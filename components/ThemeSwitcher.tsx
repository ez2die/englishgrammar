import React, { useState } from 'react';
import { Theme } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { value: Theme.DEFAULT, name: '活力主题', icon: '🎨' },
    { value: Theme.FRESH, name: '小清新', icon: '🌿' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full border-2 border-gray-200 hover:border-gray-300 transition-all active:scale-95 shadow-sm"
        aria-label="切换主题"
      >
        <span className="text-xl">{theme === Theme.DEFAULT ? '🎨' : '🌿'}</span>
      </button>

      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 主题选择菜单 */}
          <div className="absolute right-0 top-12 z-50 bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden min-w-[160px]">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-3 text-left flex items-center gap-3 transition-all
                  ${theme === t.value
                    ? 'bg-emerald-50 text-emerald-700 font-bold'
                    : 'hover:bg-gray-50 text-gray-700'
                  }
                `}
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-sm">{t.name}</span>
                {theme === t.value && (
                  <span className="ml-auto text-emerald-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSwitcher;
