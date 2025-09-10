import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import Button from './Button';
import ImagePreviewModal from './ImagePreviewModal';

interface SpriteDisplayProps {
  isLoading: boolean;
  error: string | null;
  generatedImage: string | null;
  loadingText: string;
  placeholder: React.ReactNode;
  downloadFileName: string;
  imageAlt: string;
  imageContainerClassName?: string;
  imageClassName?: string;
  onRemoveBackground?: () => void;
  isRemovingBackground?: boolean;
}

const SpriteDisplay: React.FC<SpriteDisplayProps> = ({ 
  isLoading, 
  error, 
  generatedImage,
  loadingText,
  placeholder,
  downloadFileName,
  imageAlt,
  imageContainerClassName = 'bg-checkered-pattern p-4 border-2 border-gray-600 rounded-md',
  imageClassName = '',
  onRemoveBackground,
  isRemovingBackground,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <LoadingSpinner />
          <p className="mt-4 text-lg text-gray-300 animate-pulse">{loadingText}</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <p className="text-xl text-red-400">生成失败</p>
          <p className="text-gray-400 mt-2">{error}</p>
        </div>
      );
    }
    if (generatedImage) {
      return (
        <>
          {isPreviewOpen && (
            <ImagePreviewModal
              imageUrl={generatedImage}
              altText={imageAlt}
              onClose={() => setIsPreviewOpen(false)}
            />
          )}
          <div className="flex flex-col items-center w-full">
            <div
              className={`${imageContainerClassName} transition-transform hover:scale-105 cursor-zoom-in`}
              onClick={() => setIsPreviewOpen(true)}
              title="点击放大预览"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setIsPreviewOpen(true)}
            >
              <img 
                src={generatedImage} 
                alt={imageAlt}
                className={imageClassName}
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <p className="text-gray-300 mt-4 text-center">右键点击并“图像另存为...”来下载。</p>
            <div className="mt-2 w-full max-w-xs space-y-2">
              <a
                href={generatedImage}
                download={downloadFileName}
                className="block"
              >
                <Button className="w-full">下载 PNG</Button>
              </a>
              {onRemoveBackground && (
                 <Button 
                    onClick={onRemoveBackground} 
                    disabled={isRemovingBackground || isLoading}
                    className="w-full bg-teal-600 border-teal-800 hover:bg-teal-500 hover:border-teal-700 active:bg-teal-700 active:border-teal-900"
                  >
                    {isRemovingBackground ? '处理中...' : '一键去背'}
                  </Button>
              )}
            </div>
          </div>
        </>
      );
    }
    return placeholder;
  };

  return (
    <div className="w-full min-h-[420px] bg-gray-900 rounded-md p-4 flex items-center justify-center">
      {renderContent()}
    </div>
  );
};

export default SpriteDisplay;