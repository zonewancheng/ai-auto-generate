import React, { useState, useCallback, useEffect } from 'react';
import { generateCombatEffect, adjustGeneratedImage, addAsset, getAssetsByType, AssetRecord } from '../services/geminiService';
import Button from './Button';
import SpriteDisplay from './SpriteDisplay';
import AdjustmentInput from './AdjustmentInput';
import { GeneratorProps } from './GeneratorTabs';

const placeholderExamples = [
    "A brilliant holy light spell that descends from the sky.",
    "A chaotic dark energy explosion with purple and black swirls.",
    "A slashing sword effect with a clean, sharp blue arc.",
    "A massive fireball erupting from the ground.",
    "An ice shard barrage freezing the air.",
    "A green poison cloud that bubbles and expands.",
];

const HistoryPanel: React.FC<{ history: AssetRecord[], onSelect: (item: AssetRecord) => void, disabled: boolean }> = ({ history, onSelect, disabled }) => (
  <div className="mt-6 border-t-2 border-gray-700 pt-4">
    <h3 className="text-xl text-yellow-400 mb-2 font-press-start">History</h3>
    {history.length === 0 ? (
      <p className="text-gray-500">Your generated effects will appear here.</p>
    ) : (
      <div className="max-h-60 overflow-y-auto bg-gray-900 p-2 rounded-md border-2 border-gray-700 scrollbar-hide">
        {history.map(item => (
          <button 
            key={item.id} 
            onClick={() => onSelect(item)} 
            disabled={disabled}
            className="flex items-center w-full text-left p-2 mb-2 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src={item.imageDataUrl} alt={item.prompt} className="w-12 h-12 object-contain mr-4 bg-checkered-pattern rounded-sm" style={{ imageRendering: 'pixelated' }} />
            <div className="flex-grow overflow-hidden">
              <p className="text-gray-200 truncate">{item.prompt}</p>
              <p className="text-sm text-gray-500">{new Date(item.timestamp).toLocaleString()}</p>
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
);

const CombatEffectGenerator: React.FC<GeneratorProps> = ({ apiLock }) => {
  const [prompt, setPrompt] = useState('');
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<AssetRecord[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const assets = await getAssetsByType('combat-effect');
      setHistory(assets);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleGenerate = useCallback(async () => {
    if (!prompt || apiLock.isApiLocked) return;
    apiLock.lockApi();
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setAdjustmentPrompt('');

    try {
      const imageDataUrl = await generateCombatEffect(prompt);
      setGeneratedImage(imageDataUrl);
      await addAsset({ type: 'combat-effect', prompt, imageDataUrl });
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? `Generation failed: ${err.message}` : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
      apiLock.unlockApi();
    }
  }, [prompt, apiLock, loadHistory]);

  const handleAdjust = useCallback(async () => {
    if (!adjustmentPrompt || !generatedImage || apiLock.isApiLocked) return;

    apiLock.lockApi();
    setIsAdjusting(true);
    setError(null);
    
    try {
      const imageDataUrl = await adjustGeneratedImage(generatedImage, adjustmentPrompt);
      setGeneratedImage(imageDataUrl);
      setAdjustmentPrompt('');
      await addAsset({ type: 'combat-effect', prompt: `Adjusted: ${adjustmentPrompt} (Original: ${prompt})`, imageDataUrl });
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? `Adjustment failed: ${err.message}` : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsAdjusting(false);
      apiLock.unlockApi();
    }
  }, [adjustmentPrompt, generatedImage, prompt, apiLock, loadHistory]);

  const handleSelectExample = (example: string) => {
    setPrompt(example);
  };
  
  const handleSelectHistoryItem = (item: AssetRecord) => {
    setPrompt(item.prompt);
    setGeneratedImage(item.imageDataUrl);
    setError(null);
    setAdjustmentPrompt('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
        <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. Describe Combat Effect</h2>
        <p className="text-gray-300 mb-4 text-lg">Describe an animation. The AI will generate a 5-frame sprite sheet (960x192px) for RPG Maker MZ.</p>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A powerful lightning strike from a thundercloud."
          className="w-full h-48 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
          disabled={apiLock.isApiLocked}
        />
        <div className="my-4">
          <p className="text-gray-400 mb-2 text-md">Or try an example:</p>
          <div className="flex flex-wrap gap-2">
              {placeholderExamples.map((ex, index) => (
                  <button 
                      key={index}
                      onClick={() => handleSelectExample(ex)}
                      disabled={apiLock.isApiLocked}
                      className="text-sm bg-gray-700 hover:bg-purple-600 text-gray-200 py-1 px-3 rounded-full transition-colors disabled:opacity-50"
                  >
                      {ex.split(' ').slice(0, 3).join(' ')}...
                  </button>
              ))}
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={apiLock.isApiLocked || !prompt} className="mt-4 w-full">
          {isLoading ? 'Generating...' : 'Generate Effect'}
        </Button>
      </div>
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
        <div className='flex-grow'>
          <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">Result</h2>
          <SpriteDisplay
            isLoading={isLoading || isAdjusting}
            error={error}
            generatedImage={generatedImage}
            loadingText={isAdjusting ? 'Recasting spell...' : 'Conjuring visual magic...'}
            placeholder={
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <div className="w-32 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                      <span className="text-5xl">✨</span>
                  </div>
                  <p className="mt-4 text-xl">Your combat effect animation will appear here.</p>
              </div>
            }
            downloadFileName={'combat_effect.png'}
            imageAlt="Generated combat effect animation"
            imageContainerClassName="bg-checkered-pattern p-2 border-2 border-gray-600 rounded-md w-full"
            imageClassName="w-full h-auto object-contain max-h-[100px]"
          />
          {generatedImage && !isLoading && (
              <AdjustmentInput 
                  adjustmentPrompt={adjustmentPrompt}
                  setAdjustmentPrompt={setAdjustmentPrompt}
                  handleAdjust={handleAdjust}
                  isAdjusting={isAdjusting}
                  disabled={apiLock.isApiLocked}
              />
          )}
        </div>
        <HistoryPanel history={history} onSelect={handleSelectHistoryItem} disabled={apiLock.isApiLocked}/>
      </div>
    </div>
  );
};

export default CombatEffectGenerator;
