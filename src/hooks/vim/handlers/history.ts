import { type VimState, type VimAction, Mode } from '../../../types';

// 현재 상태를 히스토리에 기록
export const recordHistory = (state: VimState): VimState => {
  // 상태 불변성을 위해 깊은 복사 (라인 배열 및 커서)
  const snapshot = {
    lines: [...state.lines],
    cursor: { ...state.cursor },
  };

  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(snapshot);

  // 히스토리 크기 제한 (예: 50개)
  if (newHistory.length > 50) {
    newHistory.shift();
  }

  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
};

// 실행 취소 (Undo)
export const handleUndo = (state: VimState): VimState => {
  if (state.historyIndex <= 0) return state; // 초기 상태 이전으로는 되돌릴 수 없음

  const newIndex = state.historyIndex - 1;
  const previousState = state.history[newIndex];

  return {
    ...state,
    lines: [...previousState.lines],
    cursor: { ...previousState.cursor },
    historyIndex: newIndex,
  };
};

// 다시 실행 (Redo)
export const handleRedo = (state: VimState): VimState => {
  if (state.historyIndex >= state.history.length - 1) return state; // 더 이상 Redo 할 내용 없음

  const newIndex = state.historyIndex + 1;
  const nextState = state.history[newIndex];

  return {
    ...state,
    lines: [...nextState.lines],
    cursor: { ...nextState.cursor },
    historyIndex: newIndex,
  };
};

// 히스토리를 저장해야 하는 시점인지 판단하는 헬퍼 함수
export const shouldPushHistoryAfter = (act: VimAction, oldMode: Mode): boolean => {
  // 상태를 변경하는 '원자적(Atomic)' 액션 목록
  const atomicMutations = [
    'LINE_OP', 'PASTE', 'REPLACE_CHAR', 'JOIN_LINES', 
    'VISUAL_DELETE', 'VISUAL_PASTE', 'VISUAL_INDENT', 
    'VISUAL_CASE', 'VISUAL_JOIN', 'VISUAL_REPLACE'
  ];
  
  if (atomicMutations.includes(act.type)) return true;
  
  // 모드가 종료될 때 (Insert 모드 등에서 나갈 때 변경사항 저장)
  if (act.type === 'EXIT_MODE' && 
     (oldMode === Mode.INSERT || oldMode === Mode.VISUAL_BLOCK_INSERT || oldMode === Mode.REPLACE)) {
    return true;
  }
  
  return false;
};

