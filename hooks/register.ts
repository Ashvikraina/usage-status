import type { Register, SessionRateLimit, TurnStepChunk } from 'claude-code'

const NAMES: Record<string, string> = { five_hour: '5-hour', seven_day: 'Weekly' }
const MARK = '⏱'

function resetsIn(resetsAt: string | undefined, now: number): string {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - now
  if (!(ms > 0)) return ''
  const mins = Math.round(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  const span = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
  return `, resets in ${span}`
}

function usageLine(limits: readonly SessionRateLimit[], now: number): string | undefined {
  const parts = ['five_hour', 'seven_day']
    .map(kind => limits.find(l => l.kind === kind))
    .filter((l): l is SessionRateLimit => l !== undefined)
    .map(l => `${NAMES[l.kind]} ${Math.round(l.percentUsed)}%${resetsIn(l.resetsAt, now)}`)
  return parts.length === 0 ? undefined : `${MARK} ${parts.join(' · ')}`
}

export const register: Register = on => {
  // A new session learns the usage figures only from an API response, which
  // the first reply's own arrives too late for. So before the first turn, if
  // there are none yet, send one tiny request (a few tokens) to fetch them.
  let warmed = false
  on('turn.start', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined && !warmed) {
      warmed = true
      try {
        if ((await $.session.usage()).rateLimits.length === 0) {
          await $.model.complete({ model: 'haiku', prompt: 'Reply with: ok', maxTokens: 1, timeoutMs: 5000 })
        }
      } catch {
        // No figures this turn; the line appears from the next reply on.
      }
    }
    return result
  })

  // Add the usage line to the end of the reply's final text, as it streams:
  // hold back the latest text piece (and engine items after it) until the
  // next real chunk shows whether more is coming.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    let held: TurnStepChunk[] = []
    let sawTool = false
    for await (const chunk of next(e)) {
      if (chunk.kind === 'tool') sawTool = true
      if (chunk.kind === 'engine' && held.length > 0) {
        held.push(chunk)
        continue
      }
      if (chunk.kind === 'stop' && !sawTool && held[0]?.kind === 'text') {
        try {
          const [{ rateLimits }, now] = await Promise.all([$.session.usage(), $.clock.now()])
          const line = usageLine(rateLimits, now)
          const first = held[0]
          if (line) held[0] = { ...first, text: `${first.text}\n\n*${line}*` }
        } catch {
          // Never let the usage line get in the way of the reply.
        }
      }
      for (const h of held) yield h
      held = []
      if (chunk.kind === 'text') held = [chunk]
      else yield chunk
    }
    for (const h of held) yield h
  })

  // One short system-prompt note so Claude never writes the line itself.
  on('prompt.compose', async ($, e, next) => {
    const { sections } = await next(e)
    return {
      sections: [
        ...sections,
        {
          id: 'usage-status',
          scope: 'session',
          text: `Lines starting with ${MARK} at the end of your earlier replies were added automatically by a plugin. Never write one yourself.`,
        },
      ],
    }
  })
}
