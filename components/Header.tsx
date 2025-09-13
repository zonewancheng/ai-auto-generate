
import React from 'react';
import { useTranslation } from '../services/i18n';

// Settings icon
const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


interface HeaderProps {
    onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
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
             <button
                onClick={onOpenSettings}
                className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-300"
                title={t('apiKeySettingsTitle')}
                aria-label={t('settingsAriaLabel')}
            >
                <SettingsIcon />
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
