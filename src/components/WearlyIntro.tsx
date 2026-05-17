'use client';

import { useState, useEffect, useRef } from 'react';
import {
  WandSparkles, MirrorRound, Shirt, Sparkles,
  Recycle, Accessibility, ShieldCheck, Volume2, ChevronRight,
} from 'lucide-react';
import { speak, stopSpeech } from '@/lib/speak';

const INTRO_KEY = 'wearly_intro_seen_v1';

const INTRO_SCRIPT = `Hi! I'm Wearly — your personal AI fashion assistant, built to live right in your pocket.

I work completely offline. No cloud. No data leaks. Just intelligent style advice powered by on-device AI.

Let me show you what I can do.

My Smart Mirror uses your camera to analyse your outfit in real time. I'll identify your colours, suggest matching bottoms and accessories, and narrate a personalised style guide — all hands-free, all private.

Your Wardrobe is your digital closet. Add your clothes, shoes, fragrances, grooming products — anything you wear. I remember every piece and help you discover new combinations you already own.

My AI Stylist is always on. Ask me anything — what to wear for a meeting, how to style a specific piece, or what goes with today's weather. I adapt my advice to Singapore's climate and your upcoming events.

I'm eco-friendly by design. I help you re-wear, re-style, and reduce fashion waste — because sustainable fashion is smart fashion.

And I'm built for everyone. Full voice narration, high-contrast design, and large touch targets make me accessible to all users, including those with visual impairments.

This is Wearly. Let's make every outfit your best outfit.`;

type Feature = {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
};

const FEATURES: Feature[] = [
  { Icon: MirrorRound,   iconBg: 'rgba(168,208,96,0.16)',  iconColor: '#A8D060', title: 'Smart Mirror',    desc: 'Real-time outfit analysis & voice narration' },
  { Icon: Shirt,         iconBg: 'rgba(100,160,220,0.16)', iconColor: '#7EB8F0', title: 'Digital Wardrobe', desc: 'Your entire closet, organised by AI' },
  { Icon: Sparkles,      iconBg: 'rgba(244,162,97,0.16)',  iconColor: '#F4A261', title: 'AI Stylist',       desc: 'Chat for outfit ideas, weather-aware advice' },
  { Icon: Recycle,       iconBg: 'rgba(82,196,126,0.16)',  iconColor: '#52C47E', title: 'Eco Mode',         desc: 'Re-wear suggestions, reduce fashion waste' },
  { Icon: Accessibility, iconBg: 'rgba(168,208,96,0.16)',  iconColor: '#A8D060', title: 'Accessible',       desc: 'Voice-first, works for all users' },
  { Icon: ShieldCheck,   iconBg: 'rgba(130,100,240,0.16)', iconColor: '#A080F0', title: '100% Private',     desc: 'On-device AI, nothing leaves your phone' },
];

interface Props {
  forceShow?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export default function WearlyIntro({ forceShow, open: controlledOpen, onClose }: Props) {
  const isControlled = controlledOpen !== undefined;
  const [visible, setVisible]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hasSpoken = useRef(false);

  useEffect(() => {
    if (isControlled) { setVisible(!!controlledOpen); setDismissed(false); return; }
    if (forceShow) { setVisible(true); return; }
    const seen = localStorage.getItem(INTRO_KEY);
    if (!seen) setVisible(true);
  }, [forceShow, controlledOpen, isControlled]);

  function handleSpeak() {
    if (speaking) { stopSpeech(); setSpeaking(false); return; }
    setSpeaking(true);
    hasSpoken.current = true;
    const utt = new SpeechSynthesisUtterance(INTRO_SCRIPT);
    utt.rate = 0.92; utt.pitch = 1.05; utt.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const pick =
      voices.find((v) => /samantha|karen|victoria/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en-SG')) ||
      voices.find((v) => v.lang.startsWith('en-GB')) ||
      voices.find((v) => v.lang.startsWith('en-AU')) ||
      voices.find((v) => v.lang.startsWith('en-US')) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (pick) utt.voice = pick;
    utt.onend  = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function handleDismiss() {
    stopSpeech();
    setSpeaking(false);
    if (!isControlled) localStorage.setItem(INTRO_KEY, '1');
    setDismissed(true);
    setTimeout(() => { setVisible(false); onClose?.(); }, 400);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(160deg, #080f06 0%, #0d1a09 50%, #060e04 100%)',
      transition: 'opacity 0.4s ease',
      opacity: dismissed ? 0 : 1,
      overflowY: 'auto',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(90,146,64,0.22) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 28px 32px', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* Logo mark */}
        <div style={{
          width: 72, height: 72, borderRadius: 22, marginBottom: 20,
          background: 'linear-gradient(145deg, rgba(168,208,96,0.25), rgba(60,106,32,0.55))',
          border: '1.5px solid rgba(168,208,96,0.40)',
          boxShadow: '0 0 40px rgba(90,146,64,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <WandSparkles size={32} color="#A8D060" strokeWidth={1.5} />
        </div>

        {/* Headline */}
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', textAlign: 'center', margin: 0, lineHeight: 1.2 }}>
          Hi, I&apos;m <span style={{ color: '#A8D060' }}>Wearly</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 14, textAlign: 'center', marginTop: 10, marginBottom: 32, lineHeight: 1.65, maxWidth: 300 }}>
          Your personal AI fashion assistant — private, offline, and always stylish.
        </p>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', marginBottom: 32 }}>
          {FEATURES.map(({ Icon, iconBg, iconColor, title, desc }) => (
            <div key={title} style={{
              borderRadius: 16, padding: '14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(168,208,96,0.12)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color={iconColor} strokeWidth={1.75} />
              </div>
              <span style={{ color: '#C8EC80', fontSize: 12, fontWeight: 700, letterSpacing: '0.01em' }}>{title}</span>
              <span style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, lineHeight: 1.5 }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Hear intro button */}
        <button
          onClick={handleSpeak}
          style={{
            width: '100%', padding: '15px 20px', borderRadius: 16, marginBottom: 12,
            background: speaking
              ? 'linear-gradient(135deg,rgba(168,208,96,0.30),rgba(90,146,64,0.50))'
              : 'rgba(168,208,96,0.10)',
            border: `1.5px solid ${speaking ? 'rgba(168,208,96,0.60)' : 'rgba(168,208,96,0.25)'}`,
            color: '#A8D060', fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: 'pointer', touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {speaking ? (
            <>
              <span style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width: 3, height: 14, borderRadius: 2, background: '#A8D060', animation: `waveBar 0.9s ${i * 0.15}s ease-in-out infinite alternate` }} />
                ))}
              </span>
              Tap to stop
            </>
          ) : (
            <>
              <Volume2 size={18} color="#A8D060" strokeWidth={1.75} />
              Hear Wearly&apos;s intro
            </>
          )}
        </button>

        {/* Get started */}
        <button
          onClick={handleDismiss}
          style={{
            width: '100%', padding: '16px 20px', borderRadius: 16,
            background: 'linear-gradient(135deg, #5a9240, #3c6a20)',
            border: 'none', color: '#fff', fontSize: 15, fontWeight: 800,
            cursor: 'pointer', touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 4px 24px rgba(90,146,64,0.40)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          Get Started
          <ChevronRight size={18} color="#fff" strokeWidth={2.5} />
        </button>

        <p style={{ color: 'rgba(255,255,255,0.20)', fontSize: 11, marginTop: 16, textAlign: 'center' }}>
          Powered by on-device AI · No data leaves your phone
        </p>
      </div>

      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); opacity: 0.5; }
          to   { transform: scaleY(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
