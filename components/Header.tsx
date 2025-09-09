
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 border-b-4 border-purple-600 shadow-lg">
      <div className="container mx-auto px-4 py-4 md:py-6 text-center">
        <h1 className="text-3xl md:text-4xl font-press-start text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          AI RPG Asset Factory
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mt-2">
          Generate Characters, Monsters, Maps and more with AI
        </p>
      </div>
    </header>
  );
};

export default Header;