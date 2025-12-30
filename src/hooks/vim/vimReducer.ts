import { type VimState, type VimAction, Mode } from '../../types';
import { recordHistory, handleUndo, handleRedo, shouldPushHistoryAfter } from './handlers/history';
import {
  handleMove,
  handleMoveWord,
  handleMoveLineBoundary,
  handleScroll,
  handleJumpFile,
  handleMatchBracket,
} from './handlers/navigation';
import {
  handleTypeChar,
  handleDeleteChar,
  handleNewLine,
  handleSubstitute,
  handleReplaceChar,
  handleJoinLines,
  handlePaste,
  handleLineOp,
  handleCommandBuffer,
  handleClearBuffer,
} from './handlers/editing';
import {
  handleVisualDelete,
  handleVisualYank,
  handleVisualCase,
  handleVisualIndent,
  handleVisualJoin,
  handleVisualReplace,
  handleVisualBlockInsert,
} from './handlers/visual';
import { handleFindChar, findAllMatches, handleCommandMode } from './handlers/search';
import { handleEnterMode, handleExitMode } from './handlers/mode';

export function vimReducer(state: VimState, action: VimAction): VimState {
  // 초기 실행 시 히스토리 초기화 (최초 1회)
  if (state.history.length === 0) {
    const initialStateSnapshot = { lines: [...state.lines], cursor: { ...state.cursor } };
    state = { ...state, history: [initialStateSnapshot], historyIndex: 0 };
  }

  let nextState = state;

  // 1. 특수 모드 또는 복합 로직 우선 처리
  if (state.mode === Mode.REPLACE && action.type === 'TYPE_CHAR') {
    nextState = handleReplaceChar(state, action.char);
  } else if (state.mode === Mode.VISUAL_BLOCK_INSERT) {
    if (action.type === 'TYPE_CHAR') nextState = handleTypeChar(state, action.char);
    else if (action.type === 'DELETE_CHAR') nextState = handleDeleteChar(state);
    else if (action.type === 'EXIT_MODE') nextState = handleExitMode(state);
    else nextState = state;
  } else if (state.mode.startsWith('VISUAL') && state.waitingForChar && action.type === 'VISUAL_REPLACE') {
    nextState = handleVisualReplace(state, action.char);
  } else if (state.mode === Mode.COMMAND) {
    // 커맨드 모드(검색 등) 처리
    if (action.type === 'SEARCH_TYPE') {
      nextState = handleCommandMode(state, action.type, action.char);
    } else if (action.type === 'SEARCH_EXEC' || action.type === 'EXIT_MODE' || action.type === 'DELETE_CHAR') {
      nextState = handleCommandMode(state, action.type);
    }
  } else {
    // 2. 일반 액션 처리 (Switch 문)
    switch (action.type) {
      // 네비게이션
      case 'MOVE':
        nextState = handleMove(state, action.direction);
        break;
      case 'MOVE_WORD':
        nextState = handleMoveWord(state, action.direction);
        break;
      case 'MOVE_LINE_BOUNDARY':
        nextState = handleMoveLineBoundary(state, action.boundary);
        break;
      case 'SCROLL':
        nextState = handleScroll(state, action.direction);
        break;
      case 'JUMP_FILE':
        nextState = handleJumpFile(state, action.target, action.line);
        break;
      case 'MATCH_BRACKET':
        nextState = handleMatchBracket(state);
        break;
      case 'WAIT_FOR_CHAR':
        nextState = { ...state, waitingForChar: true, findDirection: action.direction };
        break;
      case 'FIND_CHAR':
        nextState = handleFindChar(state, action.char);
        break;

      // 모드 전환
      case 'ENTER_MODE':
        nextState = handleEnterMode(state, action.mode);
        break;
      case 'EXIT_MODE':
        nextState = handleExitMode(state);
        break;

      // 편집
      case 'TYPE_CHAR':
        nextState = handleTypeChar(state, action.char);
        break;
      case 'DELETE_CHAR':
        nextState = handleDeleteChar(state);
        break;
      case 'NEW_LINE':
        nextState = handleNewLine(state);
        break;
      case 'SUBSTITUTE':
        nextState = handleSubstitute(state);
        break;
      case 'PASTE':
        nextState = handlePaste(state);
        break;
      case 'LINE_OP':
        nextState = handleLineOp(state, action.op);
        break;
      case 'REPLACE_CHAR':
        nextState = { ...state, mode: Mode.REPLACE };
        break;
      case 'JOIN_LINES':
        nextState = handleJoinLines(state);
        break;
      case 'ADD_TO_COMMAND_BUFFER':
        nextState = handleCommandBuffer(state, action.char);
        break;
      case 'CLEAR_COMMAND_BUFFER':
        nextState = handleClearBuffer(state);
        break;

      // 비주얼 작업
      case 'VISUAL_DELETE':
        nextState = handleVisualDelete(state);
        break;
      case 'VISUAL_YANK':
        nextState = handleVisualYank(state);
        break;
      case 'VISUAL_CASE':
        nextState = handleVisualCase(state, action.caseType);
        break;
      case 'VISUAL_INDENT':
        nextState = handleVisualIndent(state, action.direction);
        break;
      case 'VISUAL_REPLACE':
        if (!action.char) {
          nextState = { ...state, waitingForChar: true };
          break;
        }
        nextState = handleVisualReplace(state, action.char);
        break;
      case 'VISUAL_JOIN':
        nextState = handleVisualJoin(state);
        break;
      case 'VISUAL_BLOCK_INSERT':
        nextState = handleVisualBlockInsert(state, action.side);
        break;

      // 검색
      case 'SEARCH_START':
        nextState = { ...state, mode: Mode.COMMAND, commandBar: '/', searchQuery: action.query || '' };
        break;
      case 'SEARCH_NEXT': {
        const matches = findAllMatches(state.lines, state.searchQuery);
        if (matches.length === 0) {
          nextState = state;
          break;
        }
        const { line, col } = state.cursor;
        if (action.direction === 'next') {
          const next = matches.find((m) => m.line > line || (m.line === line && m.col > col));
          if (next) nextState = { ...state, cursor: next };
          else nextState = { ...state, cursor: matches[0] };
        } else {
          const prev = [...matches].reverse().find((m) => m.line < line || (m.line === line && m.col < col));
          if (prev) nextState = { ...state, cursor: prev };
          else nextState = { ...state, cursor: matches[matches.length - 1] };
        }
        break;
      }

      // 히스토리
      case 'UNDO':
        return handleUndo(state);
      case 'REDO':
        return handleRedo(state);

      default:
        nextState = state;
    }
  }

  // 3. 히스토리 저장 판단 (액션 처리 후)
  // 상태 변경을 유발하는 주요 액션(Insert 종료, 삭제, 붙여넣기 등)이 발생했을 때 히스토리를 저장합니다.
  if (shouldPushHistoryAfter(action, state.mode)) {
    return recordHistory(nextState);
  }

  return nextState;
}
