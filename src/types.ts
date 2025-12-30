export const Mode = {
  NORMAL: 'NORMAL',
  INSERT: 'INSERT',
  VISUAL: 'VISUAL',
  VISUAL_LINE: 'VISUAL_LINE',
  VISUAL_BLOCK: 'VISUAL_BLOCK',
  COMMAND: 'COMMAND', // New: For '/' search or ':' commands
  REPLACE: 'REPLACE', // New: For 'r' command
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

  // Navigation & Search
  waitingForChar: boolean; // For 'f', 'F' command
  findDirection: 'forward' | 'backward' | null; // For 'f' vs 'F'

  // Extended Features
  commandBuffer: string; // Stores partial commands like 'g', 'd', 'y', 'c'
  searchQuery: string; // Current search query
  searchMatchIndex: number | null; // Current index in match results (conceptually)
  commandBar: string | null; // Text being typed in command bar (e.g. "/query")
}

export type VimAction =
  | { type: 'MOVE'; direction: 'h' | 'j' | 'k' | 'l' }
  | { type: 'MOVE_WORD'; direction: 'w' | 'b' | 'e' }
  | { type: 'MOVE_LINE_BOUNDARY'; boundary: '$' | '_' }
  | { type: 'ENTER_MODE'; mode: Mode }
  | { type: 'EXIT_MODE' }
  | { type: 'TYPE_CHAR'; char: string }
  | { type: 'DELETE_CHAR' }
  | { type: 'NEW_LINE' }
  | { type: 'WAIT_FOR_CHAR'; direction: 'forward' | 'backward' }
  | { type: 'FIND_CHAR'; char: string }
  | { type: 'VISUAL_DELETE' }
  | { type: 'VISUAL_YANK' }
  | { type: 'PASTE' }
  | { type: 'SUBSTITUTE' }
  // New Actions
  | { type: 'SCROLL'; direction: 'up' | 'down' } // Ctrl+u, Ctrl+d
  | { type: 'JUMP_FILE'; target: 'start' | 'end' } // gg, G
  | { type: 'MATCH_BRACKET' } // %
  | { type: 'LINE_OP'; op: 'delete' | 'yank' | 'change' | 'open_below' | 'open_above' } // dd, yy, cc, o, O
  | { type: 'REPLACE_CHAR'; char: string } // r + char
  | { type: 'JOIN_LINES' } // J
  | { type: 'SEARCH_START'; query?: string } // / or *
  | { type: 'SEARCH_TYPE'; char: string } // Typing in search bar
  | { type: 'SEARCH_EXEC' } // Enter in search bar
  | { type: 'SEARCH_NEXT'; direction: 'next' | 'prev' } // n, N
  | { type: 'ADD_TO_COMMAND_BUFFER'; char: string } // For handling multi-key sequences
  | { type: 'CLEAR_COMMAND_BUFFER' };
