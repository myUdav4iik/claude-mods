import type { EngineInterface, Register } from 'claude-code'

const SOUNDS_DIR = '/System/Library/Sounds'
const MUTED_KEY = 'isMuted'

const play = ($: EngineInterface, name: string) =>
  $.process
    .run(['afplay', `${SOUNDS_DIR}/${name}.aiff`], { timeoutMs: 10_000 })
    .then(({ exitCode, stderr }) => {
      if (exitCode !== 0) {
        $.ui.toast(`done-sound: afplay failed: ${stderr.trim().slice(0, 80)}`)
      }
    })
    .catch(() => $.ui.toast('done-sound: could not run afplay'))

const isMuted = async ($: EngineInterface) => (await $.store.get(MUTED_KEY)) === true

const setMuted = async ($: EngineInterface, value: boolean) => {
  await $.store.set(MUTED_KEY, value)
  $.ui.status(value ? 'sound off' : undefined)
}

export const register: Register = (on, options) => {
  const sound = String(options.sound ?? 'Glass')
  const errorSound = String(options.errorSound ?? 'Basso')
  const minMs = Number(options.minSeconds ?? 0) * 1000

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'sound',
      description: 'Toggle the turn-finished sound (on, off, test)',
      argumentHint: '[on|off|test]',
      immediate: true,
    })
    $.ui.status((await isMuted($)) ? 'sound off' : undefined)

    return next(e)
  })

  on('command.run', { command: 'sound' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === 'test') {
      await play($, sound)
      return { text: `Played ${sound}.` }
    }

    const wasMuted = await isMuted($)
    const nextMuted = arg === 'on' ? false : arg === 'off' ? true : !wasMuted

    if (arg !== '' && arg !== 'on' && arg !== 'off') {
      return { text: 'Usage: /sound [on|off|test]' }
    }

    await setMuted($, nextMuted)

    return { text: nextMuted ? 'Done sound off.' : 'Done sound on.' }
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)

    // Main conversation only: subagent turns end mid-task, and an interrupted
    // turn means the person is already at the keyboard.
    const isSilent =
      e.agentId !== undefined || e.isAborted || e.durationMs < minMs || (await isMuted($))
    if (isSilent) {
      return result
    }

    const name = e.reason === 'answer' ? sound : errorSound

    // Played from a timer so the turn's completion never waits on playback.
    $.clock.after(0, () => void play($, name))

    return result
  })
}
