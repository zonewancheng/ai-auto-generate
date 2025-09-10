import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateGameConceptArt, adjustGeneratedImage, removeImageBackground, addAsset, getAssetsByType, deleteAsset, AssetRecord, generateConceptArtFromAssets } from '../services/geminiService';
import Button from './Button';
import SpriteDisplay from './SpriteDisplay';
import AdjustmentInput from './AdjustmentInput';
import { GeneratorProps } from './GeneratorTabs';
import LoadingSpinner from './LoadingSpinner';
import ImagePreviewModal from './ImagePreviewModal';

type Mode = 'generate' | 'fromAssets' | 'restyle';
type AssetType = 'character' | 'monster' | 'pet' | 'item' | 'equipment';

const ASSET_TYPE_CONFIG: { id: AssetType, label: string }[] = [
    { id: 'character', label: '角色' },
    { id: 'monster', label: '怪物' },
    { id: 'pet', label: '宠物' },
    { id: 'item', label: '物品' },
    { id: 'equipment', label: '装备' },
];

const AssetSelectorModal: React.FC<{
  onSelect: (asset: AssetRecord) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState<AssetType>('character');
  const [history, setHistory] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      const assets = await getAssetsByType(activeTab);
      setHistory(assets);
      setIsLoading(false);
    };
    loadHistory();
  }, [activeTab]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl border-2 border-purple-600 w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-press-start text-yellow-400">选择素材</h2>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="flex-shrink-0 flex border-b border-gray-700 overflow-x-auto scrollbar-hide">
            {ASSET_TYPE_CONFIG.map(tab => (
                 <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 font-press-start text-lg transition-colors ${activeTab === tab.id ? 'bg-gray-700 text-yellow-400' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
        <div className="p-6 overflow-y-auto scrollbar-hide">
          {isLoading ? <div className="flex justify-center"><LoadingSpinner /></div> : (
            history.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {history.map(asset => (
                  <div key={asset.id} onClick={() => onSelect(asset)} className="bg-gray-900 p-2 rounded-md border-2 border-gray-700 hover:border-yellow-400 cursor-pointer transition-colors text-center">
                    <img src={asset.imageDataUrl} alt={asset.prompt} className="w-full h-24 object-contain mx-auto bg-checkered-pattern rounded" style={{ imageRendering: 'pixelated' }}/>
                    <p className="text-sm text-gray-300 mt-2 truncate">{asset.prompt}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-center text-lg">未找到该类型的素材，请先去其他功能页生成。</p>
          )}
        </div>
      </div>
    </div>
  );
};


const placeholderExamples = [
    "英雄站在悬崖边，俯瞰着月光下的王国。",
    "主角和反派在一场史诗般的剑斗中，火花四溅。",
    "一个角色在一个神秘的、发光的森林中发现了一个古老的遗迹。",
    "团队围坐在篝火旁，在星空下休息。",
    "一条巨大的龙飞过一座火山，投下巨大的阴影。",
];

const HistoryPanel: React.FC<{ 
  history: AssetRecord[], 
  onSelect: (item: AssetRecord) => void, 
  onDelete: (id: number) => void,
  disabled: boolean,
  onImageClick: (url: string) => void,
}> = ({ history, onSelect, onDelete, disabled, onImageClick }) => {
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
        <p className="text-gray-500">你生成的原画将显示在此处。</p>
      ) : (
        <div className="max-h-60 overflow-y-auto bg-gray-900 p-2 rounded-md border-2 border-gray-700 scrollbar-hide">
          {history.map(item => (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onSelect(item)}
                disabled={disabled}
                className="flex items-center w-full text-left p-2 mb-2 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img 
                  src={item.imageDataUrl} 
                  alt={item.prompt} 
                  className="flex-shrink-0 w-12 h-12 object-cover mr-4 bg-checkered-pattern rounded-sm cursor-zoom-in" 
                  onClick={(e) => { e.stopPropagation(); onImageClick(item.imageDataUrl); }}
                  title="点击放大预览"
                />
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

const GameCGGenerator: React.FC<GeneratorProps> = ({ apiLock }) => {
  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<AssetRecord[]>([]);
  
  // Mode 'fromAssets' state
  const [selectedAssets, setSelectedAssets] = useState<AssetRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const localAssetInputRef = useRef<HTMLInputElement>(null);

  // Mode 'restyle' state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);


  const loadHistory = useCallback(async () => {
    try {
      const assets = await getAssetsByType('game-concept-art');
      setHistory(assets);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const resetCommonState = () => {
    setError(null);
    setGeneratedImage(null);
    setAdjustmentPrompt('');
  }

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
    resetCommonState();

    try {
      const imageDataUrl = await generateGameConceptArt(prompt);
      setGeneratedImage(imageDataUrl);
      await addAsset({ type: 'game-concept-art', prompt, imageDataUrl });
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? `生成失败: ${err.message}` : '发生未知错误。');
      console.error(err);
    } finally {
      setIsLoading(false);
      apiLock.unlockApi();
    }
  }, [prompt, apiLock, loadHistory]);

  const handleGenerateFromAssets = useCallback(async () => {
    if (!prompt || selectedAssets.length === 0 || apiLock.isApiLocked) return;
    apiLock.lockApi();
    setIsLoading(true);
    resetCommonState();

    try {
      const imageDataUrl = await generateConceptArtFromAssets(selectedAssets, prompt);
      setGeneratedImage(imageDataUrl);
      await addAsset({ type: 'game-concept-art', prompt, imageDataUrl });
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? `生成失败: ${err.message}` : '发生未知错误。');
      console.error(err);
    } finally {
      setIsLoading(false);
      apiLock.unlockApi();
    }
  }, [prompt, selectedAssets, apiLock, loadHistory]);

  const handleRestyle = useCallback(async () => {
    if (!uploadedImage || !prompt || apiLock.isApiLocked) return;
    apiLock.lockApi();
    setIsLoading(true);
    resetCommonState();

    try {
      const imageDataUrl = await adjustGeneratedImage(uploadedImage, prompt);
      setGeneratedImage(imageDataUrl);
      await addAsset({ type: 'game-concept-art', prompt, imageDataUrl });
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? `重绘失败: ${err.message}` : '发生未知错误。');
      console.error(err);
    } finally {
      setIsLoading(false);
      apiLock.unlockApi();
    }
  }, [uploadedImage, prompt, apiLock, loadHistory]);

  const handleAdjust = useCallback(async () => {
    if (!adjustmentPrompt || !generatedImage || apiLock.isApiLocked) return;
    apiLock.lockApi();
    setIsAdjusting(true);
    setError(null);
    
    try {
      const imageDataUrl = await adjustGeneratedImage(generatedImage, adjustmentPrompt);
      setGeneratedImage(imageDataUrl);
      setAdjustmentPrompt('');
      await addAsset({ type: 'game-concept-art', prompt: `已调整: ${adjustmentPrompt} (原始: ${prompt})`, imageDataUrl });
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
            await addAsset({ type: 'game-concept-art', prompt: `已移除背景 (原始: ${prompt})`, imageDataUrl: newImageDataUrl });
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
    setMode('generate');
    resetCommonState();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLocalAssetFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target?.result as string;
            if (imageDataUrl) {
                const newAsset: AssetRecord = {
                    id: Date.now() + Math.random(), // Temporary unique ID for React key
                    type: 'local-asset',
                    prompt: file.name,
                    imageDataUrl,
                    timestamp: Date.now(),
                };
                setSelectedAssets(prev => [...prev, newAsset]);
            }
        };
        reader.readAsDataURL(file);
    });

    // Reset file input to allow selecting the same file again
    if (event.target) {
        event.target.value = "";
    }
  };


  const renderModeSwitcher = () => (
    <div className="flex justify-center bg-gray-800 p-2 rounded-lg mb-8 border-2 border-gray-700">
      <button onClick={() => setMode('generate')} disabled={apiLock.isApiLocked} className={`w-1/3 font-press-start text-base py-3 rounded-md transition-colors ${mode === 'generate' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}>描述生成</button>
      <button onClick={() => setMode('fromAssets')} disabled={apiLock.isApiLocked} className={`w-1/3 font-press-start text-base py-3 rounded-md transition-colors ${mode === 'fromAssets' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}>素材合成</button>
      <button onClick={() => setMode('restyle')} disabled={apiLock.isApiLocked} className={`w-1/3 font-press-start text-base py-3 rounded-md transition-colors ${mode === 'restyle' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}>图片重绘</button>
    </div>
  );

  const renderGenerateMode = () => (
    <>
      <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. 描述原画场景</h2>
      <p className="text-gray-300 mb-4 text-lg">描述一个游戏中的场景或关键时刻。AI 将为其生成一个 16:9 的高清原画插图。</p>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：一位骑士在暴风雨中与一条巨龙对峙。" className="w-full h-48 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none" disabled={apiLock.isApiLocked} />
      <div className="my-4">
        <p className="text-gray-400 mb-2 text-md">或试试这些示例：</p>
        <div className="flex flex-wrap gap-2">
            {placeholderExamples.map((ex, index) => (<button key={index} onClick={() => handleSelectExample(ex)} disabled={apiLock.isApiLocked} className="text-sm bg-gray-700 hover:bg-purple-600 text-gray-200 py-1 px-3 rounded-full transition-colors disabled:opacity-50">{ex.split('，')[0]}...</button>))}
        </div>
      </div>
      <Button onClick={handleGenerate} disabled={apiLock.isApiLocked || !prompt} className="mt-4 w-full">{isLoading ? '绘制中...' : '生成原画'}</Button>
    </>
  );

  const renderFromAssetsMode = () => (
    <>
      <h2 className="text-2xl text-yellow-400 mb-2 font-press-start">1. 选择素材</h2>
      <p className="text-gray-300 mb-4 text-lg">从你的历史记录中选择角色、怪物等，或从本地上传图片，将它们添加到场景中。</p>
      <div className="min-h-[8rem] bg-gray-900 border-2 border-dashed border-gray-600 rounded-md p-2 flex flex-wrap gap-2 items-center">
        {selectedAssets.map((asset, index) => (
            <div key={`${asset.id}-${index}`} className="relative group">
                <img 
                  src={asset.imageDataUrl} 
                  className="w-16 h-16 object-contain bg-checkered-pattern rounded cursor-zoom-in" 
                  style={{ imageRendering: 'pixelated' }} 
                  onClick={() => setPreviewImage(asset.imageDataUrl)}
                  title={asset.prompt}
                />
                <button onClick={() => setSelectedAssets(assets => assets.filter((_, i) => i !== index))} className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100" aria-label="移除素材">&times;</button>
            </div>
        ))}
        <button onClick={() => setIsModalOpen(true)} className="w-16 h-16 bg-gray-700 hover:bg-purple-600 rounded flex items-center justify-center text-4xl text-gray-400 transition-colors" title="从历史记录选择">+</button>
        <button onClick={() => localAssetInputRef.current?.click()} className="w-16 h-16 bg-gray-700 hover:bg-purple-600 rounded flex items-center justify-center text-gray-400 transition-colors" title="从本地上传">
          <span className="text-2xl">🖥️</span>
        </button>
      </div>
      <input type="file" ref={localAssetInputRef} onChange={handleLocalAssetFileChange} accept="image/*" className="hidden" multiple disabled={apiLock.isApiLocked} />
      <h2 className="text-2xl text-yellow-400 mt-6 mb-2 font-press-start">2. 描述场景</h2>
      <p className="text-gray-300 mb-4 text-lg">描述这些素材在做什么，以及场景的环境。</p>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：英雄正在与巨龙战斗，背景是一座火山。" className="w-full h-32 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none" disabled={apiLock.isApiLocked} />
      <Button onClick={handleGenerateFromAssets} disabled={apiLock.isApiLocked || !prompt || selectedAssets.length === 0} className="mt-4 w-full">{isLoading ? '合成中...' : '生成原画'}</Button>
    </>
  );

  const renderRestyleMode = () => (
     <>
        <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. 上传图片</h2>
        <p className="text-gray-300 mb-4 text-lg">上传一张你想修改或重绘风格的图片。</p>
        <div className="w-full h-48 p-3 bg-gray-900 border-2 border-dashed border-gray-600 rounded-md hover:border-purple-500 flex items-center justify-center cursor-pointer" onClick={() => !apiLock.isApiLocked && fileInputRef.current?.click()}>
            {uploadedImage ? <img src={uploadedImage} alt="上传预览" className="max-w-full max-h-full object-contain rounded cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setPreviewImage(uploadedImage); }} title="点击放大预览" /> : <span className="text-gray-500 text-center">点击或拖放上传</span>}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={apiLock.isApiLocked} />
        <h2 className="text-2xl text-yellow-400 mt-6 mb-2 font-press-start">2. 描述修改</h2>
        <p className="text-gray-300 mb-4 text-lg">告诉AI你想如何修改这张图片。</p>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：将这张图的风格变成夜晚，并增加一些发光的魔法效果。" className="w-full h-32 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none" disabled={apiLock.isApiLocked || !uploadedImage} />
        <Button onClick={handleRestyle} disabled={apiLock.isApiLocked || !prompt || !uploadedImage} className="mt-4 w-full">{isLoading ? '重绘中...' : '生成原画'}</Button>
    </>
  );

  return (
    <div>
      {previewImage && <ImagePreviewModal imageUrl={previewImage} altText="预览" onClose={() => setPreviewImage(null)} />}
      {isModalOpen && <AssetSelectorModal onSelect={(asset) => { setSelectedAssets(prev => [...prev, asset]); setIsModalOpen(false); }} onClose={() => setIsModalOpen(false)} />}
      {renderModeSwitcher()}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
            {mode === 'generate' && renderGenerateMode()}
            {mode === 'fromAssets' && renderFromAssetsMode()}
            {mode === 'restyle' && renderRestyleMode()}
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
          <div className="flex-grow">
            <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">结果</h2>
            <SpriteDisplay
              isLoading={isLoading || isAdjusting}
              error={error}
              generatedImage={generatedImage}
              loadingText={isAdjusting ? '重新构图...' : '正在绘制史诗场景...'}
              placeholder={
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4"><span className="text-5xl">🎨</span></div>
                    <p className="text-xl">你的游戏原画将显示在此处。</p>
                </div>
              }
              downloadFileName={'game_concept_art.png'}
              imageAlt="生成游戏原画"
              imageContainerClassName="bg-checkered-pattern p-2 border-2 border-gray-600 rounded-md w-full"
              imageClassName="w-full h-auto object-contain max-h-[350px]"
              onRemoveBackground={handleRemoveBackground}
              isRemovingBackground={isRemovingBg}
            />
            {generatedImage && !isLoading && (
                <AdjustmentInput adjustmentPrompt={adjustmentPrompt} setAdjustmentPrompt={setAdjustmentPrompt} handleAdjust={handleAdjust} isAdjusting={isAdjusting} disabled={apiLock.isApiLocked}/>
            )}
          </div>
          <HistoryPanel history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteAsset} disabled={apiLock.isApiLocked} onImageClick={setPreviewImage} />
        </div>
      </div>
    </div>
  );
};

export default GameCGGenerator;