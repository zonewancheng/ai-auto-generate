import React, { useState, useCallback, useEffect } from 'react';
import { 
  generateBaseCharacter, 
  generateWalkingSpriteFromImage,
  generateBattlerFromImage,
  generateFacesetFromImage,
  adjustGeneratedImage,
  addAsset,
  getAssetsByType,
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
    "A brave knight with shiny silver armor, a long red cape, and a gleaming sword.",
    "A wise old wizard with a long white beard, a pointy hat, and a glowing staff.",
    "A cheerful female bard with green clothes, a lute on her back, and blonde hair.",
    "A stealthy rogue dressed in dark leather armor, with a hood and two daggers.",
    "A futuristic cyborg soldier with glowing blue eyes and a plasma rifle.",
];

const HistoryPanel: React.FC<{ history: AssetRecord[], onSelect: (item: AssetRecord) => void, disabled: boolean }> = ({ history, onSelect, disabled }) => (
  <div className="mt-6 border-t-2 border-gray-700 pt-4">
    <h3 className="text-xl text-yellow-400 mb-2 font-press-start">History</h3>
    {history.length === 0 ? (
      <p className="text-gray-500">Your generated characters will appear here.</p>
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
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setBaseError(`Failed to generate character: ${errorMessage}`);
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
      await addAsset({ type: 'character', prompt: `Adjusted: ${adjustmentPrompt} (Original: ${prompt})`, imageDataUrl });
      loadHistory();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setBaseError(`Failed to adjust character: ${errorMessage}`);
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
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setStateError(stateSetter, `Generation failed: ${errorMessage}`);
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
        <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">Step 1: Describe Character</h2>
        <p className="text-gray-300 mb-4 text-lg">Be descriptive. The AI will generate a base character design from this prompt.</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A cyborg ninja with a katana and glowing red eyes"
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
                        {ex.split(' ')[2]} {ex.split(' ')[3]}
                    </button>
                ))}
            </div>
        </div>
        <Button onClick={handleGenerateBaseCharacter} disabled={apiLock.isApiLocked || !prompt} className="mt-4 w-full">
          {isGeneratingBase ? 'Generating...' : 'Generate Character'}
        </Button>
      </div>
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
        <div className='flex-grow'>
          <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">Result</h2>
          <SpriteDisplay 
            isLoading={isGeneratingBase || isAdjusting}
            error={baseError}
            generatedImage={baseImage}
            loadingText={isAdjusting ? "AI is adjusting your hero..." : "AI is crafting your hero..."}
            placeholder={
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-5xl">?</span>
                  </div>
                  <p className="text-xl">Your base character will appear here.</p>
              </div>
            }
            downloadFileName="base_character.png"
            imageAlt="Generated base character"
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
        <HistoryPanel history={history} onSelect={handleSelectHistoryItem} disabled={apiLock.isApiLocked} />
      </div>
    </div>
  );

  const renderGenerateStep = () => (
    <div>
        <div className="text-center mb-8">
            <h2 className="text-3xl text-yellow-400 font-press-start">Step 2: Generate Game Assets</h2>
            <p className="text-lg text-gray-300 mt-2">Use your base character to generate sprites for RPG Maker MZ.</p>
            <Button onClick={handleStartOver} disabled={apiLock.isApiLocked} className="mt-4 bg-red-600 border-red-800 hover:bg-red-500 hover:border-red-700 active:bg-red-700 active:border-red-900">
                Start Over
            </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 bg-gray-800 p-4 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col items-center justify-center">
                <h3 className="text-2xl text-yellow-400 mb-4 font-press-start text-center">Base Character</h3>
                <img src={baseImage!} alt="Base Character" className="p-2 bg-checkered-pattern rounded-md" style={{ imageRendering: 'pixelated' }} />
                <HistoryPanel history={history} onSelect={handleSelectHistoryItem} disabled={apiLock.isApiLocked} />
            </div>
             <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Walking Sprite */}
                <div className="bg-gray-800 p-4 rounded-lg shadow-inner border-2 border-gray-700 flex flex-col">
                    <h3 className="text-xl text-yellow-400 mb-4 font-press-start text-center">Walking Sprite</h3>
                    <div className="flex-grow">
                        <SpriteDisplay
                            isLoading={walkingSprite.isLoading}
                            error={walkingSprite.error}
                            generatedImage={walkingSprite.image}
                            loadingText="Generating..."
                            placeholder={<div className="text-center text-gray-500 p-4">Click below to generate a 144x192px walking sprite.</div>}
                            downloadFileName="walking_sprite.png"
                            imageAlt="Generated walking sprite"
                            imageClassName="w-[144px] h-[192px]"
                         />
                    </div>
                    <Button onClick={() => handleGenerateAsset('walking')} disabled={walkingSprite.isLoading || battlerSprite.isLoading || faceSprite.isLoading || apiLock.isApiLocked} className="mt-4 w-full">
                        {walkingSprite.isLoading ? 'Working...' : 'Generate'}
                    </Button>
                </div>

                {/* Battler Sprite */}
                 <div className="bg-gray-800 p-4 rounded-lg shadow-inner border-2 border-gray-700 flex flex-col">
                    <h3 className="text-xl text-yellow-400 mb-4 font-press-start text-center">Battler</h3>
                    <div className="flex-grow">
                        <SpriteDisplay
                            isLoading={battlerSprite.isLoading}
                            error={battlerSprite.error}
                            generatedImage={battlerSprite.image}
                            loadingText="Generating..."
                            placeholder={<div className="text-center text-gray-500 p-4">Click below to generate a side-view battle sprite.</div>}
                            downloadFileName="battler.png"
                            imageAlt="Generated battler sprite"
                         />
                    </div>
                    <Button onClick={() => handleGenerateAsset('battler')} disabled={walkingSprite.isLoading || battlerSprite.isLoading || faceSprite.isLoading || apiLock.isApiLocked} className="mt-4 w-full">
                        {battlerSprite.isLoading ? 'Working...' : 'Generate'}
                    </Button>
                </div>

                {/* Faceset Sprite */}
                 <div className="bg-gray-800 p-4 rounded-lg shadow-inner border-2 border-gray-700 flex flex-col">
                    <h3 className="text-xl text-yellow-400 mb-4 font-press-start text-center">Faceset</h3>
                    <div className="flex-grow">
                        <SpriteDisplay
                            isLoading={faceSprite.isLoading}
                            error={faceSprite.error}
                            generatedImage={faceSprite.image}
                            loadingText="Generating..."
                            placeholder={<div className="text-center text-gray-500 p-4">Click below to generate a 144x144px face portrait.</div>}
                            downloadFileName="faceset.png"
                            imageAlt="Generated faceset"
                            imageClassName="w-[144px] h-[144px]"
                         />
                    </div>
                    <Button onClick={() => handleGenerateAsset('faceset')} disabled={walkingSprite.isLoading || battlerSprite.isLoading || faceSprite.isLoading || apiLock.isApiLocked} className="mt-4 w-full">
                        {faceSprite.isLoading ? 'Working...' : 'Generate'}
                    </Button>
                </div>

             </div>
        </div>
    </div>
  );

  return step === 'describe' ? renderDescribeStep() : renderGenerateStep();
};

export default CharacterGenerator;
