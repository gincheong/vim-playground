import type { Position } from '../types';

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const getLineLength = (lines: string[], lineIndex: number): number => {
  if (lineIndex < 0 || lineIndex >= lines.length) return 0;
  return lines[lineIndex].length;
};

export function getRange(p1: Position, p2: Position): { start: Position; end: Position } {
  if (p1.line < p2.line || (p1.line === p2.line && p1.col <= p2.col)) {
    return { start: p1, end: p2 };
  }
  return { start: p2, end: p1 };
}

// Word Navigation Logic

const isAlphanumeric = (char: string) => /[\w]/.test(char); // \w includes [a-zA-Z0-9_]
const isWhitespace = (char: string) => /\s/.test(char);

// 'w': 다음 단어 시작 지점으로 이동
// 로직:
// 1. 현재 문자가 영숫자면 비영숫자 나올 때까지 스킵
// 2. 특수문자면 비특수문자 나올 때까지 스킵
// 3. 공백이면 비공백 나올 때까지 스킵
// 4. 최종 위치 반환
export const getNextWordStartSimple = (lines: string[], cursor: Position): Position => {
  let { line, col } = cursor;

  const getCurrentChar = () => {
    if (line >= lines.length) return null;
    const l = lines[line];
    if (col >= l.length) return '\n'; // 줄 끝을 개행 문자로 취급
    return l[col];
  };

  const advance = () => {
    col++;
    const l = lines[line];
    if (col > l.length) {
      // 줄 넘어감
      if (line < lines.length - 1) {
        line++;
        col = 0;
        return true;
      }
      return false; // 파일 끝
    }
    return true;
  };

  // 초기 문자 확인
  let char = getCurrentChar();
  if (char === null) return cursor;

  // 타입 체크 헬퍼
  const isAlpha = (c: string) => isAlphanumeric(c);
  const isSpec = (c: string) => !isAlphanumeric(c) && !isWhitespace(c) && c !== '\n';

  const startAlpha = isAlpha(char as string);
  const startSpec = isSpec(char as string);

  // 1. 현재 단어 건너뛰기
  if (startAlpha) {
    while (true) {
      if (!advance()) return { line, col: Math.min(col, lines[line].length) };
      char = getCurrentChar();
      if (char === '\n' || char === null || !isAlpha(char)) break;
    }
  } else if (startSpec) {
    while (true) {
      if (!advance()) return { line, col: Math.min(col, lines[line].length) };
      char = getCurrentChar();
      if (char === '\n' || char === null || !isSpec(char)) break;
    }
  }

  // 2. 공백(개행 포함) 건너뛰기
  char = getCurrentChar();
  while (char !== null && (isWhitespace(char) || char === '\n')) {
    if (char === '\n' && lines[line].length === 0) {
      // 빈 줄은 'w'의 정지 지점
      return { line, col: 0 };
    }

    if (!advance()) break;
    char = getCurrentChar();

    // 빈 줄에 도달하면 정지
    if (col === 0 && lines[line].length === 0) return { line, col: 0 };
  }

  // 파일 범위를 벗어났으면 조정
  if (line >= lines.length) return cursor;
  const len = lines[line].length;
  if (col > len) col = len;

  return { line, col };
};

// 'b': 이전 단어 시작 지점으로 이동
export const getPrevWordStart = (lines: string[], cursor: Position): Position => {
  let { line, col } = cursor;

  const retreat = () => {
    col--;
    if (col < 0) {
      if (line > 0) {
        line--;
        col = lines[line].length; // 줄 끝으로 이동
        return true;
      }
      col = 0;
      return false; // 파일 시작
    }
    return true;
  };

  // 문자 타입 판별 헬퍼
  const getType = (l: number, c: number) => {
    if (c >= lines[l].length) return 'space'; // 줄 끝은 공백으로 취급
    const ch = lines[l][c];
    if (isWhitespace(ch)) return 'space';
    if (isAlphanumeric(ch)) return 'word';
    return 'special';
  };

  let currType = getType(line, col);

  // 1. 공백이면 뒤로 스킵
  if (currType === 'space') {
    while (true) {
      if (!retreat()) return { line, col };
      currType = getType(line, col);
      if (currType !== 'space') break;
    }
  } else {
    // 2. 단어/특수문자 위인 경우
    // 현재 위치가 단어의 시작인지 확인
    let isStart = false;
    if (col === 0) isStart = true;
    else {
      const prevType = getType(line, col - 1);
      if (prevType !== currType) isStart = true;
    }

    if (isStart) {
      // 이미 시작점이면 이전 단어로 이동해야 함
      // 우선 현재 단어를 벗어남
      if (!retreat()) return { line, col };

      // 다시 공백 스킵
      currType = getType(line, col);
      while (currType === 'space') {
        if (!retreat()) return { line, col: 0 };
        currType = getType(line, col);
      }
    }
  }

  // 3. 현재 타입이 바뀔 때까지 뒤로 이동 (단어의 시작점 찾기)
  while (true) {
    if (col === 0) return { line, col: 0 };
    const prevType = getType(line, col - 1);
    if (prevType !== currType) return { line, col };
    retreat();
  }
};

// 'e': 단어의 끝으로 이동
export const getNextWordEnd = (lines: string[], cursor: Position): Position => {
  let { line, col } = cursor;

  const advance = () => {
    col++;
    const l = lines[line];
    if (col >= l.length) {
      if (line < lines.length - 1) {
        line++;
        col = 0;
        return true;
      }
      return false;
    }
    return true;
  };

  // 1. 최소 한 칸 전진
  if (!advance()) return cursor;

  // 2. 공백 건너뛰기
  let char = lines[line][col];
  while (isWhitespace(char) || lines[line].length === 0) {
    if (!advance()) return { line, col: lines[line].length - 1 };
    if (lines[line].length > 0) char = lines[line][col];
  }

  // 3. 단어 시작점에서 끝까지 이동
  const getType = (c: string) => (isAlphanumeric(c) ? 'word' : isWhitespace(c) ? 'space' : 'special');
  const startType = getType(char);

  while (true) {
    const l = lines[line];
    if (col + 1 >= l.length) return { line, col }; // 줄 끝이면 단어 끝

    const nextChar = l[col + 1];
    const nextType = getType(nextChar);

    if (nextType !== startType) return { line, col };

    col++;
  }
};
