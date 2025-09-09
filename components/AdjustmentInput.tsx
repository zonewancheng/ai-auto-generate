import React from 'react';
import Button from './Button';

interface AdjustmentInputProps {
  adjustmentPrompt: string;
  setAdjustmentPrompt: (value: string) => void;
  handleAdjust: () => void;
  isAdjusting: boolean;
  className?: string;
  disabled?: boolean;
}

const AdjustmentInput: React.FC<AdjustmentInputProps> = ({
  adjustmentPrompt,
  setAdjustmentPrompt,
  handleAdjust,
  isAdjusting,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={`mt-4 border-t-2 border-gray-700 pt-4 ${className}`}>
      <h3 className="text-xl text-yellow-400 mb-2 font-press-start">Adjust Image</h3>
      <p className="text-gray-300 mb-2 text-md">Not quite right? Describe a change to refine the image.</p>
      <textarea
        value={adjustmentPrompt}
        onChange={(e) => setAdjustmentPrompt(e.target.value)}
        placeholder="e.g., Make it blue, add a glow, change the style to spooky"
        className="w-full h-24 p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:outline-none focus:border-purple-500 transition-colors text-lg text-gray-200 resize-none"
        disabled={isAdjusting || disabled}
      />
      <Button onClick={handleAdjust} disabled={isAdjusting || !adjustmentPrompt || disabled} className="mt-2 w-full">
        {isAdjusting ? 'Adjusting...' : 'Adjust'}
      </Button>
    </div>
  );
};

export default AdjustmentInput;
