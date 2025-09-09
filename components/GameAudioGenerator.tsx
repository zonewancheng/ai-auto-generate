
import React, { useState, useCallback, useEffect } from 'react';
import { generateAudioDescription, addAsset, getAssetsByType, deleteAsset, AssetRecord } from '../services/geminiService';
import Button from './Button';
import { GeneratorProps } from './GeneratorTabs';
import LoadingSpinner from './LoadingSpinner';

type Mode = 'sfx' | 'music';

const sfxExamples = [
    "一把巨大的剑猛烈撞击沉重金属盾牌的声音。",
    "施放一个大型火球法术，伴随着呼啸声和爆炸声。",
    "打开一个古老、沉重的石门，发出摩擦和回响的声音。",
    "一个怪物痛苦的、非人类的尖叫声。",
];

const musicExamples = [
    "一个宁静、祥和的村庄的背景音乐，有民谣吉他和长笛。",
    "一场史诗般的、紧张的最终 Boss 战，有管弦乐队和合唱团。",
    "一个神秘、阴森的洞穴的氛围音乐，有滴水声和低沉的嗡嗡声。",
    "一个充满活力的、欢快的城镇主题音乐，庆祝节日。",
];

const AudioHistoryPanel: React.FC<{
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
                <p className="text-gray-500">你生成的音频描述将显示在此处。</p>
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
                                    <span className="text-2xl">🎵</span>
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


const GameAudioGenerator: React.FC<GeneratorProps> = ({ apiLock }) => {
    const [mode, setMode] = useState<Mode>('sfx');
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedText, setGeneratedText] = useState<string | null>(null);
    const [history, setHistory] = useState<AssetRecord[]>([]);

    const loadHistory = useCallback(async () => {
        try {
            const assets = await getAssetsByType('audio');
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
            const description = await generateAudioDescription(prompt, mode);
            setGeneratedText(description);
            await addAsset({ type: 'audio', prompt, imageDataUrl: description });
            loadHistory();
        } catch (err) {
            setError(err instanceof Error ? `生成失败: ${err.message}` : '发生未知错误。');
            console.error(err);
        } finally {
            setIsLoading(false);
            apiLock.unlockApi();
        }
    }, [prompt, mode, apiLock, loadHistory]);

    const handleSelectExample = (example: string) => {
        setPrompt(example);
    };

    const handleSelectHistoryItem = (item: AssetRecord) => {
        setPrompt(item.prompt);
        setGeneratedText(item.imageDataUrl);
        setError(null);
    };
    
    const currentExamples = mode === 'sfx' ? sfxExamples : musicExamples;
    
    return (
        <div>
            <div className="flex justify-center bg-gray-800 p-2 rounded-lg mb-8 border-2 border-gray-700">
                <button onClick={() => setMode('sfx')} disabled={apiLock.isApiLocked} className={`w-1/2 font-press-start text-lg py-3 rounded-md transition-colors ${mode === 'sfx' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}>音效 (SFX)</button>
                <button onClick={() => setMode('music')} disabled={apiLock.isApiLocked} className={`w-1/2 font-press-start text-lg py-3 rounded-md transition-colors ${mode === 'music' ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-700'}`}>音乐</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col">
                    <div className="flex-grow">
                        <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">1. 描述你需要的音频</h2>
                        <p className="text-gray-300 mb-4 text-lg">
                            {mode === 'sfx' ? '描述一个声音事件。AI 将生成一份详细的音效设计说明。' : '描述一个场景或情绪。AI 将生成一份详细的音乐设计说明。'}
                        </p>
                        
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={mode === 'sfx' ? "例如：一个英雄的胜利呐喊" : "例如：一个被诅咒的森林的氛围音乐"}
                            className="w-full h-48 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
                            disabled={apiLock.isApiLocked}
                        />
                        <div className="my-4">
                            <p className="text-gray-400 mb-2 text-md">或试试这些示例：</p>
                            <div className="flex flex-wrap gap-2">
                                {currentExamples.map((ex, index) => (
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
                            {isLoading ? '生成中...' : '生成描述'}
                        </Button>
                    </div>
                     <AudioHistoryPanel history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteAsset} disabled={apiLock.isApiLocked}/>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-2 border-gray-700">
                    <h2 className="text-2xl text-yellow-400 mb-4 font-press-start">结果</h2>
                    <div className="w-full min-h-[60vh] bg-gray-900 rounded-md p-4 flex items-center justify-center">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <LoadingSpinner />
                                <p className="mt-4 text-lg text-gray-300 animate-pulse">正在谱写声音...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-400 p-4">{error}</div>
                        ) : generatedText ? (
                            <div className="w-full h-full overflow-y-auto text-gray-200 text-lg whitespace-pre-wrap font-sans bg-gray-900 p-4 border-2 border-gray-700 rounded-md scrollbar-hide">
                                {generatedText}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                                <div className="w-24 h-24 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-4">
                                    <span className="text-5xl">🎵</span>
                                </div>
                                <p className="text-xl">你的音频设计说明将显示在此处。</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameAudioGenerator;
