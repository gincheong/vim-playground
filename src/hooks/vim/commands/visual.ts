import { type VimAction, Mode } from '../../../types';

export const handleVisualModeKey = (e: KeyboardEvent, dispatch: React.Dispatch<VimAction>) => {
  switch (e.key) {
    case 'Escape':
    case 'v':
      e.preventDefault();
      dispatch({ type: 'EXIT_MODE' });
      break;
    case 'h':
    case 'j':
    case 'k':
    case 'l':
      dispatch({ type: 'MOVE', direction: e.key });
      break;
    case 'w':
    case 'b':
    case 'e':
      dispatch({ type: 'MOVE_WORD', direction: e.key });
      break;
    case '$':
    case '_':
      dispatch({ type: 'MOVE_LINE_BOUNDARY', boundary: e.key });
      break;
    case 'x':
    case 'd':
      e.preventDefault();
      dispatch({ type: 'VISUAL_DELETE' });
      break;
    case 'y':
      e.preventDefault();
      dispatch({ type: 'VISUAL_YANK' });
      break;
    case '~':
      e.preventDefault();
      dispatch({ type: 'VISUAL_CASE', caseType: 'toggle' });
      break;
    case 'u':
      e.preventDefault();
      dispatch({ type: 'VISUAL_CASE', caseType: 'lower' });
      break;
    case 'U': // 대문자 변환 (Shift+u)
      e.preventDefault();
      dispatch({ type: 'VISUAL_CASE', caseType: 'upper' });
      break;
    case '>': // 들여쓰기 (Shift+.)
      e.preventDefault();
      dispatch({ type: 'VISUAL_INDENT', direction: 'in' });
      break;
    case '<': // 내어쓰기 (Shift+,)
      e.preventDefault();
      dispatch({ type: 'VISUAL_INDENT', direction: 'out' });
      break;
    case 'J': // 라인 합치기 (Shift+j)
      e.preventDefault();
      dispatch({ type: 'VISUAL_JOIN' });
      break;
    case 'r':
      e.preventDefault();
      // 다음 문자 대기 (리듀서에서 처리)
      dispatch({ type: 'VISUAL_REPLACE', char: '' });
      break;
    case 'I': // 블록 삽입 (Shift+i)
      e.preventDefault();
      dispatch({ type: 'VISUAL_BLOCK_INSERT', side: 'before' });
      break;
    case 'A': // 블록 추가 (Shift+a)
      e.preventDefault();
      dispatch({ type: 'VISUAL_BLOCK_INSERT', side: 'after' });
      break;
    case 's':
    case 'c':
      e.preventDefault();
      // 선택 영역 변경: 삭제 후 Insert 모드 진입
      dispatch({ type: 'VISUAL_DELETE' });
      dispatch({ type: 'ENTER_MODE', mode: Mode.INSERT });
      break;
  }
};
