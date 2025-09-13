
import React, { useEffect } from 'react';
import { useTranslation } from '../services/i18n';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('donateDeveloper')}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl border-2 border-purple-600 w-full max-w-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-press-start text-yellow-400">{t('supportDeveloper')}</h2>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-white" aria-label={t('close')}>&times;</button>
        </div>
        <div className="p-6 space-y-4 text-center">
          <p className="text-gray-300 text-lg">
            {t('donationMessage')} ☕️
          </p>
          <p className="text-gray-400">
            {t('donationThanks')}
          </p>
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm mt-4">
            <p><strong>{t('important')}:</strong> {t('donationPlaceholderNote')}</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-around items-center pt-4 gap-4">
            <div className="flex flex-col items-center">
              <h3 className="text-xl text-green-400 mb-2 font-press-start">{t('wechatPay')}</h3>
              <div className="p-2 bg-white rounded-md">
                 {/* TODO: Replace with your own WeChat Pay QR code image */}
                 <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=wechat-placeholder"
                    alt="WeChat Pay QR Code"
                    className="w-40 h-40"
                 />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <h3 className="text-xl text-blue-400 mb-2 font-press-start">{t('alipay')}</h3>
              <div className="p-2 bg-white rounded-md">
                 {/* TODO: Replace with your own Alipay QR code image */}
                 <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=alipay-placeholder"
                    alt="Alipay QR Code"
                    className="w-40 h-40"
                 />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationModal;
