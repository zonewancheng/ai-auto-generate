import React, { useState, useCallback, useEffect } from 'react';
import { generateEquipmentSprite, adjustGeneratedImage, removeImageBackground, addAsset, getAssetsByType, deleteAsset, AssetRecord } from '../services/geminiService';
import Button from './Button';
import SpriteDisplay from './SpriteDisplay';
import AdjustmentInput from './AdjustmentInput';
import { GeneratorProps } from './GeneratorTabs';

const placeholderExamples = [
    "一把带有火焰附魔刀刃的巨剑。",
    "带有羽毛翅膀的华丽白金头盔。",
    "一个坚固的龙鳞盾牌。",
    "一个顶部镶嵌着发光水晶的魔法法杖。",
    "脚踝处有小翅膀的皮质速度之靴。",
    "一把强大的精灵长弓。",
];

const HistoryPanel: React.FC<{ 
  history: AssetRecord[], 
  onSelect: (item: AssetRecord) => void, 
  onDelete: (id: number) => void,
  disabled: boolean 
}> = ({ history, onSelect, onDelete, disabled }) => {
  const handleDelete = (e: React.MouseEvent, id: number | undefined) => {
    e.stopPropagation();
    if (typeof id === 'number' && window.confirm('你确定要删除这条历史记录吗？')) {
      onDelete(id);
    }
  };

  return (
    <div className="mt-6 border-t-2 border-gray-700 pt-4">
      <h3 className="text-xl text-yellow-400 mb-2 font-press-start">历史记录</h3>
      {history.length === 0 ? (
        <p className="text-gray-500">你生成的装备将显示在此处。</p>
      ) : (
        <div className="max-h-60 overflow-y-auto bg-gray-900 p-2 rounded-md border-2 border-gray-700 scrollbar-hide">
          {history.map(item => (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onSelect(item)}
                disabled={disabled}
                className="flex items-center w-full text-left p-2 mb-2 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img src={item.imageDataUrl} alt={item.prompt} className="flex-shrink-0 w-12 h-12 object-contain mr-4 bg-checkered-pattern rounded-sm" style={{ imageRendering: 'pixelated' }} />
                <div className="flex-grow overflow-hidden">
                  <p className="text-gray-200 truncate font-semibold">{item.prompt}</p>
                  <p className="text-sm text-gray-500">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              </button>
              <button
                onClick={(e) => handleDelete(e, item.id)}
                disabled={disabled}
                className="absolute top-1/2 right-2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="删除"
              >
                &#x1F5D1;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EquipmentGenerator: React.FC<GeneratorProps> = ({ apiLock }) => {
  const [prompt, setPrompt] = useState('');
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<AssetRecord[]>([]);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const assets = await getAssetsByType('equipment');
      setHistory(assets);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDeleteAsset = async (id: number) => {
    if (apiLock.isApiLocked) return;
    try {
      await deleteAsset(id);
      loadHistory();
    } catch (error) {
      console.error("Failed to delete asset:", error);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt || apiLock.isApiLocked) return;
    apiLock.lockApi();
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setAdjustmentPrompt('');

    try {
      const imageDataUrl = await generateEquipmentSprite(prompt);
      setGeneratedImage(imageDataUrl);
      await addAsset({ type: 'equipment', prompt, imageDataUrl });
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
      await addAsset({ type: 'equipment', prompt: `已调整: ${adjustmentPrompt} (原始: ${prompt})`, imageDataUrl });
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? `调整失败: ${err.message}` : '发生未知错误。');
      console.error(err);
    } finally {
      setIsAdjusting(false);
      apiLock.unlockApi();
    }
  }, [adjustmentPrompt, generatedImage, prompt, apiLock, loadHistory]);

    const handleRemoveBackground = useCallback(async () => {
        if (!generatedImage || apiLock.isApiLocked) return;

        apiLock.lockApi();
        setIsRemovingBg(true);
        setError(null);

        try {
            const newImageDataUrl = await removeImageBackground(generatedImage);
            setGeneratedImage(newImageDataUrl);
            await addAsset({ type: 'equipment', prompt: `已移除背景 (原始: ${prompt})`, imageDataUrl: newImageDataUrl });
            loadHistory();
        } catch (err) {
            setError(err instanceof Error ? `去背失败: ${err.message}` : '发生未知错误。');
            console.error(err);
        } finally {
            setIsRemovingBg(false);
            apiLock.unlockApi();
        }
    }, [generatedImage, prompt, apiLock, loadHistory]);

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
        <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. 描述你的装备</h2>
        <p className="text-gray-300 mb-4 text-lg">描述一件武器、盔甲或配饰。AI 将为其生成一个 48x48 像素的图标。</p>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例如：一把散发着微光的圣剑。"
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
          {isLoading ? '锻造中...' : '生成装备'}
        </Button>
      </div>
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
        <div className="flex-grow">
          <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">结果</h2>
          <SpriteDisplay
            isLoading={isLoading || isAdjusting}
            error={error}
            generatedImage={generatedImage}
            loadingText={isAdjusting ? '重铸装备...' : '制作你的装备...'}
            placeholder={
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-5xl">⚔️</span>
                  </div>
                  <p className="text-xl">你的装备图标将显示在此处。</p>
              </div>
            }
            downloadFileName={'rpg_equipment.png'}
            imageAlt="生成的装备图标"
            imageContainerClassName="bg-checkered-pattern p-2 border-2 border-gray-600 rounded-md"
            imageClassName="w-[48px] h-[48px]"
            onRemoveBackground={handleRemoveBackground}
            isRemovingBackground={isRemovingBg}
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
        <HistoryPanel history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteAsset} disabled={apiLock.isApiLocked} />
      </div>
    </div>
  );
};

export default EquipmentGenerator;