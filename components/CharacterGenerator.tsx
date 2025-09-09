
import React, { useState, useCallback, useEffect } from 'react';
import { 
  generateBaseCharacter, 
  generateWalkingSpriteFromImage,
  generateBattlerFromImage,
  generateFacesetFromImage,
  adjustGeneratedImage,
  addAsset,
  getAssetsByType,
  deleteAsset,
  AssetRecord,
} from '../services/geminiService';
import Button from './Button';
import SpriteDisplay from './SpriteDisplay';
import AdjustmentInput from './AdjustmentInput';
import { GeneratorProps } from './GeneratorTabs';


type AssetType = 'walking' | 'battler' | 'faceset';

interface AssetState {
  image: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialAssetState: AssetState = { image: null, isLoading: false, error: null };

const placeholderExamples = [
    "一位勇敢的骑士，身穿闪亮的银色盔甲，披着红色长披风，手持一把闪闪发光的剑。",
    "一位智慧的老法师，留着长长的白胡子，戴着一顶尖顶帽，手持一根发光的手杖。",
    "一位开朗的女吟游诗人，身穿绿色衣服，背着一把鲁特琴，留着一头金发。",
    "一位潜行的盗贼，身穿深色皮甲，戴着兜帽，手持两把匕首。",
    "一位未来的半机械人战士，拥有发光的蓝色眼睛和一把等离子步枪。",
];

const HistoryPanel: React.FC<{ 
  history: AssetRecord[], 
  onSelect: (item: AssetRecord) => void, 
  onDelete: (id: number) => void,
  disabled: boolean 
}> = ({ history, onSelect, onDelete, disabled }) => {

  const handleDelete = (e: React.MouseEvent, id: number | undefined) => {
    e.stopPropagation(); // Prevent onSelect from firing
    if (typeof id === 'number' && window.confirm('你确定要删除这条历史记录吗？')) {
      onDelete(id);
    }
  };

  return (
    <div className="mt-6 border-t-2 border-gray-700 pt-4">
      <h3 className="text-xl text-yellow-400 mb-2 font-press-start">历史记录</h3>
      {history.length === 0 ? (
        <p className="text-gray-500">你生成的角色将显示在此处。</p>
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


const CharacterGenerator: React.FC<GeneratorProps> = ({ apiLock }) => {
  const [step, setStep] = useState<'describe' | 'generate'>('describe');
  const [prompt, setPrompt] = useState('');
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [history, setHistory] = useState<AssetRecord[]>([]);

  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [isGeneratingBase, setIsGeneratingBase] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [baseError, setBaseError] = useState<string | null>(null);

  const [walkingSprite, setWalkingSprite] = useState<AssetState>(initialAssetState);
  const [battlerSprite, setBattlerSprite] = useState<AssetState>(initialAssetState);
  const [faceSprite, setFaceSprite] = useState<AssetState>(initialAssetState);

  const loadHistory = useCallback(async () => {
    try {
      const assets = await getAssetsByType('character');
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
      // Optionally show an error message to the user
    }
  };

  const handleGenerateBaseCharacter = useCallback(async () => {
    if (!prompt || apiLock.isApiLocked) return;

    apiLock.lockApi();
    setIsGeneratingBase(true);
    setBaseError(null);
    setBaseImage(null);
    setAdjustmentPrompt('');

    try {
      const imageDataUrl = await generateBaseCharacter(prompt);
      setBaseImage(imageDataUrl);
      setStep('generate');
      await addAsset({ type: 'character', prompt, imageDataUrl });
      loadHistory();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误。';
      setBaseError(`生成角色失败: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsGeneratingBase(false);
      apiLock.unlockApi();
    }
  }, [prompt, apiLock, loadHistory]);

  const handleAdjustBaseCharacter = useCallback(async () => {
    if (!adjustmentPrompt || !baseImage || apiLock.isApiLocked) return;
    
    apiLock.lockApi();
    setIsAdjusting(true);
    setBaseError(null);
    
    try {
      const imageDataUrl = await adjustGeneratedImage(baseImage, adjustmentPrompt);
      setBaseImage(imageDataUrl);
      setAdjustmentPrompt(''); // Clear prompt after successful adjustment
      await addAsset({ type: 'character', prompt: `已调整: ${adjustmentPrompt} (原始: ${prompt})`, imageDataUrl });
      loadHistory();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误。';
      setBaseError(`调整角色失败: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsAdjusting(false);
      apiLock.unlockApi();
    }
  }, [adjustmentPrompt, baseImage, prompt, apiLock, loadHistory]);

  const handleGenerateAsset = useCallback(async (assetType: AssetType) => {
    if (!baseImage || apiLock.isApiLocked) return;

    apiLock.lockApi();

    const setStateLoading = (setter: React.Dispatch<React.SetStateAction<AssetState>>) => setter(prev => ({ ...prev, isLoading: true, error: null }));
    const setStateResult = (setter: React.Dispatch<React.SetStateAction<AssetState>>, image: string) => setter({ image, isLoading: false, error: null });
    const setStateError = (setter: React.Dispatch<React.SetStateAction<AssetState>>, error: string) => setter({ image: null, isLoading: false, error });

    let serviceCall: (base64: string) => Promise<string>;
    let stateSetter: React.Dispatch<React.SetStateAction<AssetState>>;

    switch(assetType) {
        case 'walking':
            serviceCall = generateWalkingSpriteFromImage;
            stateSetter = setWalkingSprite;
            break;
        case 'battler':
            serviceCall = generateBattlerFromImage;
            stateSetter = setBattlerSprite;
            break;
        case 'faceset':
            serviceCall = generateFacesetFromImage;
            stateSetter = setFaceSprite;
            break;
    }

    setStateLoading(stateSetter);
    try {
        const imageDataUrl = await serviceCall(baseImage);
        setStateResult(stateSetter, imageDataUrl);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : '发生未知错误。';
        setStateError(stateSetter, `生成失败: ${errorMessage}`);
        console.error(err);
    } finally {
        apiLock.unlockApi();
    }
  }, [baseImage, apiLock]);

  const handleStartOver = () => {
    setStep('describe');
    setPrompt('');
    setBaseImage(null);
    setBaseError(null);
    setAdjustmentPrompt('');
    setWalkingSprite(initialAssetState);
    setBattlerSprite(initialAssetState);
    setFaceSprite(initialAssetState);
  };
  
  const handleSelectExample = (example: string) => {
    setPrompt(example);
  };

  const handleSelectHistoryItem = (item: AssetRecord) => {
    setPrompt(item.prompt);
    setBaseImage(item.imageDataUrl);
    setStep('generate');
    // Reset derived assets when loading from history
    setWalkingSprite(initialAssetState);
    setBattlerSprite(initialAssetState);
    setFaceSprite(initialAssetState);
    setBaseError(null);
    setAdjustmentPrompt('');
  };

  const renderDescribeStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
        <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">第一步：描述角色</h2>
        <p className="text-gray-300 mb-4 text-lg">请详细描述。AI 将根据你的提示生成基础角色设计。</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例如：一个持武士刀、眼睛发红光的赛博格忍者"
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
        <Button onClick={handleGenerateBaseCharacter} disabled={apiLock.isApiLocked || !prompt} className="mt-4 w-full">
          {isGeneratingBase ? '生成中...' : '生成角色'}
        </Button>
      </div>
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
        <div className='flex-grow'>
          <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">结果</h2>
          <SpriteDisplay 
            isLoading={isGeneratingBase || isAdjusting}
            error={baseError}
            generatedImage={baseImage}
            loadingText={isAdjusting ? "AI 正在调整你的英雄..." : "AI 正在塑造你的英雄..."}
            placeholder={
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-5xl">?</span>
                  </div>
                  <p className="text-xl">你的基础角色将显示在此处。</p>
              </div>
            }
            downloadFileName="base_character.png"
            imageAlt="生成的角色"
          />
          {baseImage && !isGeneratingBase && (
              <AdjustmentInput
                  adjustmentPrompt={adjustmentPrompt}
                  setAdjustmentPrompt={setAdjustmentPrompt}
                  handleAdjust={handleAdjustBaseCharacter}
                  isAdjusting={isAdjusting}
                  disabled={apiLock.isApiLocked}
              />
          )}
        </div>
        <HistoryPanel history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteAsset} disabled={apiLock.isApiLocked} />
      </div>
    </div>
  );

  const renderGenerateStep = () => (
    <div>
        <div className="text-center mb-8">
            <h2 className="text-3xl text-yellow-400 font-press-start">第二步：生成游戏资源</h2>
            <p className="text-lg text-gray-300 mt-2">使用你的基础角色为 RPG Maker MZ 生成配套资源。</p>
            <Button onClick={handleStartOver} disabled={apiLock.isApiLocked} className="mt-4 bg-red-600 border-red-800 hover:bg-red-500 hover:border-red-700 active:bg-red-700 active:border-red-900">
                重新开始
            </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 bg-gray-800 p-4 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
                <h3 className="text-2xl text-yellow-400 mb-4 font-press-start text-center">基础角色</h3>
                <img src={baseImage!} alt="基础角色" className="p-2 bg-checkered-pattern rounded-md" style={{ imageRendering: 'pixelated' }} />
                <HistoryPanel history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteAsset} disabled={apiLock.isApiLocked} />
            </div>
             <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Walking Sprite */}
                <div className="bg-gray-800 p-4 rounded-lg shadow-inner border-2 border-gray-700 flex flex-col">
                    <h3 className="text-xl text-yellow-400 mb-4 font-press-start text-center">行走图</h3>
                    <div className="flex-grow">
                        <SpriteDisplay
                            isLoading={walkingSprite.isLoading}
                            error={walkingSprite.error}
                            generatedImage={walkingSprite.image}
                            loadingText="生成中..."
                            placeholder={<div className="text-center text-gray-500 p-4">点击下方生成 144x192 像素的行走图。</div>}
                            downloadFileName="walking_sprite.png"
                            imageAlt="生成的行走图"
                            imageClassName="w-[144px] h-[192px]"
                         />
                    </div>
                    <Button onClick={() => handleGenerateAsset('walking')} disabled={walkingSprite.isLoading || battlerSprite.isLoading || faceSprite.isLoading || apiLock.isApiLocked} className="mt-4 w-full">
                        {walkingSprite.isLoading ? '处理中...' : '生成'}
                    </Button>
                </div>

                {/* Battler Sprite */}
                 <div className="bg-gray-800 p-4 rounded-lg shadow-inner border-2 border-gray-700 flex flex-col">
                    <h3 className="text-xl text-yellow-400 mb-4 font-press-start text-center">战斗图</h3>
                    <div className="flex-grow">
                        <SpriteDisplay
                            isLoading={battlerSprite.isLoading}
                            error={battlerSprite.error}
                            generatedImage={battlerSprite.image}
                            loadingText="生成中..."
                            placeholder={<div className="text-center text-gray-500 p-4">点击下方生成侧视图战斗图。</div>}
                            downloadFileName="battler.png"
                            imageAlt="生成的战斗图"
                         />
                    </div>
                    <Button onClick={() => handleGenerateAsset('battler')} disabled={walkingSprite.isLoading || battlerSprite.isLoading || faceSprite.isLoading || apiLock.isApiLocked} className="mt-4 w-full">
                        {battlerSprite.isLoading ? '处理中...' : '生成'}
                    </Button>
                </div>

                {/* Faceset Sprite */}
                 <div className="bg-gray-800 p-4 rounded-lg shadow-inner border-2 border-gray-700 flex flex-col">
                    <h3 className="text-xl text-yellow-400 mb-4 font-press-start text-center">脸图</h3>
                    <div className="flex-grow">
                        <SpriteDisplay
                            isLoading={faceSprite.isLoading}
                            error={faceSprite.error}
                            generatedImage={faceSprite.image}
                            loadingText="生成中..."
                            placeholder={<div className="text-center text-gray-500 p-4">点击下方生成 144x144 像素的脸图。</div>}
                            downloadFileName="faceset.png"
                            imageAlt="生成的脸图"
                            imageClassName="w-[144px] h-[144px]"
                         />
                    </div>
                    <Button onClick={() => handleGenerateAsset('faceset')} disabled={walkingSprite.isLoading || battlerSprite.isLoading || faceSprite.isLoading || apiLock.isApiLocked} className="mt-4 w-full">
                        {faceSprite.isLoading ? '处理中...' : '生成'}
                    </Button>
                </div>

             </div>
        </div>
    </div>
  );

  return step === 'describe' ? renderDescribeStep() : renderGenerateStep();
};

export default CharacterGenerator;
