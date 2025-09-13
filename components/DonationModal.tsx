
import React, { useEffect } from 'react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
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
      aria-label="打赏开发者"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl border-2 border-purple-600 w-full max-w-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-press-start text-yellow-400">支持开发者</h2>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-white" aria-label="关闭">&times;</button>
        </div>
        <div className="p-6 space-y-4 text-center">
          <p className="text-gray-300 text-lg">
            如果你觉得这个工具对你有帮助，可以请我喝杯咖啡！☕️
          </p>
          <p className="text-gray-400">
            你的支持是我持续更新和维护的最大动力。非常感谢！
          </p>
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm mt-4">
            <p><strong>重要提示：</strong>下面的二维码是占位符。请在代码中将它们替换为您自己的收款码图片链接。</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-around items-center pt-4 gap-4">
            <div className="flex flex-col items-center">
              <h3 className="text-xl text-green-400 mb-2 font-press-start">微信支付</h3>
              <div className="p-2 bg-white rounded-md">
                 {/* TODO: 替换为你自己的微信收款码图片 */}
                 <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=wxp://f2f0dd_I-G1f5f5g_W7E_X_Y2Z3a4b5c6d7e8f9"
                    alt="微信支付二维码"
                    className="w-40 h-40"
                 />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <h3 className="text-xl text-blue-400 mb-2 font-press-start">支付宝</h3>
              <div className="p-2 bg-white rounded-md">
                 {/* TODO: 替换为你自己的支付宝收款码图片 */}
                 <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://qr.alipay.com/fkx1234567890abcdefg"
                    alt="支付宝二维码"
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
