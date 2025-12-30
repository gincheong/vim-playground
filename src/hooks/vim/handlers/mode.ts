import { type VimState, Mode } from '../../../types';

// 모드 진입
export const handleEnterMode = (state: VimState, mode: Mode): VimState => {
  if (state.mode === mode) return state;
  return {
    ...state,
    mode,
    visualStart: mode.startsWith('VISUAL') ? { ...state.cursor } : null,
    commandBuffer: '',
  };
};

// 모드 종료 (Normal 모드로 복귀)
export const handleExitMode = (state: VimState): VimState => {
  // Insert 모드 등에서 빠져나올 때 커서 위치 보정 (왼쪽으로 한 칸 이동)
  // 이는 Vim의 표준 동작을 모방한 것임
  let newCol = state.cursor.col;
  if (state.mode === Mode.INSERT || state.mode === Mode.VISUAL_BLOCK_INSERT) {
    newCol = Math.max(0, state.cursor.col - 1);
  }

  return {
    ...state,
    mode: Mode.NORMAL,
    cursor: { ...state.cursor, col: newCol },
    visualStart: null,
    visualBlock: null,
    waitingForChar: false,
    findDirection: null,
    commandBar: null,
    commandBuffer: '',
  };
};

