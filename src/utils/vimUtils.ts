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

// 'w': Next word start
export const getNextWordStart = (lines: string[], cursor: Position): Position => {
  let { line, col } = cursor;

  // Current char type
  let currentLine = lines[line];
  if (col >= currentLine.length) {
    // End of line, move to next line
    if (line < lines.length - 1) return { line: line + 1, col: 0 };
    return cursor;
  }

  const startChar = currentLine[col];
  const startType = isWhitespace(startChar) ? 'space' : isAlphanumeric(startChar) ? 'word' : 'special';

  // 1. Skip current word/space chunk
  while (line < lines.length) {
    currentLine = lines[line];
    if (col >= currentLine.length) {
      // Reached EOL
      if (line < lines.length - 1) {
        line++;
        col = 0;
        // If we just crossed EOL, we are technically at a new "start" position (whitespace or word)
        // But Vim 'w' skips empty lines usually? No, it lands on empty line if it's the next thing.
        // Simplified: If next line is empty, land there. If not, check its char.
        const nextLine = lines[line];
        if (nextLine.length === 0) return { line, col: 0 };
        const nextChar = nextLine[0];
        if (!isWhitespace(nextChar)) return { line, col: 0 };
        // If whitespace, continue skipping
      } else {
        return cursor; // End of file
      }
    }

    const currentChar = currentLine[col];
    const currentType = isWhitespace(currentChar) ? 'space' : isAlphanumeric(currentChar) ? 'word' : 'special';

    if (startType === 'space') {
      // If we started on space, we look for non-space
      if (currentType !== 'space') return { line, col };
    } else {
      // We started on word/special
      // If we encounter space, we are done with current word, now consume spaces until next word
      if (currentType !== startType) {
        // If we changed from word->special or special->word, that's a new word start!
        // If we changed to space, we need to skip spaces.
        if (currentType !== 'space') return { line, col };

        // Now consume spaces
        while (line < lines.length) {
          const l = lines[line];
          if (col >= l.length) {
            if (line < lines.length - 1) {
              line++;
              col = 0;
              if (lines[line].length === 0) return { line, col: 0 }; // empty line is a word? Vim says yes for 'w' landing
              if (!isWhitespace(lines[line][0])) return { line, col: 0 };
              continue;
            }
            return cursor;
          }
          if (!isWhitespace(l[col])) return { line, col };
          col++;
        }
      }
    }
    col++;
    if (col >= lines[line].length && line < lines.length - 1) {
      line++;
      col = 0;
      if (lines[line].length === 0) return { line, col: 0 };
      if (!isWhitespace(lines[line][0])) return { line, col: 0 };
    }
  }

  return { line, col };
};

// Simplified logic for 'w':
// 1. If on alphanumeric, consume until non-alphanumeric.
// 2. If on special, consume until non-special.
// 3. (After 1 or 2) If now on space, consume until non-space.
// 4. Return position.
// Handling EOL: EOL is treated like a space usually for 'w' transition across lines.

export const getNextWordStartSimple = (lines: string[], cursor: Position): Position => {
  let { line, col } = cursor;

  const getCurrentChar = () => {
    if (line >= lines.length) return null;
    const l = lines[line];
    if (col >= l.length) return '\n'; // Treat EOL as newline char conceptually
    return l[col];
  };

  const advance = () => {
    col++;
    const l = lines[line];
    if (col > l.length) {
      // Crossed EOL
      if (line < lines.length - 1) {
        line++;
        col = 0;
        return true;
      }
      return false; // EOF
    }
    return true;
  };

  // Initial char
  let char = getCurrentChar();
  if (char === null) return cursor;

  // Check type
  const isAlpha = (c: string) => isAlphanumeric(c);
  const isSpec = (c: string) => !isAlphanumeric(c) && !isWhitespace(c) && c !== '\n';

  const startAlpha = isAlpha(char as string);
  const startSpec = isSpec(char as string);

  // 1. Consume current word
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

  // 2. Consume whitespace (including newlines)
  char = getCurrentChar();
  while (char !== null && (isWhitespace(char) || char === '\n')) {
    if (char === '\n' && lines[line].length === 0) {
      // Empty line is a stop for 'w'
      return { line, col: 0 };
    }
    // But wait, if we just came from a word and hit \n, we should check if next line is empty.
    // If we are at \n (col == length), we advance to next line 0.
    // If next line is empty, we stop.

    if (!advance()) break;
    char = getCurrentChar();

    // If we advanced to an empty line, stop?
    // Vim 'w': word, word, \n, word.
    // If empty line: word, \n\n, word. Stops at empty line.
    if (col === 0 && lines[line].length === 0) return { line, col: 0 };
  }

  // If we are past EOL of last line, clamp
  if (line >= lines.length) return cursor;
  const len = lines[line].length;
  if (col > len) col = len; // Should be at 0 or valid char

  return { line, col };
};

// 'b': Previous word start
export const getPrevWordStart = (lines: string[], cursor: Position): Position => {
  let { line, col } = cursor;

  const retreat = () => {
    col--;
    if (col < 0) {
      if (line > 0) {
        line--;
        col = lines[line].length; // At "newline" position (end of line)
        return true;
      }
      col = 0;
      return false; // BOF
    }
    return true;
  };

  // 1. Skip whitespace backwards
  // If we are at start of word, 'b' goes to prev word.
  // If we are in middle of word, 'b' goes to start of current word.

  // Logic:
  // If current char is space, skip spaces backwards.
  // Then we are at end of a word (or special).
  // Then skip word chars backwards until start.

  // If current char is word/special, we need to check if we are at start.
  // If col > 0 and prev char is same type, we are in middle/end.
  // If we are at start (col=0 or prev different), we go to prev word.

  // Let's just retreat once to ensure we move if at start.
  // But if we are in middle, we stay in current word.

  // Correct Logic:
  // 1. Skip spaces backwards.
  // 2. Identify type of char we landed on.
  // 3. Skip same type backwards.
  // 4. Move forward one step (to land on start).

  // Exception: If we started in middle of word, 'b' goes to start of *current* word.
  // So we shouldn't skip spaces first if we are in a word.

  // Helper to get char type
  const getType = (l: number, c: number) => {
    if (c >= lines[l].length) return 'space'; // EOL treated as space for separation
    const ch = lines[l][c];
    if (isWhitespace(ch)) return 'space';
    if (isAlphanumeric(ch)) return 'word';
    return 'special';
  };

  let currType = getType(line, col);

  // If we are at 'space', we consume spaces backwards.
  if (currType === 'space') {
    while (true) {
      if (!retreat()) return { line, col };
      currType = getType(line, col);
      if (currType !== 'space') break;
    }
  } else {
    // We are on a word/special.
    // Check if we are at start of this word.
    // If col > 0 and type(col-1) == currType, we are not at start.
    // If we are not at start, we just go to start of THIS word.
    // If we ARE at start, we need to go to prev word.

    let isStart = false;
    if (col === 0) isStart = true;
    else {
      const prevType = getType(line, col - 1);
      if (prevType !== currType) isStart = true;
    }

    if (isStart) {
      // We are at start, so we need to jump to prev word.
      // First retreat to get off the current word
      if (!retreat()) return { line, col };

      // Now consume spaces
      currType = getType(line, col);
      while (currType === 'space') {
        if (!retreat()) return { line, col: 0 }; // BOF
        currType = getType(line, col);
      }
    }
  }

  // Now we are at the end (or middle) of the target word.
  // currType is target type.
  // Consume backwards until type changes.
  while (true) {
    if (col === 0) return { line, col: 0 };
    const prevType = getType(line, col - 1);
    if (prevType !== currType) return { line, col };
    retreat();
  }
};

// 'e': End of word
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

  // 1. Advance at least once
  if (!advance()) return cursor;

  // 2. Consume spaces forward
  let char = lines[line][col];
  while (isWhitespace(char) || lines[line].length === 0) {
    if (!advance()) return { line, col: lines[line].length - 1 };
    if (lines[line].length > 0) char = lines[line][col];
  }

  // 3. We are at start of a word. Consume until end.
  const getType = (c: string) => (isAlphanumeric(c) ? 'word' : isWhitespace(c) ? 'space' : 'special');
  const startType = getType(char);

  while (true) {
    // Look ahead
    const l = lines[line];
    if (col + 1 >= l.length) return { line, col }; // End of line is end of word

    const nextChar = l[col + 1];
    const nextType = getType(nextChar);

    if (nextType !== startType) return { line, col };

    col++;
  }
};
