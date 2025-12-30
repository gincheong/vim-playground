export const Mode = {
  NORMAL: 'NORMAL',
  INSERT: 'INSERT',
  VISUAL: 'VISUAL',
  VISUAL_LINE: 'VISUAL_LINE',
  VISUAL_BLOCK: 'VISUAL_BLOCK',
  VISUAL_BLOCK_INSERT: 'VISUAL_BLOCK_INSERT', // 멀티 커서 입력 (Block Insert)
  COMMAND: 'COMMAND',
  REPLACE: 'REPLACE',
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

  // 네비게이션 및 검색
  waitingForChar: boolean;
  findDirection: 'forward' | 'backward' | null;

  // 확장 기능
  commandBuffer: string;
  searchQuery: string;
  searchMatchIndex: number | null;
  commandBar: string | null;

  // Visual Block Insert 상태
  visualBlock: {
    startLine: number;
    endLine: number;
    col: number; // 입력이 일어나는 컬럼 위치
  } | null;

  // 실행 취소/다시 실행 기록
  history: {
    lines: string[];
    cursor: Position;
  }[];
  historyIndex: number;
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
  | { type: 'SCROLL'; direction: 'up' | 'down' }
  | { type: 'JUMP_FILE'; target: 'start' | 'end'; line?: number } // 라인 지정 이동 ({count}G)
  | { type: 'MATCH_BRACKET' }
  | { type: 'LINE_OP'; op: 'delete' | 'yank' | 'change' | 'open_below' | 'open_above' }
  | { type: 'REPLACE_CHAR'; char: string }
  | { type: 'JOIN_LINES' }
  | { type: 'SEARCH_START'; query?: string }
  | { type: 'SEARCH_TYPE'; char: string }
  | { type: 'SEARCH_EXEC' }
  | { type: 'SEARCH_NEXT'; direction: 'next' | 'prev' }
  | { type: 'ADD_TO_COMMAND_BUFFER'; char: string }
  | { type: 'CLEAR_COMMAND_BUFFER' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // 추가된 Visual 액션
  | { type: 'VISUAL_CASE'; caseType: 'toggle' | 'upper' | 'lower' }
  | { type: 'VISUAL_INDENT'; direction: 'in' | 'out' }
  | { type: 'VISUAL_REPLACE'; char: string } // 선택 영역 치환 (문자 입력 대기)
  | { type: 'VISUAL_JOIN' }
  | { type: 'VISUAL_BLOCK_INSERT'; side: 'before' | 'after' }; // 'I' (before) 또는 'A' (after)
