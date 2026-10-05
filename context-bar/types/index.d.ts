export type SegmentKind = 'used' | 'free' | 'buffer'

export type Segment = { name: string; tokens: number; color: string; kind: SegmentKind }

export type Snapshot = {
  total: number
  max: number
  threshold: number | null
  segments: Segment[]
}

// One plan rate-limit window: `five_hour`, `seven_day`, or a gateway's
// `spend_limit`. `resetsAt` is in epoch milliseconds, null when not reported.
export type Limit = { kind: string; percent: number; resetsAt: number | null }

declare module 'claude-code' {
  interface PluginState {
    'context-bar': { snapshot: Snapshot | null; isShown: boolean; limits: Limit[]; now: number }
  }
}
