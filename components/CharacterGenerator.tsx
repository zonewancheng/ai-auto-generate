
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  generateBaseCharacter, 
  generateWalkingSpriteFromImage,
  generateBattlerFromImage,
  generateFacesetFromImage,
  adjustGeneratedImage,
  optimizeCharacterImage,
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
type Mode = 'describe' | 'optimize';

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

const optimizationOptionsConfig = {
    sharpen: "锐化线条和细节",
    shading: "增强阴影和高光",
    colors: "丰富并统一色彩",
};
type OptimizationChoice = keyof typeof optimizationOptionsConfig;

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
  const [mode, setMode] = useState<Mode>('describe');
  const [prompt, setPrompt] = useState('');
  const [currentBasePrompt, setCurrentBasePrompt] = useState('');
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [history, setHistory] = useState<AssetRecord[]>([]);

  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [isGeneratingBase, setIsGeneratingBase] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [baseError, setBaseError] = useState<string | null>(null);

  const [walkingSprite, setWalkingSprite] = useState<AssetState>(initialAssetState);
  const [battlerSprite, setBattlerSprite] = useState<AssetState>(initialAssetState);
  const [faceSprite, setFaceSprite] = useState<AssetState>(initialAssetState);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);

  // State for optimization mode
  const [optimizationChoices, setOptimizationChoices] = useState<Record<OptimizationChoice, boolean>>({ sharpen: false, shading: false, colors: false });
  const [styleInfluence, setStyleInfluence] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);


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
      setCurrentBasePrompt(prompt);
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

  const handleOptimizeCharacter = useCallback(async () => {
    const activeChoices = Object.entries(optimizationChoices)
        .filter(([, value]) => value)
        .map(([key]) => optimizationOptionsConfig[key as OptimizationChoice]);

    if (!uploadedImage || apiLock.isApiLocked || (activeChoices.length === 0 && !styleInfluence && !referenceImage)) return;

    apiLock.lockApi();
    setIsGeneratingBase(true); // Reuse the same loading state
    setBaseError(null);
    setBaseImage(null);

    let optimizationPrompt = "请对提供的像素图进行以下优化：\n";
    if (activeChoices.length > 0) {
        optimizationPrompt += activeChoices.map(c => `- ${c}`).join('\n') + '\n';
    }
    if (styleInfluence) {
        optimizationPrompt += `请参考以下艺术风格：${styleInfluence}`;
    }

    try {
      const imageDataUrl = await optimizeCharacterImage(uploadedImage, optimizationPrompt, referenceImage);
      setBaseImage(imageDataUrl);
      const dbPromptSummary = `已优化: ${activeChoices.join(', ') || '无'} | 风格: ${styleInfluence || '无'} | 参考图: ${referenceImage ? '有' : '无'}`;
      setCurrentBasePrompt(dbPromptSummary);
      setStep('generate');
      
      await addAsset({ type: 'character', prompt: dbPromptSummary, imageDataUrl });
      loadHistory();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误。';
      setBaseError(`优化角色失败: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsGeneratingBase(false);
      apiLock.unlockApi();
    }
  }, [uploadedImage, optimizationChoices, styleInfluence, referenceImage, apiLock, loadHistory]);


  const handleAdjustBaseCharacter = useCallback(async () => {
    if (!adjustmentPrompt || !baseImage || apiLock.isApiLocked) return;
    
    apiLock.lockApi();
    setIsAdjusting(true);
    setBaseError(null);
    
    try {
      const imageDataUrl = await adjustGeneratedImage(baseImage, adjustmentPrompt);
      setBaseImage(imageDataUrl);
      const newPrompt = `已调整: ${adjustmentPrompt} (原始: ${currentBasePrompt})`;
      setCurrentBasePrompt(newPrompt);
      setAdjustmentPrompt(''); // Clear prompt after successful adjustment
      await addAsset({ type: 'character', prompt: newPrompt, imageDataUrl });
      loadHistory();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误。';
      setBaseError(`调整角色失败: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsAdjusting(false);
      apiLock.unlockApi();
    }
  }, [adjustmentPrompt, baseImage, currentBasePrompt, apiLock, loadHistory]);

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
    setMode('describe');
    setPrompt('');
    setCurrentBasePrompt('');
    setBaseImage(null);
    setBaseError(null);
    setAdjustmentPrompt('');
    setWalkingSprite(initialAssetState);
    setBattlerSprite(initialAssetState);
    setFaceSprite(initialAssetState);
    setUploadedImage(null);
    setOptimizationChoices({ sharpen: false, shading: false, colors: false });
    setStyleInfluence('');
    setReferenceImage(null);
  };
  
  const handleSelectExample = (example: string) => {
    setPrompt(example);
  };

  const handleSelectHistoryItem = (item: AssetRecord) => {
    setPrompt(item.prompt);
    setCurrentBasePrompt(item.prompt);
    setBaseImage(item.imageDataUrl);
    setStep('generate');
    // Reset derived assets when loading from history
    setWalkingSprite(initialAssetState);
    setBattlerSprite(initialAssetState);
    setFaceSprite(initialAssetState);
    setBaseError(null);
    setAdjustmentPrompt('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setBaseError(null);
      };
      reader.onerror = () => {
        setBaseError("读取上传文件失败。");
      }
      reader.readAsDataURL(file);
    }
  };

  const handleReferenceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setReferenceImage(e.target?.result as string);
      };
      reader.onerror = () => {
        setBaseError("读取参考文件失败。");
      }
      reader.readAsDataURL(file);
    }
  };


  const handleOptimizationChoiceChange = (choice: OptimizationChoice) => {
    setOptimizationChoices(prev => ({ ...prev, [choice]: !prev[choice] }));
  };

  const isOptimizeButtonDisabled = apiLock.isApiLocked || !uploadedImage || (!Object.values(optimizationChoices).some(v => v) && !styleInfluence && !referenceImage);

  const renderDescribeStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
        <div className="flex justify-center bg-gray-900 p-2 rounded-lg mb-6 border-2 border-gray-700">
            <button
                onClick={() => setMode('describe')}
                disabled={apiLock.isApiLocked}
                className={`w-1/2 font-press-start text-base py-3 rounded-md transition-colors ${mode === 'describe' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}
            >
                描述生成
            </button>
            <button
                onClick={() => setMode('optimize')}
                disabled={apiLock.isApiLocked}
                className={`w-1/2 font-press-start text-base py-3 rounded-md transition-colors ${mode === 'optimize' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}
            >
                优化图片
            </button>
        </div>
        
        {mode === 'describe' ? (
          <>
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
          </>
        ) : (
          <>
            <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">第一步：上传角色图片</h2>
            <p className="text-gray-300 mb-4 text-lg">上传你的像素图角色，AI 将会优化它，同时保持原图尺寸。</p>
            <div 
                className="w-full h-40 p-3 bg-gray-900 border-2 border-dashed border-gray-600 rounded-md hover:border-purple-500 flex items-center justify-center cursor-pointer transition-colors"
                onClick={() => !apiLock.isApiLocked && fileInputRef.current?.click()}
            >
                {uploadedImage ? (
                    <img src={uploadedImage} alt="上传角色预览" className="max-w-full max-h-full object-contain rounded" style={{ imageRendering: 'pixelated' }} />
                ) : (
                    <span className="text-gray-500 text-center">点击或拖放上传</span>
                )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={apiLock.isApiLocked} />
            
            <h3 className="text-xl text-yellow-400 mt-4 mb-2 font-press-start">第二步：选择优化选项</h3>
            <div className="space-y-2 text-lg">
                {Object.entries(optimizationOptionsConfig).map(([key, label]) => (
                    <label key={key} className="flex items-center p-2 bg-gray-900 rounded-md cursor-pointer hover:bg-gray-700">
                        <input
                            type="checkbox"
                            checked={optimizationChoices[key as OptimizationChoice]}
                            onChange={() => handleOptimizationChoiceChange(key as OptimizationChoice)}
                            disabled={apiLock.isApiLocked || !uploadedImage}
                            className="w-5 h-5 bg-gray-700 border-gray-500 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-gray-300">{label}</span>
                    </label>
                ))}
            </div>

            <h3 className="text-xl text-yellow-400 mt-4 mb-2 font-press-start">第三步：指定参考风格 (可选)</h3>
            <textarea
                value={styleInfluence}
                onChange={(e) => setStyleInfluence(e.target.value)}
                placeholder="例如：风格更接近《八方旅人》，增加赛博朋克元素。"
                className="w-full h-20 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
                disabled={apiLock.isApiLocked || !uploadedImage}
            />

            <h3 className="text-xl text-yellow-400 mt-4 mb-2 font-press-start">第四步：上传参考图片 (可选)</h3>
            <p className="text-gray-300 mb-2 text-md">上传一张图片作为风格参考，AI 将模仿其画风。</p>
            <div 
                className="w-full h-24 p-2 bg-gray-900 border-2 border-dashed border-gray-600 rounded-md hover:border-purple-500 flex items-center justify-center cursor-pointer transition-colors"
                onClick={() => !apiLock.isApiLocked && referenceFileInputRef.current?.click()}
            >
                {referenceImage ? (
                    <img src={referenceImage} alt="参考图片预览" className="max-w-full max-h-full object-contain rounded" />
                ) : (
                    <span className="text-gray-500 text-center">点击或拖放上传</span>
                )}
            </div>
            <input type="file" ref={referenceFileInputRef} onChange={handleReferenceFileChange} accept="image/*" className="hidden" disabled={apiLock.isApiLocked || !uploadedImage} />
            
            <Button onClick={handleOptimizeCharacter} disabled={isOptimizeButtonDisabled} className="mt-4 w-full">
                {isGeneratingBase ? '优化中...' : '优化角色'}
            </Button>
          </>
        )}
      </div>
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
        <div className='flex-grow'>
          <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">结果</h2>
          <SpriteDisplay 
            isLoading={isGeneratingBase || isAdjusting}
            error={baseError}
            generatedImage={baseImage}
            loadingText={isAdjusting ? "AI 正在调整你的英雄..." : (mode === 'optimize' ? "AI 正在优化你的英雄..." : "AI 正在塑造你的英雄...")}
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
                <div className='flex-grow'>
                    <img src={baseImage!} alt="基础角色" className="p-2 bg-checkered-pattern rounded-md" style={{ imageRendering: 'pixelated' }} />
                    <AdjustmentInput
                        adjustmentPrompt={adjustmentPrompt}
                        setAdjustmentPrompt={setAdjustmentPrompt}
                        handleAdjust={handleAdjustBaseCharacter}
                        isAdjusting={isAdjusting}
                        disabled={apiLock.isApiLocked}
                    />
                </div>
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
