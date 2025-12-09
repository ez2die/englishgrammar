import React from 'react';
import { GrammarRole } from '../types';

interface WordPillProps {
  text: string;
  index: number;
  assignedRole?: GrammarRole | null;
  correctRoleLabel?: GrammarRole; // Pass the actual correct role for feedback
  isSelected?: boolean;
  onClick?: () => void;
  isCorrect?: boolean | null; // null = unchecked, true = correct, false = wrong
  isSkeletonMode?: boolean;
  isInSkeletonSlot?: boolean;
  // Drag and Drop props
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
  
  // Base style: Chunky, rounded, 3D effect with border-b-4
  let baseClasses = "inline-flex items-center justify-center px-4 py-2.5 m-1.5 rounded-2xl text-base font-bold transition-all duration-100 cursor-pointer border-2 border-b-4 select-none relative group touch-manipulation active:border-b-2 active:translate-y-[2px]";
  
  // Color logic
  // Default State (In Bank)
  let colorClasses = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50";

  if (isSelected) {
    // Selected State (Blue)
    colorClasses = "bg-sky-100 border-sky-500 text-sky-600 border-b-sky-500";
  } else if (isSkeletonMode) {
     // Phase 3 Logic
     if (isInSkeletonSlot) {
        colorClasses = "bg-slate-100 border-slate-200 text-slate-300 border-b-0 shadow-inner"; 
        baseClasses = baseClasses.replace("active:translate-y-[2px]", "").replace("active:border-b-2", "").replace("cursor-pointer", "cursor-default");
     }
  } else {
     // Phase 1 Logic (Analysis)
     if (isCorrect === true) {
        // Correct! (Green)
        colorClasses = "bg-green-500 border-green-600 text-white border-b-green-700";
     } else if (isCorrect === false) {
        // Wrong! (Red)
        colorClasses = "bg-rose-500 border-rose-600 text-white border-b-rose-700";
     } else if (assignedRole) {
        // Assigned to a basket (Inside Basket View) - Keep it looking like a chip
        colorClasses = "bg-white border-slate-200 text-slate-700 text-sm py-2 px-3";
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
      
      {/* Show Correction Feedback (Only when wrong and submitted) */}
      {isCorrect === false && !isSkeletonMode && correctRoleLabel && (
        <div className="absolute -top-3 right-0 translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
           <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-1 rounded-lg border-2 border-white shadow-sm whitespace-nowrap">
             {correctRoleLabel}
           </span>
        </div>
      )}
    </div>
  );
};

export default WordPill;