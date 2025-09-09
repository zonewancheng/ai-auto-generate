
import React from 'react';

interface ImagePreviewModalProps {
  imageUrl: string;
  altText: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, altText, onClose }) => {
  // Effect to handle Escape key press
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close on backdrop click
      role="dialog"
      aria-modal="true"
      aria-label="图像预览"
    >
      <div 
        className="relative max-w-[90vw] max-h-[90vh] bg-gray-800 p-2 rounded-lg shadow-2xl border-2 border-purple-600"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image container
      >
        <button 
          onClick={onClose} 
          className="absolute -top-5 -right-5 w-10 h-10 bg-red-600 text-white rounded-full text-2xl font-bold flex items-center justify-center z-10 border-2 border-white hover:bg-red-500 transition-transform transform hover:scale-110"
          aria-label="关闭预览"
        >
          &times;
        </button>
        <img 
          src={imageUrl} 
          alt={altText} 
          className="max-w-full max-h-full object-contain"
          style={{ imageRendering: 'pixelated' }} 
        />
      </div>
    </div>
  );
};

export default ImagePreviewModal;
