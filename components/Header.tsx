
import React from 'react';
import Button from './Button';

interface HeaderProps {
  onFlashOfInspiration: () => void;
}

const Header: React.FC<HeaderProps> = ({ onFlashOfInspiration }) => {
  return (
    <header className="bg-gray-800 border-b-4 border-purple-600 shadow-lg">
      <div className="container mx-auto px-4 py-4 md:py-6 flex justify-center items-center relative">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-press-start text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            AI RPG 资源工厂
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mt-2">
            使用 AI 生成角色、怪物、地图等游戏资源
          </p>
        </div>
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
          <button
            onClick={onFlashOfInspiration}
            className="font-press-start text-sm md:text-base px-4 py-2 bg-yellow-400 text-gray-900 border-b-4 border-yellow-600 rounded-lg shadow-lg hover:bg-yellow-300 hover:border-yellow-500 active:bg-yellow-500 active:translate-y-1 transition-all duration-100 ease-in-out flex items-center"
            title="根据已有素材，自动生成一个迷你游戏！"
          >
            <span className="mr-2 text-xl">💡</span>
            灵光一闪
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
