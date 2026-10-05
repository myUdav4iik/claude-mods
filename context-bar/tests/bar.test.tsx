import { test, expect, mock } from 'claude-code/testing'

const cat = (name: string, tokens: number, color: string, kind: 'used' | 'free' | 'buffer') =>
  ({ name, tokens, color, isDeferred: false, kind })

// 2026-10-04T12:00:00Z; the windows reset 2h 14m and 3d 4h later.
const NOW = Date.parse('2026-10-04T12:00:00Z')
const RATE_LIMITS = [
  { kind: 'five_hour', percentUsed: 23.4, resetsAt: '2026-10-04T14:14:00Z' },
  { kind: 'seven_day', percentUsed: 81, resetsAt: '2026-10-07T16:00:00Z' },
]

const USAGE = {
  startedAt: 0,
  rateLimits: RATE_LIMITS,
  context: {
    tokens: 178_000,
    window: 1_000_000,
    percent: 18,
    breakdown: {
      categories: [
        cat('System prompt', 4_600, 'promptBorder', 'used'),
        cat('System tools', 24_700, 'inactive', 'used'),
        cat('Messages', 117_000, 'permission', 'used'),
        cat('Free space', 789_000, 'promptBorder', 'free'),
        cat('Autocompact buffer', 33_000, 'inactive', 'buffer'),
      ],
      totalTokens: 178_000, maxTokens: 1_000_000, rawMaxTokens: 1_000_000,
      autocompactSource: 'model-default', percentage: 18, gridRows: [], model: 'x',
      memoryFiles: [], mcpTools: [], agents: [], autoCompactThreshold: 967_000,
      isAutoCompactEnabled: true, apiUsage: null,
    },
  },
}

const RUN = {
  command: 'context-bar', args: 'on',
  origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 100 },
} as const

const PROPS = {
  hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 19 }, view: {},
}

for (const surface of ['desktop', 'terminal'] as const) {
  test(`draws on ${surface}`, async ($, on) => {
    mock.clock(on, { now: NOW })
    on('session.usage', () => ({ value: USAGE }) as never)
    on('store.set', () => ({ value: undefined }) as never)
    on('store.get', () => ({ value: undefined }) as never)
    await $.command.run(RUN)
    const ui = await $.ui.mount({ plugin: 'context-bar', surface, component: 'AbovePrompt', props: PROPS as never })
    const tree = await ui.drawn()
    expect(tree).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '23%' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' · resets in 2h 14m' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' · resets in 3d 4h' })).toBeDefined()
  })
}

test('counts down to the reset and leaves the row out off a subscription', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  let windows: typeof RATE_LIMITS = RATE_LIMITS
  on('session.usage', () => ({ value: { ...USAGE, rateLimits: windows } }) as never)
  on('store.set', () => ({ value: undefined }) as never)
  on('store.get', () => ({ value: undefined }) as never)
  on('session.start', () => ({ cwd: '/' }))
  on('command.register', () => ({ value: undefined }) as never)
  await $.session.start({ cwd: '/' } as never)
  await $.command.run(RUN)
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', component: 'AbovePrompt', props: PROPS as never })
  expect(await ui.find({ type: 'Text', text: 'usage' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' · resets in 2h 14m' })).toBeDefined()

  await clock.advance(2 * 60 * 60_000)
  expect(await ui.find({ type: 'Text', text: ' · resets in 14m' })).toBeDefined()

  await clock.advance(15 * 60_000)
  expect(await ui.find({ type: 'Text', text: ' · resetting' })).toBeDefined()

  windows = []
  await $.command.run(RUN)
  expect(await ui.find({ type: 'Text', text: 'usage' })).toBeUndefined()
})
