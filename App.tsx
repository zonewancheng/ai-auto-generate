
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import GeneratorTabs from './components/GeneratorTabs';
import Footer from './components/Footer';
import GamePreview from './components/GamePreview';
import InspirationGeneratorModal from './components/InspirationGeneratorModal';
import { getAllAssets, generateGamePlan } from './services/geminiService';
import { AssetRecord } from './services/geminiService';
import ApiKeyModal from './components/ApiKeyModal';

export interface GamePreviewData {
  blueprint: any;
  heroAsset: AssetRecord;
  villainAsset: AssetRecord;
  itemAsset: AssetRecord;
}

interface InspirationAssets {
  heroAsset: AssetRecord;
  villainAsset: AssetRecord;
  itemAsset: AssetRecord;
}

const App: React.FC = () => {
  const [isGamePreviewOpen, setIsGamePreviewOpen] = useState(false);
  const [gamePreviewData, setGamePreviewData] = useState<GamePreviewData | null>(null);
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);
  const [inspirationAssets, setInspirationAssets] = useState<InspirationAssets | null>(null);
  const [gameGenerationError, setGameGenerationError] = useState<string | null>(null);

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
    if (key) {
      setHasApiKey(true);
    } else {
      setIsApiKeyModalOpen(true);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setHasApiKey(true);
    setIsApiKeyModalOpen(false);
  };


  const handleFlashOfInspiration = async () => {
    if (!hasApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    setIsGeneratingGame(true);
    setGameGenerationError(null);
    setInspirationAssets(null);
    try {
      const allAssets = await getAllAssets();
      
      const heroAsset = allAssets.find(a => a.type === 'character');
      const villainAsset = allAssets.find(a => a.type === 'monster');
      const itemAsset = allAssets.find(a => a.type === 'item');

      if (!heroAsset || !villainAsset || !itemAsset) {
        alert("灵感需要素材！请先生成至少一个角色、一个怪物和一个物品。");
        return;
      }

      setInspirationAssets({ heroAsset, villainAsset, itemAsset });

      const assetPrompts = {
        '主角': heroAsset.prompt,
        '反派': villainAsset.prompt,
        '关键物品': itemAsset.prompt,
      };

      const gameConcept = "根据用户提供的核心资源（主角、反派、关键物品），创建一个简短、经典、完整、适合 RPG Maker 的幻想冒险故事。故事应该围绕英雄击败反派、夺回关键物品展开。";
      
      const blueprint = await generateGamePlan(gameConcept, assetPrompts);
      
      setGamePreviewData({ blueprint, heroAsset, villainAsset, itemAsset });
      setIsGamePreviewOpen(true);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误。';
      setGameGenerationError(`生成游戏失败: ${errorMessage}`);
      alert(`生成游戏失败: ${errorMessage}`);
    } finally {
      setIsGeneratingGame(false);
      setInspirationAssets(null);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => hasApiKey && setIsApiKeyModalOpen(false)}
        onSave={handleSaveApiKey}
      />
      {isGeneratingGame && inspirationAssets && (
        <InspirationGeneratorModal 
          heroAsset={inspirationAssets.heroAsset}
          villainAsset={inspirationAssets.villainAsset}
          itemAsset={inspirationAssets.itemAsset}
        />
      )}
      {isGamePreviewOpen && gamePreviewData && (
        <GamePreview 
          gameData={gamePreviewData} 
          onClose={() => setIsGamePreviewOpen(false)} 
        />
      )}
      <Header onOpenSettings={() => setIsApiKeyModalOpen(true)} />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <GeneratorTabs onFlashOfInspiration={handleFlashOfInspiration} />
      </main>
      <Footer />
    </div>
  );
};

export default App;