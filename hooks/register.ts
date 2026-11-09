import type { Register, SessionRateLimit } from 'claude-code'

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

function line(now: number): string | undefined {
  const parts = ['five_hour', 'seven_day']
    .map(kind => limits.find(l => l.kind === kind))
    .filter((l): l is SessionRateLimit => l !== undefined)
    .map(l => `${LABELS[l.kind]} ${Math.round(l.percentUsed)}%${untilReset(l.resetsAt, now)}`)
  if (parts.length === 0) return 'usage: waiting for first reply…'
  return parts.join(' · ')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    try {
      limits = (await $.session.usage()).rateLimits
    } catch {
      limits = []
    }
    $.ui.status(line(await $.clock.now()))
    // Keep the reset countdowns current between turns.
    $.clock.every(60_000, () => {
      void $.clock.now().then(now => $.ui.status(line(now)))
    })
    return result
  })

  on('session.measure', async ($, e, next) => {
    limits = e.rateLimits
    $.ui.status(line(await $.clock.now()))
    return next(e)
  })
}
