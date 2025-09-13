
import React from 'react';

interface FooterProps {
  onOpenDonationModal: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenDonationModal }) => {
  return (
    <footer className="bg-gray-800 border-t-2 border-purple-600 mt-8 py-4">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-center items-center text-center text-gray-400 text-lg flex-wrap gap-x-4">
        <p>由 Gemini API 驱动。为像素艺术爱好者打造。</p>
        <div className="flex items-center justify-center mt-2 sm:mt-0">
          <button
            onClick={onOpenDonationModal}
            className="text-yellow-400 hover:text-yellow-300 transition-colors underline"
          >
            打赏作者 ❤️
          </button>
          <span className="mx-2 text-gray-500">|</span>
          <a
            href="https://github.com/sponsors/YOUR_USERNAME" // TODO: 请将 YOUR_USERNAME 替换为你的 GitHub 用户名
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 transition-colors underline"
            title="通过 GitHub 长期支持作者"
          >
            GitHub Sponsor
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
