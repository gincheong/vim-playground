import React from 'react';
import { Mode, type Position } from '../types';

interface StatusBarProps {
  mode: Mode;
  cursor: Position;
  waitingForChar: boolean;
  message?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ mode, cursor, waitingForChar, message }) => {
  return (
    <div className="bg-[#007acc] text-white px-2 py-1 text-sm font-mono flex justify-between items-center w-full">
      <div className="flex gap-4">
        <span className="font-bold uppercase">-- {mode} --</span>
        {waitingForChar && <span className="animate-pulse">Waiting for character...</span>}
        {message && <span>{message}</span>}
      </div>
      <div>
        Ln {cursor.line + 1}, Col {cursor.col + 1}
      </div>
    </div>
  );
};
