import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Segment, Snapshot } from '../types'

const snapshot = atom({ plugin: 'context-bar', key: 'snapshot' } as const, null)
const isShown = atom({ plugin: 'context-bar', key: 'isShown' } as const, true)

// Persisted across sessions, so the bar stays hidden once turned off.
const SHOWN_KEY = 'isShown'
const ACCENT = '#D97757'
// Longer than any band is wide; the free track's box clips it to its share.
const FREE_FILL = '─'.repeat(400)

// Shorter legend labels for /context's category names; others show as given.
const LABELS: Record<string, string> = {
  'system prompt': 'system',
  'system tools': 'tools',
  'mcp tools': 'mcp',
  'mcp server instructions': 'mcp instr',
  'custom agents': 'agents',
  'memory files': 'memory',
}

const short = (n: number) => {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`
  return String(n)
}

// A segment's share of the window as a flex weight, in hundredths of a
// percent: the surfaces cap flexGrow at 10000.
const growOf = (tokens: number, max: number) => Math.min(10_000, (tokens / max) * 10_000)

const badgeColor = (percent: number) =>
  percent < 50 ? 'success' : percent < 80 ? 'warning' : 'error'

const refresh = async ($: EngineInterface) => {
  try {
    const { context } = await $.session.usage({ breakdown: 'summary' })
    const b = context.breakdown
    if (!b) {
      return
    }
    const segments: Segment[] = b.categories
      .filter(c => c.kind !== 'deferred')
      .map(c => ({
        name: c.name.toLowerCase(),
        tokens: c.tokens,
        color: c.color,
        kind: c.kind === 'free' ? 'free' : c.kind === 'buffer' ? 'buffer' : 'used',
      }))
    const next: Snapshot = {
      total: b.totalTokens,
      max: b.rawMaxTokens,
      threshold: b.isAutoCompactEnabled ? (b.autoCompactThreshold ?? null) : null,
      segments,
    }
    await update($, snapshot, () => next)
  } catch {
    // No reading this time; the bar keeps the last one.
  }
}

const setShown = async ($: EngineInterface, value: boolean) => {
  await $.store.set(SHOWN_KEY, value)
  await update($, isShown, () => value)
  if (value) {
    await refresh($)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({
      name: 'context-bar',
      description: 'Toggle the context-window bar above the prompt',
      argumentHint: '[on|off]',
      immediate: true,
    })
    const stored = await $.store.get(SHOWN_KEY)
    await update($, isShown, () => stored !== false)
    $.clock.after(0, () => void refresh($))

    return result
  })

  on('command.run', { command: 'context-bar' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg !== '' && arg !== 'on' && arg !== 'off') {
      return { text: 'Usage: /context-bar [on|off]' }
    }
    const value = arg === 'on' ? true : arg === 'off' ? false : !(await read($, isShown))
    await setShown($, value)

    return { text: value ? 'Context bar on.' : 'Context bar off.' }
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      $.clock.after(0, () => void refresh($))
    }
    return result
  })

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      $.clock.after(0, () => void refresh($))
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isShown))) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const snap = await read($, snapshot)

    if (snap === null || snap.max <= 0) {
      return (
        <Box paddingX={1}>
          <Text color={ACCENT}>◆ </Text>
          <Text bold>context</Text>
          <Text dimColor>  waiting for the first reading…</Text>
        </Box>
      )
    }

    const percent = Math.round((snap.total / snap.max) * 100)
    const used = snap.segments.filter(s => s.kind === 'used' && s.tokens > 0)
    const free = snap.segments.find(s => s.kind === 'free')
    const isTerminal = e.surface === 'terminal'
    // Everything past the used segments, the compaction reserve included, is
    // drawn as one free track; the header says where compaction runs.
    const rest = Math.max(0, snap.max - used.reduce((sum, s) => sum + s.tokens, 0))

    // Each segment grows by its token count from a zero basis, so the row
    // splits in exact proportion (the surfaces accept only whole-number
    // percentage widths).
    // The badge sits beside the totals, not at the row's right edge, where the
    // engine draws the band's own [-] control over it.
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row">
          <Text color={ACCENT}>◆ </Text>
          <Text bold>context </Text>
          <Text bold color="black" backgroundColor={badgeColor(percent)}>
            {` ${percent}% `}
          </Text>
          <Text bold> {short(snap.total)}</Text>
          <Text dimColor>/{short(snap.max)}</Text>
          {snap.threshold !== null && <Text dimColor> · compacts {short(snap.threshold)}</Text>}
        </Box>
        <Box flexDirection="row" height={1} overflow="hidden">
          {used.map((s, i) => (
            <Box
              key={`seg${i}`}
              width={0}
              flexGrow={growOf(s.tokens, snap.max)}
              minWidth={1}
              height={1}
              backgroundColor={s.color}
            />
          ))}
          {/* On the terminal the free track is a dim line of text, not filled:
              the engine's colour for free space there is bright enough to read
              as used. Other surfaces wrap a long text run rather than clip it,
              and draw that colour dark, so it is filled there. */}
          {rest > 0 && (
            isTerminal ? (
              <Box key="free" width={0} flexGrow={growOf(rest, snap.max)} height={1} overflow="hidden">
                <Text dimColor>{FREE_FILL}</Text>
              </Box>
            ) : (
              <Box key="free" width={0} flexGrow={growOf(rest, snap.max)} height={1} backgroundColor={free?.color} />
            )
          )}
        </Box>
        <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
          {used.map((s, i) => (
            <Box key={`leg${i}`} flexDirection="row">
              <Text color={s.color}>■ </Text>
              <Text dimColor>{LABELS[s.name] ?? s.name} </Text>
              <Text>{short(s.tokens)}</Text>
            </Box>
          ))}
          {free && free.tokens > 0 && (
            <Box key="leg-free" flexDirection="row">
              {isTerminal ? <Text dimColor>─ </Text> : <Text color={free.color}>■ </Text>}
              <Text dimColor>free </Text>
              <Text>{short(free.tokens)}</Text>
            </Box>
          )}
        </Box>
      </Box>
    )
  })
}
