import React, { useEffect, useRef } from 'react';
import { CameraViewMode, ObjectType, OpticsCalculation, OpticsState } from '../types';

interface FirstPersonLensCanvasProps {
  state: OpticsState;
  calc: OpticsCalculation;
}

export const FirstPersonLensCanvas: React.FC<FirstPersonLensCanvasProps> = ({
  state,
  calc,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      timeRef.current += 0.03;
      const t = timeRef.current;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Skip render if canvas is zero-sized or hidden (e.g. mobile tab toggle or before layout)
      if (w <= 10 || h <= 10) {
        if (isRunning) {
          animFrameId.current = requestAnimationFrame(render);
        }
        return;
      }

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Dark studio background
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);

      // 2. Optical laboratory bench rails & environment
      drawStudioBackground(ctx, w, h, t);

      // Direct first-person observer view (looking through lens or into mirror)
      drawFirstPersonOpticView(ctx, w, h, state, calc, t);

      ctx.restore();

      if (isRunning) {
        animFrameId.current = requestAnimationFrame(render);
      }
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameId.current);
    };
  }, [state, calc]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};

// --- Studio Environment Background ---
function drawStudioBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number
) {
  // Radial vignette
  const bgGrad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    40,
    w / 2,
    h / 2,
    Math.max(80, Math.max(w, h) * 0.7)
  );
  bgGrad.addColorStop(0, '#131926');
  bgGrad.addColorStop(0.6, '#0b0f19');
  bgGrad.addColorStop(1, '#05070c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Optical bench rails at bottom
  const railY = h * 0.82;
  const benchGrad = ctx.createLinearGradient(0, railY, 0, h);
  benchGrad.addColorStop(0, '#1e293b');
  benchGrad.addColorStop(0.2, '#0f172a');
  benchGrad.addColorStop(1, '#020617');
  ctx.fillStyle = benchGrad;
  ctx.fillRect(0, railY, w, h - railY);

  // Metallic rail lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, railY + 8);
  ctx.lineTo(w, railY + 8);
  ctx.moveTo(0, railY + 22);
  ctx.lineTo(w, railY + 22);
  ctx.stroke();

  // Fine millimeter bench scale ticks
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 20; x < w; x += 15) {
    const isMajor = (x - 20) % 75 === 0;
    const tickH = isMajor ? 8 : 4;
    ctx.moveTo(x, railY + 8);
    ctx.lineTo(x, railY + 8 + tickH);
  }
  ctx.stroke();

  // Grid pattern on distant studio wall
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
  ctx.lineWidth = 0.75;
  const gridSize = 40;
  ctx.beginPath();
  for (let x = 0; x < w; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, railY);
  }
  for (let y = 0; y < railY; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

// --- Main View 1: First-Person Observer View ---
function drawFirstPersonOpticView(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: OpticsState,
  calc: OpticsCalculation,
  t: number
) {
  const centerX = w / 2;
  const centerY = h / 2 - 15;
  const radius = Math.max(10, Math.min(w, h) * 0.36);
  const isMirror = calc.isMirror;

  // 1. Draw Optical Mount Hardware & Stand
  drawMountHardware(ctx, centerX, centerY, radius, h);

  // 2. Draw Object Image Inside Optic Aperture (Clipped to circular aperture)
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, Math.max(1, radius - 2), 0, Math.PI * 2);
  ctx.clip();

  // Background tint / material shading of the optic
  drawOpticMaterialInterior(ctx, centerX, centerY, radius, state.opticType);

  // Render optics object inside with physics magnification, inversion & blur
  ctx.save();
  ctx.translate(centerX, centerY);

  // Scale based on absolute magnification
  let scale = calc.absMagnification;
  if (!isFinite(scale) || isNaN(scale) || scale <= 0) scale = 6.0; // clamp near focal plane
  scale = Math.min(Math.max(0.05, scale), 10.0);
  const baseObjectSize = Math.max(10, radius * 0.55);

  // Apply Gaussian blur if eye is placed closer than real image or collimated
  if (calc.eyeDefocusBlurPx > 0.5) {
    ctx.filter = `blur(${calc.eyeDefocusBlurPx.toFixed(1)}px)`;
  }

  // Handle optical inversion (180 degree rotation)
  if (calc.isInverted) {
    ctx.rotate(Math.PI);
  }

  // Draw selected test object
  drawTestObject(ctx, state.objectType, Math.max(5, baseObjectSize * scale), t, false);

  ctx.restore(); // restore transform & filter

  // Visual effects tailored to optic type
  if (!isMirror) {
    // Glass chromatic dispersion fringe at edge of lens
    drawChromaticAberrationRing(ctx, centerX, centerY, radius);
  } else {
    // Subtle mirror curvature radial shimmer
    drawMirrorCurvatureShimmer(ctx, centerX, centerY, radius, state.opticType);
  }

  ctx.restore(); // restore clipping

  // 3. Draw Bezel, Knurled Rim, Engraving
  drawOpticBezel(ctx, centerX, centerY, radius, state, calc);

  // 4. Specular Surface Reflection
  if (!isMirror) {
    drawGlassReflection(ctx, centerX, centerY, radius, t);
  } else {
    drawMirrorReflection(ctx, centerX, centerY, radius, state.opticType, t);
  }
}

// --- Optic Interior Material Shading ---
function drawOpticMaterialInterior(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  opticType: OpticsState['opticType']
) {
  const safeRadius = Math.max(5, radius);

  if (opticType === 'convex_lens') {
    // Transparent glass tint with slight cyan-teal depth
    const glassTint = ctx.createRadialGradient(
      cx - safeRadius * 0.2,
      cy - safeRadius * 0.2,
      10,
      cx,
      cy,
      safeRadius
    );
    glassTint.addColorStop(0, 'rgba(14, 165, 233, 0.08)');
    glassTint.addColorStop(0.7, 'rgba(6, 78, 59, 0.04)');
    glassTint.addColorStop(1, 'rgba(15, 23, 42, 0.35)');
    ctx.fillStyle = glassTint;
    ctx.fillRect(cx - safeRadius, cy - safeRadius, safeRadius * 2, safeRadius * 2);
  } else if (opticType === 'concave_lens') {
    // Diverging concave lens: Thicker edges, thinner center (slight ring gradient)
    const glassTint = ctx.createRadialGradient(
      cx,
      cy,
      safeRadius * 0.2,
      cx,
      cy,
      safeRadius
    );
    glassTint.addColorStop(0, 'rgba(99, 102, 241, 0.05)');
    glassTint.addColorStop(0.7, 'rgba(99, 102, 241, 0.12)');
    glassTint.addColorStop(1, 'rgba(30, 27, 75, 0.45)');
    ctx.fillStyle = glassTint;
    ctx.fillRect(cx - safeRadius, cy - safeRadius, safeRadius * 2, safeRadius * 2);
  } else if (opticType === 'concave_mirror') {
    // Silver metallic concave mirror dish with deep center
    const mirrorGrad = ctx.createRadialGradient(
      cx,
      cy,
      safeRadius * 0.1,
      cx,
      cy,
      safeRadius
    );
    mirrorGrad.addColorStop(0, '#0c1a1a');
    mirrorGrad.addColorStop(0.5, '#09151c');
    mirrorGrad.addColorStop(0.85, '#070f17');
    mirrorGrad.addColorStop(1, '#02060a');
    ctx.fillStyle = mirrorGrad;
    ctx.fillRect(cx - safeRadius, cy - safeRadius, safeRadius * 2, safeRadius * 2);

    // Silver metallic brushed reflection rim
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.12)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, safeRadius - 4), 0, Math.PI * 2);
    ctx.stroke();
  } else if (opticType === 'convex_mirror') {
    // Bulging wide-angle convex dome mirror
    const mirrorGrad = ctx.createRadialGradient(
      cx - safeRadius * 0.3,
      cy - safeRadius * 0.3,
      10,
      cx,
      cy,
      Math.max(10, safeRadius)
    );
    mirrorGrad.addColorStop(0, '#1a1d24');
    mirrorGrad.addColorStop(0.4, '#10141e');
    mirrorGrad.addColorStop(0.8, '#090d16');
    mirrorGrad.addColorStop(1, '#03050a');
    ctx.fillStyle = mirrorGrad;
    ctx.fillRect(cx - safeRadius, cy - safeRadius, safeRadius * 2, safeRadius * 2);

    // Dome contour concentric rings
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, safeRadius * 0.7), 0, Math.PI * 2);
    ctx.arc(cx, cy, Math.max(1, safeRadius * 0.9), 0, Math.PI * 2);
    ctx.stroke();
  }
}

// --- Test Objects Drawing Logic ---
function drawTestObject(
  ctx: CanvasRenderingContext2D,
  type: ObjectType,
  size: number,
  t: number,
  isReflection: boolean
) {
  switch (type) {
    case 'chart':
      drawOpticsChart(ctx, size);
      break;
    case 'candle':
      drawCandle(ctx, size, t);
      break;
    case 'chess':
      drawChessPiece(ctx, size);
      break;
    case 'text':
      drawTextTarget(ctx, size);
      break;
  }
}

// 1. Optics Chart
function drawOpticsChart(ctx: CanvasRenderingContext2D, size: number) {
  const r = Math.max(2, Math.abs(size) * 0.5);

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Concentric rings
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.2;
  [0.25, 0.5, 0.75].forEach((frac) => {
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.5, r * frac), 0, Math.PI * 2);
    ctx.stroke();
  });

  // Crosshairs
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.stroke();

  // Asymmetric orientation arrows
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(r * 0.15, -r * 0.5);
  ctx.lineTo(-r * 0.15, -r * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(9, Math.round(r * 0.18))}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OPTICS', 0, -r * 0.25);

  ctx.fillStyle = '#38bdf8';
  ctx.font = `600 ${Math.max(8, Math.round(r * 0.14))}px ui-monospace, monospace`;
  ctx.fillText('TARGET', 0, r * 0.28);

  ctx.fillStyle = '#10b981';
  ctx.font = `bold ${Math.max(8, Math.round(r * 0.15))}px ui-monospace, monospace`;
  ctx.fillText('TOP ▲', 0, -r * 0.65);
}

// 2. Realistic Candle & Animated Flame
function drawCandle(ctx: CanvasRenderingContext2D, size: number, t: number) {
  const safeSize = Math.max(10, Math.abs(size));
  const w = Math.max(2, safeSize * 0.22);
  const h = Math.max(4, safeSize * 0.65);
  const baseY = safeSize * 0.2;

  // Wax Cylinder
  const waxGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  waxGrad.addColorStop(0, '#e2e8f0');
  waxGrad.addColorStop(0.35, '#ffffff');
  waxGrad.addColorStop(0.7, '#cbd5e1');
  waxGrad.addColorStop(1, '#94a3b8');

  ctx.fillStyle = waxGrad;
  ctx.beginPath();
  ctx.roundRect(-w / 2, baseY - h, w, h, [2, 2, 6, 6]);
  ctx.fill();

  // Wick
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, baseY - h);
  ctx.quadraticCurveTo(2, baseY - h - 8, 1, baseY - h - 14);
  ctx.stroke();

  // Animated flickering flame
  const flicker = Math.sin(t * 8) * 2 + Math.cos(t * 13) * 1.5;
  const flameTipX = flicker * 0.8;
  const flameTipY = baseY - h - 42 + Math.sin(t * 11) * 2;
  const flameBaseY = baseY - h - 10;

  // Outer yellow flame
  ctx.save();
  const flameGrad = ctx.createRadialGradient(
    0,
    flameBaseY - 12,
    2,
    0,
    flameBaseY - 15,
    28
  );
  flameGrad.addColorStop(0, '#ffffff');
  flameGrad.addColorStop(0.2, '#fef08a');
  flameGrad.addColorStop(0.55, '#f59e0b');
  flameGrad.addColorStop(0.85, '#ea580c');
  flameGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-w * 0.45, flameBaseY);
  ctx.bezierCurveTo(-w * 0.6, flameBaseY - 18, -w * 0.2 + flicker, flameTipY + 12, flameTipX, flameTipY);
  ctx.bezierCurveTo(w * 0.2 + flicker, flameTipY + 12, w * 0.6, flameBaseY - 18, w * 0.45, flameBaseY);
  ctx.closePath();
  ctx.fill();

  // Inner bright blue core
  ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
  ctx.beginPath();
  ctx.ellipse(0, flameBaseY - 2, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 3. Chess Piece (Knight)
function drawChessPiece(ctx: CanvasRenderingContext2D, size: number) {
  const s = Math.max(10, Math.abs(size) * 0.48);
  const w = s * 0.7;
  const h = s * 1.1;

  ctx.save();
  const woodGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  woodGrad.addColorStop(0, '#fde68a');
  woodGrad.addColorStop(0.4, '#d97706');
  woodGrad.addColorStop(0.85, '#92400e');
  woodGrad.addColorStop(1, '#451a03');

  ctx.fillStyle = woodGrad;
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 2;

  // Base
  ctx.beginPath();
  ctx.roundRect(-w * 0.45, h * 0.35, w * 0.9, h * 0.12, 4);
  ctx.fill();
  ctx.stroke();

  // Knight Head Silhouette
  ctx.beginPath();
  ctx.moveTo(-w * 0.35, h * 0.35);
  ctx.bezierCurveTo(-w * 0.45, h * 0.15, -w * 0.38, -h * 0.2, -w * 0.2, -h * 0.38);
  ctx.lineTo(-w * 0.12, -h * 0.48);
  ctx.lineTo(0, -h * 0.4);
  ctx.lineTo(w * 0.08, -h * 0.48);
  ctx.lineTo(w * 0.15, -h * 0.38);
  ctx.bezierCurveTo(w * 0.25, -h * 0.32, w * 0.48, -h * 0.22, w * 0.45, -h * 0.08);
  ctx.lineTo(w * 0.28, -h * 0.02);
  ctx.bezierCurveTo(w * 0.32, h * 0.12, w * 0.2, h * 0.22, w * 0.3, h * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(w * 0.12, -h * 0.24, Math.max(1, Math.abs(h * 0.035)), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 4. Directional Typography & Arrow Target
function drawTextTarget(ctx: CanvasRenderingContext2D, size: number) {
  const r = Math.max(5, Math.abs(size) * 0.48);

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2, Math.min(12, Math.max(1, r * 0.2)));
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Upward Arrow in bright emerald
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(r * 0.5, -r * 0.35);
  ctx.lineTo(r * 0.2, -r * 0.35);
  ctx.lineTo(r * 0.2, r * 0.1);
  ctx.lineTo(-r * 0.2, r * 0.1);
  ctx.lineTo(-r * 0.2, -r * 0.35);
  ctx.lineTo(-r * 0.5, -r * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(11, Math.round(r * 0.24))}px ui-sans-serif, system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText('UPRIGHT', 0, r * 0.35);

  ctx.fillStyle = '#38bdf8';
  ctx.font = `600 ${Math.max(9, Math.round(r * 0.16))}px ui-monospace, SFMono-Regular, monospace`;
  ctx.fillText('ORIENTATION TEST', 0, r * 0.6);

  ctx.fillStyle = '#f59e0b';
  ctx.font = `bold ${Math.max(9, Math.round(r * 0.18))}px ui-sans-serif, system-ui`;
  ctx.fillText('F', -r * 0.7, -r * 0.6);
  ctx.fillText('180°', r * 0.65, -r * 0.6);
}

// --- Optic Hardware & Mounting Stand ---
function drawMountHardware(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  canvasH: number
) {
  const mountTopY = cy + radius;
  const standBottomY = canvasH * 0.82 + 10;
  const postW = 20;

  // Vertical optical rod
  const postGrad = ctx.createLinearGradient(cx - postW / 2, 0, cx + postW / 2, 0);
  postGrad.addColorStop(0, '#1e293b');
  postGrad.addColorStop(0.3, '#475569');
  postGrad.addColorStop(0.6, '#94a3b8');
  postGrad.addColorStop(0.85, '#334155');
  postGrad.addColorStop(1, '#0f172a');

  ctx.fillStyle = postGrad;
  const postH = Math.max(0, standBottomY - mountTopY);
  ctx.fillRect(cx - postW / 2, mountTopY + 12, postW, postH);

  // Bench clamp carriage
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx - 36, standBottomY - 14, 72, 28, 4);
  ctx.fill();
  ctx.stroke();

  // Brass thumbscrew knob on mount
  const knobGrad = ctx.createLinearGradient(cx + 26, 0, cx + 46, 0);
  knobGrad.addColorStop(0, '#854d0e');
  knobGrad.addColorStop(0.5, '#facc15');
  knobGrad.addColorStop(1, '#713f12');
  ctx.fillStyle = knobGrad;
  ctx.beginPath();
  ctx.roundRect(cx + 36, standBottomY - 8, 14, 16, 3);
  ctx.fill();
}

// --- Optic Bezel, Knurled Rim, Engraving ---
function drawOpticBezel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  state: OpticsState,
  calc: OpticsCalculation
) {
  const safeRadius = Math.max(5, radius);
  const rimThickness = 14;

  // Outer bezel ring gradient (anodized black aluminum or brushed steel)
  const bezelGrad = ctx.createLinearGradient(
    cx - safeRadius,
    cy - safeRadius,
    cx + safeRadius,
    cy + safeRadius
  );
  bezelGrad.addColorStop(0, '#475569');
  bezelGrad.addColorStop(0.3, '#1e293b');
  bezelGrad.addColorStop(0.7, '#0f172a');
  bezelGrad.addColorStop(1, '#334155');

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, safeRadius + rimThickness, 0, Math.PI * 2);
  ctx.arc(cx, cy, safeRadius, 0, Math.PI * 2, true);
  ctx.fillStyle = bezelGrad;
  ctx.fill();

  // Inner shiny metallic lip
  ctx.strokeStyle = calc.isMirror ? '#34d399' : '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, safeRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Outer bezel border
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, safeRadius + rimThickness, 0, Math.PI * 2);
  ctx.stroke();

  // Knurling notches around circumference
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  const notches = 48;
  for (let i = 0; i < notches; i++) {
    const angle = (i * Math.PI * 2) / notches;
    const r1 = safeRadius + 2;
    const r2 = safeRadius + rimThickness - 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }

  // Optical engraving text at top
  let engravingTitle = '';
  switch (state.opticType) {
    case 'convex_lens':
      engravingTitle = `CONVEX LENS • f = +${state.focalLength.toFixed(1)} cm`;
      break;
    case 'concave_lens':
      engravingTitle = `CONCAVE LENS • f = -${state.focalLength.toFixed(1)} cm`;
      break;
    case 'concave_mirror':
      engravingTitle = `CONCAVE MIRROR • f = +${state.focalLength.toFixed(1)} cm (R = ${(state.focalLength * 2).toFixed(0)}cm)`;
      break;
    case 'convex_mirror':
      engravingTitle = `CONVEX MIRROR • f = -${state.focalLength.toFixed(1)} cm (R = ${(state.focalLength * 2).toFixed(0)}cm)`;
      break;
  }

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(engravingTitle, cx, cy - safeRadius - 18);

  // Sub-engraving on lower bezel for security/convex mirror
  if (state.opticType === 'convex_mirror') {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 8.5px ui-monospace, monospace';
    ctx.fillText('OBJECTS IN MIRROR ARE CLOSER THAN THEY APPEAR', cx, cy + safeRadius + 26);
  }

  ctx.restore();
}

// --- Glass Curvature Reflection & Specular Arc ---
function drawGlassReflection(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  t: number
) {
  const safeRadius = Math.max(5, radius);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1, safeRadius - 2), 0, Math.PI * 2);
  ctx.clip();

  // Curving specular arc (studio softbox reflection)
  const specX = cx - safeRadius * 0.45;
  const specY = cy - safeRadius * 0.45;
  const specGrad = ctx.createLinearGradient(
    specX - 40,
    specY - 40,
    specX + 80,
    specY + 80
  );
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  specGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.25)');
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.ellipse(specX, specY, Math.max(1, safeRadius * 0.5), Math.max(1, safeRadius * 0.2), -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Secondary soft reflection
  const secX = cx + safeRadius * 0.4;
  const secY = cy + safeRadius * 0.4;
  const secGrad = ctx.createLinearGradient(secX, secY, secX + 30, secY + 30);
  secGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
  secGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = secGrad;
  ctx.beginPath();
  ctx.ellipse(secX, secY, Math.max(1, safeRadius * 0.35), Math.max(1, safeRadius * 0.12), -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// --- Mirror Specular Reflection Arc ---
function drawMirrorReflection(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  opticType: OpticsState['opticType'],
  t: number
) {
  const safeRadius = Math.max(5, radius);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1, safeRadius - 2), 0, Math.PI * 2);
  ctx.clip();

  // High metallic sheen for mirror
  const specX = cx - safeRadius * 0.4;
  const specY = cy - safeRadius * 0.4;
  const specGrad = ctx.createLinearGradient(
    specX - 50,
    specY - 50,
    specX + 100,
    specY + 100
  );
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  specGrad.addColorStop(0.3, 'rgba(203, 213, 225, 0.35)');
  specGrad.addColorStop(0.7, 'rgba(148, 163, 184, 0.1)');
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.ellipse(
    specX,
    specY,
    Math.max(1, safeRadius * 0.6),
    Math.max(1, safeRadius * (opticType === 'convex_mirror' ? 0.35 : 0.22)),
    -Math.PI / 4,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();
}

// --- Chromatic Aberration Fringe at Lens Edge ---
function drawChromaticAberrationRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
) {
  const safeRadius = Math.max(5, radius);
  const edgeGrad = ctx.createRadialGradient(
    cx,
    cy,
    safeRadius * 0.88,
    cx,
    cy,
    safeRadius
  );
  edgeGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
  edgeGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.08)');
  edgeGrad.addColorStop(0.9, 'rgba(239, 68, 68, 0.12)');
  edgeGrad.addColorStop(1, 'rgba(15, 23, 42, 0.7)');

  ctx.fillStyle = edgeGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, safeRadius, 0, Math.PI * 2);
  ctx.fill();
}

// --- Mirror Curvature Shimmer ---
function drawMirrorCurvatureShimmer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  opticType: OpticsState['opticType']
) {
  const safeRadius = Math.max(5, radius);
  const shimmerGrad = ctx.createRadialGradient(
    cx,
    cy,
    safeRadius * 0.82,
    cx,
    cy,
    safeRadius
  );
  shimmerGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shimmerGrad.addColorStop(
    1,
    opticType === 'concave_mirror'
      ? 'rgba(16, 185, 129, 0.18)'
      : 'rgba(245, 158, 11, 0.18)'
  );
  ctx.fillStyle = shimmerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, safeRadius, 0, Math.PI * 2);
  ctx.fill();
}
