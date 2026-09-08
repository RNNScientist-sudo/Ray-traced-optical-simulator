import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { DragTarget, OpticsCalculation, OpticsState } from '../types';

interface RayDiagramCanvasProps {
  state: OpticsState;
  calc: OpticsCalculation;
  onUpdateState: (partial: Partial<OpticsState>) => void;
  zoom?: number;
  onZoomChange?: (newZoom: number) => void;
}

export const RayDiagramCanvas: React.FC<RayDiagramCanvasProps> = ({
  state,
  calc,
  onUpdateState,
  zoom: externalZoom,
  onZoomChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Manual zoom control state (0.4x to 2.5x, default 1.0x = 100%)
  const [internalZoom, setInternalZoom] = useState<number>(1.0);
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.max(0.4, Math.min(2.5, +newZoom.toFixed(2)));
    if (onZoomChange) {
      onZoomChange(clamped);
    } else {
      setInternalZoom(clamped);
    }
  };

  // Viewport panning state (pan offset in pixels)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    initPanX: number;
    initPanY: number;
  }>({
    startX: 0,
    startY: 0,
    initPanX: 0,
    initPanY: 0,
  });

  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [hoverTarget, setHoverTarget] = useState<DragTarget>(null);

  const isMirror = calc.isMirror;

  // Fixed baseline physical scale: 48 cm across the active half-span of the bench.
  // CRITICAL: This scale does NOT depend on objectDistance, objectHeight, focalLength,
  // eyeDistance, or calc.v! It only scales with the user's manual Zoom slider.
  const getScale = (width: number) => {
    const basePxPerCm = (width * (isMirror ? 0.54 : 0.44)) / 48;
    return basePxPerCm * zoom;
  };

  // Reset view to 100% zoom and centered origin
  const handleResetView = () => {
    handleZoomChange(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Canvas mouse wheel zoom listener (non-passive to prevent page scroll)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      handleZoomChange(zoom * zoomFactor);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [zoom, onZoomChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Guard against unmeasured or zero-sized canvas
    if (w <= 10 || h <= 10) return;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Clear Canvas
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // 2. Coordinate System: Origin (ox, oy) is optical center / mirror vertex + pan offset
    const originX = (isMirror ? w * 0.58 : w * 0.44) + pan.x;
    const originY = h * 0.5 + pan.y;

    // Fixed physical scale (does not scale when parameters change, only scales with zoom slider)
    const pxPerCm = getScale(w);

    // Draw coordinate grid
    drawGrid(ctx, w, h, originX, originY);

    // Draw main optics bench, optic element, arrows, and rays
    drawOpticsBench(
      ctx,
      w,
      h,
      originX,
      originY,
      pxPerCm,
      state,
      calc,
      hoverTarget,
      dragTarget
    );

    ctx.restore();
  }, [state, calc, hoverTarget, dragTarget, isMirror, zoom, pan]);

  // Pointer event handlers for drag-and-drop interaction & panning
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const originX = (isMirror ? rect.width * 0.58 : rect.width * 0.44) + pan.x;
    const originY = rect.height * 0.5 + pan.y;
    const pxPerCm = getScale(rect.width);

    // Positions in pixels
    const objPxX = originX - state.objectDistance * pxPerCm;
    const objTipY = originY - state.objectHeight * pxPerCm;

    // Focus hit position
    const focusPxX =
      state.opticType === 'convex_mirror'
        ? originX + state.focalLength * pxPerCm
        : originX - state.focalLength * pxPerCm;

    // Observer eye position
    const eyePxX = isMirror
      ? originX - state.eyeDistance * pxPerCm
      : originX + state.eyeDistance * pxPerCm;

    const hitRadius = 24;
    const objTipRadius = 24;
    const isTipHit = Math.hypot(x - objPxX, y - objTipY) < objTipRadius;
    const isBodyHit =
      Math.hypot(x - objPxX, y - originY) < hitRadius ||
      (Math.abs(x - objPxX) < 18 && y <= Math.max(originY, objTipY) + 5 && y >= Math.min(originY, objTipY) - 5);

    if (isTipHit) {
      setDragTarget('object_tip');
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initPanX: state.objectHeight,
        initPanY: state.objectDistance,
      };
      canvas.setPointerCapture(e.pointerId);
    } else if (isBodyHit) {
      setDragTarget('object');
      canvas.setPointerCapture(e.pointerId);
    } else if (Math.hypot(x - focusPxX, y - originY) < hitRadius) {
      setDragTarget('focus');
      canvas.setPointerCapture(e.pointerId);
    } else if (Math.hypot(x - eyePxX, y - originY) < hitRadius * 1.5) {
      setDragTarget('eye');
      canvas.setPointerCapture(e.pointerId);
    } else {
      // Click on background -> start panning
      setDragTarget('pan');
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initPanX: pan.x,
        initPanY: pan.y,
      };
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const originX = (isMirror ? rect.width * 0.58 : rect.width * 0.44) + pan.x;
    const originY = rect.height * 0.5 + pan.y;
    const pxPerCm = getScale(rect.width);

    if (dragTarget) {
      if (dragTarget === 'pan') {
        const dx = e.clientX - panStartRef.current.startX;
        const dy = e.clientY - panStartRef.current.startY;
        setPan({
          x: panStartRef.current.initPanX + dx,
          y: panStartRef.current.initPanY + dy,
        });
        return;
      }

      const cmDist = (x - originX) / pxPerCm;

      if (dragTarget === 'object_tip') {
        // Dragging the arrow tip adjusts height directly from vertical offset
        const newH = Math.max(1.5, Math.min(22.0, (originY - y) / pxPerCm));
        const dxFromStart = Math.abs(e.clientX - panStartRef.current.startX);
        // If moved horizontally significantly, also adjust distance in 2D
        if (dxFromStart > 14) {
          const newU = Math.max(1, Math.min(80, -cmDist));
          onUpdateState({
            objectHeight: +newH.toFixed(1),
            objectDistance: +newU.toFixed(1),
          });
        } else {
          onUpdateState({ objectHeight: +newH.toFixed(1) });
        }
      } else if (dragTarget === 'object') {
        // Dragging arrow base/body moves along optical bench (u)
        const newU = Math.max(1, Math.min(80, -cmDist));
        onUpdateState({ objectDistance: +newU.toFixed(1) });
      } else if (dragTarget === 'focus') {
        if (state.opticType === 'convex_mirror') {
          const newF = Math.max(5, Math.min(40, cmDist));
          onUpdateState({ focalLength: +newF.toFixed(1) });
        } else {
          const newF = Math.max(5, Math.min(40, -cmDist));
          onUpdateState({ focalLength: +newF.toFixed(1) });
        }
      } else if (dragTarget === 'eye') {
        if (isMirror) {
          const newEye = Math.max(5, Math.min(80, -cmDist));
          onUpdateState({ eyeDistance: +newEye.toFixed(1) });
        } else {
          const newEye = Math.max(5, Math.min(80, cmDist));
          onUpdateState({ eyeDistance: +newEye.toFixed(1) });
        }
      }
      return;
    }

    // Hover detection
    const objPxX = originX - state.objectDistance * pxPerCm;
    const objTipY = originY - state.objectHeight * pxPerCm;
    const focusPxX =
      state.opticType === 'convex_mirror'
        ? originX + state.focalLength * pxPerCm
        : originX - state.focalLength * pxPerCm;
    const eyePxX = isMirror
      ? originX - state.eyeDistance * pxPerCm
      : originX + state.eyeDistance * pxPerCm;
    const hitRadius = 20;
    const objTipRadius = 22;

    if (Math.hypot(x - objPxX, y - objTipY) < objTipRadius) {
      setHoverTarget('object_tip');
    } else if (
      Math.hypot(x - objPxX, y - originY) < hitRadius ||
      (Math.abs(x - objPxX) < 16 && y <= Math.max(originY, objTipY) + 5 && y >= Math.min(originY, objTipY) - 5)
    ) {
      setHoverTarget('object');
    } else if (Math.hypot(x - focusPxX, y - originY) < hitRadius) {
      setHoverTarget('focus');
    } else if (Math.hypot(x - eyePxX, y - originY) < hitRadius * 1.5) {
      setHoverTarget('eye');
    } else {
      setHoverTarget(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragTarget) {
      setDragTarget(null);
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const getCursorStyle = () => {
    if (dragTarget === 'pan') return 'grabbing';
    if (dragTarget === 'object_tip') return 'ns-resize';
    if (dragTarget === 'object') return 'ew-resize';
    if (dragTarget) return 'grabbing';
    if (hoverTarget === 'object_tip') return 'ns-resize';
    if (hoverTarget === 'object') return 'ew-resize';
    if (hoverTarget === 'focus' || hoverTarget === 'eye') return 'ew-resize';
    if (hoverTarget) return 'grab';
    return 'default';
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: getCursorStyle(), touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleResetView}
      />

      {/* Floating Instructions / Legend Bar on top-left (unobstructed full width) */}
      <div className="absolute top-2.5 left-3 pointer-events-none flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-slate-950/80 backdrop-blur-sm px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-800/90 shadow-sm z-10">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span className="hidden sm:inline">
          Drag Object Arrow (Move &amp; Adjust Height ↕), Focus (Cyan), or Eye
        </span>
        <span className="sm:hidden">Drag Object (Move/Height ↕) or Focus</span>
      </div>

      {/* Zoom Control Slider on the bottom right corner so both legend and slider are completely visible */}
      <div
        id="diagram-zoom-controls"
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 sm:gap-2 bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-800 shadow-xl text-xs text-slate-300 select-none"
      >
        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">Zoom</span>
        <button
          type="button"
          id="zoom-out-btn"
          onClick={() => handleZoomChange(zoom - 0.1)}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Zoom Out (-10%)"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <input
          type="range"
          id="diagram-zoom-slider"
          min="0.4"
          max="2.5"
          step="0.05"
          value={zoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          className="w-16 sm:w-24 md:w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          aria-label="Ray Diagram Zoom Slider"
          title="Zoom Ray Diagram in or out"
        />
        <button
          type="button"
          id="zoom-in-btn"
          onClick={() => handleZoomChange(zoom + 0.1)}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Zoom In (+10%)"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-[11px] text-sky-400 font-semibold w-8 sm:w-10 text-right">
          {Math.round(zoom * 100)}%
        </span>
        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
          <button
            type="button"
            id="reset-zoom-btn"
            onClick={handleResetView}
            className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Reset Zoom to 100% and Center View"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};

// --- Background Blueprint Coordinate Grid ---
function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ox: number,
  oy: number
) {
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.18)';
  ctx.lineWidth = 1;
  const gridSize = 24;

  const startX = ((ox % gridSize) + gridSize) % gridSize;
  const startY = ((oy % gridSize) + gridSize) % gridSize;

  ctx.beginPath();
  for (let x = startX; x < w; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = startY; y < h; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

// --- Main Ray Diagram Physics Drawing ---
function drawOpticsBench(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ox: number,
  oy: number,
  scale: number,
  state: OpticsState,
  calc: OpticsCalculation,
  hover: DragTarget,
  dragging: DragTarget
) {
  const { focalLength: f, objectDistance: u, objectHeight: ho, eyeDistance: deye } = state;
  const isMirror = calc.isMirror;
  const opticHeightPx = Math.min(h * 0.75, Math.max(state.lensRadius * 2 * scale, 120));

  // 1. Principal Axis
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, oy);
  ctx.lineTo(w, oy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Principal Axis label
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 10px ui-monospace, monospace';
  ctx.fillText('PRINCIPAL AXIS', 16, oy - 8);

  // 2. Cardinal Points (Foci F, 2F, Center of Curvature C, Vertex V / Center O)
  drawCardinalPoints(ctx, ox, oy, f, scale, state.opticType);

  // 3. Central Optic Element Graphic
  drawOpticElementGraphic(ctx, ox, oy, opticHeightPx, state.opticType);

  // 4. Object Arrow (Always placed at -u on the left)
  const objX = ox - u * scale;
  const objTipY = oy - ho * scale;
  drawObjectArrow(
    ctx,
    objX,
    oy,
    objTipY,
    ho,
    u,
    hover === 'object' || dragging === 'object',
    hover === 'object_tip' || dragging === 'object_tip'
  );

  // 5. Image Arrow (Real or Virtual)
  if (!calc.isAtFocus && isFinite(calc.v)) {
    let imgX: number;
    if (isMirror) {
      // For mirror:
      // Real image (v > 0) is formed IN FRONT of mirror on the left (-v)
      // Virtual image (v < 0) is formed BEHIND mirror on the right (+|v|)
      imgX = calc.isReal ? ox - calc.v * scale : ox + Math.abs(calc.v) * scale;
    } else {
      // For lens:
      // Real image (v > 0) is formed to the RIGHT of lens (+v)
      // Virtual image (v < 0) is formed to the LEFT of lens (-|v|)
      imgX = calc.isReal ? ox + calc.v * scale : ox - Math.abs(calc.v) * scale;
    }

    const imgTipY = calc.isInverted
      ? oy + calc.imageHeight * scale
      : oy - calc.imageHeight * scale;

    drawImageArrow(ctx, imgX, oy, imgTipY, calc, calc.isVirtual);
  } else if (calc.isAtFocus) {
    drawCollimatedBeamAnnotation(ctx, ox, oy);
  }

  // 6. Principal Light Rays
  drawPrincipalRays(ctx, ox, oy, scale, state, calc, opticHeightPx, w);

  // 7. Observer Eye (Clean rendering without sightlines)
  const eyeX = isMirror ? ox - deye * scale : ox + deye * scale;
  drawObserverEye(
    ctx,
    eyeX,
    oy,
    scale,
    state,
    calc,
    hover === 'eye' || dragging === 'eye'
  );

  // 8. Distance Brackets / Dimension Leaders
  drawDistanceDimensions(ctx, ox, oy, scale, state, calc);
}

// --- Draw Cardinal Reference Points (F, 2F, C, V, O) ---
function drawCardinalPoints(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  f: number,
  scale: number,
  opticType: OpticsState['opticType']
) {
  let points: { x: number; label: string; sub: string }[] = [];

  switch (opticType) {
    case 'convex_lens':
    case 'concave_lens': {
      points = [
        { x: ox - 2 * f * scale, label: '2F₁', sub: `-${(2 * f).toFixed(0)}cm` },
        { x: ox - f * scale, label: 'F₁', sub: `-${f.toFixed(0)}cm` },
        { x: ox + f * scale, label: 'F₂', sub: `+${f.toFixed(0)}cm` },
        { x: ox + 2 * f * scale, label: '2F₂', sub: `+${(2 * f).toFixed(0)}cm` },
      ];
      break;
    }
    case 'concave_mirror': {
      // Real focus F and center of curvature C are in front of the mirror (left side)
      points = [
        { x: ox - 2 * f * scale, label: 'C (2F)', sub: `-${(2 * f).toFixed(0)}cm` },
        { x: ox - f * scale, label: 'F', sub: `-${f.toFixed(0)}cm` },
      ];
      break;
    }
    case 'convex_mirror': {
      // Virtual focus F and center of curvature C are behind the mirror (right side)
      points = [
        { x: ox + f * scale, label: 'F (Virtual)', sub: `+${f.toFixed(0)}cm` },
        { x: ox + 2 * f * scale, label: 'C (2F)', sub: `+${(2 * f).toFixed(0)}cm` },
      ];
      break;
    }
  }

  points.forEach((p) => {
    // Tick mark
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, oy - 6);
    ctx.lineTo(p.x, oy + 6);
    ctx.stroke();

    // Circle point
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(p.x, oy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Text label
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.label, p.x, oy + 18);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 9px ui-sans-serif, system-ui';
    ctx.fillText(p.sub, p.x, oy + 29);
  });
}

// --- Dynamic Central Optic Element Graphic ---
function drawOpticElementGraphic(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  opticH: number,
  opticType: OpticsState['opticType']
) {
  const halfH = opticH / 2;
  ctx.save();

  if (opticType === 'convex_lens') {
    // Biconvex Lens Graphic
    const lensW = 16;
    const lensGrad = ctx.createLinearGradient(ox - lensW, 0, ox + lensW, 0);
    lensGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
    lensGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.45)');
    lensGrad.addColorStop(1, 'rgba(56, 189, 248, 0.15)');

    ctx.fillStyle = lensGrad;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(ox, oy - halfH);
    ctx.quadraticCurveTo(ox + lensW, oy, ox, oy + halfH);
    ctx.quadraticCurveTo(ox - lensW, oy, ox, oy - halfH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central dashed plane & Outward Arrowheads
    drawOpticCenterLine(ctx, ox, oy, halfH);
    ctx.fillStyle = '#38bdf8';
    drawArrowHead(ctx, ox, oy - halfH - 8, -Math.PI / 2, 7);
    drawArrowHead(ctx, ox, oy + halfH + 8, Math.PI / 2, 7);

    // Label O
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('O', ox - 12, oy - 8);
  } else if (opticType === 'concave_lens') {
    // Biconcave (Diverging) Lens Graphic
    const endW = 14;
    const waistW = 4;
    const lensGrad = ctx.createLinearGradient(ox - endW, 0, ox + endW, 0);
    lensGrad.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
    lensGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
    lensGrad.addColorStop(1, 'rgba(99, 102, 241, 0.45)');

    ctx.fillStyle = lensGrad;
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Top flat edge
    ctx.moveTo(ox - endW, oy - halfH);
    ctx.lineTo(ox + endW, oy - halfH);
    // Right concave edge
    ctx.quadraticCurveTo(ox + waistW, oy, ox + endW, oy + halfH);
    // Bottom flat edge
    ctx.lineTo(ox - endW, oy + halfH);
    // Left concave edge
    ctx.quadraticCurveTo(ox - waistW, oy, ox - endW, oy - halfH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawOpticCenterLine(ctx, ox, oy, halfH);

    // Diverging lens symbol: Inward pointing arrows
    ctx.fillStyle = '#818cf8';
    drawArrowHead(ctx, ox, oy - halfH, Math.PI / 2, 7);
    drawArrowHead(ctx, ox, oy + halfH, -Math.PI / 2, 7);

    // Label O
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('O', ox - 12, oy - 8);
  } else if (opticType === 'concave_mirror') {
    // Concave Mirror: Reflective inner surface on the left curving towards vertex at (ox, oy)
    // Curvature: Edges at (ox - sagitta, oy ± halfH), vertex at (ox, oy)
    const sagitta = 14;

    // 1. Draw silvered backing hatch marks on right/back side
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.2;
    const hatchCount = 20;
    for (let i = 0; i <= hatchCount; i++) {
      const frac = i / hatchCount;
      const y = oy - halfH + frac * opticH;
      const t = (y - oy) / halfH;
      const arcX = ox - sagitta * (1 - t * t);
      ctx.beginPath();
      ctx.moveTo(arcX, y);
      ctx.lineTo(arcX + 8, y + 6);
      ctx.stroke();
    }

    // 2. Mirror reflective arc
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(ox - sagitta, oy - halfH);
    ctx.quadraticCurveTo(ox, oy, ox - sagitta, oy + halfH);
    ctx.stroke();

    // Specular reflective highlights
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ox - sagitta + 1, oy - halfH * 0.7);
    ctx.quadraticCurveTo(ox - 1, oy - halfH * 0.2, ox - 2, oy);
    ctx.stroke();

    // Vertex mark V
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(ox, oy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#34d399';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('V (Vertex)', ox + 8, oy - 6);
  } else if (opticType === 'convex_mirror') {
    // Convex Mirror: Dome bulging towards left, vertex at (ox, oy)
    // Edges curve back towards right at (ox + sagitta, oy ± halfH)
    const sagitta = 14;

    // 1. Silvered backing hatch marks inside the back (right side)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.2;
    const hatchCount = 20;
    for (let i = 0; i <= hatchCount; i++) {
      const frac = i / hatchCount;
      const y = oy - halfH + frac * opticH;
      const t = (y - oy) / halfH;
      const arcX = ox + sagitta * (t * t);
      ctx.beginPath();
      ctx.moveTo(arcX, y);
      ctx.lineTo(arcX + 8, y + 6);
      ctx.stroke();
    }

    // 2. Convex reflective arc
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(ox + sagitta, oy - halfH);
    ctx.quadraticCurveTo(ox, oy, ox + sagitta, oy + halfH);
    ctx.stroke();

    // Specular reflective chrome highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ox + sagitta * 0.6, oy - halfH * 0.7);
    ctx.quadraticCurveTo(ox + 1, oy - halfH * 0.25, ox + 1, oy);
    ctx.stroke();

    // Vertex mark V
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(ox, oy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('V (Vertex)', ox - 8, oy - 6);
  }

  ctx.restore();
}

function drawOpticCenterLine(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  halfH: number
) {
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(ox, oy - halfH - 12);
  ctx.lineTo(ox, oy + halfH + 12);
  ctx.stroke();
  ctx.setLineDash([]);
}

// --- Object Arrow ---
function drawObjectArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  tipY: number,
  ho: number,
  u: number,
  isBodyActive: boolean,
  isTipActive: boolean
) {
  ctx.save();
  const isActive = isBodyActive || isTipActive;

  // Shaft
  ctx.strokeStyle = isActive ? '#fbbf24' : '#f59e0b';
  ctx.lineWidth = isBodyActive ? 3.5 : 2.5;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, tipY);
  ctx.stroke();

  // Base grip indicator on principal axis
  ctx.fillStyle = isBodyActive ? '#fef08a' : '#d97706';
  ctx.beginPath();
  ctx.arc(x, baseY, isBodyActive ? 5 : 4, 0, Math.PI * 2);
  ctx.fill();

  // Arrow Head
  ctx.fillStyle = isTipActive ? '#fef08a' : isActive ? '#fbbf24' : '#f59e0b';
  drawArrowHead(ctx, x, tipY, -Math.PI / 2, isTipActive ? 11 : 9);

  // Height resize handle circle at the arrow tip
  ctx.save();
  ctx.fillStyle = isTipActive ? '#fef08a' : '#f59e0b';
  ctx.strokeStyle = '#0a0f1a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, tipY, isTipActive ? 6.5 : 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Drag handle glow when active/hovered
  if (isTipActive) {
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, tipY, 13, 0, Math.PI * 2);
    ctx.stroke();
  } else if (isBodyActive) {
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, baseY, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Object label badge
  const labelObj = 'OBJECT';
  const subObj = isTipActive
    ? `h = ${ho.toFixed(1)} cm (Drag ↕)`
    : `u = ${u.toFixed(1)} • h = ${ho.toFixed(1)} cm`;
  ctx.font = '600 11px ui-monospace, monospace';
  const w1 = ctx.measureText(labelObj).width;
  ctx.font = '400 10px ui-sans-serif, system-ui';
  const w2 = ctx.measureText(subObj).width;
  const badgeW = Math.max(w1, w2) + 16;
  const badgeH = 28;
  const badgeY = tipY - 32;

  // Semi-transparent dark background badge
  ctx.fillStyle = 'rgba(10, 15, 26, 0.9)';
  ctx.strokeStyle = isTipActive ? '#fbbf24' : 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - badgeW / 2, badgeY, badgeW, badgeH, 5);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 4;
  ctx.textAlign = 'center';
  ctx.fillStyle = isTipActive ? '#fef08a' : '#fbbf24';
  ctx.font = '600 11px ui-monospace, monospace';
  ctx.fillText(labelObj, x, tipY - 19);

  ctx.fillStyle = isTipActive ? '#fbbf24' : '#fde68a';
  ctx.font = '400 10px ui-sans-serif, system-ui';
  ctx.fillText(subObj, x, tipY - 7);

  ctx.restore();
}

// --- Image Arrow ---
function drawImageArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  tipY: number,
  calc: OpticsCalculation,
  isVirtual: boolean
) {
  ctx.save();
  const color = isVirtual ? '#06b6d4' : '#ef4444';
  const label = isVirtual ? 'VIRTUAL IMAGE' : 'REAL IMAGE';

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;

  if (isVirtual) {
    ctx.setLineDash([5, 4]);
  }

  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, tipY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrow Head pointing in direction of tip
  const angle = calc.isInverted ? Math.PI / 2 : -Math.PI / 2;
  ctx.fillStyle = color;
  drawArrowHead(ctx, x, tipY, angle, 8);

  // Label text strings
  const mathStr = calc.isInverted
    ? `v = +${calc.v.toFixed(1)} cm • M = ${calc.magnification.toFixed(2)}×`
    : `v = ${calc.v.toFixed(1)} cm • M = +${calc.magnification.toFixed(2)}×`;
  const descStr = calc.isInverted
    ? `|v| = ${calc.absV.toFixed(1)} cm (${calc.isMirror ? 'In Front of Mirror' : 'Right of Lens'})`
    : `|v| = ${calc.absV.toFixed(1)} cm (${calc.isMirror ? 'Behind Mirror' : 'Left of Lens'})`;

  // Subtle semi-transparent dark background badge behind virtual/real image readouts
  ctx.font = '600 10px ui-monospace, monospace';
  const wMath = ctx.measureText(mathStr).width;
  ctx.font = '600 11px ui-monospace, monospace';
  const wLabel = ctx.measureText(label).width;
  ctx.font = '400 9px ui-sans-serif, system-ui';
  const wDesc = ctx.measureText(descStr).width;

  const badgeW = Math.max(wMath, wLabel, wDesc) + 18;
  const badgeH = 46;
  const badgeY = calc.isInverted ? tipY + 6 : tipY - 52;

  ctx.fillStyle = 'rgba(10, 15, 26, 0.88)';
  ctx.strokeStyle = isVirtual ? 'rgba(6, 182, 212, 0.45)' : 'rgba(239, 68, 68, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - badgeW / 2, badgeY, badgeW, badgeH, 6);
  ctx.fill();
  ctx.stroke();

  // Draw texts with subtle text-shadow for crisp legibility against overlapping dashed virtual rays
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 4;
  ctx.textAlign = 'center';

  if (calc.isInverted) {
    ctx.fillStyle = color;
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText(label, x, tipY + 19);

    ctx.font = '600 10px ui-monospace, monospace';
    ctx.fillText(mathStr, x, tipY + 32);

    ctx.fillStyle = isVirtual ? '#a5f3fc' : '#fca5a5';
    ctx.font = '400 9px ui-sans-serif, system-ui';
    ctx.fillText(descStr, x, tipY + 44);
  } else {
    ctx.fillStyle = color;
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText(label, x, tipY - 37);

    ctx.font = '600 10px ui-monospace, monospace';
    ctx.fillText(mathStr, x, tipY - 24);

    ctx.fillStyle = isVirtual ? '#a5f3fc' : '#fca5a5';
    ctx.font = '400 9px ui-sans-serif, system-ui';
    ctx.fillText(descStr, x, tipY - 12);
  }

  ctx.restore();
}

// --- Collimated Beam Annotation (Object at Focal Point u = f) ---
function drawCollimatedBeamAnnotation(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number
) {
  ctx.save();
  const bannerY = oy - 85;
  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 12px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('COLLIMATED PARALLEL BEAM • IMAGE AT INFINITY (v → ∞)', ox, bannerY);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 10px ui-sans-serif, system-ui';
  ctx.fillText('Object placed at Focal Point (u = f) • Emergent rays are parallel and never intersect', ox, bannerY + 16);
  ctx.restore();
}

// --- Principal Light Rays Tracing (4 Optical Element Modes) ---
function drawPrincipalRays(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  scale: number,
  state: OpticsState,
  calc: OpticsCalculation,
  opticH: number,
  w: number
) {
  const { focalLength: f, objectDistance: u, objectHeight: ho, opticType } = state;
  const objX = ox - u * scale;
  const objTipY = oy - ho * scale;

  ctx.save();

  if (opticType === 'convex_lens') {
    // -----------------------------------------------------------------
    // 1. CONVEX LENS (Converging Refractor)
    // -----------------------------------------------------------------
    const f1X = ox - f * scale;
    const f2X = ox + f * scale;
    const endRightX = ox + Math.max(state.eyeDistance * scale + 100, 480);

    // Ray 1: Parallel to principal axis -> Refracts through F2
    if (state.showRayParallel) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(objX, objTipY);
      ctx.lineTo(ox, objTipY);
      ctx.stroke();
      drawRayDirectionArrow(ctx, (objX + ox) / 2, objTipY, 0);

      const slope1 = (oy - objTipY) / (f * scale);
      const endX1 = endRightX;
      const endY1 = objTipY + slope1 * (endX1 - ox);

      ctx.beginPath();
      ctx.moveTo(ox, objTipY);
      ctx.lineTo(endX1, endY1);
      ctx.stroke();
      drawRayDirectionArrow(
        ctx,
        (ox + f2X) / 2,
        objTipY + slope1 * (f2X - ox) * 0.5,
        Math.atan(slope1)
      );

      // Virtual back-projection starts right at lens boundary (ox, objTipY)
      if (calc.isVirtual && state.showVirtualExtensions && isFinite(calc.v)) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        const virtImgX = ox - Math.abs(calc.v) * scale;
        const virtImgTipY = oy - calc.imageHeight * scale;
        ctx.beginPath();
        ctx.moveTo(ox, objTipY);
        ctx.lineTo(virtImgX, virtImgTipY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Ray 2: Central through optical center O (0, 0)
    if (state.showRayCentral) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;

      const slope2 = (oy - objTipY) / (ox - objX);
      const endX2 = endRightX;
      const endY2 = oy + slope2 * (endX2 - ox);

      ctx.beginPath();
      ctx.moveTo(objX, objTipY);
      ctx.lineTo(ox, oy);
      ctx.lineTo(endX2, endY2);
      ctx.stroke();

      drawRayDirectionArrow(ctx, (objX + ox) / 2, (objTipY + oy) / 2, Math.atan(slope2));
      drawRayDirectionArrow(ctx, (ox + endX2) * 0.5, (oy + endY2) * 0.5, Math.atan(slope2));

      // Virtual back-projection starts right at optical center (ox, oy)
      if (calc.isVirtual && state.showVirtualExtensions && isFinite(calc.v)) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        const virtImgX = ox - Math.abs(calc.v) * scale;
        const virtImgTipY = oy - calc.imageHeight * scale;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(virtImgX, virtImgTipY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Ray 3: Focal ray through F1
    if (state.showRayFocal && !calc.isAtFocus) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;

      if (calc.isReal) {
        const slope3 = (oy - objTipY) / (f1X - objX);
        const lensHitY = oy + slope3 * (ox - f1X);

        if (Math.abs(lensHitY - oy) < opticH) {
          ctx.beginPath();
          ctx.moveTo(objX, objTipY);
          ctx.lineTo(ox, lensHitY);
          ctx.stroke();
          drawRayDirectionArrow(ctx, (objX + ox) / 2, (objTipY + lensHitY) / 2, Math.atan(slope3));

          const endX3 = endRightX;
          ctx.beginPath();
          ctx.moveTo(ox, lensHitY);
          ctx.lineTo(endX3, lensHitY);
          ctx.stroke();
          drawRayDirectionArrow(ctx, (ox + endX3) / 2, lensHitY, 0);
        }
      } else if (calc.isVirtual && isFinite(calc.v)) {
        const slope3 = (objTipY - oy) / (objX - f1X);
        const lensHitY = oy + slope3 * (ox - f1X);

        if (Math.abs(lensHitY - oy) < opticH) {
          ctx.beginPath();
          ctx.moveTo(objX, objTipY);
          ctx.lineTo(ox, lensHitY);
          ctx.stroke();
          drawRayDirectionArrow(ctx, (objX + ox) / 2, (objTipY + lensHitY) / 2, Math.atan(slope3));

          const endX3 = endRightX;
          ctx.beginPath();
          ctx.moveTo(ox, lensHitY);
          ctx.lineTo(endX3, lensHitY);
          ctx.stroke();
          drawRayDirectionArrow(ctx, (ox + endX3) / 2, lensHitY, 0);

          if (state.showVirtualExtensions) {
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
            ctx.lineWidth = 1.4;
            ctx.setLineDash([4, 4]);
            const virtImgX = ox - Math.abs(calc.v) * scale;
            ctx.beginPath();
            ctx.moveTo(ox, lensHitY);
            ctx.lineTo(virtImgX, lensHitY);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }
  } else if (opticType === 'concave_lens') {
    // -----------------------------------------------------------------
    // 2. CONCAVE LENS (Diverging Refractor)
    // -----------------------------------------------------------------
    const f1X = ox - f * scale; // front focus (virtual focus)
    const f2X = ox + f * scale; // back focus
    const endRightX = ox + Math.max(state.eyeDistance * scale + 100, 480);

    // Ray 1: Parallel to axis -> Diverges along line from front focus F1
    if (state.showRayParallel) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;

      // Incident ray: object tip to lens
      ctx.beginPath();
      ctx.moveTo(objX, objTipY);
      ctx.lineTo(ox, objTipY);
      ctx.stroke();
      drawRayDirectionArrow(ctx, (objX + ox) / 2, objTipY, 0);

      // Refracted diverging ray (slope away from F1)
      const slope1 = (objTipY - oy) / (ox - f1X);
      const endX1 = endRightX;
      const endY1 = objTipY + slope1 * (endX1 - ox);

      ctx.beginPath();
      ctx.moveTo(ox, objTipY);
      ctx.lineTo(endX1, endY1);
      ctx.stroke();
      drawRayDirectionArrow(ctx, (ox + endX1) / 2, (objTipY + endY1) / 2, Math.atan(slope1));

      // Virtual back-projection starts right at lens boundary (ox, objTipY) to F1
      if (state.showVirtualExtensions) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(ox, objTipY);
        ctx.lineTo(f1X, oy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Ray 2: Central through optical center (0, 0)
    if (state.showRayCentral) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;

      const slope2 = (oy - objTipY) / (ox - objX);
      const endX2 = endRightX;
      const endY2 = oy + slope2 * (endX2 - ox);

      ctx.beginPath();
      ctx.moveTo(objX, objTipY);
      ctx.lineTo(ox, oy);
      ctx.lineTo(endX2, endY2);
      ctx.stroke();

      drawRayDirectionArrow(ctx, (objX + ox) / 2, (objTipY + oy) / 2, Math.atan(slope2));
      drawRayDirectionArrow(ctx, (ox + endX2) * 0.5, (oy + endY2) * 0.5, Math.atan(slope2));
    }

    // Ray 3: Directed towards rear focus F2 -> Emerges parallel to axis
    if (state.showRayFocal) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;

      // Line from objTip aiming at (f2X, oy)
      const slope3 = (oy - objTipY) / (f2X - objX);
      const lensHitY = objTipY + slope3 * (ox - objX);

      if (Math.abs(lensHitY - oy) < opticH) {
        ctx.beginPath();
        ctx.moveTo(objX, objTipY);
        ctx.lineTo(ox, lensHitY);
        ctx.stroke();
        drawRayDirectionArrow(ctx, (objX + ox) / 2, (objTipY + lensHitY) / 2, Math.atan(slope3));

        // Emerges parallel to axis to the right
        const endX3 = endRightX;
        ctx.beginPath();
        ctx.moveTo(ox, lensHitY);
        ctx.lineTo(endX3, lensHitY);
        ctx.stroke();
        drawRayDirectionArrow(ctx, (ox + endX3) / 2, lensHitY, 0);

        // Virtual back-projection parallel behind lens to left starting right at (ox, lensHitY)
        if (state.showVirtualExtensions && isFinite(calc.v)) {
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]);
          const virtImgX = ox - Math.abs(calc.v) * scale;
          ctx.beginPath();
          ctx.moveTo(ox, lensHitY);
          ctx.lineTo(virtImgX, lensHitY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  } else if (opticType === 'concave_mirror') {
    // -----------------------------------------------------------------
    // 3. CONCAVE MIRROR (Converging Reflector)
    // -----------------------------------------------------------------
    const fX = ox - f * scale; // Real Focus in front of mirror (left side)
    const minLeftX = Math.max(10, ox - Math.max(state.eyeDistance * scale + 100, 480));

    // Ray 1: Parallel to axis -> Reflects through Focus F (to the left)
    if (state.showRayParallel) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;

      // Incident ray: Object tip horizontally to mirror face at (ox, objTipY)
      ctx.beginPath();
      ctx.moveTo(objX, objTipY);
      ctx.lineTo(ox, objTipY);
      ctx.stroke();
      drawRayDirectionArrow(ctx, (objX + ox) / 2, objTipY, 0);

      // Reflected ray: Starts EXACTLY at mirror face (ox, objTipY), passes through F(fX, oy)
      // Equation: for x < ox, y(x) = objTipY + (ho / f) * (ox - x)
      const endX1 = minLeftX;
      const endY1 = objTipY + (ho / f) * (ox - endX1);

      ctx.beginPath();
      ctx.moveTo(ox, objTipY);
      ctx.lineTo(endX1, endY1);
      ctx.stroke();

      drawRayDirectionArrow(
        ctx,
        (ox + fX) / 2,
        (objTipY + oy) / 2,
        Math.atan2(endY1 - objTipY, endX1 - ox)
      );

      // Virtual extension (u < f): Straight back-projection starting EXACTLY at mirror (ox, objTipY) to Virtual Image tip
      if (calc.isVirtual && state.showVirtualExtensions && isFinite(calc.v)) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        const virtImgX = ox + Math.abs(calc.v) * scale;
        const virtImgTipY = oy - calc.imageHeight * scale;
        ctx.beginPath();
        ctx.moveTo(ox, objTipY);
        ctx.lineTo(virtImgX, virtImgTipY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Ray 2: Incident to Vertex V -> Reflects at equal angle across axis (Law of Reflection)
    if (state.showRayCentral) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;

      // Incident ray: Object tip to mirror Vertex (V) at (ox, oy)
      ctx.beginPath();
      ctx.moveTo(objX, objTipY);
      ctx.lineTo(ox, oy);
      ctx.stroke();
      drawRayDirectionArrow(
        ctx,
        (objX + ox) / 2,
        (objTipY + oy) / 2,
        Math.atan2(oy - objTipY, ox - objX)
      );

      // Reflected ray: Starts EXACTLY at Vertex V (ox, oy). Reflects DOWNWARD and to the LEFT (below axis)
      // Equation: for x < ox, y(x) = oy + (ho / u) * (ox - x) > oy
      const endX2 = minLeftX;
      const endY2 = oy + (ho / u) * (ox - endX2);

      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(endX2, endY2);
      ctx.stroke();

      drawRayDirectionArrow(
        ctx,
        (ox + endX2) / 2,
        (oy + endY2) / 2,
        Math.atan2(endY2 - oy, endX2 - ox)
      );

      // Virtual extension: Straight dashed back-projection starting EXACTLY from Vertex (V) to Virtual Image tip
      if (calc.isVirtual && state.showVirtualExtensions && isFinite(calc.v)) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        const virtImgX = ox + Math.abs(calc.v) * scale;
        const virtImgTipY = oy - calc.imageHeight * scale;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(virtImgX, virtImgTipY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Ray 3: Focal Ray
    if (state.showRayFocal && !calc.isAtFocus) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;

      if (calc.isReal) {
        // Real case (u > f): Ray passes from object tip through F(fX, oy) to mirror at (ox, hitY)
        const hitY = oy + calc.imageHeight * scale;
        if (Math.abs(hitY - oy) < opticH) {
          ctx.beginPath();
          ctx.moveTo(objX, objTipY);
          ctx.lineTo(ox, hitY);
          ctx.stroke();
          drawRayDirectionArrow(
            ctx,
            (objX + ox) / 2,
            (objTipY + hitY) / 2,
            Math.atan2(hitY - objTipY, ox - objX)
          );

          // Reflected parallel to the left at y = hitY
          const endX3 = minLeftX;
          ctx.beginPath();
          ctx.moveTo(ox, hitY);
          ctx.lineTo(endX3, hitY);
          ctx.stroke();
          drawRayDirectionArrow(ctx, (ox + endX3) / 2, hitY, Math.PI);
        }
      } else if (calc.isVirtual && isFinite(calc.v)) {
        // Virtual case (u < f): Ray aligned with F through object tip hits mirror at (ox, hitY)
        const hitY = oy - calc.imageHeight * scale;
        if (Math.abs(hitY - oy) < opticH) {
          // Guide line from F to object tip (dashed)
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(fX, oy);
          ctx.lineTo(objX, objTipY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Incident ray from object tip to mirror
          ctx.strokeStyle = '#34d399';
          ctx.beginPath();
          ctx.moveTo(objX, objTipY);
          ctx.lineTo(ox, hitY);
          ctx.stroke();
          drawRayDirectionArrow(
            ctx,
            (objX + ox) / 2,
            (objTipY + hitY) / 2,
            Math.atan2(hitY - objTipY, ox - objX)
          );

          // Reflected parallel to the left at y = hitY
          const endX3 = minLeftX;
          ctx.beginPath();
          ctx.moveTo(ox, hitY);
          ctx.lineTo(endX3, hitY);
          ctx.stroke();
          drawRayDirectionArrow(ctx, (ox + endX3) / 2, hitY, Math.PI);

          // Virtual extension parallel behind mirror to virtual image tip starting at (ox, hitY)
          if (state.showVirtualExtensions) {
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
            ctx.lineWidth = 1.4;
            ctx.setLineDash([4, 4]);
            const virtImgX = ox + Math.abs(calc.v) * scale;
            ctx.beginPath();
            ctx.moveTo(ox, hitY);
            ctx.lineTo(virtImgX, hitY);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }
  } else if (opticType === 'convex_mirror') {
    // -----------------------------------------------------------------
    // 4. CONVEX MIRROR (Diverging Reflector)
    // -----------------------------------------------------------------
    const fX = ox + f * scale; // Virtual Focus behind mirror (right side)
    const minLeftX = Math.max(10, ox - Math.max(state.eyeDistance * scale + 100, 480));

    // Ray 1: Parallel to axis -> Reflects diverging away from virtual focus F
    if (state.showRayParallel) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;

      // Incident: horizontally to mirror face at (ox, objTipY)
      ctx.beginPath();
      ctx.moveTo(objX, objTipY);
      ctx.lineTo(ox, objTipY);
      ctx.stroke();
      drawRayDirectionArrow(ctx, (objX + ox) / 2, objTipY, 0);

      // Reflected ray diverging to left: y(x) = objTipY - (ho / f) * (ox - x)
      const endX1 = minLeftX;
      const endY1 = objTipY - (ho / f) * (ox - endX1);

      ctx.beginPath();
      ctx.moveTo(ox, objTipY);
      ctx.lineTo(endX1, endY1);
      ctx.stroke();
      drawRayDirectionArrow(
        ctx,
        (ox + endX1) / 2,
        (objTipY + endY1) / 2,
        Math.atan2(endY1 - objTipY, endX1 - ox)
      );

      // Virtual back-extension behind mirror to virtual focus F starting right at (ox, objTipY)
      if (state.showVirtualExtensions) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(ox, objTipY);
        ctx.lineTo(fX, oy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Ray 2: Incident to Vertex V -> Reflects down-left at equal angle across axis
    if (state.showRayCentral) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;

      // Incident to vertex
      ctx.beginPath();
      ctx.moveTo(objX, objTipY);
      ctx.lineTo(ox, oy);
      ctx.stroke();
      drawRayDirectionArrow(
        ctx,
        (objX + ox) / 2,
        (objTipY + oy) / 2,
        Math.atan2(oy - objTipY, ox - objX)
      );

      // Reflected ray down-left
      const endX2 = minLeftX;
      const endY2 = oy + (ho / u) * (ox - endX2);

      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(endX2, endY2);
      ctx.stroke();
      drawRayDirectionArrow(
        ctx,
        (ox + endX2) / 2,
        (oy + endY2) / 2,
        Math.atan2(endY2 - oy, endX2 - ox)
      );

      // Virtual extension behind mirror starting right at Vertex (ox, oy)
      if (state.showVirtualExtensions && isFinite(calc.v)) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        const virtImgX = ox + Math.abs(calc.v) * scale;
        const virtImgTipY = oy - calc.imageHeight * scale;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(virtImgX, virtImgTipY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Ray 3: Aiming towards virtual focus F -> Reflects parallel to axis to the left
    if (state.showRayFocal) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;

      const hitY = oy - calc.imageHeight * scale;
      if (Math.abs(hitY - oy) < opticH) {
        // Incident ray aiming towards F hits mirror at (ox, hitY)
        ctx.beginPath();
        ctx.moveTo(objX, objTipY);
        ctx.lineTo(ox, hitY);
        ctx.stroke();
        drawRayDirectionArrow(
          ctx,
          (objX + ox) / 2,
          (objTipY + hitY) / 2,
          Math.atan2(hitY - objTipY, ox - objX)
        );

        // Guide line from hit point towards F (dashed)
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(ox, hitY);
        ctx.lineTo(fX, oy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Reflected parallel to the left
        ctx.strokeStyle = '#34d399';
        const endX3 = minLeftX;
        ctx.beginPath();
        ctx.moveTo(ox, hitY);
        ctx.lineTo(endX3, hitY);
        ctx.stroke();
        drawRayDirectionArrow(ctx, (ox + endX3) / 2, hitY, Math.PI);

        // Virtual extension parallel behind mirror to virtual image tip starting at (ox, hitY)
        if (state.showVirtualExtensions && isFinite(calc.v)) {
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]);
          const virtImgX = ox + Math.abs(calc.v) * scale;
          ctx.beginPath();
          ctx.moveTo(ox, hitY);
          ctx.lineTo(virtImgX, hitY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }

  ctx.restore();
}

// --- Observer Eye Graphic & Sight Line ---
function drawObserverEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  oy: number,
  scale: number,
  state: OpticsState,
  calc: OpticsCalculation,
  isActive: boolean
) {
  ctx.save();
  const eyeR = 18;
  const isMirror = calc.isMirror;

  let statusColor = '#10b981';
  let statusText = 'Eye in Focus';

  if (calc.isReal) {
    if (calc.eyeBeforeRealImage) {
      statusColor = '#f59e0b';
      statusText = 'Unconverged Rays (Defocus Blur)';
    } else {
      statusColor = '#10b981';
      statusText = 'Real Image in Focus';
    }
  } else if (calc.isAtFocus) {
    statusColor = '#60a5fa';
    statusText = 'Parallel Collimated Light';
  } else {
    statusColor = '#06b6d4';
    statusText = 'Virtual Image in Focus';
  }

  // Draw eye outline
  // For lenses: eye looks LEFT towards optic (iris on left side)
  // For mirrors: eye is on left looking RIGHT towards optic (iris on right side)
  const lookDir = isMirror ? 1 : -1;

  ctx.strokeStyle = isActive ? '#38bdf8' : '#e2e8f0';
  ctx.lineWidth = isActive ? 2.5 : 1.8;
  ctx.fillStyle = '#0f172a';

  // Sclera ellipse
  ctx.beginPath();
  ctx.moveTo(x + lookDir * eyeR * 1.2, oy);
  ctx.quadraticCurveTo(x, oy - eyeR, x - lookDir * eyeR, oy);
  ctx.quadraticCurveTo(x, oy + eyeR, x + lookDir * eyeR, oy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Iris
  ctx.fillStyle = statusColor;
  ctx.beginPath();
  ctx.arc(
    x + lookDir * eyeR * 0.4,
    oy,
    eyeR * 0.55,
    lookDir > 0 ? -Math.PI / 2 : Math.PI / 2,
    lookDir > 0 ? Math.PI / 2 : -Math.PI / 2
  );
  ctx.fill();

  // Pupil
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(
    x + lookDir * eyeR * 0.55,
    oy,
    eyeR * 0.28,
    lookDir > 0 ? -Math.PI / 2 : Math.PI / 2,
    lookDir > 0 ? Math.PI / 2 : -Math.PI / 2
  );
  ctx.fill();

  // Light catch
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + lookDir * eyeR * 0.65, oy - 3, 2, 0, Math.PI * 2);
  ctx.fill();

  // Position guide line
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x, oy - eyeR - 15);
  ctx.lineTo(x, oy + eyeR + 25);
  ctx.stroke();
  ctx.setLineDash([]);

  // Eye Distance Label
  ctx.fillStyle = statusColor;
  ctx.font = '600 11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('OBSERVER EYE', x, oy - eyeR - 22);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '400 10px ui-sans-serif, system-ui';
  ctx.fillText(`d = ${state.eyeDistance.toFixed(1)} cm`, x, oy + eyeR + 38);

  ctx.fillStyle = statusColor;
  ctx.font = '500 9px ui-monospace, monospace';
  ctx.fillText(statusText, x, oy + eyeR + 50);

  ctx.restore();
}

// --- Distance Brackets / Dimension Leaders ---
function drawDistanceDimensions(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  scale: number,
  state: OpticsState,
  calc: OpticsCalculation
) {
  const rulerY = oy + 65;
  const isMirror = calc.isMirror;

  ctx.save();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;

  // 1. Dimension u (Object to Optic)
  const objX = ox - state.objectDistance * scale;
  drawDimensionLine(
    ctx,
    objX,
    ox,
    rulerY,
    `u = ${state.objectDistance.toFixed(1)} cm`,
    '#f59e0b'
  );

  // 2. Dimension f
  const fX =
    state.opticType === 'convex_mirror'
      ? ox + state.focalLength * scale
      : state.opticType === 'concave_mirror'
      ? ox - state.focalLength * scale
      : ox + state.focalLength * scale;
  drawDimensionLine(
    ctx,
    ox,
    fX,
    rulerY + 20,
    `f = ${state.focalLength.toFixed(1)} cm`,
    '#38bdf8'
  );

  // 3. Dimension v (if image is finite)
  if (!calc.isAtFocus && isFinite(calc.v)) {
    let imgX: number;
    if (isMirror) {
      imgX = calc.isReal ? ox - calc.v * scale : ox + Math.abs(calc.v) * scale;
    } else {
      imgX = calc.isReal ? ox + calc.v * scale : ox - Math.abs(calc.v) * scale;
    }
    drawDimensionLine(
      ctx,
      ox,
      imgX,
      rulerY + 40,
      calc.isVirtual
        ? `v = ${calc.v.toFixed(1)} cm (|v| = ${calc.absV.toFixed(1)} cm)`
        : `v = +${calc.v.toFixed(1)} cm`,
      calc.isReal ? '#ef4444' : '#06b6d4'
    );
  }

  ctx.restore();
}

function drawDimensionLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  text: string,
  color: string
) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(minX, y - 4);
  ctx.lineTo(minX, y + 4);
  ctx.moveTo(maxX, y - 4);
  ctx.lineTo(maxX, y + 4);
  ctx.moveTo(minX, y);
  ctx.lineTo(maxX, y);
  ctx.stroke();

  ctx.font = '500 10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  const textWidth = ctx.measureText(text).width;
  const textX = (minX + maxX) / 2;
  const textY = y - 6;

  // Subtle dark background backing for dimension label
  ctx.fillStyle = 'rgba(10, 15, 26, 0.88)';
  ctx.fillRect(textX - textWidth / 2 - 4, textY - 10, textWidth + 8, 13);

  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 3;
  ctx.fillText(text, textX, textY);
  ctx.shadowBlur = 0;
}

// --- Helper: Draw Arrow Head ---
function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.45);
  ctx.lineTo(-size * 0.7, 0);
  ctx.lineTo(-size, size * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- Helper: Draw Ray Direction Indicator Chevron ---
function drawRayDirectionArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(-4, -3.5);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-4, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
