import React, { useState } from 'react';
import { CameraViewMode, ObjectType, OpticsState } from './types';
import { calculateOptics } from './utils/optics';
import { FirstPersonLensCanvas } from './components/FirstPersonLensCanvas';
import { RayDiagramCanvas } from './components/RayDiagramCanvas';
import { MathReadoutPanel } from './components/MathReadoutPanel';
import { OpticsControls } from './components/OpticsControls';
import { OpticsTheoryModal } from './components/OpticsTheoryModal';
import { Eye, HelpCircle, Sparkles } from 'lucide-react';

const INITIAL_STATE: OpticsState = {
  opticType: 'convex_lens',
  focalLength: 15.0, // 15 cm
  objectDistance: 30.0, // 30 cm (2f, unit conjugate initial state)
  objectHeight: 6.0, // 6 cm
  eyeDistance: 35.0, // 35 cm (observer eye position)
  objectType: 'chart',
  viewMode: 'through_lens',
  showRayParallel: true,
  showRayCentral: true,
  showRayFocal: true,
  showVirtualExtensions: true,
  lensRadius: 7.5,
};

export default function App() {
  const [state, setState] = useState<OpticsState>(INITIAL_STATE);
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'both' | 'first_person' | 'rays'>('both');
  const [diagramZoom, setDiagramZoom] = useState<number>(1.0);

  const calc = calculateOptics(state);

  const updateState = (partial: Partial<OpticsState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  const handleReset = () => {
    setState(INITIAL_STATE);
  };

  const isMirror = calc.isMirror;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/20">
              <Eye className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Optical Elements Simulator
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/60">
                  <Sparkles className="w-2.5 h-2.5" /> Lenses &amp; Mirrors Ray Tracer
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Simulate 1st-person perspective, focal regimes &amp; ray geometries for Convex/Concave Lenses &amp; Mirrors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View tab on small screens */}
            <div className="flex lg:hidden bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTabMobile('first_person')}
                className={`px-2 py-1 rounded ${activeTabMobile === 'first_person' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                1st Person
              </button>
              <button
                type="button"
                onClick={() => setActiveTabMobile('rays')}
                className={`px-2 py-1 rounded ${activeTabMobile === 'rays' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                Ray Diagram
              </button>
              <button
                type="button"
                onClick={() => setActiveTabMobile('both')}
                className={`px-2 py-1 rounded ${activeTabMobile === 'both' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                Dual
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsTheoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              title="View optics formulas and explanation"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Optics Theory</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Simulation Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Real-time Optics Math Readout */}
        <section aria-label="Optics Calculations Readout">
          <MathReadoutPanel state={state} calc={calc} />
        </section>

        {/* Dual-View Layout: First-Person Perspective & Side Profile Ray Diagram */}
        <section
          aria-label="Interactive Dual Visual Views"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[460px] lg:min-h-[500px]"
        >
          {/* VIEW 1: First-Person Visual Perspective Through Optic */}
          <div
            className={`flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl ${
              activeTabMobile === 'rays' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* View 1 Header Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  First-Person Perspective
                  <span className="text-[11px] font-normal text-slate-400 font-mono">
                    {isMirror
                      ? '(Looking Into Mirror Dish)'
                      : '(Looking Through Lens)'}
                  </span>
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                {calc.eyeBeforeRealImage && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/80">
                    Defocus Blur Active
                  </span>
                )}
                <span className="text-slate-400 text-[11px]">
                  {calc.isAtFocus ? (
                    <span className="text-sky-400 font-medium">Parallel Rays (Collimated)</span>
                  ) : calc.isUpright ? (
                    <span className="text-cyan-400 font-medium">
                      Virtual • Upright ({calc.absMagnification.toFixed(1)}×)
                    </span>
                  ) : (
                    <span className="text-red-400 font-medium">
                      Real • Inverted 180° ({calc.absMagnification.toFixed(1)}×)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Canvas Stage 1 */}
            <div className="flex-1 w-full h-full min-h-[300px] sm:min-h-[360px] relative">
              <FirstPersonLensCanvas state={state} calc={calc} />
            </div>
          </div>

          {/* VIEW 2: Side Profile Ray Diagram */}
          <div
            className={`flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl ${
              activeTabMobile === 'first_person' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* View 2 Header Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  Side Profile Ray Diagram
                  <span className="text-[11px] font-normal text-slate-400 font-mono hidden md:inline">
                    (Interactive Drag &amp; Drop)
                  </span>
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono text-[11px] text-sky-400/90 font-medium">
                  Zoom: {Math.round(diagramZoom * 100)}%
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="hidden sm:inline font-sans text-[11px] text-slate-400">
                  Fixed Scale
                </span>
              </div>
            </div>

            {/* Canvas Stage 2 */}
            <div className="flex-1 w-full h-full min-h-[300px] sm:min-h-[360px] relative">
              <RayDiagramCanvas
                state={state}
                calc={calc}
                onUpdateState={updateState}
                zoom={diagramZoom}
                onZoomChange={setDiagramZoom}
              />
            </div>
          </div>
        </section>

        {/* Interactive Sliders & Configuration Bar */}
        <section aria-label="Simulation Controls">
          <OpticsControls
            state={state}
            calc={calc}
            onUpdateState={updateState}
            onReset={handleReset}
          />
        </section>
      </main>

      {/* Optics Theory Reference Modal */}
      <OpticsTheoryModal
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
      />
    </div>
  );
}
