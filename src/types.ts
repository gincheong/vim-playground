export const Mode = {
  NORMAL: 'NORMAL',
  INSERT: 'INSERT',
  VISUAL: 'VISUAL',
  VISUAL_LINE: 'VISUAL_LINE',
  VISUAL_BLOCK: 'VISUAL_BLOCK',
} as const;

export type Mode = (typeof Mode)[keyof typeof Mode];

export interface Position {
  line: number;
  col: number;
}

export interface VimState {
  lines: string[];
  cursor: Position;
  mode: Mode;
  visualStart: Position | null;
  clipboard: string | null;
  waitingForChar: boolean; // For 'f', 'F' command
  findDirection: 'forward' | 'backward' | null; // For 'f' vs 'F'
}

export type VimAction =
  | { type: 'MOVE'; direction: 'h' | 'j' | 'k' | 'l' }
  | { type: 'MOVE_WORD'; direction: 'w' | 'b' | 'e' } // New: Word navigation
  | { type: 'MOVE_LINE_BOUNDARY'; boundary: '$' | '_' } // New: Line boundary
  | { type: 'ENTER_MODE'; mode: Mode }
  | { type: 'EXIT_MODE' }
  | { type: 'TYPE_CHAR'; char: string }
  | { type: 'DELETE_CHAR' }
  | { type: 'NEW_LINE' }
  | { type: 'WAIT_FOR_CHAR'; direction: 'forward' | 'backward' } // Updated: Added direction
  | { type: 'FIND_CHAR'; char: string }
  | { type: 'VISUAL_DELETE' }
  | { type: 'VISUAL_YANK' }
  | { type: 'PASTE' }
  | { type: 'SUBSTITUTE' };
