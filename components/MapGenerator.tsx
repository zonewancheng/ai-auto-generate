import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateTileset, restyleMapImage, adjustGeneratedImage, removeImageBackground, addAsset, getAssetsByType, deleteAsset, AssetRecord } from '../services/geminiService';
import Button from './Button';
import SpriteDisplay from './SpriteDisplay';
import AdjustmentInput from './AdjustmentInput';
import { GeneratorProps } from './GeneratorTabs';
import ImagePreviewModal from './ImagePreviewModal';

type Mode = 'generate' | 'restyle';

const placeholderExamples = [
    "神秘的森林，有发光的蘑菇和古老的、长满青苔的树木。",
    "古老的沙漠遗迹，有砂岩柱子和隐藏的绿洲。",
    "繁华的港口小镇，有木制码头、船只和市场摊位。",
    "宁静的山顶寺庙，周围环绕着樱花树。",
    "充满水晶的洞穴，有发光的宝石和地下河流。",
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
        <p className="text-gray-500">你生成的地图将显示在此处。</p>
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
                  className="flex-shrink-0 w-12 h-12 object-contain mr-4 bg-checkered-pattern rounded-sm cursor-zoom-in" 
                  style={{ imageRendering: 'pixelated' }} 
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

const MapGenerator: React.FC<GeneratorProps> = ({ apiLock }) => {
  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<AssetRecord[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const assets = await getAssetsByType('map');
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
      const imageDataUrl = await generateTileset(prompt);
      setGeneratedImage(imageDataUrl);
      await addAsset({ type: 'map', prompt, imageDataUrl });
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
      await addAsset({ type: 'map', prompt: `已调整: ${adjustmentPrompt} (原始: ${prompt})`, imageDataUrl });
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
            await addAsset({ type: 'map', prompt: `已移除背景 (原始: ${prompt})`, imageDataUrl: newImageDataUrl });
            loadHistory();
        } catch (err) {
            setError(err instanceof Error ? `去背失败: ${err.message}` : '发生未知错误。');
            console.error(err);
        } finally {
            setIsRemovingBg(false);
            apiLock.unlockApi();
        }
    }, [generatedImage, prompt, apiLock, loadHistory]);

  const handleRestyle = useCallback(async () => {
    if (!uploadedImage || apiLock.isApiLocked) return;
    apiLock.lockApi();
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const finalPrompt = stylePrompt || "重绘风格的地图";
      const imageDataUrl = await restyleMapImage(uploadedImage, stylePrompt);
      setGeneratedImage(imageDataUrl);
      await addAsset({ type: 'map', prompt: finalPrompt, imageDataUrl });
      loadHistory();
    } catch (err) {
       setError(err instanceof Error ? `重绘风格失败: ${err.message}` : '发生未知错误。');
       console.error(err);
    } finally {
      setIsLoading(false);
      apiLock.unlockApi();
    }
  }, [uploadedImage, stylePrompt, apiLock, loadHistory]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setError(null);
      };
      reader.onerror = () => {
        setError("读取上传文件失败。");
      }
      reader.readAsDataURL(file);
    }
  };

  const handleSelectExample = (example: string) => {
    setPrompt(example);
  };
  
  const handleSelectHistoryItem = (item: AssetRecord) => {
    setPrompt(item.prompt);
    setGeneratedImage(item.imageDataUrl);
    setMode('generate');
    setError(null);
    setAdjustmentPrompt('');
  };


  const renderModeSwitcher = () => (
    <div className="flex justify-center bg-gray-800 p-2 rounded-lg mb-8 border-2 border-gray-700">
      <button
        onClick={() => setMode('generate')}
        disabled={apiLock.isApiLocked}
        className={`w-1/2 font-press-start text-lg py-3 rounded-md transition-colors ${mode === 'generate' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700 disabled:opacity-50'}`}
      >
        生成新图块
      </button>
      <button
        onClick={() => setMode('restyle')}
        disabled={apiLock.isApiLocked}
        className={`w-1/2 font-press-start text-lg py-3 rounded-md transition-colors ${mode === 'restyle' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700 disabled:opacity-50'}`}
      >
        重绘我的地图
      </button>
    </div>
  );

  const renderGenerateMode = () => (
    <>
      <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. 描述图块主题</h2>
      <p className="text-gray-300 mb-4 text-lg">描述一个主题，AI 将生成“原神”像素艺术风格的图块集。</p>
      
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="例如：一个宁静的村庄，有中央水井和舒适的小屋。"
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
                    {ex.split('，')[0]}...
                </button>
            ))}
        </div>
      </div>
      <Button onClick={handleGenerate} disabled={apiLock.isApiLocked || !prompt} className="mt-4 w-full">
        {isLoading ? '生成中...' : '生成图块集'}
      </Button>
    </>
  );

  const renderRestyleMode = () => (
    <>
        <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. 上传你的地图</h2>
        <p className="text-gray-300 mb-4 text-lg">上传你的 RPG Maker 地图截图。AI 将以“原神”像素艺术风格重绘它，用作视差背景。</p>
        
        <div 
            className="w-full h-48 p-3 bg-gray-900 border-2 border-dashed border-gray-600 rounded-md focus:outline-none hover:border-purple-500 transition-colors text-lg text-gray-200 flex items-center justify-center cursor-pointer"
            onClick={() => !apiLock.isApiLocked && fileInputRef.current?.click()}
        >
            {uploadedImage ? (
                <img 
                  src={uploadedImage} 
                  alt="上传地图预览" 
                  className="max-w-full max-h-full object-contain rounded cursor-zoom-in" 
                  onClick={(e) => { e.stopPropagation(); setPreviewImage(uploadedImage); }} 
                  title="点击放大预览"
                />
            ) : (
                <span className="text-gray-500 text-center">点击或拖放以上传地图截图</span>
            )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={apiLock.isApiLocked} />

        <div className="my-4">
            <p className="text-gray-300 mb-2 text-md">2. 添加风格说明 (可选)</p>
            <input
                type="text"
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                placeholder="例如：把它变成雨夜，添加更多花朵"
                className="w-full p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200"
                disabled={apiLock.isApiLocked || !uploadedImage}
            />
        </div>
        
        <Button onClick={handleRestyle} disabled={apiLock.isApiLocked || !uploadedImage} className="mt-4 w-full">
            {isLoading ? '重绘中...' : '重绘地图'}
        </Button>
    </>
  );

  return (
    <div>
      {previewImage && <ImagePreviewModal imageUrl={previewImage} altText="预览" onClose={() => setPreviewImage(null)} />}
      {renderModeSwitcher()}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
          {mode === 'generate' ? renderGenerateMode() : renderRestyleMode()}
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
          <div className='flex-grow'>
            <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">结果</h2>
            <SpriteDisplay
              isLoading={isLoading || isAdjusting}
              error={error}
              generatedImage={generatedImage}
              loadingText={isAdjusting ? '调整世界...' : (mode === 'generate' ? '构建图块集...' : '重绘你的世界...')}
              placeholder={
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <div className="w-32 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                        <span className="text-5xl">🖼️</span>
                    </div>
                    <p className="mt-4 text-xl">你生成的地图/图块集将显示在此处。</p>
                </div>
              }
              downloadFileName={mode === 'generate' ? 'genshin_tileset.png' : 'restyled_map.png'}
              imageAlt="生成的地图或图块集"
              imageContainerClassName="bg-checkered-pattern p-2 border-2 border-gray-600 rounded-md w-full"
              imageClassName="w-full h-auto object-contain max-h-[350px]"
              onRemoveBackground={handleRemoveBackground}
              isRemovingBackground={isRemovingBg}
            />
            {generatedImage && !isLoading && mode === 'generate' && (
                <AdjustmentInput 
                    adjustmentPrompt={adjustmentPrompt}
                    setAdjustmentPrompt={setAdjustmentPrompt}
                    handleAdjust={handleAdjust}
                    isAdjusting={isAdjusting}
                    disabled={apiLock.isApiLocked}
                />
            )}
          </div>
          <HistoryPanel history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteAsset} disabled={apiLock.isApiLocked} onImageClick={setPreviewImage}/>
        </div>
      </div>
    </div>
  );
};

export default MapGenerator;