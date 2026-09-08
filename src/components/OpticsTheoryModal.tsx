import React from 'react';
import { X, BookOpen, AlertCircle, Sparkles } from 'lucide-react';

interface OpticsTheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpticsTheoryModal: React.FC<OpticsTheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto shadow-2xl p-6 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white">Optical Elements Physics &amp; Formula Guide</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-slate-300">
          {/* Sign Conventions & Master Equations */}
          <section className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <h3 className="font-semibold text-sky-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              1. Master Equations &amp; Cartesian Sign Conventions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-sky-300 mb-1">Thin Lens Formula:</div>
                <div className="font-mono text-cyan-200 text-sm mb-1.5">1/f = 1/v - 1/(-u) = 1/v + 1/u</div>
                <div className="font-mono text-slate-400">v = (f · u) / (u - f)</div>
                <div className="font-mono text-emerald-400 mt-1">M = v / (-u) = f / (f - u)</div>
              </div>
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-amber-300 mb-1">Spherical Mirror Formula:</div>
                <div className="font-mono text-amber-200 text-sm mb-1.5">1/f = 1/v + 1/u</div>
                <div className="font-mono text-slate-400">v = (f · u) / (u - f) | R = 2f</div>
                <div className="font-mono text-emerald-400 mt-1">M = -v / u = -f / (u - f)</div>
              </div>
            </div>
          </section>

          {/* 4 Optical Elements Matrix */}
          <section className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <h3 className="font-semibold text-white mb-2">2. The Four Optical Elements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Convex Lens */}
              <div className="p-3 bg-slate-900/80 rounded-lg border border-sky-900/40">
                <div className="font-bold text-sky-400 text-xs mb-1">Convex Lens (Converging Refractor)</div>
                <ul className="text-xs space-y-1 text-slate-300 list-disc list-inside">
                  <li><strong>f &gt; 0</strong> (Real optical focal point)</li>
                  <li><strong>u &lt; f:</strong> Virtual, Upright, Magnified (magnifying glass)</li>
                  <li><strong>u &gt; f:</strong> Real, Inverted (projector / camera)</li>
                </ul>
              </div>

              {/* Concave Lens */}
              <div className="p-3 bg-slate-900/80 rounded-lg border border-indigo-900/40">
                <div className="font-bold text-indigo-400 text-xs mb-1">Concave Lens (Diverging Refractor)</div>
                <ul className="text-xs space-y-1 text-slate-300 list-disc list-inside">
                  <li><strong>f &lt; 0</strong> (Negative virtual focal point)</li>
                  <li><strong>For all u &gt; 0:</strong> Always Virtual, Upright, and Diminished (M &lt; 1)</li>
                  <li>Used in peepholes &amp; myopia vision correction</li>
                </ul>
              </div>

              {/* Concave Mirror */}
              <div className="p-3 bg-slate-900/80 rounded-lg border border-emerald-900/40">
                <div className="font-bold text-emerald-400 text-xs mb-1">Concave Mirror (Converging Reflector)</div>
                <ul className="text-xs space-y-1 text-slate-300 list-disc list-inside">
                  <li><strong>f &gt; 0, R = 2f</strong> (Center of Curvature C)</li>
                  <li><strong>u &lt; f:</strong> Virtual, Upright, Magnified reflection (shaving/makeup mirror)</li>
                  <li><strong>u &gt; f:</strong> Real, Inverted aerial image in front of mirror</li>
                </ul>
              </div>

              {/* Convex Mirror */}
              <div className="p-3 bg-slate-900/80 rounded-lg border border-amber-900/40">
                <div className="font-bold text-amber-400 text-xs mb-1">Convex Mirror (Diverging Reflector)</div>
                <ul className="text-xs space-y-1 text-slate-300 list-disc list-inside">
                  <li><strong>f &lt; 0</strong> (Virtual focus behind mirror)</li>
                  <li><strong>For all u &gt; 0:</strong> Always Virtual, Upright, and Diminished (M &lt; 1)</li>
                  <li>Wide field of view: Security mirrors &amp; automotive side mirrors</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Observer Perspective & Defocus Blur */}
          <section className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <h3 className="font-semibold text-purple-400 mb-2">3. Defocus Blur &amp; Observer Eye Geometry</h3>
            <p className="text-xs leading-relaxed mb-2">
              In real optics, an aerial real image is formed by light rays converging at image distance <code className="text-red-300 font-mono">v</code>.
            </p>
            <div className="flex items-start gap-2 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>Eye Position &lt; Image Plane (d_eye &lt; v):</strong> Rays entering the observer pupil are still converging toward a point behind the eye. The human crystalline lens adds additional positive power, causing the focal point to cross far in front of the retina. This creates circular defocus blur. When <code className="text-emerald-300 font-mono">d_eye ≥ v</code>, the eye catches diverging rays and focuses cleanly.
              </span>
            </div>
          </section>
        </div>

        <div className="mt-5 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
