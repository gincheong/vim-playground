import { type VimAction, Mode, type VimState } from '../../../types';

export const handleNormalModeKey = (e: KeyboardEvent, dispatch: React.Dispatch<VimAction>, state: VimState) => {
  const { commandBuffer } = state;

  // Undo/Redo 처리
  if (e.key === 'u' && !e.ctrlKey) {
    e.preventDefault();
    dispatch({ type: 'UNDO' });
    return;
  }
  if (e.key === 'r' && e.ctrlKey) {
    e.preventDefault();
    dispatch({ type: 'REDO' });
    return;
  }

  // 숫자 입력 처리 ({count}gg, {count}G 지원)
  if (/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    dispatch({ type: 'ADD_TO_COMMAND_BUFFER', char: e.key });
    return;
  }

  // 멀티 키 시퀀스 처리
  if (commandBuffer) {
    const countMatch = commandBuffer.match(/^(\d+)/);
    const count = countMatch ? parseInt(countMatch[1], 10) : null;
    // cmdPrefix는 숫자 이후의 문자열 (예: "12g" -> "g", "12" -> "")
    const cmdPrefix = countMatch ? commandBuffer.slice(countMatch[1].length) : commandBuffer;

    // 1. {count}G -> 해당 라인으로 이동
    if (count !== null && cmdPrefix === '' && e.key === 'G') {
      dispatch({ type: 'JUMP_FILE', target: 'start', line: count });
      return;
    }

    // 2. {count}gg -> 해당 라인으로 이동 (count 없으면 파일 시작으로)
    if (cmdPrefix === 'g' && e.key === 'g') {
      if (count !== null) {
        dispatch({ type: 'JUMP_FILE', target: 'start', line: count });
      } else {
        dispatch({ type: 'JUMP_FILE', target: 'start' });
      }
      return;
    }

    // 3. 라인 단위 작업 (dd, yy, cc)
    if (cmdPrefix === 'd' && e.key === 'd') {
      dispatch({ type: 'LINE_OP', op: 'delete' });
      return;
    }
    if (cmdPrefix === 'y' && e.key === 'y') {
      dispatch({ type: 'LINE_OP', op: 'yank' });
      return;
    }
    if (cmdPrefix === 'c' && e.key === 'c') {
      dispatch({ type: 'LINE_OP', op: 'change' });
      return;
    }

    // 4. 시퀀스 계속 입력 (버퍼에 추가)
    if (e.key === 'g' || e.key === 'd' || e.key === 'y' || e.key === 'c') {
      e.preventDefault();
      dispatch({ type: 'ADD_TO_COMMAND_BUFFER', char: e.key });
      return;
    }

    // 5. 유효하지 않은 시퀀스 -> 버퍼 초기화
    dispatch({ type: 'CLEAR_COMMAND_BUFFER' });
    return;
  }

  // 멀티 키 커맨드 시작 (단일 키 입력)
  if (!e.ctrlKey && (e.key === 'g' || e.key === 'd' || e.key === 'y' || e.key === 'c')) {
    e.preventDefault();
    dispatch({ type: 'ADD_TO_COMMAND_BUFFER', char: e.key });
    return;
  }

  // {count} 없이 G만 입력된 경우 (파일 끝으로 이동)
  if (e.key === 'G') {
    dispatch({ type: 'JUMP_FILE', target: 'end' });
    return;
  }

  switch (e.key) {
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
    case '%': // 괄호 짝 찾기 (Shift+5)
      dispatch({ type: 'MATCH_BRACKET' });
      break;
    case 'J': // 라인 합치기 (Shift+j)
      e.preventDefault();
      dispatch({ type: 'JOIN_LINES' });
      break;
    case 'u':
      if (e.ctrlKey) {
        e.preventDefault();
        dispatch({ type: 'SCROLL', direction: 'up' });
      }
      break;
    case 'd': // Ctrl+d 스크롤 (단독 d는 위에서 처리됨)
      if (e.ctrlKey) {
        e.preventDefault();
        dispatch({ type: 'SCROLL', direction: 'down' });
        return;
      }
      break;
    case 'i':
      e.preventDefault();
      dispatch({ type: 'ENTER_MODE', mode: Mode.INSERT });
      break;
    case 'a':
      e.preventDefault();
      dispatch({ type: 'ENTER_MODE', mode: Mode.INSERT });
      dispatch({ type: 'MOVE', direction: 'l' });
      break;
    case 'o':
      e.preventDefault();
      dispatch({ type: 'LINE_OP', op: 'open_below' });
      break;
    case 'O': // 위쪽으로 라인 열기 (Shift+o)
      e.preventDefault();
      dispatch({ type: 'LINE_OP', op: 'open_above' });
      break;
    case 's':
      e.preventDefault();
      dispatch({ type: 'SUBSTITUTE' });
      break;
    case 'v':
      e.preventDefault();
      if (e.ctrlKey) {
        dispatch({ type: 'ENTER_MODE', mode: Mode.VISUAL_BLOCK });
      } else {
        dispatch({ type: 'ENTER_MODE', mode: Mode.VISUAL });
      }
      break;
    case 'V': // 라인 비주얼 모드 (Shift+v)
      e.preventDefault();
      dispatch({ type: 'ENTER_MODE', mode: Mode.VISUAL_LINE });
      break;
    case 'f':
      e.preventDefault();
      dispatch({ type: 'WAIT_FOR_CHAR', direction: 'forward' });
      break;
    case 'F':
      e.preventDefault();
      dispatch({ type: 'WAIT_FOR_CHAR', direction: 'backward' });
      break;
    case 'p':
      e.preventDefault();
      dispatch({ type: 'PASTE' });
      break;
    case '/':
      e.preventDefault();
      dispatch({ type: 'SEARCH_START' });
      break;
    case 'n':
      e.preventDefault();
      dispatch({ type: 'SEARCH_NEXT', direction: 'next' });
      break;
    case 'N':
      e.preventDefault();
      dispatch({ type: 'SEARCH_NEXT', direction: 'prev' });
      break;
  }
};
