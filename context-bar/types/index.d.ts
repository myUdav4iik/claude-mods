export type SegmentKind = 'used' | 'free' | 'buffer'

export type Segment = { name: string; tokens: number; color: string; kind: SegmentKind }

export type Snapshot = {
  total: number
  max: number
  threshold: number | null
  segments: Segment[]
}

declare module 'claude-code' {
  interface PluginState {
    'context-bar': { snapshot: Snapshot | null; isShown: boolean }
  }
}
