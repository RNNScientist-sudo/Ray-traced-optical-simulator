import React from 'react';
import { ObjectType, OpticElementType, OpticsCalculation, OpticsState } from '../types';
import { PRESETS_BY_TYPE } from '../utils/optics';
import {
  Eye,
  RefreshCw,
  Flame,
  Grid,
  Compass,
  Type,
  Layers,
  Sparkles,
  CircleDot,
  Radio,
  Split,
  ChevronRight,
} from 'lucide-react';

interface OpticsControlsProps {
  state: OpticsState;
  calc: OpticsCalculation;
  onUpdateState: (partial: Partial<OpticsState>) => void;
  onReset: () => void;
}

export const OpticsControls: React.FC<OpticsControlsProps> = ({
  state,
  calc,
  onUpdateState,
  onReset,
}) => {
  const minU = +(state.focalLength * 0.1).toFixed(1);
  const maxU = +(state.focalLength * 4.0).toFixed(1);

  const presets = PRESETS_BY_TYPE[state.opticType] || PRESETS_BY_TYPE.convex_lens;

  const opticModes: {
    type: OpticElementType;
    label: string;
    sublabel: string;
    category: 'Lenses (Refractors)' | 'Mirrors (Reflectors)';
    badge: string;
    badgeColor: string;
  }[] = [
    {
      type: 'convex_lens',
      label: 'Convex Lens',
      sublabel: 'Converging Refractor',
      category: 'Lenses (Refractors)',
      badge: 'Converging',
      badgeColor: 'bg-sky-950/80 text-sky-400 border-sky-800/60',
    },
    {
      type: 'concave_lens',
      label: 'Concave Lens',
      sublabel: 'Diverging Refractor',
      category: 'Lenses (Refractors)',
      badge: 'Diverging',
      badgeColor: 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60',
    },
    {
      type: 'concave_mirror',
      label: 'Concave Mirror',
      sublabel: 'Converging Reflector',
      category: 'Mirrors (Reflectors)',
      badge: 'Converging',
      badgeColor: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
    },
    {
      type: 'convex_mirror',
      label: 'Convex Mirror',
      sublabel: 'Diverging Reflector',
      category: 'Mirrors (Reflectors)',
      badge: 'Diverging',
      badgeColor: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
    },
  ];

  return (
    <div className="flex flex-col gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
      {/* 1. Primary Optical Element Selector Segmented Tab Bar */}
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span>Select Optical Element:</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {calc.isMirror ? 'Reflective Surface (Law of Reflection)' : 'Transparent Glass (Snell’s Law Refraction)'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {opticModes.map((mode) => {
            const isSelected = state.opticType === mode.type;
            return (
              <button
                key={mode.type}
                type="button"
                onClick={() => onUpdateState({ opticType: mode.type })}
                className={`relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-slate-800/95 border-sky-500/80 shadow-md shadow-sky-950/40 ring-1 ring-sky-400/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {mode.label}
                  </span>
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${mode.badgeColor}`}
                  >
                    {mode.badge}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans leading-tight">
                  {mode.sublabel}
                </span>
                {isSelected && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Top Header: Perspective Indicator, Object Target & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Perspective Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300">
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          <span>{calc.isMirror ? 'Looking Into Mirror' : 'Looking Through Lens'}</span>
        </div>

        {/* Test Object Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 px-2">Target:</span>
          {(
            [
              { type: 'chart', label: 'Optics Chart', icon: Grid },
              { type: 'candle', label: 'Candle Flame', icon: Flame },
              { type: 'chess', label: 'Chess Piece', icon: Compass },
              { type: 'text', label: 'Target Text', icon: Type },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isSelected = state.objectType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => onUpdateState({ objectType: item.type })}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={item.label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Reset Button */}
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
          title="Reset to default optics parameters"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden md:inline">Reset</span>
        </button>
      </div>

      {/* 3. Optical Scenario Presets (Tailored to current optic element) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-xs font-semibold text-slate-400 whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Presets:</span>
        </span>
        <div className="flex items-center gap-2">
          {presets.map((preset) => {
            const targetU = +(state.focalLength * preset.uFactor).toFixed(1);
            const isCurrent = Math.abs(state.objectDistance - targetU) < 0.2;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onUpdateState({ objectDistance: targetU })}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                  isCurrent
                    ? 'bg-sky-950/70 text-sky-300 border-sky-600/80 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:bg-slate-800 hover:text-slate-200'
                }`}
                title={preset.description}
              >
                {preset.name} ({preset.uFactor}f)
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Interactive Sliders Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
        {/* 1. Object Distance (u) */}
        <div className="flex flex-col gap-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="slider-u" className="font-semibold text-amber-400 flex items-center gap-1.5">
              <span>Object Distance (u)</span>
            </label>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-amber-300 font-bold">{state.objectDistance.toFixed(1)}</span>
              <span className="text-slate-500">cm</span>
              <span className="text-slate-500">({(state.objectDistance / state.focalLength).toFixed(2)}f)</span>
            </div>
          </div>
          <input
            id="slider-u"
            type="range"
            min={minU}
            max={maxU}
            step={0.1}
            value={state.objectDistance}
            onChange={(e) => onUpdateState({ objectDistance: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.1f ({minU}cm)</span>
            <span className="text-sky-400/80">F ({state.focalLength}cm)</span>
            <span>4.0f ({maxU}cm)</span>
          </div>
        </div>

        {/* 2. Object Height (h) */}
        <div className="flex flex-col gap-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="slider-h" className="font-semibold text-amber-300 flex items-center gap-1.5">
              <span>Object Height (h)</span>
            </label>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-amber-200 font-bold">{state.objectHeight.toFixed(1)}</span>
              <span className="text-slate-500">cm</span>
            </div>
          </div>
          <input
            id="slider-h"
            type="range"
            min={1.5}
            max={18.0}
            step={0.5}
            value={state.objectHeight}
            onChange={(e) => onUpdateState({ objectHeight: parseFloat(e.target.value) })}
            className="w-full accent-amber-300 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>1.5 cm (Short)</span>
            <span>6.0 cm (Default)</span>
            <span>18.0 cm (Tall)</span>
          </div>
        </div>

        {/* 3. Focal Length (f) */}
        <div className="flex flex-col gap-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="slider-f" className="font-semibold text-sky-400 flex items-center gap-1.5">
              <span>Focal Length (f)</span>
            </label>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-sky-300 font-bold">{state.focalLength.toFixed(1)}</span>
              <span className="text-slate-500">cm</span>
              <span className="text-slate-500">
                ({calc.isMirror ? `R=${calc.curvatureRadius}cm` : `${calc.signedF > 0 ? '+' : ''}${(100 / calc.signedF).toFixed(1)}D`})
              </span>
            </div>
          </div>
          <input
            id="slider-f"
            type="range"
            min={6}
            max={30}
            step={0.5}
            value={state.focalLength}
            onChange={(e) => {
              const newF = parseFloat(e.target.value);
              onUpdateState({ focalLength: newF });
            }}
            className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>6.0 cm (Strong Curvature)</span>
            <span>Radius: {(2 * state.focalLength).toFixed(0)}cm</span>
            <span>30.0 cm (Flatter)</span>
          </div>
        </div>

        {/* 4. Observer Eye Distance (d_eye) */}
        <div className="flex flex-col gap-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="slider-eye" className="font-semibold text-purple-400 flex items-center gap-1.5">
              <span>Observer Eye Distance</span>
            </label>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-purple-300 font-bold">{state.eyeDistance.toFixed(1)}</span>
              <span className="text-slate-500">cm</span>
              {calc.eyeBeforeRealImage && (
                <span className="text-amber-400 text-[10px] font-sans font-medium">blur active</span>
              )}
            </div>
          </div>
          <input
            id="slider-eye"
            type="range"
            min={5}
            max={70}
            step={0.5}
            value={state.eyeDistance}
            onChange={(e) => onUpdateState({ eyeDistance: parseFloat(e.target.value) })}
            className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>5.0 cm (Close)</span>
            {calc.isReal && isFinite(calc.v) && (
              <span className={state.eyeDistance < calc.v ? 'text-amber-400' : 'text-emerald-400'}>
                Real image plane at {calc.v.toFixed(1)}cm
              </span>
            )}
            <span>70.0 cm (Far)</span>
          </div>
        </div>
      </div>

      {/* 5. Ray Diagram Tracing Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Ray Tracing:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
            <input
              type="checkbox"
              checked={state.showRayParallel}
              onChange={(e) => onUpdateState({ showRayParallel: e.target.checked })}
              className="accent-sky-400 rounded"
            />
            <span className="text-sky-400 font-mono font-medium">
              Ray 1 (Parallel {calc.isMirror ? '→ Reflects through F' : '→ Focus'})
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
            <input
              type="checkbox"
              checked={state.showRayCentral}
              onChange={(e) => onUpdateState({ showRayCentral: e.target.checked })}
              className="accent-yellow-400 rounded"
            />
            <span className="text-yellow-400 font-mono font-medium">
              Ray 2 ({calc.isMirror ? 'To Vertex V (Law of Reflection)' : 'Central through O'})
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
            <input
              type="checkbox"
              checked={state.showRayFocal}
              onChange={(e) => onUpdateState({ showRayFocal: e.target.checked })}
              className="accent-emerald-400 rounded"
            />
            <span className="text-emerald-400 font-mono font-medium">
              Ray 3 ({calc.isMirror ? 'Through F/C → Parallel' : 'Focal → Parallel'})
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
            <input
              type="checkbox"
              checked={state.showVirtualExtensions}
              onChange={(e) => onUpdateState({ showVirtualExtensions: e.target.checked })}
              className="accent-cyan-400 rounded"
            />
            <span className="text-cyan-400 font-mono font-medium">Virtual Ray Extensions (Dashed)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
