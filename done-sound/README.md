# done-sound

Plays a sound when Claude finishes a reply, so you can switch to another window during a long task and hear when it's done.

- **Reply finished:** plays the "Glass" system sound.
- **Turn ended on an error or a refusal:** plays "Basso" instead, so you can tell the two apart.
- **No sound** when you stop a turn yourself (you're already at the keyboard), or when a subagent finishes part of a larger task.

The sound plays in the background, so it never delays the end of a turn.

## Usage

| Command | Does |
| --- | --- |
| `/sound` | Mutes or unmutes |
| `/sound off` | Mutes |
| `/sound on` | Unmutes |
| `/sound test` | Plays the done sound now |

The command runs at once, even while Claude is working. Muting is remembered across sessions, and the status line shows `sound off` while muted.

## Settings

| Setting | Default | Does |
| --- | --- | --- |
| `sound` | `Glass` | The sound for a finished reply |
| `errorSound` | `Basso` | The sound for an error or a refusal |
| `minSeconds` | `0` | Stays silent for turns shorter than this many seconds. Set it to around 15 to hear only long tasks. |

`sound` and `errorSound` take any macOS system sound: Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine or Tink.

The settings appear in Claude Code's config menu. To see or set them from the command line:

```bash
claude plugin configure done-sound@claude-mods
```

## How it works

| Hook | What it does |
| --- | --- |
| `session.start` | Registers `/sound`, and shows `sound off` in the status line if muted. |
| `command.run` for `sound` | Handles `/sound`. |
| `turn.complete` | After a turn of the main conversation ends, plays the sound with `afplay` from `/System/Library/Sounds`, from a timer so the turn doesn't wait for playback. |

If `afplay` fails, a toast says so.

## Requirements

- macOS, because the mod uses `afplay` and the macOS system sounds.
