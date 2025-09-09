
import React, { useState, useCallback, useEffect } from 'react';
import { generatePetSprite, adjustGeneratedImage, addAsset, getAssetsByType, AssetRecord } from '../services/geminiService';
import Button from './Button';
import SpriteDisplay from './SpriteDisplay';
import AdjustmentInput from './AdjustmentInput';
import { GeneratorProps } from './GeneratorTabs';

const placeholderExamples = [
    "一只毛茸茸的白色小狼崽伙伴。",
    "一条可以坐在你肩膀上的迷你龙。",
    "一匹带有皮质马鞍的雄伟白马。",
    "一只大眼睛、会漂浮的可爱史莱姆。",
    "一头强大的装甲熊坐骑。",
    "一只忠诚的金毛寻回犬。",
];

const HistoryPanel: React.FC<{ history: AssetRecord[], onSelect: (item: AssetRecord) => void, disabled: boolean }> = ({ history, onSelect, disabled }) => (
  <div className="mt-6 border-t-2 border-gray-700 pt-4">
    <h3 className="text-xl text-yellow-400 mb-2 font-press-start">历史记录</h3>
    {history.length === 0 ? (
      <p className="text-gray-500">你生成的宠物将显示在此处。</p>
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

const PetGenerator: React.FC<GeneratorProps> = ({ apiLock }) => {
  const [prompt, setPrompt] = useState('');
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<AssetRecord[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const assets = await getAssetsByType('pet');
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
      const imageDataUrl = await generatePetSprite(prompt);
      setGeneratedImage(imageDataUrl);
      await addAsset({ type: 'pet', prompt, imageDataUrl });
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? `生成失败: ${err.message}` : '发生未知错误。');
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
      await addAsset({ type: 'pet', prompt: `已调整: ${adjustmentPrompt} (原始: ${prompt})`, imageDataUrl });
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? `调整失败: ${err.message}` : '发生未知错误。');
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
        <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. 描述宠物或坐骑</h2>
        <p className="text-gray-300 mb-4 text-lg">描述一个伙伴。AI 将生成一个 3x4 的行走图 (144x192px)。</p>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例如：一只长着发光翅膀的小仙女。"
          className="w-full h-48 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
          disabled={apiLock.isApiLocked}
        />
        <div className="my-4">
          <p className="text-gray-400 mb-2 text-md">或试试这些示例：</p>
          <div className="flex flex-wrap gap-2">
              {placeholderExamples.map((ex, index) => (
                  <button 
                      key={index}
                      onClick={() => handleSelectExample(ex)}
                      disabled={apiLock.isApiLocked}
                      className="text-sm bg-gray-700 hover:bg-purple-600 text-gray-200 py-1 px-3 rounded-full transition-colors disabled:opacity-50"
                  >
                      {ex.split('。')[0]}
                  </button>
              ))}
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={apiLock.isApiLocked || !prompt} className="mt-4 w-full">
          {isLoading ? '驯服中...' : '生成宠物'}
        </Button>
      </div>
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
        <div className="flex-grow">
          <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">结果</h2>
          <SpriteDisplay
            isLoading={isLoading || isAdjusting}
            error={error}
            generatedImage={generatedImage}
            loadingText={isAdjusting ? '重新训练伙伴...' : '将伙伴带到身边...'}
            placeholder={
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-5xl">🐾</span>
                  </div>
                  <p className="text-xl">你的宠物/坐骑雪碧图将显示在此处。</p>
              </div>
            }
            downloadFileName={'pet_sprite.png'}
            imageAlt="生成的宠物雪碧图"
            imageContainerClassName="bg-checkered-pattern p-2 border-2 border-gray-600 rounded-md"
            imageClassName="w-[144px] h-[192px]"
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
        <HistoryPanel history={history} onSelect={handleSelectHistoryItem} disabled={apiLock.isApiLocked} />
      </div>
    </div>
  );
};

export default PetGenerator;
