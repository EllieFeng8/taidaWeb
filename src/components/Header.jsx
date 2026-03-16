import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Header = ({ title }) => {
  const { language, toggleLanguage, t } = useLanguage();
  
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>

      <div className="flex items-center gap-4">

        
        <div className="flex items-center gap-1">

          <button 
            onClick={toggleLanguage}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
            title={t('language.switch')}
          >
            <Languages size={20} />
            <span className="text-sm font-medium">
              {language === 'zh' ? '中文' : 'EN'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
