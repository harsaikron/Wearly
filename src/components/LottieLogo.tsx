'use client';

import Lottie from 'lottie-react';
import wAnimation from '../../public/w.json';

interface Props {
  size?: number;
  loop?: boolean;
}

export default function LottieLogo({ size = 40, loop = false }: Props) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Lottie
        animationData={wAnimation}
        loop={loop}
        autoplay
        style={{ width: size, height: size }}
      />
    </div>
  );
}
