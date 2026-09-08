import React from 'react';
import { OpticsCalculation, OpticsState } from '../types';
import { Eye, Focus, Maximize2, AlertTriangle, CheckCircle2, CircleDot, Compass } from 'lucide-react';

interface MathReadoutPanelProps {
  state: OpticsState;
  calc: OpticsCalculation;
}

export const MathReadoutPanel: React.FC<MathReadoutPanelProps> = ({ state, calc }) => {
  const formatValue = (val: number, unit = 'cm') => {
    if (!isFinite(val)) return 'v = ∞ (Collimated)';
    return `v = ${val > 0 ? '+' : ''}${val.toFixed(1)} ${unit}`;
  };

  const formatMag = (m: number) => {
    if (!isFinite(m)) return 'M = ∞';
    const sign = m > 0 ? '+' : '';
    return `M = ${sign}${m.toFixed(2)}×`;
  };

  const getOpticDisplayName = () => {
    switch (state.opticType) {
      case 'convex_lens':
        return { name: 'Convex Lens', sub: 'Converging Refractor', color: 'text-sky-400', badge: 'Refractor' };
      case 'concave_lens':
        return { name: 'Concave Lens', sub: 'Diverging Refractor', color: 'text-indigo-400', badge: 'Refractor' };
      case 'concave_mirror':
        return { name: 'Concave Mirror', sub: 'Converging Reflector', color: 'text-emerald-400', badge: 'Reflector' };
      case 'convex_mirror':
        return { name: 'Convex Mirror', sub: 'Diverging Reflector', color: 'text-amber-400', badge: 'Reflector' };
    }
  };

  const opticInfo = getOpticDisplayName();

  return (
    <div className="flex flex-col gap-2.5">
      {/* Dynamic Summary Bar with Key Image Characteristics */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>Active Optic:</span>
          </span>
          <span className={`font-bold ${opticInfo.color}`}>{opticInfo.name}</span>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60 font-mono">
            {opticInfo.sub}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <span className="text-slate-500 font-sans font-medium text-xs mr-1">Image:</span>
          <span
            className={`px-2 py-0.5 rounded font-semibold border ${
              calc.isReal
                ? 'bg-rose-950/70 text-rose-300 border-rose-800/60'
                : calc.isAtFocus
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60'
            }`}
          >
            {calc.imageNatureDescription}
          </span>
          <span
            className={`px-2 py-0.5 rounded font-semibold border ${
              calc.isInverted
                ? 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
            }`}
          >
            {calc.imageOrientationDescription}
          </span>
          <span className="px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-200 border border-slate-700">
            {calc.imageSizeDescription} ({calc.absMagnification.toFixed(2)}×)
          </span>
        </div>
      </div>

      {/* Grid of 6 Detailed Parameter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Object Distance (u) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Object Dist (u)</span>
            <span className="text-amber-400 font-mono">{(state.objectDistance / state.focalLength).toFixed(2)}f</span>
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-400">
              {state.objectDistance.toFixed(1)} <span className="text-xs font-normal text-slate-400">cm</span>
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              Range: 0.1f – 4.0f
            </div>
          </div>
        </div>

        {/* 2. Focal Length & Focal Type */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Focal Length (f)</span>
            <Focus className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-bold font-mono text-sky-400">
              {calc.signedF > 0 ? `+${state.focalLength.toFixed(1)}` : `-${state.focalLength.toFixed(1)}`} <span className="text-xs font-normal text-slate-400">cm</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-0.5">
              <span className={`font-semibold ${calc.isConverging ? 'text-sky-300' : 'text-indigo-300'}`}>
                {calc.focalType}
              </span>
              <span className="text-slate-500">({calc.isMirror ? `R=${calc.curvatureRadius}cm` : `${calc.diopters > 0 ? '+' : ''}${calc.diopters}D`})</span>
            </div>
          </div>
        </div>

        {/* 3. Image Distance (v) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Image Dist (v)</span>
            <span
              className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                calc.isVirtual
                  ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60'
                  : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
              }`}
            >
              {calc.isVirtual ? 'Virtual' : 'Real'}
            </span>
          </div>
          <div className="mt-1">
            <div
              className={`text-lg sm:text-xl font-bold font-mono ${
                calc.isVirtual ? 'text-cyan-400' : 'text-rose-400'
              }`}
            >
              {formatValue(calc.v)}
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5" title={calc.imageLocationText}>
              {calc.imageLocationText}
            </div>
          </div>
        </div>

        {/* 4. Magnification (M) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Magnification (M)</span>
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
              {formatMag(calc.magnification)}
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              {calc.isInverted ? 'Inverted (M < 0)' : 'Upright (M > 0)'} • {calc.imageSizeDescription}
            </div>
          </div>
        </div>

        {/* 5. Observer Eye Distance */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Observer Eye (d_eye)</span>
            <Eye className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-bold font-mono text-purple-400">
              {state.eyeDistance.toFixed(1)} <span className="text-xs font-normal text-slate-400">cm</span>
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {calc.isMirror ? 'In front of mirror' : 'Opposite side (behind)'}
            </div>
          </div>
        </div>

        {/* 6. Eye Optical State / Defocus Blur */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Ray Convergence</span>
            {calc.eyeBeforeRealImage ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="mt-1">
            <div
              className={`text-sm sm:text-base font-semibold font-mono truncate ${
                calc.eyeBeforeRealImage ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {calc.eyeBeforeRealImage
                ? `Defocus (${calc.eyeDefocusBlurPx.toFixed(0)}px blur)`
                : 'In Focus'}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {calc.eyeBeforeRealImage
                ? 'Eye inside real image distance'
                : calc.isVirtual
                ? 'Diverging virtual rays'
                : 'Aerial real image in focus'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
