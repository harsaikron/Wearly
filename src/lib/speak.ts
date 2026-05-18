'use client';

/**
 * Web Speech API utility — desktop + iOS safe.
 *
 * Desktop browsers (Chrome, Firefox, Safari) block speechSynthesis unless the
 * page has received at least one user gesture. We solve this with a two-phase
 * approach:
 *  1. initAudio() — call once on mount; attaches capture-phase listeners that
 *     fire a silent utterance on the very first click/keydown/touch, which
 *     "unlocks" the API for the whole browser session.
 *  2. speak() — if called before unlock (e.g. from a setTimeout or fetch
 *     callback), the text is queued and played automatically once unlocked.
 *     If already unlocked, plays immediately.
 *
 * iOS additionally requires speak() to be in the same gesture callstack, which
 * is preserved for direct onClick handlers. The queue path covers deferred calls.
 */

let _unlocked = false;
let _pending: { text: string; rate: number } | null = null;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /samantha|karen|victoria/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith('en-SG')) ||
    voices.find((v) => v.lang.startsWith('en-GB')) ||
    voices.find((v) => v.lang.startsWith('en-AU')) ||
    voices.find((v) => v.lang.startsWith('en-US')) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    null
  );
}

function _doSpeak(text: string, rate: number) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate   = rate;
  utt.pitch  = 1.05;
  utt.volume = 1;
  const voice = pickVoice();
  if (voice) utt.voice = voice;
  window.speechSynthesis.speak(utt);
}

/**
 * Call once in a 'use client' component (AudioInit) on mount.
 * Pre-loads the voice list and registers the first-interaction unlock.
 */
export function initAudio() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Eagerly load voices (async on Chrome, sync on Safari/Firefox)
  window.speechSynthesis.getVoices();
  if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }

  function unlock() {
    if (_unlocked) return;
    _unlocked = true;

    // A zero-width space utterance at zero volume unlocks the API for the session
    const silent = new SpeechSynthesisUtterance('​');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);

    // Flush any queued speech
    if (_pending) {
      const { text, rate } = _pending;
      _pending = null;
      setTimeout(() => _doSpeak(text, rate), 80);
    }

    document.removeEventListener('click',      unlock, true);
    document.removeEventListener('keydown',    unlock, true);
    document.removeEventListener('touchstart', unlock, true);
    document.removeEventListener('pointerdown', unlock, true);
  }

  // Capture phase so we catch ANY interaction before React's synthetic events
  document.addEventListener('click',       unlock, true);
  document.addEventListener('keydown',     unlock, true);
  document.addEventListener('touchstart',  unlock, true);
  document.addEventListener('pointerdown', unlock, true);
}

export function speak(text: string, rate = 0.93) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  if (!_unlocked) {
    // Queue — will play as soon as the user first interacts with the page
    _pending = { text, rate };
    return;
  }
  _doSpeak(text, rate);
}

export function stopSpeech() {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  _pending = null;
}

/** Only announce once per calendar day (keyed by storageKey) */
export function speakOnceToday(text: string, storageKey: string) {
  const today = new Date().toISOString().slice(0, 10);
  const last  = localStorage.getItem(storageKey);
  if (last === today) return;
  localStorage.setItem(storageKey, today);
  speak(text);
}
