import React, { useRef, useEffect } from 'react';
import { Mode, type VimState } from '../types';
import { getRange } from '../utils/stringUtils';

interface VimEditorProps {
  vimState: VimState;
}

export const VimEditor: React.FC<VimEditorProps> = ({ vimState }) => {
  const { lines, cursor, mode, visualStart } = vimState;
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     // Scroll logic if needed
  }, [cursor]);

  const isSelected = (line: number, col: number) => {
    if (!mode.startsWith('VISUAL') || !visualStart) return false;
    
    const { start, end } = getRange(visualStart, cursor);

    if (mode === Mode.VISUAL_LINE) {
        // Select all columns in lines between start.line and end.line
        return line >= start.line && line <= end.line;
    }

    if (mode === Mode.VISUAL_BLOCK) {
        // Select rectangular area
        // Lines between start.line and end.line
        // Cols between min(start.col, cursor.col) and max(start.col, cursor.col)
        if (line < start.line || line > end.line) return false;
        
        const minCol = Math.min(visualStart.col, cursor.col);
        const maxCol = Math.max(visualStart.col, cursor.col);
        
        return col >= minCol && col <= maxCol;
    }
    
    // Normal Visual
    if (line < start.line || line > end.line) return false;
    
    if (line === start.line && line === end.line) {
      return col >= start.col && col <= end.col;
    }
    
    if (line === start.line) return col >= start.col;
    if (line === end.line) return col <= end.col;
    
    return true; // Intermediate lines
  };

  return (
    <div 
      className="bg-[#1e1e1e] text-[#d4d4d4] font-mono text-lg p-4 h-full overflow-auto outline-none"
      ref={editorRef}
      tabIndex={0}
    >
      <div className="relative">
        {lines.map((lineContent, lineIndex) => (
          <div key={lineIndex} className="flex relative leading-relaxed whitespace-pre">
            {/* Line Number */}
            <div className="w-12 text-right mr-4 text-[#858585] select-none">
              {lineIndex + 1}
            </div>

            {/* Line Content */}
            <div className="flex-1">
              {lineContent.length === 0 ? (
                 <span className={`relative ${
                    cursor.line === lineIndex && cursor.col === 0 ? 
                      (mode === Mode.INSERT ? 'border-l-2 border-white' : 'bg-white/50') 
                      : ''
                 } ${isSelected(lineIndex, 0) ? 'bg-[#264f78]' : ''}`}>&nbsp;</span>
              ) : (
                lineContent.split('').map((char, colIndex) => {
                  const isCursor = cursor.line === lineIndex && cursor.col === colIndex;
                  const selected = isSelected(lineIndex, colIndex);
                  
                  let className = "";
                  
                  if (selected) {
                    className += " bg-[#264f78]";
                  }
                  
                  if (isCursor) {
                    if (mode === Mode.INSERT) {
                      className += " border-l-2 border-white";
                    } else {
                      className += " bg-white text-black animate-pulse";
                    }
                  }

                  return (
                    <span key={colIndex} className={className}>{char}</span>
                  );
                })
              )}
              
              {/* Cursor at end of line (Insert mode mostly) */}
              {mode === Mode.INSERT && cursor.line === lineIndex && cursor.col === lineContent.length && (
                  <span className="border-l-2 border-white">&nbsp;</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
