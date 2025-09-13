
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  generateBaseCharacter, 
  generateWalkingSpriteFromImage,
  generateBattlerFromImage,
  generateFacesetFromImage,
  adjustGeneratedImage,
  optimizeCharacterImage,
  synthesizeCharacterFromParts,
  removeImageBackground,
  addAsset,
  getAssetsByType,
  deleteAsset,
  AssetRecord,
} from '../services/geminiService';
import Button from './Button';
import SpriteDisplay from './SpriteDisplay';
import AdjustmentInput from './AdjustmentInput';
import { GeneratorProps } from './GeneratorTabs';
import ImagePreviewModal from './ImagePreviewModal';
import { useTranslation } from '../services/i18n';

interface ResizeOptions {
    maxWidth: number;
    maxHeight: number;
    smoothing?: boolean;
}

const resizeImage = (dataUrl: string, options: ResizeOptions): Promise<string> => {
    return new Promise((resolve, reject) => {
        const { maxWidth, maxHeight, smoothing = false } = options;
        const img = new Image();
        img.onload = () => {
            const { width, height } = img;

            if (width <= maxWidth && height <= maxHeight) {
                resolve(dataUrl); // No resize needed
                return;
            }

            const ratio = Math.min(maxWidth / width, maxHeight / height);
            const newWidth = Math.round(width * ratio);
            const newHeight = Math.round(height * ratio);

            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error("Could not get canvas context"));
            }
            
            ctx.imageSmoothingEnabled = smoothing;
            if (smoothing) {
                 ctx.imageSmoothingQuality = 'high';
            }
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            resolve(canvas.toDataURL('image/png')); 
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = dataUrl;
    });
};

type AssetType = 'walking' | 'battler' | 'faceset';
type Mode = 'describe' | 'optimize' | 'synthesis';

interface AssetState {
  image: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialAssetState: AssetState = { image: null, isLoading: false, error: null };

// Fix: Moved this config up to be available for OptimizationChoice type alias.
const optimizationOptionsConfigData: { [key: string]: string } = {
    "sharpen": "Sharpen lines and details",
    "shading": "Enhance shadows and highlights",
    "colors": "Enrich and unify colors"
};
// FIX: Changed to use optimizationOptionsConfigData for type definition because optimizationOptionsConfig is not in scope here.
type OptimizationChoice = keyof typeof optimizationOptionsConfigData;

const HistoryPanel: React.FC<{ 
  history: AssetRecord[], 
  onSelect: (item: AssetRecord) => void, 
  onDelete: (id: number) => void,
  disabled: boolean,
  onImageClick: (url: string) => void,
}> = ({ history, onSelect, onDelete, disabled, onImageClick }) => {
  const { t } = useTranslation();

  const handleDelete = (e: React.MouseEvent, id: number | undefined) => {
    e.stopPropagation(); // Prevent onSelect from firing
    if (typeof id === 'number' && window.confirm(t('confirmDeleteHistory'))) {
      onDelete(id);
    }
  };

  return (
    <div className="mt-6 border-t-2 border-gray-700 pt-4">
      <h3 className="text-xl text-yellow-400 mb-2 font-press-start">{t('history')}</h3>
      {history.length === 0 ? (
        <p className="text-gray-500">{t('historyEmpty_character')}</p>
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
                  title={t('clickToZoom')}
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
                aria-label={t('delete')}
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
  const { t } = useTranslation();
  
  const placeholderExamples = JSON.parse(t('placeholderExamples_character'));
  const optimizationOptionsConfig = JSON.parse(t('optimizationOptions_character'));

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
  const [visibleAssets, setVisibleAssets] = useState<AssetType[]>([]);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);

  // State for optimization mode
  const [optimizationChoices, setOptimizationChoices] = useState<Record<OptimizationChoice, boolean>>({ sharpen: false, shading: false, colors: false });
  const [styleInfluence, setStyleInfluence] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // State for synthesis mode
  const [headImage, setHeadImage] = useState<string | null>(null);
  const [poseImage, setPoseImage] = useState<string | null>(null);
  const [clothesImage, setClothesImage] = useState<string | null>(null);
  const headFileInputRef = useRef<HTMLInputElement>(null);
  const poseFileInputRef = useRef<HTMLInputElement>(null);
  const clothesFileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRemovingBgFor, setIsRemovingBgFor] = useState<string | null>(null);


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
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      setBaseError(`${t('characterGenerationFailed')}: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsGeneratingBase(false);
      apiLock.unlockApi();
    }
  }, [prompt, apiLock, loadHistory, t]);

  const handleOptimizeCharacter = useCallback(async () => {
    const activeChoices = Object.entries(optimizationChoices)
        .filter(([, value]) => value)
        .map(([key]) => optimizationOptionsConfig[key as OptimizationChoice]);

    if (!uploadedImage || apiLock.isApiLocked || (activeChoices.length === 0 && !styleInfluence && !referenceImage)) return;

    apiLock.lockApi();
    setIsGeneratingBase(true); // Reuse the same loading state
    setBaseError(null);
    setBaseImage(null);

    // FIX: Changed to valid translation keys
    let optimizationPrompt = t('optimizationBasePrompt_character');
    if (activeChoices.length > 0) {
        optimizationPrompt += activeChoices.map(c => `- ${c}`).join('\n') + '\n';
    }
    if (styleInfluence) {
        // FIX: Changed to valid translation keys
        optimizationPrompt += t('optimizationStylePrompt_character', styleInfluence);
    }

    try {
      const imageDataUrl = await optimizeCharacterImage(uploadedImage, optimizationPrompt, referenceImage);
      setBaseImage(imageDataUrl);
      const dbPromptSummary = t('dbPrompt_optimized_character', {
        choices: activeChoices.join(', ') || t('none'),
        style: styleInfluence || t('none'),
        ref: referenceImage ? t('yes') : t('no')
      });
      setCurrentBasePrompt(dbPromptSummary);
      setStep('generate');
      
      await addAsset({ type: 'character', prompt: dbPromptSummary, imageDataUrl });
      loadHistory();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      setBaseError(`${t('optimizationFailed_character')}: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsGeneratingBase(false);
      apiLock.unlockApi();
    }
  }, [uploadedImage, optimizationChoices, styleInfluence, referenceImage, apiLock, loadHistory, t, optimizationOptionsConfig]);

  const handleSynthesizeCharacter = useCallback(async () => {
    if (!prompt || apiLock.isApiLocked || (!headImage && !poseImage && !clothesImage)) return;

    apiLock.lockApi();
    setIsGeneratingBase(true); // Reuse loading state
    setBaseError(null);
    setBaseImage(null);

    try {
      const parts = { head: headImage, pose: poseImage, clothes: clothesImage };
      const imageDataUrl = await synthesizeCharacterFromParts(parts, prompt);
      setBaseImage(imageDataUrl);
      setCurrentBasePrompt(prompt);
      setStep('generate');

      await addAsset({ type: 'character', prompt, imageDataUrl });
      loadHistory();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      setBaseError(`${t('synthesisFailed_character')}: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsGeneratingBase(false);
      apiLock.unlockApi();
    }
  }, [prompt, headImage, poseImage, clothesImage, apiLock, loadHistory, t]);


  const handleAdjustBaseCharacter = useCallback(async () => {
    if (!adjustmentPrompt || !baseImage || apiLock.isApiLocked) return;
    
    apiLock.lockApi();
    setIsAdjusting(true);
    setBaseError(null);
    
    try {
      const imageDataUrl = await adjustGeneratedImage(baseImage, adjustmentPrompt);
      setBaseImage(imageDataUrl);
      const newPrompt = t('dbPrompt_adjusted', adjustmentPrompt, currentBasePrompt);
      setCurrentBasePrompt(newPrompt);
      setAdjustmentPrompt(''); // Clear prompt after successful adjustment
      await addAsset({ type: 'character', prompt: newPrompt, imageDataUrl });
      loadHistory();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      setBaseError(`${t('adjustmentFailed')}: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsAdjusting(false);
      apiLock.unlockApi();
    }
  }, [adjustmentPrompt, baseImage, currentBasePrompt, apiLock, loadHistory, t]);

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
        const errorMessage = err instanceof Error ? err.message : t('unknownError');
        setStateError(stateSetter, `${t('generationFailed')}: ${errorMessage}`);
        console.error(err);
    } finally {
        apiLock.unlockApi();
    }
  }, [baseImage, apiLock, t]);

   const handleRemoveBg = useCallback(async (
      assetIdentifier: 'base' | AssetType,
      currentImage: string | null,
      imageSetter: (url: string) => void,
      errorSetter: (err: string | null) => void
    ) => {
      if (!currentImage || apiLock.isApiLocked) return;
      
      apiLock.lockApi();
      setIsRemovingBgFor(assetIdentifier);
      errorSetter(null);

      try {
        const newImageDataUrl = await removeImageBackground(currentImage);
        imageSetter(newImageDataUrl);
        if (assetIdentifier === 'base') {
          const newPrompt = t('dbPrompt_bgRemoved', currentBasePrompt);
          setCurrentBasePrompt(newPrompt);
          await addAsset({ type: 'character', prompt: newPrompt, imageDataUrl: newImageDataUrl });
          loadHistory();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? `${t('bgRemovalFailed')}: ${err.message}` : t('unknownError');
        errorSetter(errorMessage);
        console.error(err);
      } finally {
        setIsRemovingBgFor(null);
        apiLock.unlockApi();
      }
    }, [apiLock, currentBasePrompt, loadHistory, t]);

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
    setVisibleAssets([]);
    setUploadedImage(null);
    setOptimizationChoices({ sharpen: false, shading: false, colors: false });
    setStyleInfluence('');
    setReferenceImage(null);
    setHeadImage(null);
    setPoseImage(null);
    setClothesImage(null);
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
    setVisibleAssets([]);
    setBaseError(null);
    setAdjustmentPrompt('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalDataUrl = e.target?.result as string;
        if (!originalDataUrl) return;
        try {
            const resizedDataUrl = await resizeImage(originalDataUrl, { maxWidth: 512, maxHeight: 512, smoothing: false });
            setUploadedImage(resizedDataUrl);
            setBaseError(null);
        } catch (err) {
            console.error("Image processing failed:", err);
            setBaseError(t('imageProcessingError'));
        }
      };
      reader.onerror = () => {
        setBaseError(t('fileReadError'));
      }
      reader.readAsDataURL(file);
    }
  };

    const handlePartFileChange = (event: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const originalDataUrl = e.target?.result as string;
                if (!originalDataUrl) return;
                try {
                    const resizedDataUrl = await resizeImage(originalDataUrl, { maxWidth: 512, maxHeight: 512, smoothing: false });
                    setter(resizedDataUrl);
                } catch (err) {
                    console.error("Image processing failed:", err);
                    setBaseError(t('partImageProcessingError'));
                }
            };
            reader.readAsDataURL(file);
        }
        // Reset file input to allow re-uploading the same file
        if (event.target) {
            event.target.value = "";
        }
    };


  const handleReferenceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalDataUrl = e.target?.result as string;
        if (!originalDataUrl) return;
        try {
            const resizedDataUrl = await resizeImage(originalDataUrl, { maxWidth: 512, maxHeight: 512, smoothing: false });
            setReferenceImage(resizedDataUrl);
        } catch (err) {
            console.error("Image processing failed:", err);
            setBaseError(t('refImageProcessingError'));
        }
      };
      reader.onerror = () => {
        setBaseError(t('refFileReadError'));
      }
      reader.readAsDataURL(file);
    }
  };


  const handleOptimizationChoiceChange = (choice: OptimizationChoice) => {
    setOptimizationChoices(prev => ({ ...prev, [choice]: !prev[choice] }));
  };

  const handleShowAndGenerateAsset = (assetType: AssetType) => {
      if (!visibleAssets.includes(assetType)) {
          setVisibleAssets(prev => [...prev, assetType]);
      }
      handleGenerateAsset(assetType);
  };

  const isOptimizeButtonDisabled = apiLock.isApiLocked || !uploadedImage || (!Object.values(optimizationChoices).some(v => v) && !styleInfluence && !referenceImage);
  const isSynthesisButtonDisabled = apiLock.isApiLocked || !prompt || (!headImage && !poseImage && !clothesImage);

    const ImageUploadSlot: React.FC<{
        label: string;
        image: string | null;
        fileInputRef: React.RefObject<HTMLInputElement>;
        onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
        onRemove: () => void;
    }> = ({ label, image, fileInputRef, onFileChange, onRemove }) => (
        <div>
            <h3 className="text-lg text-yellow-400 mb-2 font-press-start">{label}</h3>
            {image ? (
                <div className="relative">
                    <div className="w-full h-32 p-2 bg-gray-900 border-2 border-gray-600 rounded-md flex items-center justify-center">
                        <img src={image} alt={`${label} preview`} className="max-w-full max-h-full object-contain rounded cursor-zoom-in" style={{ imageRendering: 'pixelated' }} onClick={() => setPreviewImage(image)} title={t('clickToZoom')} />
                    </div>
                    <div className="absolute bottom-2 right-2 flex gap-2">
                        <Button onClick={() => !apiLock.isApiLocked && fileInputRef.current?.click()} className="text-xs px-2 py-1 border-b-2 active:translate-y-px" disabled={apiLock.isApiLocked}>{t('change')}</Button>
                        <Button onClick={onRemove} className="text-xs px-2 py-1 border-b-2 active:translate-y-px bg-red-600 border-red-800 hover:bg-red-500" disabled={apiLock.isApiLocked}>{t('remove')}</Button>
                    </div>
                </div>
            ) : (
                <div className="w-full h-32 p-3 bg-gray-900 border-2 border-dashed border-gray-600 rounded-md hover:border-purple-500 flex items-center justify-center cursor-pointer transition-colors" onClick={() => !apiLock.isApiLocked && fileInputRef.current?.click()}>
                    <span className="text-gray-500 text-center text-3xl">+</span>
                </div>
            )}
            <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" disabled={apiLock.isApiLocked} />
        </div>
    );


  const renderDescribeStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {previewImage && <ImagePreviewModal imageUrl={previewImage} altText={t('previewAltText')} onClose={() => setPreviewImage(null)} />}
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
        <div className="flex justify-center bg-gray-900 p-2 rounded-lg mb-6 border-2 border-gray-700">
            <button
                onClick={() => setMode('describe')}
                disabled={apiLock.isApiLocked}
                className={`w-1/3 font-press-start text-sm py-3 rounded-md transition-colors ${mode === 'describe' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}
            >
                {t('mode_describe')}
            </button>
            <button
                onClick={() => setMode('optimize')}
                disabled={apiLock.isApiLocked}
                className={`w-1/3 font-press-start text-sm py-3 rounded-md transition-colors ${mode === 'optimize' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}
            >
                {t('mode_optimize')}
            </button>
            <button
                onClick={() => setMode('synthesis')}
                disabled={apiLock.isApiLocked}
                className={`w-1/3 font-press-start text-sm py-3 rounded-md transition-colors ${mode === 'synthesis' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}
            >
                {t('mode_synthesis')}
            </button>
        </div>
        
        {mode === 'describe' && (
          <>
            <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">{t('character_step1_title')}</h2>
            <p className="text-gray-300 mb-4 text-lg">{t('character_step1_desc')}</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('character_step1_placeholder')}
              className="w-full h-48 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
              disabled={apiLock.isApiLocked}
            />
             <div className="my-4">
                <p className="text-gray-400 mb-2 text-md">{t('tryExamples')}</p>
                <div className="flex flex-wrap gap-2">
                    {placeholderExamples.map((ex: { full: string; short: string; }, index: number) => (
                        <button 
                            key={index}
                            onClick={() => handleSelectExample(ex.full)}
                            disabled={apiLock.isApiLocked}
                            className="text-sm bg-gray-700 hover:bg-purple-600 text-gray-200 py-1 px-3 rounded-full transition-colors disabled:opacity-50"
                        >
                            {ex.short}...
                        </button>
                    ))}
                </div>
            </div>
            <Button onClick={handleGenerateBaseCharacter} disabled={apiLock.isApiLocked || !prompt} className="mt-4 w-full">
              {isGeneratingBase ? t('generating') : t('generateCharacter')}
            </Button>
          </>
        )}
        {mode === 'optimize' && (
          <>
            <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">{t('character_optimize_step1_title')}</h2>
            <p className="text-gray-300 mb-4 text-lg">{t('character_optimize_step1_desc')}</p>
            
            {uploadedImage ? (
              <div className="relative">
                <div className="w-full h-40 p-3 bg-gray-900 border-2 border-gray-600 rounded-md flex items-center justify-center">
                    <img 
                      src={uploadedImage} 
                      alt={t('uploadedCharacterPreview')} 
                      className="max-w-full max-h-full object-contain rounded cursor-zoom-in" 
                      style={{ imageRendering: 'pixelated' }} 
                      onClick={(e) => { e.stopPropagation(); setPreviewImage(uploadedImage); }} 
                      title={t('clickToZoom')} 
                    />
                </div>
                <Button 
                    onClick={() => !apiLock.isApiLocked && fileInputRef.current?.click()}
                    className="absolute bottom-4 right-4 text-sm px-4 py-2 border-b-2 active:translate-y-px"
                    disabled={apiLock.isApiLocked}
                >
                    {t('changeImage')}
                </Button>
              </div>
            ) : (
              <div 
                  className="w-full h-40 p-3 bg-gray-900 border-2 border-dashed border-gray-600 rounded-md hover:border-purple-500 flex items-center justify-center cursor-pointer transition-colors"
                  onClick={() => !apiLock.isApiLocked && fileInputRef.current?.click()}
              >
                  <span className="text-gray-500 text-center">{t('clickOrDropToUpload')}</span>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={apiLock.isApiLocked} />
            
            <h3 className="text-xl text-yellow-400 mt-4 mb-2 font-press-start">{t('character_optimize_step2_title')}</h3>
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
                        <span className="ml-3 text-gray-300">{label as string}</span>
                    </label>
                ))}
            </div>

            <h3 className="text-xl text-yellow-400 mt-4 mb-2 font-press-start">{t('character_optimize_step3_title')}</h3>
            <textarea
                value={styleInfluence}
                onChange={(e) => setStyleInfluence(e.target.value)}
                placeholder={t('character_optimize_step3_placeholder')}
                className="w-full h-20 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
                disabled={apiLock.isApiLocked || !uploadedImage}
            />

            <h3 className="text-xl text-yellow-400 mt-4 mb-2 font-press-start">{t('character_optimize_step4_title')}</h3>
            <p className="text-gray-300 mb-2 text-md">{t('character_optimize_step4_desc')}</p>
            <div 
                className="w-full h-24 p-2 bg-gray-900 border-2 border-dashed border-gray-600 rounded-md hover:border-purple-500 flex items-center justify-center cursor-pointer transition-colors"
                onClick={() => !apiLock.isApiLocked && referenceFileInputRef.current?.click()}
            >
                {referenceImage ? (
                    <img src={referenceImage} alt={t('refImagePreview')} className="max-w-full max-h-full object-contain rounded cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setPreviewImage(referenceImage); }} title={t('clickToZoom')} />
                ) : (
                    <span className="text-gray-500 text-center">{t('clickOrDropToUpload')}</span>
                )}
            </div>
            <input type="file" ref={referenceFileInputRef} onChange={handleReferenceFileChange} accept="image/*" className="hidden" disabled={apiLock.isApiLocked || !uploadedImage} />
            
            <Button onClick={handleOptimizeCharacter} disabled={isOptimizeButtonDisabled} className="mt-4 w-full">
                {isGeneratingBase ? t('optimizing') : t('optimizeCharacter')}
            </Button>
          </>
        )}
        {mode === 'synthesis' && (
          <>
            <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">{t('character_synthesis_step1_title')}</h2>
            <p className="text-gray-300 mb-4 text-lg">{t('character_synthesis_step1_desc')}</p>
            <div className="space-y-4">
                <ImageUploadSlot label={t('part_head')} image={headImage} fileInputRef={headFileInputRef} onFileChange={(e) => handlePartFileChange(e, setHeadImage)} onRemove={() => setHeadImage(null)} />
                <ImageUploadSlot label={t('part_pose')} image={poseImage} fileInputRef={poseFileInputRef} onFileChange={(e) => handlePartFileChange(e, setPoseImage)} onRemove={() => setPoseImage(null)} />
                <ImageUploadSlot label={t('part_clothes')} image={clothesImage} fileInputRef={clothesFileInputRef} onFileChange={(e) => handlePartFileChange(e, setClothesImage)} onRemove={() => setClothesImage(null)} />
            </div>

             <h3 className="text-xl text-yellow-400 mt-6 mb-2 font-press-start">{t('character_synthesis_step2_title')}</h3>
             <p className="text-gray-300 mb-2 text-md">{t('character_synthesis_step2_desc')}</p>
             <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('character_synthesis_step2_placeholder')}
              className="w-full h-24 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
              disabled={apiLock.isApiLocked}
            />

            <Button onClick={handleSynthesizeCharacter} disabled={isSynthesisButtonDisabled} className="mt-4 w-full">
                {isGeneratingBase ? t('synthesizing') : t('synthesizeCharacter')}
            </Button>
          </>
        )}
      </div>
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
        <div className='flex-grow'>
          <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">{t('results')}</h2>
          <SpriteDisplay 
            isLoading={isGeneratingBase || isAdjusting}
            error={baseError}
            generatedImage={baseImage}
            loadingText={isAdjusting ? t('loading_adjustingHero') : (mode === 'optimize' ? t('loading_optimizingHero') : (mode === 'synthesis' ? t('loading_synthesizingHero') : t('loading_creatingHero')))}
            placeholder={
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-5xl">?</span>
                  </div>
                  <p className="text-xl">{t('placeholder_baseCharacter')}</p>
              </div>
            }
            downloadFileName="base_character.png"
            imageAlt={t('generatedCharacterAlt')}
            onRemoveBackground={() => handleRemoveBg('base', baseImage, setBaseImage, (err) => setBaseError(err))}
            isRemovingBackground={isRemovingBgFor === 'base'}
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
        <HistoryPanel history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteAsset} disabled={apiLock.isApiLocked} onImageClick={setPreviewImage} />
      </div>
    </div>
  );

  const renderGenerateStep = () => {
      const isAnyAssetLoading = walkingSprite.isLoading || battlerSprite.isLoading || faceSprite.isLoading;

      const derivedAssetsConfig: {
          type: AssetType;
          title: string;
          spriteDisplayProps: Omit<React.ComponentProps<typeof SpriteDisplay>, 'isLoading' | 'error' | 'generatedImage'>;
          description: string;
      }[] = [
          { type: 'walking', title: t('asset_walking'), spriteDisplayProps: { imageClassName: "w-[144px] h-[192px]", downloadFileName: "walking_sprite.png", imageAlt: t('asset_walking'), loadingText: t('generating'), placeholder:<div/> }, description: "Generate a 144x192 walking sprite." },
          { type: 'battler', title: t('asset_battler'), spriteDisplayProps: { downloadFileName: "battler.png", imageAlt: t('asset_battler'), loadingText: t('generating'), placeholder:<div/> }, description: "Generate a side-view battler." },
          { type: 'faceset', title: t('asset_faceset'), spriteDisplayProps: { imageClassName: "w-[144px] h-[144px]", downloadFileName: "faceset.png", imageAlt: t('asset_faceset'), loadingText: t('generating'), placeholder:<div/> }, description: "Generate a 144x144 faceset." },
      ];

      const visibleDerivedAssets = derivedAssetsConfig.map(c => ({...c, state: c.type === 'walking' ? walkingSprite : c.type === 'battler' ? battlerSprite : faceSprite})).filter(c => visibleAssets.includes(c.type));
      const hiddenDerivedAssets = derivedAssetsConfig.filter(c => !visibleAssets.includes(c.type));

      const getButtonText = (state: AssetState) => {
          if (state.isLoading) return t('processing');
          if (state.error) return t('retry');
          if (state.image) return t('regenerate');
          return t('generate');
      };

      return (
          <div>
              {previewImage && <ImagePreviewModal imageUrl={previewImage} altText={t('previewAltText')} onClose={() => setPreviewImage(null)} />}
              <div className="text-center mb-8">
                  <h2 className="text-3xl text-yellow-400 font-press-start">{t('character_step2_title')}</h2>
                  <p className="text-lg text-gray-300 mt-2">{t('character_step2_desc')}</p>
                  <Button onClick={handleStartOver} disabled={apiLock.isApiLocked} className="mt-4 bg-red-600 border-red-800 hover:bg-red-500 hover:border-red-700 active:bg-red-700 active:border-red-900">
                      {t('startOver')}
                  </Button>
              </div>
              
              <div className="w-full border-t-4 border-dashed border-gray-600 my-8"></div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="lg:col-span-1 bg-gray-800 p-4 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
                      <h3 className="text-2xl text-yellow-400 mb-4 font-press-start text-center">{t('baseCharacter')}</h3>
                      <div className='flex-grow'>
                          <img
                              src={baseImage!}
                              alt={t('baseCharacter')}
                              className="p-2 bg-checkered-pattern rounded-md cursor-zoom-in transition-transform hover:scale-105 mx-auto"
                              style={{ imageRendering: 'pixelated' }}
                              onClick={() => setPreviewImage(baseImage)}
                              title={t('clickToZoom')}
                          />
                          <AdjustmentInput
                              adjustmentPrompt={adjustmentPrompt}
                              setAdjustmentPrompt={setAdjustmentPrompt}
                              handleAdjust={handleAdjustBaseCharacter}
                              isAdjusting={isAdjusting}
                              disabled={apiLock.isApiLocked}
                          />
                          {hiddenDerivedAssets.length > 0 && (
                            <div className="mt-6 border-t-2 border-gray-700 pt-4 text-center">
                                <h3 className="text-xl text-yellow-400 mb-4 font-press-start">{t('character_nextStep')}</h3>
                                <div className="flex flex-wrap gap-4 justify-center">
                                    {hiddenDerivedAssets.map(config => (
                                        <Button
                                            key={config.type}
                                            onClick={() => handleShowAndGenerateAsset(config.type)}
                                            disabled={isAnyAssetLoading || apiLock.isApiLocked}
                                            className="text-base px-4 py-2"
                                        >
                                            {t('generate')} {config.title}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                          )}
                      </div>
                      <HistoryPanel history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteAsset} disabled={apiLock.isApiLocked} onImageClick={setPreviewImage} />
                  </div>

                  <div className="lg:col-span-1">
                    {visibleDerivedAssets.length === 0 && (
                        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 h-full flex flex-col items-center justify-center text-center text-gray-500">
                            <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-5xl">➡️</span>
                            </div>
                            <p className="text-xl font-press-start">{t('derivedAssets')}</p>
                            <p className="mt-2 text-lg">{t('placeholder_derivedAssets')}</p>
                        </div>
                    )}
                    <div className="space-y-6">
                        {visibleDerivedAssets.map(config => (
                            <div key={config.type} className="bg-gray-800 p-4 rounded-lg shadow-inner border-2 border-gray-700 flex flex-col">
                                <h3 className="text-xl text-yellow-400 mb-4 font-press-start text-center">{config.title}</h3>
                                <div className="flex-grow">
                                    <SpriteDisplay
                                        isLoading={config.state.isLoading}
                                        error={config.state.error}
                                        generatedImage={config.state.image}
                                        onRemoveBackground={() => {
                                            let imageSetter: ((url: string) => void) | undefined;
                                            let errorSetter: ((err: string | null) => void) | undefined;
                                            if (config.type === 'walking') { imageSetter = (url) => setWalkingSprite(s => ({ ...s, image: url, error: null })); errorSetter = (err) => setWalkingSprite(s => ({ ...s, error: err })); }
                                            if (config.type === 'battler') { imageSetter = (url) => setBattlerSprite(s => ({ ...s, image: url, error: null })); errorSetter = (err) => setBattlerSprite(s => ({ ...s, error: err })); }
                                            if (config.type === 'faceset') { imageSetter = (url) => setFaceSprite(s => ({ ...s, image: url, error: null })); errorSetter = (err) => setFaceSprite(s => ({ ...s, error: err })); }
                                            if (imageSetter && errorSetter) {
                                                handleRemoveBg(config.type, config.state.image, imageSetter, errorSetter);
                                            }
                                        }}
                                        isRemovingBackground={isRemovingBgFor === config.type}
                                        {...config.spriteDisplayProps}
                                    />
                                </div>
                                <Button onClick={() => handleGenerateAsset(config.type)} disabled={isAnyAssetLoading || apiLock.isApiLocked} className="mt-4 w-full">
                                    {getButtonText(config.state)}
                                </Button>
                            </div>
                        ))}
                    </div>
                  </div>
              </div>
          </div>
      );
  }

  return step === 'describe' ? renderDescribeStep() : renderGenerateStep();
};

export default CharacterGenerator;
