
import React, { useState, useEffect } from 'react';
import { GamePreviewData } from '../App';
import Button from './Button';

interface GamePreviewProps {
  gameData: GamePreviewData;
  onClose: () => void;
}

type GameScreen = 'title' | 'map' | 'combat' | 'victory' | 'gameover';

const GamePreview: React.FC<GamePreviewProps> = ({ gameData, onClose }) => {
  const [screen, setScreen] = useState<GameScreen>('title');
  const [message, setMessage] = useState('');
  const [showAttackEffect, setShowAttackEffect] = useState(false);

  const { blueprint, heroAsset, villainAsset, itemAsset } = gameData;
  const heroName = blueprint.actors[0]?.name || '英雄';
  const villainName = blueprint.enemies[0]?.name || '反派';
  const itemName = blueprint.items[0]?.name || '宝物';

  useEffect(() => {
    setMessage(blueprint.story.summary);
  }, [blueprint.story.summary]);

  const handleAttack = () => {
    setShowAttackEffect(true);
    setTimeout(() => {
      setMessage(`${heroName} 击败了 ${villainName} 并夺回了 ${itemName}!`);
      setScreen('victory');
      setShowAttackEffect(false);
    }, 500);
  };
  
  const renderTitleScreen = () => (
    <div className="text-center">
      <h1 className="text-5xl font-press-start text-yellow-400 mb-4 drop-shadow-[0_3px_3px_rgba(0,0,0,0.8)]">{blueprint.title}</h1>
      <p className="text-xl text-gray-300 mb-8">"{blueprint.story.tagline}"</p>
      <Button onClick={() => setScreen('map')}>开始游戏</Button>
    </div>
  );

  const renderMapScreen = () => (
    <div className="flex flex-col items-center h-full">
      <div className="w-full bg-black bg-opacity-50 p-4 rounded-lg border-2 border-gray-600 mb-4">
        <h2 className="text-lg font-press-start text-yellow-400">{blueprint.quests[0].title}</h2>
        <p className="text-gray-300">{blueprint.quests[0].objective}</p>
      </div>
      <div className="flex-grow flex items-center justify-center">
         <img src={heroAsset.imageDataUrl} alt={heroName} className="h-48 object-contain" style={{ imageRendering: 'pixelated' }}/>
      </div>
      <Button onClick={() => setScreen('combat')}>挑战 {villainName}!</Button>
    </div>
  );
  
  const renderCombatScreen = () => (
    <div className="flex flex-col items-center h-full">
      <h2 className="text-2xl font-press-start text-red-500 mb-8">战斗开始!</h2>
      <div className="flex-grow flex items-center justify-around w-full">
        <img src={heroAsset.imageDataUrl} alt={heroName} className="h-48 object-contain" style={{ imageRendering: 'pixelated' }}/>
        <span className="text-4xl font-press-start text-yellow-400">VS</span>
        <img 
            src={villainAsset.imageDataUrl} 
            alt={villainName} 
            className={`h-48 object-contain transition-transform duration-100 ${showAttackEffect ? 'animate-bounce' : ''}`}
            style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <Button onClick={handleAttack} className="bg-red-600 border-red-800 hover:bg-red-500">攻击!</Button>
    </div>
  );

  const renderVictoryScreen = () => (
    <div className="text-center">
      <h1 className="text-4xl font-press-start text-yellow-400 mb-6">胜利!</h1>
      <div className="flex items-center justify-center space-x-4 mb-6">
        <img src={heroAsset.imageDataUrl} alt={heroName} className="h-24 object-contain" style={{ imageRendering: 'pixelated' }}/>
        <img src={itemAsset.imageDataUrl} alt={itemName} className="h-16 object-contain" style={{ imageRendering: 'pixelated' }}/>
      </div>
      <p className="text-xl text-gray-300 mb-8">{message}</p>
      <Button onClick={onClose}>结束游戏</Button>
    </div>
  );

  const renderContent = () => {
    switch(screen) {
      case 'title': return renderTitleScreen();
      case 'map': return renderMapScreen();
      case 'combat': return renderCombatScreen();
      case 'victory': return renderVictoryScreen();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40 p-4">
      <div className="w-full max-w-4xl h-[80vh] bg-gray-900 rounded-lg shadow-2xl border-4 border-purple-600 flex flex-col p-6 relative bg-checkered-pattern">
        <button onClick={onClose} className="absolute top-2 right-4 text-4xl font-press-start text-gray-400 hover:text-white transition-colors">&times;</button>
        <div className="flex-grow flex items-center justify-center">
            {renderContent()}
        </div>
        <div className="w-full h-24 bg-gray-800 rounded-lg border-2 border-gray-600 mt-4 p-4 text-lg text-gray-200 overflow-y-auto scrollbar-hide">
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
};

export default GamePreview;
