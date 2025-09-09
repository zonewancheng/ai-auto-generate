
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { AssetRecord } from '../services/geminiService';

interface InspirationGeneratorModalProps {
    heroAsset: AssetRecord;
    villainAsset: AssetRecord;
    itemAsset: AssetRecord;
}

const generationMessages = [
    "正在分析核心素材...",
    "构建世界观与传说...",
    "设计英雄的旅程...",
    "塑造邪恶的反派...",
    "构思史诗般的任务...",
    "灵感即将具象化！"
];

const InspirationGeneratorModal: React.FC<InspirationGeneratorModalProps> = ({ heroAsset, villainAsset, itemAsset }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessageIndex(prevIndex => (prevIndex + 1) % generationMessages.length);
        }, 2000); // Change message every 2 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-2xl border-4 border-purple-600 flex flex-col p-8 items-center text-center">
                <h1 className="text-4xl font-press-start text-yellow-400 mb-8 drop-shadow-[0_3px_3px_rgba(0,0,0,0.8)]">灵光迸发中...</h1>
                
                <div className="flex items-center justify-around w-full mb-8">
                    <div className="flex flex-col items-center space-y-2">
                        <img src={heroAsset.imageDataUrl} alt="主角" className="h-32 object-contain bg-checkered-pattern p-1 rounded" style={{ imageRendering: 'pixelated' }} />
                        <p className="text-lg font-press-start text-gray-300">主角</p>
                    </div>
                    <span className="text-4xl font-press-start text-yellow-400">VS</span>
                     <div className="flex flex-col items-center space-y-2">
                        <img src={villainAsset.imageDataUrl} alt="反派" className="h-32 object-contain bg-checkered-pattern p-1 rounded" style={{ imageRendering: 'pixelated' }} />
                        <p className="text-lg font-press-start text-gray-300">反派</p>
                    </div>
                </div>
                
                <div className="flex flex-col items-center mb-8 space-y-2">
                     <img src={itemAsset.imageDataUrl} alt="关键物品" className="h-16 object-contain" style={{ imageRendering: 'pixelated' }} />
                     <p className="text-lg font-press-start text-gray-300">为了... 关键物品</p>
                </div>

                <LoadingSpinner />
                <p className="mt-4 text-xl text-yellow-400 font-press-start animate-pulse">{generationMessages[currentMessageIndex]}</p>
            </div>
        </div>
    );
};

export default InspirationGeneratorModal;
