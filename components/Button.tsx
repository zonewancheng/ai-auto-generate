
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => {
  return (
    <button
      {...props}
      className={`
        font-press-start text-lg
        px-6 py-3
        bg-purple-600 text-white
        border-b-4 border-purple-800
        hover:bg-purple-500 hover:border-purple-700
        active:bg-purple-700 active:border-purple-900 active:translate-y-1
        transition-all duration-100 ease-in-out
        disabled:bg-gray-600 disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-70
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-yellow-400
        rounded-md
        shadow-lg
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default Button;
