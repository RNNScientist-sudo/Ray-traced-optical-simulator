import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type ThemeMode = 'dark' | 'light';
export type AccentPalette = 'cyberpunk' | 'slate' | 'neon_lab' | 'high_contrast';

export interface CanvasColors {
  bg: string;
  grid: string;
  axis: string;
  axisLabel: string;
  cardinalTick: string;
  cardinalPoint: string;
  cardinalLabel: string;
  cardinalSub: string;
  // Rays
  rayParallel: string;
  rayParallelDashed: string;
  rayCentral: string;
  rayCentralDashed: string;
  rayFocal: string;
  rayFocalDashed: string;
  // Object Arrow
  objectShaft: string;
  objectHead: string;
  objectHandle: string;
  objectGlow: string;
  objectBadgeBg: string;
  objectBadgeBorder: string;
  objectBadgeTitle: string;
  objectBadgeSub: string;
  // Image Arrow
  realImage: string;
  virtualImage: string;
  imageBadgeBg: string;
  imageBadgeBorder: string;
  imageBadgeText: string;
  imageBadgeSub: string;
  // Observer Eye
  eyeSclera: string;
  eyeIris: string;
  eyePupil: string;
  eyeLabel: string;
  eyeBadgeBg: string;
  // Distance Dimensions
  dimensionLine: string;
  dimensionText: string;
  // Optic Element Graphic
  opticFill: string;
  opticStroke: string;
  opticCenterLine: string;
}

export interface PaletteInfo {
  id: AccentPalette;
  name: string;
  description: string;
  primaryHex: string;
  secondaryHex: string;
  accentRing: string;
}

export const PALETTES: PaletteInfo[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Electric Sky, Cyan & Neon Amber',
    primaryHex: '#0284c7',
    secondaryHex: '#f59e0b',
    accentRing: 'ring-sky-500',
  },
  {
    id: 'slate',
    name: 'Classic Slate',
    description: 'Executive Navy, Indigo & Steel Blue',
    primaryHex: '#6366f1',
    secondaryHex: '#38bdf8',
    accentRing: 'ring-indigo-500',
  },
  {
    id: 'neon_lab',
    name: 'Neon Lab',
    description: 'Laser Emerald & Vivid Violet',
    primaryHex: '#10b981',
    secondaryHex: '#8b5cf6',
    accentRing: 'ring-emerald-500',
  },
  {
    id: 'high_contrast',
    name: 'High Contrast',
    description: 'Max-Readability Stark Contrast (WCAG AAA)',
    primaryHex: '#2563eb',
    secondaryHex: '#d97706',
    accentRing: 'ring-amber-500',
  },
];

interface ThemeContextType {
  mode: ThemeMode;
  palette: AccentPalette;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setPalette: (palette: AccentPalette) => void;
  canvasColors: CanvasColors;
  paletteInfo: PaletteInfo;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY_MODE = 'optics_theme_mode';
const STORAGE_KEY_PALETTE = 'optics_theme_palette';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MODE);
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [palette, setPaletteState] = useState<AccentPalette>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PALETTE);
      if (saved === 'cyberpunk' || saved === 'slate' || saved === 'neon_lab' || saved === 'high_contrast') {
        return saved;
      }
      return 'cyberpunk';
    } catch {
      return 'cyberpunk';
    }
  });

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY_MODE, newMode);
    } catch {
      // ignore
    }
  };

  const toggleMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const setPalette = (newPalette: AccentPalette) => {
    setPaletteState(newPalette);
    try {
      localStorage.setItem(STORAGE_KEY_PALETTE, newPalette);
    } catch {
      // ignore
    }
  };

  // Synchronize HTML classes and data attributes for Tailwind and CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-palette', palette);
  }, [mode, palette]);

  const paletteInfo = useMemo(() => {
    return PALETTES.find((p) => p.id === palette) || PALETTES[0];
  }, [palette]);

  // Canvas color computation according to mode & active palette
  const canvasColors = useMemo<CanvasColors>(() => {
    const isDark = mode === 'dark';

    if (isDark) {
      // ---------------- DARK MODE ----------------
      let rayParallel = '#38bdf8'; // Blue
      let rayCentral = '#facc15';  // Yellow
      let rayFocal = '#4ade80';    // Green
      let cardinalPoint = '#0284c7';
      let cardinalTick = '#38bdf8';
      let cardinalLabel = '#38bdf8';
      let bg = '#0f172a'; // requested: Deep dark #0f172a

      if (palette === 'slate') {
        rayParallel = '#818cf8';
        rayCentral = '#fcd34d';
        rayFocal = '#34d399';
        cardinalPoint = '#4f46e5';
        cardinalTick = '#818cf8';
        cardinalLabel = '#a5b4fc';
        bg = '#090d16';
      } else if (palette === 'neon_lab') {
        rayParallel = '#22d3ee';
        rayCentral = '#f59e0b';
        rayFocal = '#10b981';
        cardinalPoint = '#059669';
        cardinalTick = '#10b981';
        cardinalLabel = '#34d399';
        bg = '#070b12';
      } else if (palette === 'high_contrast') {
        rayParallel = '#60a5fa';
        rayCentral = '#fbbf24';
        rayFocal = '#4ade80';
        cardinalPoint = '#3b82f6';
        cardinalTick = '#ffffff';
        cardinalLabel = '#ffffff';
        bg = '#000000';
      }

      return {
        bg,
        grid: palette === 'high_contrast' ? 'rgba(71, 85, 105, 0.45)' : 'rgba(51, 65, 85, 0.35)', // requested: #334155
        axis: palette === 'high_contrast' ? '#94a3b8' : '#64748b',
        axisLabel: '#94a3b8',
        cardinalTick,
        cardinalPoint,
        cardinalLabel,
        cardinalSub: '#94a3b8',
        rayParallel,
        rayParallelDashed: 'rgba(56, 189, 248, 0.7)',
        rayCentral,
        rayCentralDashed: 'rgba(250, 204, 21, 0.7)',
        rayFocal,
        rayFocalDashed: 'rgba(74, 222, 128, 0.7)',
        objectShaft: '#f59e0b',
        objectHead: '#fbbf24',
        objectHandle: '#fef08a',
        objectGlow: 'rgba(245, 158, 11, 0.45)',
        objectBadgeBg: 'rgba(15, 23, 42, 0.94)',
        objectBadgeBorder: 'rgba(245, 158, 11, 0.5)',
        objectBadgeTitle: '#fef08a',
        objectBadgeSub: '#fde68a',
        realImage: '#ef4444',
        virtualImage: '#06b6d4',
        imageBadgeBg: 'rgba(15, 23, 42, 0.94)',
        imageBadgeBorder: 'rgba(239, 68, 68, 0.5)',
        imageBadgeText: '#ffffff',
        imageBadgeSub: '#e2e8f0',
        eyeSclera: '#f8fafc',
        eyeIris: '#818cf8',
        eyePupil: '#0f172a',
        eyeLabel: '#c084fc',
        eyeBadgeBg: 'rgba(15, 23, 42, 0.9)',
        dimensionLine: '#64748b',
        dimensionText: '#cbd5e1',
        opticFill: 'rgba(56, 189, 248, 0.15)',
        opticStroke: '#38bdf8',
        opticCenterLine: 'rgba(56, 189, 248, 0.5)',
      };
    } else {
      // ---------------- LIGHT MODE ----------------
      let rayParallel = '#0284c7'; // requested: #0284c7 in Light
      let rayCentral = '#d97706';  // requested: #d97706 in Light
      let rayFocal = '#16a34a';    // requested: #16a34a in Light
      let cardinalPoint = '#0284c7';
      let cardinalTick = '#0284c7';
      let cardinalLabel = '#0369a1';
      let bg = '#f8fafc'; // requested: Clean white/light gray #f8fafc

      if (palette === 'slate') {
        rayParallel = '#4338ca';
        rayCentral = '#b45309';
        rayFocal = '#047857';
        cardinalPoint = '#4338ca';
        cardinalTick = '#4338ca';
        cardinalLabel = '#3730a3';
        bg = '#f1f5f9';
      } else if (palette === 'neon_lab') {
        rayParallel = '#0891b2';
        rayCentral = '#c2410c';
        rayFocal = '#059669';
        cardinalPoint = '#059669';
        cardinalTick = '#059669';
        cardinalLabel = '#065f46';
        bg = '#f8fafc';
      } else if (palette === 'high_contrast') {
        rayParallel = '#004085';
        rayCentral = '#9a3412';
        rayFocal = '#14532d';
        cardinalPoint = '#000000';
        cardinalTick = '#000000';
        cardinalLabel = '#000000';
        bg = '#ffffff';
      }

      return {
        bg,
        grid: palette === 'high_contrast' ? 'rgba(148, 163, 184, 0.6)' : 'rgba(203, 213, 225, 0.7)', // requested: #cbd5e1
        axis: '#475569',
        axisLabel: '#334155',
        cardinalTick,
        cardinalPoint,
        cardinalLabel,
        cardinalSub: '#475569',
        rayParallel,
        rayParallelDashed: 'rgba(2, 132, 199, 0.75)',
        rayCentral,
        rayCentralDashed: 'rgba(217, 119, 6, 0.75)',
        rayFocal,
        rayFocalDashed: 'rgba(22, 163, 74, 0.75)',
        objectShaft: '#b45309',
        objectHead: '#d97706',
        objectHandle: '#f59e0b',
        objectGlow: 'rgba(217, 119, 6, 0.35)',
        objectBadgeBg: 'rgba(255, 255, 255, 0.96)',
        objectBadgeBorder: '#cbd5e1',
        objectBadgeTitle: '#0f172a',
        objectBadgeSub: '#334155',
        realImage: '#dc2626',
        virtualImage: '#0284c7',
        imageBadgeBg: 'rgba(255, 255, 255, 0.96)',
        imageBadgeBorder: '#cbd5e1',
        imageBadgeText: '#0f172a',
        imageBadgeSub: '#334155',
        eyeSclera: '#ffffff',
        eyeIris: '#6366f1',
        eyePupil: '#0f172a',
        eyeLabel: '#4f46e5',
        eyeBadgeBg: 'rgba(255, 255, 255, 0.95)',
        dimensionLine: '#64748b',
        dimensionText: '#1e293b',
        opticFill: 'rgba(2, 132, 199, 0.12)',
        opticStroke: '#0284c7',
        opticCenterLine: 'rgba(2, 132, 199, 0.45)',
      };
    }
  }, [mode, palette]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        palette,
        setMode,
        toggleMode,
        setPalette,
        canvasColors,
        paletteInfo,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
