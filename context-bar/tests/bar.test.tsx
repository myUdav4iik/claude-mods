import { test, expect } from 'claude-code/testing'

const cat = (name: string, tokens: number, color: string, kind: 'used' | 'free' | 'buffer') =>
  ({ name, tokens, color, isDeferred: false, kind })

const USAGE = {
  startedAt: 0,
  rateLimits: [],
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

const PROPS = {
  hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 19 }, view: {},
}

for (const surface of ['desktop', 'terminal'] as const) {
  test(`draws on ${surface}`, async ($, on) => {
    on('session.usage', () => ({ value: USAGE }) as never)
    on('store.set', () => ({ value: undefined }) as never)
    on('store.get', () => ({ value: undefined }) as never)
    const ran = await $.command.run({ command: 'context-bar', args: 'on' })
    const ui = await $.ui.mount({ plugin: 'context-bar', surface, component: 'AbovePrompt', props: PROPS as never })
    const tree = await ui.drawn()
    expect(tree).toBeDefined()
  })
}
