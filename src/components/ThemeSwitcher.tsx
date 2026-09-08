import React, { useState, useRef, useEffect } from 'react';
import { useTheme, PALETTES, AccentPalette } from '../context/ThemeContext';
import { Sun, Moon, Palette, Check, ChevronDown } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
  const { mode, palette, toggleMode, setPalette, paletteInfo } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Light / Dark Mode Toggle Button */}
      <button
        type="button"
        id="theme-mode-toggle"
        onClick={toggleMode}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700/80 dark:border-slate-800 bg-slate-800/80 dark:bg-slate-900/80 hover:bg-slate-700 dark:hover:bg-slate-800 text-slate-200 dark:text-slate-200 light:bg-slate-100 light:border-slate-300 light:hover:bg-slate-200 light:text-slate-800 transition-all cursor-pointer shadow-sm"
        title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {mode === 'dark' ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400 animate-[spin_10s_linear_infinite]" />
            <span className="text-xs font-medium hidden sm:inline">Light</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-medium hidden sm:inline">Dark</span>
          </>
        )}
      </button>

      {/* Accent Color Palette Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          id="theme-palette-btn"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700/80 dark:border-slate-800 bg-slate-800/80 dark:bg-slate-900/80 hover:bg-slate-700 dark:hover:bg-slate-800 text-slate-200 light:bg-slate-100 light:border-slate-300 light:hover:bg-slate-200 light:text-slate-800 transition-all cursor-pointer shadow-sm text-xs"
          title="Select UI Accent Palette"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          {/* Dual color swatch preview */}
          <span className="flex items-center -space-x-1 shrink-0">
            <span
              className="w-2.5 h-2.5 rounded-full ring-1 ring-black/20"
              style={{ backgroundColor: paletteInfo.primaryHex }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full ring-1 ring-black/20"
              style={{ backgroundColor: paletteInfo.secondaryHex }}
            />
          </span>
          <span className="hidden md:inline font-medium">{paletteInfo.name}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div
            id="theme-palette-dropdown"
            className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-700 dark:border-slate-800 bg-slate-900/95 dark:bg-slate-950/95 light:bg-white/95 backdrop-blur-xl shadow-2xl z-50 p-1.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 flex items-center gap-1.5">
              <Palette className="w-3 h-3 text-sky-400" />
              <span>Accent Palettes</span>
            </div>

            <div className="py-1 flex flex-col gap-0.5">
              {PALETTES.map((p) => {
                const isSelected = palette === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPalette(p.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors text-left cursor-pointer w-full ${
                      isSelected
                        ? 'bg-sky-500/15 text-sky-400 dark:text-sky-300 font-semibold'
                        : 'text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-800/80 dark:hover:bg-slate-900 light:hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex items-center -space-x-1 shrink-0">
                        <span
                          className="w-3 h-3 rounded-full ring-1 ring-black/30"
                          style={{ backgroundColor: p.primaryHex }}
                        />
                        <span
                          className="w-3 h-3 rounded-full ring-1 ring-black/30"
                          style={{ backgroundColor: p.secondaryHex }}
                        />
                      </span>
                      <div className="flex flex-col">
                        <span className="leading-none">{p.name}</span>
                        <span className="text-[10px] text-slate-500 light:text-slate-400 leading-tight mt-0.5 font-normal">
                          {p.description}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
