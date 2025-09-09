import React, { useState, useCallback, useEffect } from 'react';
import { generateStatsDesign, addAsset, getAssetsByType, deleteAsset, AssetRecord } from '../services/geminiService';
import Button from './Button';
import { GeneratorProps } from './GeneratorTabs';
import LoadingSpinner from './LoadingSpinner';

const placeholderExamples = [
    "一个速度快但防御脆弱的玻璃大炮刺客。",
    "一个拥有巨大生命值和防御力，但攻击力较低的坦克圣骑士。",
    "一个平衡型的全能英雄，各项属性都很平均。",
    "一个强大的魔法师，拥有高魔法攻击和魔法防御，但物理属性较弱。",
    "一个行动极其缓慢但每次攻击都能造成毁灭性伤害的巨石魔像 Boss。",
];

interface StatsData {
    hp: number;
    mp: number;
    atk: number;
    def: number;
    mat: number;
    mdf: number;
    agi: number;
    luk: number;
    rationale: string;
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
                <p className="text-gray-500">你设计的数值将显示在此处。</p>
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
                                    <span className="text-2xl">📊</span>
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

const StatsDisplayCard: React.FC<{ statsJSON: string }> = ({ statsJSON }) => {
    try {
        const data: StatsData = JSON.parse(statsJSON);
        const stats = [
            { label: "HP", value: data.hp, color: "text-green-400" },
            { label: "MP", value: data.mp, color: "text-blue-400" },
            { label: "ATK", value: data.atk, color: "text-red-400" },
            { label: "DEF", value: data.def, color: "text-gray-400" },
            { label: "MAT", value: data.mat, color: "text-purple-400" },
            { label: "MDF", value: data.mdf, color: "text-indigo-400" },
            { label: "AGI", value: data.agi, color: "text-yellow-400" },
            { label: "LUK", value: data.luk, color: "text-pink-400" },
        ];
        return (
            <div className="w-full h-full overflow-y-auto text-gray-200 bg-gray-900 p-4 border-2 border-gray-700 rounded-md scrollbar-hide">
                <h3 className="font-press-start text-xl text-yellow-400 mb-4">基础数值 (Lv. 1)</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-6">
                    {stats.map(stat => (
                        <div key={stat.label} className="flex justify-between items-baseline text-lg bg-gray-800 p-2 rounded">
                            <span className={`font-bold ${stat.color}`}>{stat.label}</span>
                            <span className="font-mono">{stat.value}</span>
                        </div>
                    ))}
                </div>
                <h3 className="font-press-start text-xl text-yellow-400 mb-2">设计思路</h3>
                <p className="text-lg text-gray-300">{data.rationale}</p>
            </div>
        );
    } catch (e) {
        return <div className="text-red-400">解析数值数据时出错。</div>
    }
}

const StatsDesigner: React.FC<GeneratorProps> = ({ apiLock }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedText, setGeneratedText] = useState<string | null>(null);
    const [history, setHistory] = useState<AssetRecord[]>([]);

    const loadHistory = useCallback(async () => {
        try {
            const assets = await getAssetsByType('stats');
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
            const resultJson = await generateStatsDesign(prompt);
            setGeneratedText(resultJson);
            await addAsset({ type: 'stats', prompt, imageDataUrl: resultJson });
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
                    <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. 描述单位定位</h2>
                    <p className="text-gray-300 mb-4 text-lg">
                        描述角色或怪物的战斗风格。AI 将为其生成一套 RPG Maker 风格的基础数值。
                    </p>
                    
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="例如：一个典型的入门级史莱姆怪物"
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
                                    {ex.split('。')[0]}...
                                </button>
                            ))}
                        </div>
                    </div>
                    <Button onClick={handleGenerate} disabled={apiLock.isApiLocked || !prompt} className="mt-4 w-full">
                        {isLoading ? '计算中...' : '设计数值'}
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
                            <p className="mt-4 text-lg text-gray-300 animate-pulse">正在平衡宇宙...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-400 p-4">{error}</div>
                    ) : generatedText ? (
                        <StatsDisplayCard statsJSON={generatedText} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                            <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-5xl">📊</span>
                            </div>
                            <p className="text-xl">你的数值设计将显示在此处。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatsDesigner;
