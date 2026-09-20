import React from 'react';
import { Languages, Check } from 'lucide-react';
import { SupportedLanguage } from '../i18n/translations';

interface FrontlineLanguageToggleProps {
  currentLang: SupportedLanguage;
  onChangeLang: (lang: SupportedLanguage) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  badge: string;
  subtext: string;
}

const PRIMARY_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    badge: 'EN',
    subtext: 'Clinical Standard',
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    badge: 'HI',
    subtext: 'राष्ट्रीय भाषा',
  },
  {
    code: 'mr',
    label: 'Marathi',
    nativeLabel: 'मराठी',
    badge: 'MR',
    subtext: 'स्थानिक / प्रादेशिक',
  },
];

export const FrontlineLanguageToggle: React.FC<FrontlineLanguageToggleProps> = ({
  currentLang,
  onChangeLang,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-1 text-slate-700 text-xs font-semibold whitespace-nowrap">
          <Languages className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Frontline UI:</span>
        </div>
      )}

      <div
        role="group"
        aria-label="Frontline language switcher"
        className="inline-flex p-0.5 rounded-lg bg-slate-200/80 border border-slate-300 shadow-inner"
      >
        {PRIMARY_LANGUAGES.map((lang) => {
          const isSelected = currentLang === lang.code;

          return (
            <button
              key={lang.code}
              type="button"
              id={`lang-toggle-${lang.code}`}
              onClick={() => onChangeLang(lang.code)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
              } ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : size === 'lg' ? 'px-3.5 py-1.5 text-sm' : ''}`}
              title={`Switch application interface to ${lang.label} (${lang.nativeLabel})`}
            >
              <span
                className={`text-[10px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
                  isSelected ? 'bg-indigo-700/80 text-white' : 'bg-slate-300/80 text-slate-700'
                }`}
              >
                {lang.badge}
              </span>
              <span className="tracking-tight">{lang.nativeLabel}</span>
              {isSelected && <Check className="w-3 h-3 text-emerald-300 stroke-[3]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
