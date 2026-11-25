import React, { useEffect, useRef } from 'react';
import { CharacterConfig } from '../types/wedding';
import { drawCartoonCharacter } from '../utils/cartoonRenderer';

interface CartoonAvatarPreviewProps {
  character: CharacterConfig;
  size?: number;
  animate?: boolean;
  facing?: 1 | -1;
  className?: string;
}

export const CartoonAvatarPreview: React.FC<CartoonAvatarPreviewProps> = ({
  character,
  size = 140,
  animate = true,
  facing = 1,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    let rafId = 0;
    let tick = 0;

    const render = () => {
      tick += 0.06;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const scale = size / 92;
      const blink = animate ? Math.sin(tick * 0.45) > 0.97 : false;

      drawCartoonCharacter({
        ctx,
        char: character,
        x: size / 2,
        y: size * 0.88,
        scale,
        facing,
        walkPhase: animate ? tick : 0,
        isMoving: false,
        isJumping: false,
        blink,
      });

      ctx.restore();
      if (animate) {
        rafId = requestAnimationFrame(render);
      }
    };

    render();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [character, size, animate, facing]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={className}
      aria-label={`Karakter kartun ${character.role === 'groom' ? 'Mempelai Pria' : 'Mempelai Wanita'}`}
    />
  );
};
