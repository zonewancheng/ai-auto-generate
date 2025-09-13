
import React from 'react';
import { useTranslation } from '../services/i18n';

// FIX: Per coding guidelines, API key must come from process.env and user should not be prompted. Removed settings button.
interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
  const { t, language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <header className="bg-gray-800 border-b-4 border-purple-600 shadow-lg">
      <div className="container mx-auto px-4 py-4 md:py-6 flex justify-between items-center relative">
        <div className="flex-1 flex justify-start">
            <button
                onClick={toggleLanguage}
                className="p-2 rounded-md hover:bg-gray-700 transition-colors font-press-start text-lg text-gray-300"
                title={t('languageSwitchTitle')}
                aria-label="Switch Language"
            >
                {t('languageSwitchText')}
            </button>
        </div>
        <div className="text-center flex-1">
          <h1 className="text-3xl md:text-4xl font-press-start text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            {t('appTitle')}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mt-2">
            {t('appSubtitle')}
          </p>
        </div>
        <div className="flex-1 flex justify-end">
        </div>
      </div>
    </header>
  );
};

export default Header;
