import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

// The text drawn in the footer; writing it redraws the footer.
const usageLine = atom({ plugin: 'usage-status', key: 'line' } as const, null)

// Last windows the engine reported; refreshed by session.measure.
let limits: SessionRateLimit[] = []

const LABELS: Record<string, string> = { five_hour: '5h', seven_day: 'wk' }

function untilReset(resetsAt: string | undefined, now: number): string {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - now
  if (!(ms > 0)) return ''
  const mins = Math.round(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  const span = d > 0 ? `${d}d${h}h` : h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`
  return ` ↻${span}`
}

function line(now: number): string {
  const parts = ['five_hour', 'seven_day']
    .map(kind => limits.find(l => l.kind === kind))
    .filter((l): l is SessionRateLimit => l !== undefined)
    .map(l => `${LABELS[l.kind]} ${Math.round(l.percentUsed)}%${untilReset(l.resetsAt, now)}`)
  return parts.length === 0 ? 'usage: waiting for first reply…' : parts.join(' · ')
}

async function show($: EngineInterface): Promise<void> {
  const text = line(await $.clock.now())
  $.ui.status(text) // terminal: the status line under the prompt
  await update($, usageLine, () => text) // desktop/terminal: the prompt footer
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    try {
      limits = (await $.session.usage()).rateLimits
    } catch {
      limits = []
    }
    await show($)
    // Keep the reset countdowns current between turns.
    $.clock.every(60_000, () => void show($))
    return result
  })

  on('session.measure', async ($, e, next) => {
    limits = e.rateLimits
    await show($)
    return next(e)
  })

  // Add the usage to the small labels at the right of the prompt footer.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const text = await read($, usageLine)
    if (!text) return next(e)
    return next({ ...e, props: { ...e.props, modes: [...e.props.modes, text] } })
  })
}
