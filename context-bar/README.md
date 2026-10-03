# context-bar

A live breakdown of the context window, drawn in the band above Claude Code's prompt.

```text
◆ context  18%  178k/1M · compacts 967k
▆▆▆▆▆▆▆▆▆▆▆▆────────────────────────────────────────────────────────────
■ system 4.6k  ■ tools 24.7k  ■ mcp 19.2k  ■ mcp instr 1.9k  ■ agents 38
■ memory 1.3k  ■ skills 10k  ■ messages 117k  ─ free 789k
```

- **Header:** the share of the window in use, as a badge that is green under 50%, yellow under 80% and red above. Then the tokens in use, the window size, and the point where auto-compaction runs.
- **Bar:** one segment per category, in proportion to its share of the window, followed by a track for the free space.
- **Legend:** each category with its token count, in the colours `/context` uses.

## Usage

| Command | Does |
| --- | --- |
| `/context-bar` | Shows or hides the bar |
| `/context-bar on` | Shows the bar |
| `/context-bar off` | Hides the bar |

The command runs at once, even while Claude is working. The choice is remembered across sessions. Claude Code's own `[-]` control on the band collapses it as well.

## How it works

| Hook | What it does |
| --- | --- |
| `session.start` | Registers `/context-bar`, restores the saved on/off choice, and takes a first reading. |
| `turn.complete` | Takes a reading after each turn of the main conversation. Subagent turns are skipped. |
| `session.compact` | Takes a reading after the conversation is compacted. |
| `ui.render` on `AbovePrompt` | Draws the band. It steps aside while Claude Code shows a survey there. |

Readings come from `$.session.usage({ breakdown: 'summary' })`, the same per-category breakdown `/context` shows. The `summary` mode estimates locally, so a reading sends no requests and costs nothing.

The bar is built from flex boxes, each growing by its share of the window, so it splits in exact proportion at any width and never wraps. Small categories still get at least one cell. Free space is drawn differently per surface:

- **Terminal:** a dim line, because Claude Code's colour for free space there is bright enough to read as used.
- **Desktop app:** a dark fill. The desktop wraps long runs of text rather than clipping them, so a line of characters doesn't work there.

The compaction reserve is drawn as part of the free track; the header shows where compaction runs.

## Limitations

- **Estimates:** the category figures are estimates, as in `/context`, so the total can differ slightly from the status line.
- **Once per turn:** the bar updates after each turn, not while Claude is working.
- **Before the first reply:** the bar shows "waiting for the first reading…".
- **Shared band:** the band above the prompt holds one mod at a time. If another installed mod draws there, only one of them shows.

## Tests

`tests/bar.test.tsx` feeds the mod a sample breakdown, draws the band on the terminal and desktop surfaces, and fails if either surface refuses the drawing. Claude Code drops a drawing it can't validate without an error you'd see, so run the tests after changing how the bar is drawn:

```bash
claude plugin test .
```
