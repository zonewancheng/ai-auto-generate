import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateTileset, restyleMapImage, adjustGeneratedImage, addAsset, getAssetsByType, AssetRecord } from '../services/geminiService';
import Button from './Button';
import SpriteDisplay from './SpriteDisplay';
import AdjustmentInput from './AdjustmentInput';
import { GeneratorProps } from './GeneratorTabs';

type Mode = 'generate' | 'restyle';

const placeholderExamples = [
    "Mystical forest with glowing mushrooms and ancient, mossy trees.",
    "Ancient desert ruins with sandstone columns and a hidden oasis.",
    "A bustling port town with wooden docks, ships, and market stalls.",
    "A serene mountain temple surrounded by cherry blossom trees.",
    "A crystal-filled cavern with luminous gems and underground rivers.",
];

const HistoryPanel: React.FC<{ history: AssetRecord[], onSelect: (item: AssetRecord) => void, disabled: boolean }> = ({ history, onSelect, disabled }) => (
  <div className="mt-6 border-t-2 border-gray-700 pt-4">
    <h3 className="text-xl text-yellow-400 mb-2 font-press-start">History</h3>
    {history.length === 0 ? (
      <p className="text-gray-500">Your generated maps will appear here.</p>
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
      await addAsset({ type: 'map', prompt: `Adjusted: ${adjustmentPrompt} (Original: ${prompt})`, imageDataUrl });
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? `Adjustment failed: ${err.message}` : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsAdjusting(false);
      apiLock.unlockApi();
    }
  }, [adjustmentPrompt, generatedImage, prompt, apiLock, loadHistory]);

  const handleRestyle = useCallback(async () => {
    if (!uploadedImage || apiLock.isApiLocked) return;
    apiLock.lockApi();
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const finalPrompt = stylePrompt || "Restyled map";
      const imageDataUrl = await restyleMapImage(uploadedImage, stylePrompt);
      setGeneratedImage(imageDataUrl);
      await addAsset({ type: 'map', prompt: finalPrompt, imageDataUrl });
      loadHistory();
    } catch (err) {
       setError(err instanceof Error ? `Restyling failed: ${err.message}` : 'An unknown error occurred.');
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
        setError("Failed to read the uploaded file.");
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
        Generate New Tileset
      </button>
      <button
        onClick={() => setMode('restyle')}
        disabled={apiLock.isApiLocked}
        className={`w-1/2 font-press-start text-lg py-3 rounded-md transition-colors ${mode === 'restyle' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700 disabled:opacity-50'}`}
      >
        Restyle My Map
      </button>
    </div>
  );

  const renderGenerateMode = () => (
    <>
      <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. Describe Tileset Theme</h2>
      <p className="text-gray-300 mb-4 text-lg">Describe a theme. The AI will generate a tileset with a "Genshin Impact" pixel art style.</p>
      
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., A peaceful village with a central well and cozy cottages."
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
        {isLoading ? 'Generating...' : 'Generate Tileset'}
      </Button>
    </>
  );

  const renderRestyleMode = () => (
    <>
        <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. Upload Your Map</h2>
        <p className="text-gray-300 mb-4 text-lg">Upload a screenshot of your RPG Maker map. The AI will redraw it in a "Genshin Impact" pixel art style to be used as a parallax background.</p>
        
        <div 
            className="w-full h-48 p-3 bg-gray-900 border-2 border-dashed border-gray-600 rounded-md focus:outline-none hover:border-purple-500 transition-colors text-lg text-gray-200 flex items-center justify-center cursor-pointer"
            onClick={() => !apiLock.isApiLocked && fileInputRef.current?.click()}
        >
            {uploadedImage ? (
                <img src={uploadedImage} alt="Uploaded map preview" className="max-w-full max-h-full object-contain rounded" />
            ) : (
                <span className="text-gray-500 text-center">Click or drag & drop to upload map screenshot</span>
            )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={apiLock.isApiLocked} />

        <div className="my-4">
            <p className="text-gray-300 mb-2 text-md">2. Add Style Notes (Optional)</p>
            <input
                type="text"
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                placeholder="e.g., make it a rainy night, add more flowers"
                className="w-full p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200"
                disabled={apiLock.isApiLocked || !uploadedImage}
            />
        </div>
        
        <Button onClick={handleRestyle} disabled={apiLock.isApiLocked || !uploadedImage} className="mt-4 w-full">
            {isLoading ? 'Restyling...' : 'Restyle Map'}
        </Button>
    </>
  );

  return (
    <div>
      {renderModeSwitcher()}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
          {mode === 'generate' ? renderGenerateMode() : renderRestyleMode()}
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
          <div className='flex-grow'>
            <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">Result</h2>
            <SpriteDisplay
              isLoading={isLoading || isAdjusting}
              error={error}
              generatedImage={generatedImage}
              loadingText={isAdjusting ? 'Adjusting world...' : (mode === 'generate' ? 'Building tileset...' : 'Redrawing your world...')}
              placeholder={
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <div className="w-32 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                        <span className="text-5xl">🖼️</span>
                    </div>
                    <p className="mt-4 text-xl">Your generated map/tileset will appear here.</p>
                </div>
              }
              downloadFileName={mode === 'generate' ? 'genshin_tileset.png' : 'restyled_map.png'}
              imageAlt="Generated map or tileset"
              imageContainerClassName="bg-checkered-pattern p-2 border-2 border-gray-600 rounded-md w-full"
              imageClassName="w-full h-auto object-contain max-h-[350px]"
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
          <HistoryPanel history={history} onSelect={handleSelectHistoryItem} disabled={apiLock.isApiLocked}/>
        </div>
      </div>
    </div>
  );
};

export default MapGenerator;
