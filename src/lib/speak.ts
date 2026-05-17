'use client';

/**
 * Web Speech API utility — iOS-safe.
 *
 * iOS requires speechSynthesis.speak() to be in the same callstack as a user gesture.
 * The onvoiceschanged deferred approach breaks this — speak immediately with whatever
 * voice is available, even if the voice list isn't fully loaded yet.
 */
export function speak(text: string, rate = 0.93) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate   = rate;
  utt.pitch  = 1.05;
  utt.volume = 1;

  // Pick the best available voice right now — don't defer
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const pick =
      voices.find((v) => /samantha|karen|victoria/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en-SG')) ||
      voices.find((v) => v.lang.startsWith('en-GB')) ||
      voices.find((v) => v.lang.startsWith('en-AU')) ||
      voices.find((v) => v.lang.startsWith('en-US')) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (pick) utt.voice = pick;
  }
  // Speak immediately — even with default voice if none found.
  // This keeps us in the user gesture callstack, which iOS requires.
  window.speechSynthesis.speak(utt);
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
