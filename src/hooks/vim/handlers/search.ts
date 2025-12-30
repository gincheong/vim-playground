import { type VimState, Mode } from '../../../types';

// 전체 텍스트에서 검색어와 일치하는 위치 찾기
export const findAllMatches = (lines: string[], query: string): { line: number; col: number }[] => {
  if (!query) return [];
  const matches: { line: number; col: number }[] = [];
  lines.forEach((l, i) => {
    let pos = 0;
    while (pos < l.length) {
      const idx = l.indexOf(query, pos);
      if (idx === -1) break;
      matches.push({ line: i, col: idx });
      pos = idx + 1;
    }
  });
  return matches;
};

// 한 줄 내 문자 찾기 (f, F)
export const handleFindChar = (state: VimState, char: string): VimState => {
  if (!state.waitingForChar) return state;
  const { line, col } = state.cursor;
  const currentLine = state.lines[line];
  const direction = state.findDirection || 'forward';

  let foundIndex = -1;
  if (direction === 'forward') {
    foundIndex = currentLine.indexOf(char, col + 1);
  } else {
    foundIndex = currentLine.lastIndexOf(char, col - 1);
  }

  if (foundIndex !== -1) {
    return {
      ...state,
      waitingForChar: false,
      findDirection: null,
      cursor: { ...state.cursor, col: foundIndex },
    };
  }

  return { ...state, waitingForChar: false, findDirection: null };
};

// 커맨드 모드 (/) 처리 로직
// 리듀서 내에서 직접 처리하던 부분을 함수로 분리
export const handleCommandMode = (state: VimState, actionType: string, char?: string): VimState => {
  if (actionType === 'SEARCH_TYPE' && char) {
    return { ...state, commandBar: (state.commandBar || '') + char };
  }
  
  if (actionType === 'SEARCH_EXEC') {
    const query = state.commandBar?.slice(1) || '';
    const matches = findAllMatches(state.lines, query);
    let nextMatch = matches.find(
      (m) => m.line > state.cursor.line || (m.line === state.cursor.line && m.col > state.cursor.col)
    );
    if (!nextMatch && matches.length > 0) nextMatch = matches[0];
    
    return {
      ...state,
      mode: Mode.NORMAL,
      commandBar: null,
      searchQuery: query,
      cursor: nextMatch ? { ...nextMatch } : state.cursor,
    };
  }
  
  if (actionType === 'EXIT_MODE' || actionType === 'DELETE_CHAR') {
    if (actionType === 'DELETE_CHAR') {
      return { ...state, commandBar: state.commandBar?.slice(0, -1) || null };
    }
    return { ...state, mode: Mode.NORMAL, commandBar: null };
  }

  return state;
};

