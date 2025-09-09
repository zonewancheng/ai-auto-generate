import React, { useState, useCallback } from 'react';
import { GeneratorProps } from './GeneratorTabs';
import Button from './Button';
import { AssetRecord, getAssetsByType, generateGamePlan, adjustGamePlan } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

declare var JSZip: any;

type AssetSlot = 'Hero' | 'Villain' | 'Key Item';
type SelectedAssets = { [key in AssetSlot]?: AssetRecord };

const ASSET_SLOT_CONFIG: { [key in AssetSlot]: { type: string, placeholder: string } } = {
  'Hero': { type: 'character', placeholder: '👤' },
  'Villain': { type: 'monster', placeholder: '🐲' },
  'Key Item': { type: 'item', placeholder: '💎' },
};


const HistorySelectorModal: React.FC<{
  assetType: string;
  onSelect: (asset: AssetRecord) => void;
  onClose: () => void;
}> = ({ assetType, onSelect, onClose }) => {
  const [history, setHistory] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      const assets = await getAssetsByType(assetType);
      setHistory(assets);
      setIsLoading(false);
    };
    loadHistory();
  }, [assetType]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl border-2 border-purple-600 w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-press-start text-yellow-400">Select {assetType}</h2>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto scrollbar-hide">
          {isLoading ? <LoadingSpinner /> : (
            history.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {history.map(asset => (
                  <div key={asset.id} onClick={() => onSelect(asset)} className="bg-gray-900 p-2 rounded-md border-2 border-gray-700 hover:border-yellow-400 cursor-pointer transition-colors text-center">
                    <img src={asset.imageDataUrl} alt={asset.prompt} className="w-full h-24 object-contain mx-auto bg-checkered-pattern rounded" style={{ imageRendering: 'pixelated' }}/>
                    <p className="text-sm text-gray-300 mt-2 truncate">{asset.prompt}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-center">No assets found for this type. Please generate some first.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const BlueprintDisplay: React.FC<{ blueprint: any }> = ({ blueprint }) => {
    if (!blueprint) return null;
    const { title, story, actors, enemies, items, maps, quests } = blueprint;

    const renderCard = (title: string, content: React.ReactNode) => (
        <div className="bg-gray-900 p-4 rounded-lg border-2 border-gray-700 mb-4">
            <h4 className="font-press-start text-lg text-yellow-400 mb-2">{title}</h4>
            <div className="text-gray-300 text-lg space-y-2">{content}</div>
        </div>
    );

    return (
        <div className="w-full">
            <h2 className="font-press-start text-3xl text-center text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mb-2">{title}</h2>
            <p className="text-center text-xl text-gray-400 mb-6">"{story.tagline}"</p>
            
            {renderCard("Story", <p>{story.summary}</p>)}
            {renderCard("Dramatis Personae", (
                <>
                    {actors?.map((a: any) => <p key={a.id}><strong>{a.name}:</strong> {a.description}</p>)}
                    {enemies?.map((e: any) => <p key={e.id}><strong>{e.name}:</strong> {e.description}</p>)}
                </>
            ))}
            {renderCard("Key Items", items?.map((i: any) => <p key={i.id}><strong>{i.name}:</strong> {i.description}</p>))}
            {renderCard("World Map", maps?.map((m: any) => <p key={m.id}><strong>{m.name}:</strong> {m.description}</p>))}
            {renderCard("Starting Quest", quests?.map((q: any) => (
                <div key={q.id}>
                    <p><strong>{q.title}:</strong> {q.objective}</p>
                    <ul className="list-disc list-inside pl-4 text-gray-400">
                        {q.steps?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
            )))}
        </div>
    );
};


const GameAssembler: React.FC<GeneratorProps> = ({ apiLock }) => {
    const [gameConcept, setGameConcept] = useState('');
    const [selectedAssets, setSelectedAssets] = useState<SelectedAssets>({});
    const [isModalOpen, setIsModalOpen] = useState<AssetSlot | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gameBlueprint, setGameBlueprint] = useState<any | null>(null);
    const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
    const [isAdjusting, setIsAdjusting] = useState(false);

    const handleSelectAsset = (asset: AssetRecord) => {
        if (isModalOpen) {
            setSelectedAssets(prev => ({ ...prev, [isModalOpen]: asset }));
            setIsModalOpen(null);
        }
    };

    const isGenerationDisabled = !gameConcept || Object.keys(selectedAssets).length < Object.keys(ASSET_SLOT_CONFIG).length || apiLock.isApiLocked;

    const handleGenerate = useCallback(async () => {
        if (isGenerationDisabled) return;

        apiLock.lockApi();
        setIsLoading(true);
        setError(null);
        setGameBlueprint(null);

        try {
            const assetPrompts: { [key: string]: string } = {};
            Object.entries(selectedAssets).forEach(([slot, asset]) => {
                if(asset) assetPrompts[slot] = asset.prompt;
            });

            const plan = await generateGamePlan(gameConcept, assetPrompts);
            setGameBlueprint(plan);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate game plan: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            apiLock.unlockApi();
        }
    }, [apiLock, gameConcept, selectedAssets, isGenerationDisabled]);

    const handleAdjust = useCallback(async () => {
        if (!adjustmentPrompt || !gameBlueprint || apiLock.isApiLocked) return;

        apiLock.lockApi();
        setIsAdjusting(true);
        setError(null);
        try {
            const updatedPlan = await adjustGamePlan(gameBlueprint, adjustmentPrompt);
            setGameBlueprint(updatedPlan);
            setAdjustmentPrompt('');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to adjust game plan: ${errorMessage}`);
        } finally {
            setIsAdjusting(false);
            apiLock.unlockApi();
        }
    }, [apiLock, adjustmentPrompt, gameBlueprint]);

    const handleDownload = async () => {
        if (!gameBlueprint) return;
        const zip = new JSZip();

        // Add game plan
        zip.file("game_plan.json", JSON.stringify(gameBlueprint, null, 2));
        
        // Add readme
        const readmeContent = `
# AI-Generated RPG Maker MZ Project
This ZIP file contains assets and a game plan generated by the AI RPG Asset Factory.

## How to Use
1. Create a new, blank project in RPG Maker MZ.
2. Open the project folder.
3. Drag and drop the 'img' folder from this ZIP into your project folder, merging/replacing the folders.
4. Open 'game_plan.json' to see the story, character info, and quest details.
5. Use the RPG Maker MZ editor to build the maps, events, and database entries according to the game plan.

Happy game making!
`;
        zip.file("README.md", readmeContent);

        // Add assets
        const imgFolder = zip.folder("img");
        const assetsToProcess = Object.values(selectedAssets);

        for (const asset of assetsToProcess) {
            if (asset) {
                const base64Data = asset.imageDataUrl.split(",")[1];
                let folderName = '';
                let fileName = '';

                switch (asset.type) {
                    case 'character':
                        folderName = 'characters';
                        fileName = `AI_Hero_${asset.id}.png`;
                        break;
                    case 'monster':
                        folderName = 'sv_actors'; // side-view battler
                        fileName = `AI_Villain_${asset.id}.png`;
                        break;
                    case 'item':
                    case 'equipment':
                        folderName = 'icons';
                        fileName = `AI_Icon_${asset.id}.png`;
                        break;
                    default:
                        folderName = 'pictures';
                        fileName = `AI_Asset_${asset.id}.png`;
                }

                if (imgFolder && folderName) {
                    const typeFolder = imgFolder.folder(folderName);
                    if(typeFolder) typeFolder.file(fileName, base64Data, { base64: true });
                }
            }
        }
        
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${gameBlueprint.title.replace(/\s+/g, '_')}_Project.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {isModalOpen && <HistorySelectorModal assetType={ASSET_SLOT_CONFIG[isModalOpen].type} onSelect={handleSelectAsset} onClose={() => setIsModalOpen(null)} />}

            {/* Left Panel: Controls */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 space-y-6">
                {!gameBlueprint && (
                    <>
                        <div>
                            <h2 className="text-2xl text-yellow-400 mb-2 font-press-start">1. Define Your Game</h2>
                            <textarea
                                value={gameConcept}
                                onChange={(e) => setGameConcept(e.target.value)}
                                placeholder="e.g., A hero must find a magic sword to defeat a dragon guarding a lost treasure."
                                className="w-full h-32 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
                                disabled={apiLock.isApiLocked}
                            />
                        </div>

                        <div>
                            <h2 className="text-2xl text-yellow-400 mb-2 font-press-start">2. Select Assets</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {Object.entries(ASSET_SLOT_CONFIG).map(([slot, config]) => (
                                    <div key={slot}>
                                        <h3 className="text-lg text-center text-gray-300 mb-2">{slot}</h3>
                                        <div onClick={() => !apiLock.isApiLocked && setIsModalOpen(slot as AssetSlot)} className="h-32 bg-gray-900 border-2 border-dashed border-gray-600 rounded-md cursor-pointer hover:border-purple-500 flex items-center justify-center transition-colors">
                                            {selectedAssets[slot as AssetSlot] ? (
                                                <img src={selectedAssets[slot as AssetSlot]?.imageDataUrl} alt={slot} className="max-h-full max-w-full p-1 object-contain"/>
                                            ) : (
                                                <span className="text-4xl text-gray-500">{config.placeholder}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button onClick={handleGenerate} disabled={isGenerationDisabled} className="w-full">
                            Generate Game Plan
                        </Button>
                    </>
                )}

                {gameBlueprint && (
                     <div>
                        <h2 className="text-2xl text-yellow-400 mb-2 font-press-start">Adjust Your Game</h2>
                        <p className="text-gray-300 mb-4 text-lg">Your game plan is generated. Now, tell the AI what to change!</p>
                         <textarea
                            value={adjustmentPrompt}
                            onChange={(e) => setAdjustmentPrompt(e.target.value)}
                            placeholder="e.g., Make the villain a misunderstood anti-hero. Add a friendly NPC shopkeeper in the village."
                            className="w-full h-32 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
                            disabled={apiLock.isApiLocked || isAdjusting}
                        />
                        <Button onClick={handleAdjust} disabled={!adjustmentPrompt || apiLock.isApiLocked || isAdjusting} className="w-full mt-2">
                            {isAdjusting ? 'Adjusting...' : 'Adjust Plan'}
                        </Button>
                        <Button onClick={() => setGameBlueprint(null)} disabled={apiLock.isApiLocked} className="w-full mt-4 bg-red-600 border-red-800 hover:bg-red-500 hover:border-red-700 active:bg-red-700 active:border-red-900">
                           Start Over
                        </Button>
                    </div>
                )}
            </div>

            {/* Right Panel: Display */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl text-yellow-400 font-press-start">Game Blueprint</h2>
                    {gameBlueprint && <Button onClick={handleDownload} disabled={apiLock.isApiLocked}>Download Assets (.zip)</Button>}
                </div>

                <div className="w-full min-h-[60vh] bg-gray-900/50 rounded-md p-4 flex items-center justify-center overflow-y-auto scrollbar-hide">
                {isLoading || isAdjusting ? (
                    <div className="text-center">
                        <LoadingSpinner/>
                        <p className="mt-4 text-lg text-gray-300 animate-pulse">{isAdjusting ? 'Rewriting destiny...' : 'Generating your world...'}</p>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-400">{error}</div>
                ) : gameBlueprint ? (
                    <BlueprintDisplay blueprint={gameBlueprint} />
                ) : (
                    <div className="text-center text-gray-500">
                        <span className="text-6xl">🎮</span>
                        <p className="mt-4 text-xl">Your game plan will appear here.</p>
                        <p>Fill out the details on the left to begin.</p>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default GameAssembler;
