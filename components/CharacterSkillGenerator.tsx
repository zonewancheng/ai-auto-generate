import React, { useState, useCallback, useEffect } from 'react';
import { generateSkillDesign, addAsset, getAssetsByType, deleteAsset, AssetRecord } from '../services/geminiService';
import Button from './Button';
import { GeneratorProps } from './GeneratorTabs';
import LoadingSpinner from './LoadingSpinner';

const placeholderExamples = [
    "一个强大的暴风雪法术，可以冻结区域内的所有敌人。",
    "一次快速的剑刃冲锋，可以穿透一排敌人。",
    "一种治疗光环，可以缓慢恢复附近盟友的生命值。",
    "一个可以使施法者隐身一小段时间的暗影法术。",
    "召唤一个小型火焰精灵来协助战斗。",
];

interface SkillData {
    skillName: string;
    description: string;
    mpCost: number;
    damageType: string;
    target: string;
    effects: string[];
}

const HistoryPanel: React.FC<{
    history: AssetRecord[];
    onSelect: (item: AssetRecord) => void;
    onDelete: (id: number) => void;
    disabled: boolean;
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
                <p className="text-gray-500">你设计的技能将显示在此处。</p>
            ) : (
                <div className="max-h-60 overflow-y-auto bg-gray-900 p-2 rounded-md border-2 border-gray-700 scrollbar-hide">
                    {history.map(item => (
                        <div key={item.id} className="relative group">
                            <button
                                onClick={() => onSelect(item)}
                                disabled={disabled}
                                className="flex items-center w-full text-left p-2 mb-2 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex-shrink-0 w-12 h-12 bg-gray-700 rounded-sm flex items-center justify-center mr-4">
                                    <span className="text-2xl">🔮</span>
                                </div>
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

const SkillDisplayCard: React.FC<{ skillJSON: string }> = ({ skillJSON }) => {
    try {
        const data: SkillData = JSON.parse(skillJSON);
        return (
            <div className="w-full h-full overflow-y-auto text-gray-200 text-lg bg-gray-900 p-4 border-2 border-gray-700 rounded-md scrollbar-hide">
                <h3 className="font-press-start text-2xl text-yellow-400 mb-4">{data.skillName}</h3>
                <p className="mb-4 italic text-gray-400">"{data.description}"</p>
                <div className="space-y-3">
                    <p><strong>MP 消耗:</strong> <span className="text-cyan-400">{data.mpCost}</span></p>
                    <p><strong>伤害类型:</strong> <span className="text-orange-400">{data.damageType}</span></p>
                    <p><strong>目标:</strong> <span className="text-purple-400">{data.target}</span></p>
                    <div>
                        <strong>效果:</strong>
                        <ul className="list-disc list-inside pl-4 text-green-400">
                            {data.effects.map((effect, index) => <li key={index}>{effect}</li>)}
                        </ul>
                    </div>
                </div>
            </div>
        );
    } catch (e) {
        return <div className="text-red-400">解析技能数据时出错。</div>
    }
}

const CharacterSkillGenerator: React.FC<GeneratorProps> = ({ apiLock }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedText, setGeneratedText] = useState<string | null>(null);
    const [history, setHistory] = useState<AssetRecord[]>([]);

    const loadHistory = useCallback(async () => {
        try {
            const assets = await getAssetsByType('skill');
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
        setGeneratedText(null);

        try {
            const resultJson = await generateSkillDesign(prompt);
            setGeneratedText(resultJson);
            await addAsset({ type: 'skill', prompt, imageDataUrl: resultJson });
            loadHistory();
        } catch (err) {
            setError(err instanceof Error ? `生成失败: ${err.message}` : '发生未知错误。');
            console.error(err);
        } finally {
            setIsLoading(false);
            apiLock.unlockApi();
        }
    }, [prompt, apiLock, loadHistory]);

    const handleSelectExample = (example: string) => {
        setPrompt(example);
    };

    const handleSelectHistoryItem = (item: AssetRecord) => {
        setPrompt(item.prompt);
        setGeneratedText(item.imageDataUrl); // imageDataUrl stores the JSON string
        setError(null);
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
                <div className="flex-grow">
                    <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. 描述技能概念</h2>
                    <p className="text-gray-300 mb-4 text-lg">
                        描述一个技能的想法。AI 将为其设计名称、描述、消耗和效果。
                    </p>
                    
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="例如：一个可以从地下召唤荆棘来困住敌人的德鲁伊法术"
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
                        {isLoading ? '设计中...' : '设计技能'}
                    </Button>
                </div>
                 <HistoryPanel history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteAsset} disabled={apiLock.isApiLocked}/>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
                <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">结果</h2>
                <div className="w-full min-h-[60vh] bg-gray-900/50 rounded-md p-4 flex items-center justify-center">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <LoadingSpinner />
                            <p className="mt-4 text-lg text-gray-300 animate-pulse">正在构思魔法...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-400 p-4">{error}</div>
                    ) : generatedText ? (
                        <SkillDisplayCard skillJSON={generatedText} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                            <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-5xl">🔮</span>
                            </div>
                            <p className="text-xl">你的技能设计将显示在此处。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CharacterSkillGenerator;
