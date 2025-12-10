import React from 'react';
import { GrammarRole, Theme } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface WordPillProps {
  text: string;
  index: number;
  assignedRole?: GrammarRole | null;
  correctRoleLabel?: GrammarRole;
  isSelected?: boolean;
  onClick?: () => void;
  isCorrect?: boolean | null;
  isSkeletonMode?: boolean;
  isInSkeletonSlot?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, index: number) => void;
}

const WordPill: React.FC<WordPillProps> = ({ 
  text, 
  index,
  assignedRole, 
  correctRoleLabel,
  isSelected, 
  onClick,
  isCorrect,
  isSkeletonMode,
  isInSkeletonSlot,
  draggable,
  onDragStart
}) => {
  const { theme } = useTheme();
  const isFresh = theme === Theme.FRESH;
  
  let baseClasses = "inline-flex items-center justify-center px-3 py-2 sm:px-3 sm:py-2 m-0.5 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 cursor-pointer select-none touch-manipulation active:scale-[0.95] min-h-[36px] sm:min-h-[32px]";
  
  let colorClasses = "bg-white border-2 border-gray-200 text-gray-700 shadow-sm";

  if (isSelected) {
    colorClasses = isFresh 
      ? "bg-emerald-100 border-2 border-emerald-400 text-emerald-700 shadow-md scale-105"
      : "bg-purple-100 border-2 border-purple-400 text-purple-700 shadow-md scale-105";
  } else if (isSkeletonMode) {
     if (isInSkeletonSlot) {
        colorClasses = "bg-gray-100 border-2 border-gray-200 text-gray-400 shadow-inner"; 
        baseClasses = baseClasses.replace("cursor-pointer", "cursor-default").replace("active:scale-95", "");
     }
  } else {
     if (isCorrect === true) {
        colorClasses = "bg-green-400 border-2 border-green-500 text-white shadow-lg animate-pulse";
     } else if (isCorrect === false) {
        colorClasses = isFresh
          ? "bg-rose-400 border-2 border-rose-500 text-white shadow-lg"
          : "bg-red-400 border-2 border-red-500 text-white shadow-lg";
     } else if (assignedRole) {
        colorClasses = "bg-white border-2 border-gray-200 text-gray-700 text-xs py-1.5 px-2 shadow-sm";
     }
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, index);
    }
  };

  return (
    <div 
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      className={`${baseClasses} ${colorClasses}`}
    >
      {text}
      
      {isCorrect === false && !isSkeletonMode && correctRoleLabel && (
        <div className="absolute -top-2 right-0 translate-x-1/2 z-20 pointer-events-none">
           <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-md border border-white shadow-md whitespace-nowrap">
             {correctRoleLabel}
           </span>
        </div>
      )}
    </div>
  );
};

export default WordPill;
