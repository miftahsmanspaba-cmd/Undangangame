import { CharacterConfig } from '../types/wedding';

const photoImageCache = new Map<string, HTMLImageElement>();

export function getCachedCartoonImage(dataUrl: string): HTMLImageElement | null {
  if (!dataUrl) return null;
  const cached = photoImageCache.get(dataUrl);
  if (cached) {
    return cached.complete ? cached : null;
  }
  const img = new Image();
  img.src = dataUrl;
  photoImageCache.set(dataUrl, img);
  return img.complete ? img : null;
}

export interface CartoonizeOptions {
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  cartoonStrength?: number; // 0..100
}

/**
 * Converts a real uploaded face photo into a cel-shaded, outlined cartoon portrait Data URL
 * completely client-side using HTML5 Canvas pixel processing (no external API needed).
 */
export async function cartoonizeImageToDataUrl(
  srcDataUrl: string,
  options: CartoonizeOptions = {}
): Promise<string> {
  const { zoom = 1.15, offsetX = 0, offsetY = 0, cartoonStrength = 75 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 240;
      const workCanvas = document.createElement('canvas');
      workCanvas.width = size;
      workCanvas.height = size;
      const ctx = workCanvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context tidak tersedia'));
        return;
      }

      // Draw cropped & zoomed source image
      const minSide = Math.min(img.width, img.height);
      const cropSize = minSide / zoom;
      const cx = img.width / 2 - (offsetX * minSide) / 200;
      const cy = img.height / 2 - (offsetY * minSide) / 200;
      const sx = Math.max(0, Math.min(img.width - cropSize, cx - cropSize / 2));
      const sy = Math.max(0, Math.min(img.height - cropSize, cy - cropSize / 2));

      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);

      if (cartoonStrength > 5) {
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;
        const copy = new Uint8ClampedArray(data);

        // Step 1: Fast box-bilateral style smoothing (reduces skin noise, preserves strong edges)
        const radius = 2;
        const colorThreshold = 32 + (cartoonStrength / 100) * 28;
        const smoothed = new Uint8ClampedArray(data.length);

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const r0 = copy[idx];
            const g0 = copy[idx + 1];
            const b0 = copy[idx + 2];

            let rSum = 0, gSum = 0, bSum = 0, wSum = 0;
            for (let dy = -radius; dy <= radius; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= size) continue;
              for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= size) continue;
                const nIdx = (ny * size + nx) * 4;
                const dr = copy[nIdx] - r0;
                const dg = copy[nIdx + 1] - g0;
                const db = copy[nIdx + 2] - b0;
                const dist = Math.abs(dr) + Math.abs(dg) + Math.abs(db);
                if (dist < colorThreshold * 3) {
                  rSum += copy[nIdx];
                  gSum += copy[nIdx + 1];
                  bSum += copy[nIdx + 2];
                  wSum++;
                }
              }
            }
            smoothed[idx] = wSum > 0 ? rSum / wSum : r0;
            smoothed[idx + 1] = wSum > 0 ? gSum / wSum : g0;
            smoothed[idx + 2] = wSum > 0 ? bSum / wSum : b0;
            smoothed[idx + 3] = 255;
          }
        }

        // Step 2: Cel-shading quantization + Sobel cartoon ink outlines
        const levels = Math.max(4, Math.round(10 - (cartoonStrength / 100) * 5));
        const step = 255 / levels;
        const edgeMix = (cartoonStrength / 100) * 0.72;

        const lum = (px: number, py: number) => {
          const cx2 = Math.max(0, Math.min(size - 1, px));
          const cy2 = Math.max(0, Math.min(size - 1, py));
          const i = (cy2 * size + cx2) * 4;
          return 0.299 * smoothed[i] + 0.587 * smoothed[i + 1] + 0.114 * smoothed[i + 2];
        };

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;

            // Boost saturation subtly for cheerful cartoon feel
            let r = smoothed[idx];
            let g = smoothed[idx + 1];
            let b = smoothed[idx + 2];
            const avg = (r + g + b) / 3;
            const satBoost = 1.18;
            r = Math.min(255, Math.max(0, avg + (r - avg) * satBoost));
            g = Math.min(255, Math.max(0, avg + (g - avg) * satBoost));
            b = Math.min(255, Math.max(0, avg + (b - avg) * satBoost));

            // Quantize
            const qr = Math.round(r / step) * step;
            const qg = Math.round(g / step) * step;
            const qb = Math.round(b / step) * step;

            // Sobel gradient for ink outline
            const gx =
              -lum(x - 1, y - 1) + lum(x + 1, y - 1) -
              2 * lum(x - 1, y) + 2 * lum(x + 1, y) -
              lum(x - 1, y + 1) + lum(x + 1, y + 1);
            const gy =
              -lum(x - 1, y - 1) - 2 * lum(x, y - 1) - lum(x + 1, y - 1) +
              lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1);
            const edge = Math.sqrt(gx * gx + gy * gy);

            if (edge > 78) {
              const ink = Math.min(1, (edge - 78) / 90) * edgeMix;
              data[idx] = Math.round(qr * (1 - ink) + 43 * ink);
              data[idx + 1] = Math.round(qg * (1 - ink) + 35 * ink);
              data[idx + 2] = Math.round(qb * (1 - ink) + 32 * ink);
            } else {
              data[idx] = qr;
              data[idx + 1] = qg;
              data[idx + 2] = qb;
            }
            data[idx + 3] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Step 3: Mask into a clean chibi oval portrait with transparent background
      const outCanvas = document.createElement('canvas');
      outCanvas.width = size;
      outCanvas.height = size;
      const octx = outCanvas.getContext('2d')!;
      octx.beginPath();
      octx.ellipse(size / 2, size / 2, size * 0.44, size * 0.47, 0, 0, Math.PI * 2);
      octx.closePath();
      octx.clip();
      octx.drawImage(workCanvas, 0, 0);

      resolve(outCanvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Gagal memuat gambar'));
    img.src = srcDataUrl;
  });
}

export interface DrawCharacterParams {
  ctx: CanvasRenderingContext2D;
  char: CharacterConfig;
  x: number; // feet center X
  y: number; // feet bottom Y
  scale?: number;
  facing?: 1 | -1;
  direction?: 'down' | 'up' | 'left' | 'right';
  walkPhase?: number;
  isMoving?: boolean;
  isJumping?: boolean;
  blink?: boolean;
}

const OUTLINE = '#2B2320';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Draws the expressive cartoon character (either customizable vector cartoon OR uploaded cartoonized face)
 * onto an animated chibi-adventure body sprite.
 */
export function drawCartoonCharacter({
  ctx,
  char,
  x,
  y,
  scale = 1,
  facing = 1,
  direction,
  walkPhase = 0,
  isMoving = false,
  isJumping = false,
  blink = false,
}: DrawCharacterParams) {
  const effectiveFacing = direction === 'left' ? -1 : direction === 'right' ? 1 : facing;
  const isFront = direction === 'down';
  const isBack = direction === 'up';

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * effectiveFacing, scale);

  const legSwing = isJumping ? 0.35 : isMoving ? Math.sin(walkPhase) * 0.5 : 0;
  const armSwing = isJumping ? -0.8 : isMoving ? -Math.sin(walkPhase) * 0.45 : 0;
  const bounce = isJumping ? -3 : isMoving ? Math.abs(Math.sin(walkPhase)) * -3.5 : Math.sin(walkPhase * 0.4) * 0.8;

  // Ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(43, 35, 32, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 0, isJumping ? 11 : 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.translate(0, bounce);

  // Determine outfit palette
  let topColor = '#1E293B';
  let bottomColor = '#0F172A';
  let trimColor = '#EAB308';
  const isDress =
    char.role === 'bride' &&
    (char.outfit === 'white_gown' ||
      char.outfit === 'pastel_dress' ||
      char.outfit === 'kebaya_modern' ||
      char.outfit === 'kebaya_hitam_emas' ||
      char.outfit === 'kurung_songket');

  if (char.role === 'groom') {
    if (char.outfit === 'beskap_hitam_emas') {
      topColor = '#1C1917';
      bottomColor = '#5C3D2E'; // Dark Javanese Batik jarik
      trimColor = '#FACC15';
    } else if (char.outfit === 'beskap_jawa') {
      topColor = '#273A32';
      bottomColor = '#784F32'; // Batik jarik
      trimColor = '#EAB308';
    } else if (char.outfit === 'modern_suit') {
      topColor = '#263248';
      bottomColor = '#1E293B';
      trimColor = '#F8FAFC';
    } else if (char.outfit === 'pastel_casual') {
      topColor = '#A8BFA8';
      bottomColor = '#D6C7B2';
      trimColor = '#FAF6F0';
    } else {
      topColor = '#7C2D36';
      bottomColor = '#B45309';
      trimColor = '#FCD34D';
    }
  } else {
    if (char.outfit === 'kebaya_hitam_emas') {
      topColor = '#1C1917';
      bottomColor = '#5C3D2E'; // Dark batik skirt
      trimColor = '#FACC15';
    } else if (char.outfit === 'white_gown') {
      topColor = '#FFFFFF';
      bottomColor = '#FAF6F0';
      trimColor = '#F3D5DE';
    } else if (char.outfit === 'kebaya_modern') {
      topColor = '#F4DFD8';
      bottomColor = '#8C5E3C'; // Batik skirt
      trimColor = '#C85A53';
    } else if (char.outfit === 'pastel_dress') {
      topColor = '#D1E3D8';
      bottomColor = '#B8D4C3';
      trimColor = '#FFFFFF';
    } else {
      topColor = '#9D3B46';
      bottomColor = '#D97706';
      trimColor = '#FDE68A';
    }
  }

  // --- BACK ARM ---
  ctx.save();
  ctx.translate(-9, -30);
  ctx.rotate(-armSwing);
  ctx.fillStyle = topColor;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.2;
  drawRoundedRect(ctx, -3, 0, 6, 13, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = char.skinTone;
  ctx.beginPath();
  ctx.arc(0, 14, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // --- LEGS ---
  if (!isDress || char.outfit === 'kebaya_modern' || char.outfit === 'kebaya_hitam_emas' || char.outfit === 'kurung_songket') {
    // Left leg
    ctx.save();
    ctx.translate(-5, -14);
    ctx.rotate(-legSwing);
    ctx.fillStyle = bottomColor;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    drawRoundedRect(ctx, -3.5, 0, 7, 11, 3);
    ctx.fill();
    ctx.stroke();
    // Shoe
    ctx.fillStyle = char.role === 'groom' ? '#2B2320' : '#C85A53';
    drawRoundedRect(ctx, -3.5, 9, 9, 5, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right leg
    ctx.save();
    ctx.translate(5, -14);
    ctx.rotate(legSwing);
    ctx.fillStyle = bottomColor;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    drawRoundedRect(ctx, -3.5, 0, 7, 11, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = char.role === 'groom' ? '#2B2320' : '#C85A53';
    drawRoundedRect(ctx, -3.5, 9, 9, 5, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // --- TORSO / DRESS ---
  ctx.save();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.3;

  if (isDress) {
    // Flowing gown / skirt
    ctx.fillStyle = bottomColor;
    ctx.beginPath();
    ctx.moveTo(-9, -21);
    ctx.lineTo(9, -21);
    ctx.lineTo(15 + (isMoving ? Math.sin(walkPhase) * 2 : 0), -2);
    ctx.quadraticCurveTo(0, 1, -15 - (isMoving ? Math.sin(walkPhase) * 2 : 0), -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dress trim / batik pattern line
    if (char.outfit === 'kebaya_modern' || char.outfit === 'kebaya_hitam_emas' || char.outfit === 'kurung_songket') {
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-11, -7);
      ctx.lineTo(11, -7);
      ctx.stroke();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.3;
    }

    // Bodice
    ctx.fillStyle = topColor;
    drawRoundedRect(ctx, -10, -34, 20, 15, 5);
    ctx.fill();
    ctx.stroke();

    if (char.outfit === 'kebaya_hitam_emas') {
      // Gold vertical embroidery & kalung pendant
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, -34);
      ctx.lineTo(-4, -19);
      ctx.moveTo(4, -34);
      ctx.lineTo(4, -19);
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(0, -28, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Sash / Ribbon
      ctx.fillStyle = trimColor;
      ctx.fillRect(-9, -23, 18, 3.5);
    }
  } else {
    // Groom jacket/beskap
    ctx.fillStyle = topColor;
    drawRoundedRect(ctx, -11, -34, 22, 21, 5);
    ctx.fill();
    ctx.stroke();

    if (char.outfit === 'modern_suit') {
      // White V-shirt + tie
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-4, -34);
      ctx.lineTo(4, -34);
      ctx.lineTo(0, -22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#C85A53';
      ctx.beginPath();
      ctx.arc(0, -31, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (char.outfit === 'beskap_jawa' || char.outfit === 'beskap_hitam_emas') {
      // Gold collar & beskap buttons + chain brooch
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-5, -34);
      ctx.lineTo(0, -31);
      ctx.lineTo(5, -34);
      ctx.stroke();

      ctx.fillStyle = trimColor;
      for (let by = -28; by <= -19; by += 4.2) {
        ctx.beginPath();
        ctx.arc(2, by, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (char.outfit === 'beskap_hitam_emas') {
        // Gold pocket chain
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, -27, 4, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
    }

    if (char.accessory === 'boutonniere') {
      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.arc(-5, -28, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // --- FRONT ARM ---
  ctx.save();
  ctx.translate(9, -30);
  ctx.rotate(armSwing);
  ctx.fillStyle = topColor;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.2;
  drawRoundedRect(ctx, -3, 0, 6, 13, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = char.skinTone;
  ctx.beginPath();
  ctx.arc(0, 14, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // --- HEAD & FACE ---
  ctx.save();
  ctx.translate(0, -52);

  // Veil back layer for bride
  if (char.accessory === 'veil') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-14, -12);
    ctx.quadraticCurveTo(-24, 10, -20, 32);
    ctx.lineTo(10, 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // PHOTO CARTOON FACE MODE
  const photoImg =
    char.faceMode === 'photo' && char.photoCartoonUrl
      ? getCachedCartoonImage(char.photoCartoonUrl)
      : null;

  if (char.faceMode === 'photo' && photoImg) {
    // Draw cartoonized photo inside expressive chibi head frame
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 18.5, 20, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = isBack ? char.hairColor : char.skinTone;
    ctx.fill();
    if (!isBack) {
      ctx.save();
      ctx.clip();
      ctx.scale(effectiveFacing, 1);
      ctx.drawImage(photoImg, -19.5, -21, 39, 42);
      ctx.restore();
    }

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  } else if (isBack) {
    // Back-of-head view when walking North (up) in RPG map
    ctx.fillStyle = char.hairColor;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    if (char.hairStyle === 'hijab_draped' || char.hairStyle === 'hijab_syari') {
      ctx.beginPath();
      ctx.moveTo(-19, -2);
      ctx.arc(0, -2, 19.5, Math.PI, 0);
      ctx.lineTo(19, char.hairStyle === 'hijab_syari' ? 24 : 17);
      ctx.quadraticCurveTo(0, 26, -19, char.hairStyle === 'hijab_syari' ? 24 : 17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (char.hairStyle === 'long_wavy') {
      drawRoundedRect(ctx, -18, -16, 36, 36, 14);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (char.hairStyle === 'low_bun') {
        ctx.beginPath();
        ctx.arc(0, 10, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  } else {
    // VECTOR CARTOON FACE MODE
    // Back hair / Hijab base
    if (char.hairStyle === 'hijab_draped' || char.hairStyle === 'hijab_syari') {
      ctx.fillStyle = char.hairColor;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      if (char.hairStyle === 'hijab_syari') {
        ctx.moveTo(-19, -2);
        ctx.arc(0, -2, 19.5, Math.PI, 0);
        ctx.lineTo(20, 24);
        ctx.quadraticCurveTo(0, 30, -20, 24);
      } else {
        ctx.moveTo(-19, -2);
        ctx.arc(0, -2, 19.5, Math.PI, 0);
        ctx.lineTo(17, 17);
        ctx.quadraticCurveTo(0, 22, -17, 17);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (char.hairStyle === 'long_wavy') {
      ctx.fillStyle = char.hairColor;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.3;
      drawRoundedRect(ctx, -19, -15, 38, 34, 14);
      ctx.fill();
      ctx.stroke();
    } else if (char.hairStyle === 'low_bun') {
      ctx.fillStyle = char.hairColor;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(-16, 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Ears
    if (char.hairStyle !== 'hijab_draped' && char.hairStyle !== 'hijab_syari') {
      ctx.fillStyle = char.skinTone;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-16.5, 2, 3.8, 0, Math.PI * 2);
      ctx.arc(16.5, 2, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Face circle
    ctx.fillStyle = char.skinTone;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 1, 16.5, 17.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rosy cheeks
    if (char.blush) {
      ctx.fillStyle = 'rgba(232, 108, 102, 0.36)';
      ctx.beginPath();
      ctx.ellipse(isFront ? -9 : -7, 5.5, 3.8, 2.2, 0, 0, Math.PI * 2);
      ctx.ellipse(isFront ? 9 : 10.5, 5.5, 3.8, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes (centered in front RPG view, shifted slightly in side view)
    const eyeY = 0;
    const lx = isFront ? -5.8 : -3.5;
    const rx = isFront ? 5.8 : 8.5;

    if (blink) {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(lx - 2.5, eyeY);
      ctx.lineTo(lx + 2.5, eyeY);
      ctx.moveTo(rx - 2.5, eyeY);
      ctx.lineTo(rx + 2.5, eyeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = char.eyeColor || '#231F20';
      ctx.beginPath();
      ctx.ellipse(lx, eyeY, 2.4, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(rx, eyeY, 2.4, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cute catchlight shine
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(lx - 0.7, eyeY - 1.1, 0.95, 0, Math.PI * 2);
      ctx.arc(rx - 0.7, eyeY - 1.1, 0.95, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows
    ctx.strokeStyle = char.hairStyle.startsWith('hijab') ? '#2B2320' : char.hairColor;
    ctx.lineWidth = 1.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lx - 3, eyeY - 5.5);
    ctx.quadraticCurveTo(lx, eyeY - 6.8, lx + 3, eyeY - 5.5);
    ctx.moveTo(rx - 3, eyeY - 5.5);
    ctx.quadraticCurveTo(rx, eyeY - 6.8, rx + 3, eyeY - 5.5);
    ctx.stroke();

    // Cute Nose
    ctx.strokeStyle = 'rgba(43, 35, 32, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(isFront ? 0 : 3.2, 3.5, 1.4, 0, Math.PI * 0.8);
    ctx.stroke();

    // Smile
    ctx.strokeStyle = '#7C2D2D';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(isFront ? 0 : 2.5, 6.2, 4.2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Facial Hair (Groom)
    if (char.facialHair !== 'none') {
      ctx.fillStyle = char.hairColor;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.2;
      if (char.facialHair === 'mustache' || char.facialHair === 'full_beard') {
        ctx.beginPath();
        ctx.ellipse(2.5, 6.2, 5.2, 1.8, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      if (char.facialHair === 'goatee') {
        ctx.beginPath();
        ctx.arc(2.5, 13.5, 3.8, 0, Math.PI);
        ctx.fill();
      }
      if (char.facialHair === 'full_beard') {
        ctx.beginPath();
        ctx.arc(0, 4, 16, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.lineTo(-10, 13);
        ctx.quadraticCurveTo(0, 18.5, 12, 12);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Glasses
    if (char.glasses !== 'none') {
      ctx.strokeStyle = '#2B2320';
      ctx.lineWidth = 1.8;
      if (char.glasses === 'round') {
        ctx.beginPath();
        ctx.arc(lx, eyeY, 4.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rx, eyeY, 4.6, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        drawRoundedRect(ctx, lx - 4.8, eyeY - 3.8, 9.6, 7.6, 2);
        ctx.stroke();
        drawRoundedRect(ctx, rx - 4.8, eyeY - 3.8, 9.6, 7.6, 2);
        ctx.stroke();
      }
      // Bridge
      ctx.beginPath();
      ctx.moveTo(lx + 4.5, eyeY - 0.5);
      ctx.lineTo(rx - 4.5, eyeY - 0.5);
      ctx.stroke();
    }

    // Front Hair / Hijab Trim
    ctx.fillStyle = char.hairColor;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    if (char.hairStyle === 'hijab_draped' || char.hairStyle === 'hijab_syari') {
      // Hijab inner cap + outer wrap frame
      ctx.beginPath();
      ctx.arc(0, -1, 17.8, Math.PI * 1.05, Math.PI * 1.95);
      ctx.quadraticCurveTo(10, -10, 0, -11);
      ctx.quadraticCurveTo(-10, -10, -17.5, -3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (char.hairStyle === 'short_parted') {
      ctx.beginPath();
      ctx.arc(0, -3, 17.5, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(10, -8, 2, -13);
      ctx.quadraticCurveTo(-6, -7, -17.5, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (char.hairStyle === 'undercut' || char.hairStyle === 'pompadour') {
      ctx.beginPath();
      ctx.moveTo(-16, -5);
      ctx.quadraticCurveTo(-10, -24, 6, -21);
      ctx.quadraticCurveTo(18, -19, 16, -6);
      ctx.quadraticCurveTo(4, -13, -16, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (char.hairStyle === 'curly') {
      for (let a = -14; a <= 14; a += 7) {
        ctx.beginPath();
        ctx.arc(a, -15 + Math.abs(a) * 0.25, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (char.hairStyle === 'buzz') {
      ctx.beginPath();
      ctx.arc(0, -3, 17, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (char.hairStyle === 'shoulder_bob' || char.hairStyle === 'long_wavy' || char.hairStyle === 'low_bun') {
      // Soft side-swept bangs
      ctx.beginPath();
      ctx.arc(0, -3, 17.5, Math.PI, Math.PI * 2);
      ctx.quadraticCurveTo(8, -7, 0, -11);
      ctx.quadraticCurveTo(-10, -6, -17.5, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // --- ACCESSORIES ON HEAD ---
  if (char.accessory === 'blangkon') {
    // Javanese Batik Blangkon
    ctx.fillStyle = '#5C4332';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(0, -5, 18, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(6, -12, 0, -14);
    ctx.quadraticCurveTo(-6, -12, -18, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Subtle batik gold/cream pattern dots
    ctx.fillStyle = '#E5D3B3';
    [-9, -3, 3, 9].forEach((bx) => {
      ctx.beginPath();
      ctx.arc(bx, -13 + Math.abs(bx) * 0.25, 1.3, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (char.accessory === 'peci') {
    ctx.fillStyle = '#1E1B18';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, -14, -24, 28, 11, 4);
    ctx.fill();
    ctx.stroke();
  } else if (char.accessory === 'cunduk_mentul') {
    // Twin golden Javanese Cunduk Mentul hair pins
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, -18);
    ctx.lineTo(-7, -30);
    ctx.moveTo(4, -18);
    ctx.lineTo(7, -30);
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(-7, -31, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(7, -31, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (char.accessory === 'tiara') {
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-9, -18);
    ctx.lineTo(-6, -25);
    ctx.lineTo(0, -21);
    ctx.lineTo(4, -27);
    ctx.lineTo(9, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (char.accessory === 'flower_crown') {
    const colors = ['#F43F5E', '#FBBF24', '#FB7185', '#FFFFFF'];
    [-10, -3, 4, 11].forEach((fx, i) => {
      ctx.fillStyle = colors[i % colors.length];
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(fx, -18 + Math.abs(fx) * 0.15, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  ctx.restore(); // end head
  ctx.restore(); // end character
}
