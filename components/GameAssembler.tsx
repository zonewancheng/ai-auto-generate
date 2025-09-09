
import React, { useState, useCallback, useEffect } from 'react';
import { GeneratorProps } from './GeneratorTabs';
import Button from './Button';
import { AssetRecord, getAssetsByType, generateGamePlan, adjustGamePlan, addAsset, deleteAsset } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

declare var JSZip: any;

type AssetSlot = '主角' | '反派' | '关键物品';
type SelectedAssets = { [key in AssetSlot]?: AssetRecord };

const ASSET_SLOT_CONFIG: { [key in AssetSlot]: { type: string, placeholder: string } } = {
  '主角': { type: 'character', placeholder: '👤' },
  '反派': { type: 'monster', placeholder: '👹' },
  '关键物品': { type: 'item', placeholder: '💎' },
};


const HistorySelectorModal: React.FC<{
  assetType: string;
  onSelect: (asset: AssetRecord) => void;
  onClose: () => void;
  title: string;
}> = ({ assetType, onSelect, onClose, title }) => {
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
          <h2 className="text-2xl font-press-start text-yellow-400">选择{title}</h2>
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
            ) : <p className="text-gray-500 text-center">未找到该类型的资源，请先去其他功能页生成。</p>
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
            
            {renderCard("故事", <p>{story.summary}</p>)}
            {renderCard("主要角色", (
                <>
                    {actors?.map((a: any) => <p key={a.id}><strong>{a.name}:</strong> {a.description}</p>)}
                    {enemies?.map((e: any) => <p key={e.id}><strong>{e.name}:</strong> {e.description}</p>)}
                </>
            ))}
            {renderCard("关键物品", items?.map((i: any) => <p key={i.id}><strong>{i.name}:</strong> {i.description}</p>))}
            {renderCard("世界地图", maps?.map((m: any) => <p key={m.id}><strong>{m.name}:</strong> {m.description}</p>))}
            {renderCard("起始任务", quests?.map((q: any) => (
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

const GamePlanHistoryPanel: React.FC<{ 
  history: AssetRecord[], 
  onSelect: (item: AssetRecord) => void, 
  onDelete: (id: number) => void,
  disabled: boolean 
}> = ({ history, onSelect, onDelete, disabled }) => {

  const handleDelete = (e: React.MouseEvent, id: number | undefined) => {
    e.stopPropagation();
    if (typeof id === 'number' && window.confirm('你确定要删除这个游戏策划案吗？')) {
      onDelete(id);
    }
  };

  return (
    <div className="mt-6 border-t-2 border-gray-700 pt-4">
      <h3 className="text-xl text-yellow-400 mb-2 font-press-start">历史记录</h3>
      {history.length === 0 ? (
        <p className="text-gray-500">你生成的游戏策划案将显示在此处。</p>
      ) : (
        <div className="max-h-60 overflow-y-auto bg-gray-900 p-2 rounded-md border-2 border-gray-700 scrollbar-hide">
          {history.map(item => {
            let title = "游戏策划案";
            let tagline = item.prompt;
            try {
                const data = JSON.parse(item.imageDataUrl!);
                title = data.gameBlueprint?.title || "未命名游戏";
                tagline = data.gameBlueprint?.story?.tagline || item.prompt;
            } catch(e) { /* use defaults */ }

            return (
              <div key={item.id} className="relative group">
                <button 
                  onClick={() => onSelect(item)} 
                  disabled={disabled}
                  className="flex items-center w-full text-left p-2 mb-2 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-12 h-12 flex-shrink-0 bg-gray-700 rounded-sm flex items-center justify-center mr-4">
                    <span className="text-2xl">📜</span>
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <p className="text-gray-200 font-bold truncate">{title}</p>
                    <p className="text-sm text-gray-400 truncate">{tagline}</p>
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
            );
          })}
        </div>
      )}
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
    const [history, setHistory] = useState<AssetRecord[]>([]);

    const loadHistory = useCallback(async () => {
        try {
            const assets = await getAssetsByType('game-plan');
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
    
    const handleSelectHistoryItem = (item: AssetRecord) => {
        if (apiLock.isApiLocked) return;
        try {
            const savedData = JSON.parse(item.imageDataUrl!);
            setGameConcept(savedData.gameConcept || item.prompt);
            setSelectedAssets(savedData.selectedAssets || {});
            setGameBlueprint(savedData.gameBlueprint);
            setError(null);
            setAdjustmentPrompt('');
        } catch (e) {
            console.error("Failed to parse history item", e);
            setError("加载此历史记录失败，文件可能已损坏。");
        }
    };

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

            const dataToSave = { gameConcept, selectedAssets, gameBlueprint: plan };
            await addAsset({ type: 'game-plan', prompt: gameConcept, imageDataUrl: JSON.stringify(dataToSave) });
            loadHistory();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : '发生未知错误。';
            setError(`生成游戏策划案失败: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            apiLock.unlockApi();
        }
    }, [apiLock, gameConcept, selectedAssets, isGenerationDisabled, loadHistory]);

    const handleAdjust = useCallback(async () => {
        if (!adjustmentPrompt || !gameBlueprint || apiLock.isApiLocked) return;

        apiLock.lockApi();
        setIsAdjusting(true);
        setError(null);
        try {
            const updatedPlan = await adjustGamePlan(gameBlueprint, adjustmentPrompt);
            setGameBlueprint(updatedPlan);

            const dataToSave = { gameConcept, selectedAssets, gameBlueprint: updatedPlan };
            await addAsset({ 
                type: 'game-plan', 
                prompt: `已调整: ${adjustmentPrompt}`, 
                imageDataUrl: JSON.stringify(dataToSave) 
            });
            loadHistory();
            setAdjustmentPrompt('');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : '发生未知错误。';
            setError(`调整游戏策划案失败: ${errorMessage}`);
        } finally {
            setIsAdjusting(false);
            apiLock.unlockApi();
        }
    }, [apiLock, adjustmentPrompt, gameBlueprint, gameConcept, selectedAssets, loadHistory]);

    const handleDownload = async () => {
        if (!gameBlueprint) return;
        const zip = new JSZip();

        // Add readme
        const readmeContent = `
# AI 生成的 RPG Maker MZ 项目
这个 ZIP 文件包含了由 AI RPG 资源工厂生成的资源和游戏策划案。

## 如何使用
1. 在 RPG Maker MZ 中创建一个新的空白项目。
2. 打开项目文件夹。
3. 将此 ZIP 文件中的 'img' 和 'data' 文件夹拖放到你的项目文件夹中，合并/替换文件夹。
4. 打开 'game_plan.json' 查看故事、角色信息和任务详情。
5. 使用 RPG Maker MZ 编辑器根据游戏策划案构建地图、事件和数据库条目。

祝你游戏制作愉快！
`;
        zip.file("README_使用说明.md", readmeContent);
        zip.file("game_plan.json", JSON.stringify(gameBlueprint, null, 2));
        
        // --- Create Data Files ---
        const dataFolder = zip.folder("data");
        const heroAsset = selectedAssets['主角'];
        const villainAsset = selectedAssets['反派'];
        const itemAsset = selectedAssets['关键物品'];
        const heroActorName = `AI_Hero_${heroAsset?.id || '1'}`;
        const villainEnemyName = `AI_Villain_${villainAsset?.id || '1'}`;
        const itemIconName = `AI_Icon_${itemAsset?.id || '1'}`;

        const actorsData = [null, {
            "id": 1, "battlerName": "", "characterIndex": 0, "characterName": heroActorName,
            "classId": 1, "equips": [1, 1, 2, 3, 0], "faceIndex": 0, "faceName": "",
            "traits": [], "initialLevel": 1, "maxLevel": 99, 
            "name": gameBlueprint.actors[0]?.name || "英雄", 
            "nickname": "", 
            "note": "", "profile": gameBlueprint.actors[0]?.description || ""
        }];
        if (dataFolder) dataFolder.file("Actors.json", JSON.stringify(actorsData, null, 2));

        const enemiesData = [null, {
            "id": 1, "actions": [{"conditionParam1": 0, "conditionParam2": 0, "conditionType": 0, "rating": 5, "skillId": 1}],
            "battlerHue": 0, "battlerName": villainEnemyName, "dropItems": [], "exp": 10, "gold": 5,
            "name": gameBlueprint.enemies[0]?.name || "反派", "note": "",
            "params": [100, 0, 10, 10, 10, 10, 10, 10] // [HP, MP, ATK, DEF, MAT, MDF, AGI, LUK]
        }];
        if (dataFolder) dataFolder.file("Enemies.json", JSON.stringify(enemiesData, null, 2));

        const itemsData = [null, {
            "id": 1, "animationId": 0, "consumable": true, "damage": {"critical": false, "elementId": 0, "formula": "0", "type": 0, "variance": 20},
            "description": gameBlueprint.items[0]?.description || "一个重要的物品", "effects": [], "hitType": 0, "iconIndex": 0,
            "itypeId": 2, // Key Item
            "name": gameBlueprint.items[0]?.name || "关键物品", "note": "", "occasion": 0, "price": 0,
            "repeats": 1, "scope": 7, "speed": 0, "successRate": 100, "tpGain": 0
        }];
        if (dataFolder) dataFolder.file("Items.json", JSON.stringify(itemsData, null, 2));

        // --- Add Image Assets ---
        const imgFolder = zip.folder("img");
        const assetsToProcess = Object.values(selectedAssets);

        for (const asset of assetsToProcess) {
            if (asset && asset.imageDataUrl) {
                const base64Data = asset.imageDataUrl.split(",")[1];
                let folderName = '';
                let fileName = '';

                switch (asset.type) {
                    case 'character':
                        folderName = 'characters';
                        fileName = `${heroActorName}.png`;
                        break;
                    case 'monster':
                        folderName = 'sv_actors'; // side-view battler
                        fileName = `${villainEnemyName}.png`;
                        break;
                    case 'item':
                    case 'equipment':
                        folderName = 'icons';
                        fileName = `${itemIconName}.png`;
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
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {isModalOpen && <HistorySelectorModal assetType={ASSET_SLOT_CONFIG[isModalOpen].type} title={isModalOpen} onSelect={handleSelectAsset} onClose={() => setIsModalOpen(null)} />}

            {/* Left Panel: Controls */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
                <div className="flex-grow">
                    {!gameBlueprint && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl text-yellow-400 mb-2 font-press-start">1. 定义你的游戏</h2>
                                <textarea
                                    value={gameConcept}
                                    onChange={(e) => setGameConcept(e.target.value)}
                                    placeholder="例如：英雄必须找到一把魔法剑来击败守护失落宝藏的恶龙。"
                                    className="w-full h-32 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
                                    disabled={apiLock.isApiLocked}
                                />
                            </div>

                            <div>
                                <h2 className="text-2xl text-yellow-400 mb-2 font-press-start">2. 选择核心资源</h2>
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
                                生成游戏策划案
                            </Button>
                        </div>
                    )}

                    {gameBlueprint && (
                         <div>
                            <h2 className="text-2xl text-yellow-400 mb-2 font-press-start">调整你的游戏</h2>
                            <p className="text-gray-300 mb-4 text-lg">你的游戏策划案已生成。现在，告诉 AI 你想修改什么！</p>
                             <textarea
                                value={adjustmentPrompt}
                                onChange={(e) => setAdjustmentPrompt(e.target.value)}
                                placeholder="例如：把反派改成一个被误解的英雄。在村里增加一个友好的NPC店主。"
                                className="w-full h-32 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
                                disabled={apiLock.isApiLocked || isAdjusting}
                            />
                            <Button onClick={handleAdjust} disabled={!adjustmentPrompt || apiLock.isApiLocked || isAdjusting} className="w-full mt-2">
                                {isAdjusting ? '调整中...' : '调整策划案'}
                            </Button>
                            <Button onClick={() => setGameBlueprint(null)} disabled={apiLock.isApiLocked} className="w-full mt-4 bg-red-600 border-red-800 hover:bg-red-500 hover:border-red-700 active:bg-red-700 active:border-red-900">
                               重新开始
                            </Button>
                        </div>
                    )}
                </div>
                <GamePlanHistoryPanel history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteAsset} disabled={apiLock.isApiLocked} />
            </div>

            {/* Right Panel: Display */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl text-yellow-400 font-press-start">游戏策划案</h2>
                    {gameBlueprint && <Button onClick={handleDownload} disabled={apiLock.isApiLocked}>下载项目 (.zip)</Button>}
                </div>

                <div className="w-full min-h-[60vh] bg-gray-900/50 rounded-md p-4 flex items-center justify-center overflow-y-auto scrollbar-hide">
                {isLoading || isAdjusting ? (
                    <div className="text-center">
                        <LoadingSpinner/>
                        <p className="mt-4 text-lg text-gray-300 animate-pulse">{isAdjusting ? '重写命运...' : '生成你的世界...'}</p>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-400">{error}</div>
                ) : gameBlueprint ? (
                    <BlueprintDisplay blueprint={gameBlueprint} />
                ) : (
                    <div className="text-center text-gray-500">
                        <span className="text-6xl">📜</span>
                        <p className="mt-4 text-xl">你的游戏策划案将显示在此处。</p>
                        <p>请在左侧填写详情以开始。</p>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default GameAssembler;
