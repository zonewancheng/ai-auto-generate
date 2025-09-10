
import React, { useState, useEffect } from 'react';
import Button from './Button';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        setApiKey(storedKey);
      } else {
        setApiKey('');
      }
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl border-2 border-purple-600 w-full max-w-lg flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-press-start text-yellow-400">设置 API 密钥</h2>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-gray-300 text-lg">
            未检测到 API 密钥。您可以通过配置环境变量或在下方输入框中提供密钥来使用此应用。
          </p>
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm">
            <p><strong>重要提示：</strong>本应用的图像生成功能需要使用与**已启用结算功能的 Google Cloud 项目**关联的 API 密钥。仅使用 AI Studio 的免费密钥将无法生成图像。</p>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="在此处粘贴您的 Gemini API 密钥"
            className="w-full p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200"
          />
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-yellow-400 transition-colors"
          >
            获取 Gemini API 密钥 &rarr;
          </a>
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-3 rounded-md text-sm">
            <p><strong>安全提示：</strong>您的 API 密钥将仅存储在您的浏览器本地。</p>
            <p className="mt-1">通过此窗口设置的密钥将优先于任何已配置的环境变量。</p>
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!apiKey.trim()}>
            保存密钥
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
