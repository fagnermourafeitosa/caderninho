// Sound player: afplay plays independently of renderer autoplay and window visibility; a failure falls back to the system beep.
const AFPLAY = '/usr/bin/afplay';
const LIMITS = { timeout: 30000, maxBuffer: 64 * 1024 };

function afplaySoundPlayer({ execFile, beep, log = console.error }) {
  return {
    play({ file, volume }) {
      execFile(AFPLAY, ['-v', String(volume), file], LIMITS, error => {
        if (!error) return;
        log(`Som do alerta: ${error.message}`);
        beep();
      });
    },
  };
}

module.exports = { afplaySoundPlayer };
