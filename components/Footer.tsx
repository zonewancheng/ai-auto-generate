
import React from 'react';
import { useTranslation } from '../services/i18n';

interface FooterProps {
  onOpenDonationModal: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenDonationModal }) => {
  const { t } = useTranslation();
  return (
    <footer className="bg-gray-800 border-t-2 border-purple-600 mt-8 py-4">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-center items-center text-center text-gray-400 text-lg flex-wrap gap-x-4">
        <p>{t('footerText')}</p>
        <div className="flex items-center justify-center mt-2 sm:mt-0">
          <button
            onClick={onOpenDonationModal}
            className="text-yellow-400 hover:text-yellow-300 transition-colors underline"
          >
            {t('donateAuthor')} ❤️
          </button>
          <span className="mx-2 text-gray-500">|</span>
          <a
            href="https://github.com/sponsors/YOUR_USERNAME" // TODO: Replace YOUR_USERNAME with your GitHub username
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 transition-colors underline"
            title={t('githubSponsorTooltip')}
          >
            GitHub Sponsor
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
