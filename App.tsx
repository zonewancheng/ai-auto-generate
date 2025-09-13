
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import GeneratorTabs from './components/GeneratorTabs';
import GamePreview from './components/GamePreview';
import InspirationGeneratorModal from './components/InspirationGeneratorModal';
import { getAllAssets, generateGamePlan, isApiKeySet } from './services/geminiService';
import { AssetRecord } from './services/geminiService';
import { useTranslation } from './services/i18n';
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
  const [, setApiKey] = useState<string | null>(null); // To trigger re-renders if the key changes

  const { t, language } = useTranslation();

  useEffect(() => {
    document.title = t('documentTitle');
  }, [t, language]);

  useEffect(() => {
    // Check if an API key is set when the app loads. If not, open the settings modal.
    if (!isApiKeySet()) {
      setIsApiKeyModalOpen(true);
    }
  }, []);
  
  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setIsApiKeyModalOpen(false);
  };


  const handleFlashOfInspiration = async () => {
    if (!isApiKeySet()) {
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
        alert(t('inspirationNeedAssetsError'));
        return;
      }

      setInspirationAssets({ heroAsset, villainAsset, itemAsset });

      const assetPrompts = {
        [t('gameplanHero')]: heroAsset.prompt,
        [t('gameplanVillain')]: villainAsset.prompt,
        [t('gameplanKeyItem')]: itemAsset.prompt,
      };

      const gameConcept = t('gameplanConcept');
      
      const blueprint = await generateGamePlan(gameConcept, assetPrompts);
      
      setGamePreviewData({ blueprint, heroAsset, villainAsset, itemAsset });
      setIsGamePreviewOpen(true);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      setGameGenerationError(`${t('gameGenerationFailed')}: ${errorMessage}`);
      alert(`${t('gameGenerationFailed')}: ${errorMessage}`);
    } finally {
      setIsGeneratingGame(false);
      setInspirationAssets(null);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
       <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
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
    </div>
  );
};

export default App;
