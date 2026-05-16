'use client';

/**
 * Shared Web Speech API utility.
 * Voices are loaded asynchronously on first call.
 */
export function speak(text: string, rate = 0.93) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const fire = () => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang   = 'en-SG';
    utt.rate   = rate;
    utt.pitch  = 1.05;
    utt.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const pick =
      voices.find((v) => v.lang === 'en-GB' && /female|samantha|karen|victoria/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en-SG')) ||
      voices.find((v) => v.lang.startsWith('en-GB')) ||
      voices.find((v) => v.lang.startsWith('en-AU')) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (pick) utt.voice = pick;

    window.speechSynthesis.speak(utt);
  };

  // Voices may not be loaded yet on first call (especially iOS)
  if (window.speechSynthesis.getVoices().length > 0) {
    fire();
  } else {
    window.speechSynthesis.onvoiceschanged = () => { fire(); };
  }
}

export function stopSpeech() {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

/** Only announce once per calendar day (keyed by storageKey) */
export function speakOnceToday(text: string, storageKey: string) {
  const today = new Date().toISOString().slice(0, 10);
  const last  = localStorage.getItem(storageKey);
  if (last === today) return;
  localStorage.setItem(storageKey, today);
  speak(text);
}
