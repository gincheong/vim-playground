import { type VimState, type VimAction, Mode } from '../../types';
import { clamp, getLineLength, getRange } from '../../utils/stringUtils';
import { getNextWordStartSimple, getPrevWordStart, getNextWordEnd } from '../../utils/vimUtils';

// Helper to safely clamp cursor after line changes
const clampCursor = (state: VimState, cursor = state.cursor): Position => {
    const line = clamp(cursor.line, 0, Math.max(0, state.lines.length - 1));
    const len = getLineLength(state.lines, line);
    // In Normal mode, max col is len - 1 (unless empty line). In Insert, max col is len.
    // However, after line operations, we usually land in Normal mode or specific position.
    // Standard clamp for Normal mode:
    const maxCol = Math.max(0, len - 1);
    const col = clamp(cursor.col, 0, maxCol);
    return { line, col };
};

const handleMove = (state: VimState, direction: 'h' | 'j' | 'k' | 'l'): VimState => {
  const { line, col } = state.cursor;
  let newLine = line;
  let newCol = col;

  switch (direction) {
    case 'h':
      newCol = col - 1;
      break;
    case 'l':
      newCol = col + 1;
      break;
    case 'j':
      newLine = line + 1;
      break;
    case 'k':
      newLine = line - 1;
      break;
  }

  newLine = clamp(newLine, 0, state.lines.length - 1);
  const currentLineLength = getLineLength(state.lines, newLine);
  // Allow cursor to be at length in Insert mode
  const maxCol = Math.max(0, currentLineLength - (state.mode === Mode.INSERT ? 0 : 1));
  newCol = clamp(newCol, 0, maxCol);
  
  if (direction === 'j' || direction === 'k') {
      newCol = clamp(col, 0, maxCol);
  }

  return {
    ...state,
    cursor: { line: newLine, col: newCol },
    commandBuffer: '', // Clear buffer on move
  };
};

// ... (Other existing handlers remain mostly same, but ensure commandBuffer is cleared or handled)

const handleCommandBuffer = (state: VimState, char: string): VimState => {
    return { ...state, commandBuffer: state.commandBuffer + char };
};

const handleClearBuffer = (state: VimState): VimState => {
    return { ...state, commandBuffer: '' };
};

const handleScroll = (state: VimState, direction: 'up' | 'down'): VimState => {
    // Scroll half page (approx 10 lines)
    const SCROLL_AMOUNT = 10;
    let newLine = state.cursor.line;
    if (direction === 'up') {
        newLine -= SCROLL_AMOUNT;
    } else {
        newLine += SCROLL_AMOUNT;
    }
    newLine = clamp(newLine, 0, state.lines.length - 1);
    
    // Maintain relative col if possible, or clamp
    // Simplified: move cursor to new line
    return {
        ...state,
        cursor: clampCursor({ ...state, cursor: { ...state.cursor, line: newLine } }),
    };
};

const handleJumpFile = (state: VimState, target: 'start' | 'end'): VimState => {
    let newLine = 0;
    if (target === 'end') {
        newLine = state.lines.length - 1;
    }
    // gg goes to first non-blank? usually. Let's just go to 0,0 for now or use clampCursor.
    // G goes to last line.
    
    return {
        ...state,
        cursor: clampCursor({ ...state, cursor: { line: newLine, col: 0 } }), // Could implement ^ logic here
        commandBuffer: '',
    };
};

const findMatchingBracket = (lines: string[], cursor: Position): Position | null => {
    const { line, col } = cursor;
    const char = lines[line][col];
    const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
    const revPairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
    
    if (pairs[char]) {
        // Search forward
        const open = char;
        const close = pairs[char];
        let depth = 1;
        
        for (let l = line; l < lines.length; l++) {
            const startC = l === line ? col + 1 : 0;
            const lineContent = lines[l];
            for (let c = startC; c < lineContent.length; c++) {
                const ch = lineContent[c];
                if (ch === open) depth++;
                else if (ch === close) depth--;
                
                if (depth === 0) return { line: l, col: c };
            }
        }
    } else if (revPairs[char]) {
        // Search backward
        const close = char;
        const open = revPairs[char];
        let depth = 1;
        
        for (let l = line; l >= 0; l--) {
            const startC = l === line ? col - 1 : lines[l].length - 1;
            for (let c = startC; c >= 0; c--) {
                const ch = lines[l][c];
                if (ch === close) depth++;
                else if (ch === open) depth--;
                
                if (depth === 0) return { line: l, col: c };
            }
        }
    }
    return null;
};

const handleMatchBracket = (state: VimState): VimState => {
    const match = findMatchingBracket(state.lines, state.cursor);
    if (match) {
        return { ...state, cursor: match };
    }
    return state;
};

const handleLineOp = (state: VimState, op: 'delete' | 'yank' | 'change' | 'open_below' | 'open_above'): VimState => {
    const { line } = state.cursor;
    const lines = [...state.lines];
    let newCursor = { ...state.cursor };
    let newMode = state.mode;
    let clipboard = state.clipboard;
    
    switch (op) {
        case 'delete': // dd
            clipboard = lines[line] + '\n'; // Linewise yank
            lines.splice(line, 1);
            if (lines.length === 0) lines.push(''); // Always keep 1 line
            newCursor.line = Math.min(line, lines.length - 1);
            break;
        case 'yank': // yy
            clipboard = lines[line] + '\n';
            break;
        case 'change': // cc
            clipboard = lines[line] + '\n';
            lines[line] = ''; // Clear line
            newMode = Mode.INSERT;
            newCursor.col = 0;
            break;
        case 'open_below': // o
            lines.splice(line + 1, 0, '');
            newCursor = { line: line + 1, col: 0 };
            newMode = Mode.INSERT;
            break;
        case 'open_above': // O
            lines.splice(line, 0, '');
            newCursor = { line: line, col: 0 };
            newMode = Mode.INSERT;
            break;
    }
    
    // Clamp cursor if needed (for delete/yank cases where we stayed in Normal)
    if (newMode === Mode.NORMAL) {
        const len = getLineLength(lines, newCursor.line);
        newCursor.col = Math.min(newCursor.col, Math.max(0, len - 1));
    }
    
    return {
        ...state,
        lines,
        cursor: newCursor,
        mode: newMode,
        clipboard,
        commandBuffer: '',
    };
};

const handleReplaceChar = (state: VimState, char: string): VimState => {
    const { line, col } = state.cursor;
    const lines = [...state.lines];
    const currentLine = lines[line];
    
    if (col < currentLine.length) {
        lines[line] = currentLine.slice(0, col) + char + currentLine.slice(col + 1);
    }
    
    return {
        ...state,
        lines,
        mode: Mode.NORMAL, // Return to Normal
    };
};

const handleJoinLines = (state: VimState): VimState => {
    const { line } = state.cursor;
    if (line >= state.lines.length - 1) return state; // Last line, cannot join
    
    const lines = [...state.lines];
    const curr = lines[line];
    const next = lines[line + 1];
    
    // Vim J adds a space if curr doesn't end with whitespace
    // But simple implementation: trim next line leading space?
    // Standard J: append ' ' + next.trimLeft() (simplified)
    const joined = curr + ' ' + next.trimStart();
    lines[line] = joined;
    lines.splice(line + 1, 1);
    
    return {
        ...state,
        lines,
        // Cursor moves to where join happened? Vim moves to last char of original line?
        // Actually usually moves to the space between.
        cursor: { line, col: curr.length }, // Position at the space
    };
};

// Search Logic
const findAllMatches = (lines: string[], query: string): { line: number, col: number }[] => {
    if (!query) return [];
    const matches: { line: number, col: number }[] = [];
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

// ... existing handlers (needs updating signatures or ensure they return cleanly)
// Re-implementing simplified versions or reusing where possible.

export function vimReducer(state: VimState, action: VimAction): VimState {
  // If we are in REPLACE mode, handle type char specially
  if (state.mode === Mode.REPLACE && action.type === 'TYPE_CHAR') {
      return handleReplaceChar(state, action.char);
  }
  
  // If in COMMAND mode
  if (state.mode === Mode.COMMAND) {
      if (action.type === 'SEARCH_TYPE') {
           return { ...state, commandBar: (state.commandBar || '') + action.char };
      }
      if (action.type === 'SEARCH_EXEC') {
           const query = state.commandBar?.slice(1) || ''; // Remove '/'
           const matches = findAllMatches(state.lines, query);
           // Find first match after cursor
           // ... logic for finding next match
           // For now, let's just save query and mode normal
           // Finding match:
           let nextMatch = matches.find(m => (m.line > state.cursor.line) || (m.line === state.cursor.line && m.col > state.cursor.col));
           if (!nextMatch && matches.length > 0) nextMatch = matches[0]; // Wrap around
           
           return {
               ...state,
               mode: Mode.NORMAL,
               commandBar: null,
               searchQuery: query,
               cursor: nextMatch ? { ...nextMatch } : state.cursor,
           };
      }
      if (action.type === 'EXIT_MODE') {
           return { ...state, mode: Mode.NORMAL, commandBar: null };
      }
      // Handle backspace in command bar?
      // Need DELETE_CHAR support for command bar
  }

  switch (action.type) {
    case 'MOVE':
        // Reuse logic but need to include existing file imports if split
        // For simplicity, assuming we merged back or imported.
        // Assuming vimReducer.ts has all imports or logic.
        // Let's rely on previous logic but add commandBuffer clear.
        // Copying simplified logic from previous step for completeness/context:
        return handleMove(state, action.direction);
        
    case 'MOVE_WORD':
        return { ...handleMoveWord(state, action.direction), commandBuffer: '' }; // handleMoveWord needs import or definition
        
    case 'MOVE_LINE_BOUNDARY':
        return { ...handleMoveLineBoundary(state, action.boundary), commandBuffer: '' };

    case 'ENTER_MODE':
        // ...
        return handleEnterMode(state, action.mode);

    case 'EXIT_MODE':
        return handleExitMode(state);

    case 'TYPE_CHAR':
        return handleTypeChar(state, action.char);

    case 'DELETE_CHAR':
         if (state.mode === Mode.COMMAND) {
             return { ...state, commandBar: state.commandBar?.slice(0, -1) || null };
         }
         return handleDeleteChar(state);
         
    case 'NEW_LINE':
         return handleNewLine(state);
         
    case 'SUBSTITUTE':
         return handleSubstitute(state);
         
    case 'WAIT_FOR_CHAR':
         return { ...state, waitingForChar: true, findDirection: action.direction };
         
    case 'FIND_CHAR':
         return handleFindChar(state, action.char);
         
    case 'VISUAL_DELETE':
         return handleVisualDelete(state);
         
    case 'VISUAL_YANK':
         return handleVisualYank(state);
         
    case 'PASTE':
         return handlePaste(state);
         
    // NEW ACTIONS
    case 'ADD_TO_COMMAND_BUFFER':
        return handleCommandBuffer(state, action.char);
    case 'CLEAR_COMMAND_BUFFER':
        return handleClearBuffer(state);
    case 'SCROLL':
        return handleScroll(state, action.direction);
    case 'JUMP_FILE':
        return handleJumpFile(state, action.target);
    case 'MATCH_BRACKET':
        return handleMatchBracket(state);
    case 'LINE_OP':
        return handleLineOp(state, action.op);
    case 'REPLACE_CHAR':
         // This is triggered to ENTER replace mode usually, or 'r' waits for char.
         // Standard: 'r' -> waits -> type char -> replace.
         // So 'r' sets waiting state or mode.
         // Let's use Mode.REPLACE for simplicity.
         return { ...state, mode: Mode.REPLACE };
    case 'JOIN_LINES':
        return handleJoinLines(state);
    case 'SEARCH_START':
        return { ...state, mode: Mode.COMMAND, commandBar: '/', searchQuery: action.query || '' };
    case 'SEARCH_NEXT':
        // Logic to find next/prev match based on searchQuery
        {
             const matches = findAllMatches(state.lines, state.searchQuery);
             if (matches.length === 0) return state;
             // Current logic ...
             // Wrap around logic
             const { line, col } = state.cursor;
             let idx = -1;
             
             if (action.direction === 'next') {
                 // Find first match > current
                 const next = matches.find(m => (m.line > line) || (m.line === line && m.col > col));
                 if (next) return { ...state, cursor: next };
                 return { ...state, cursor: matches[0] }; // wrap
             } else {
                 // Find last match < current
                 // Iterate reverse
                 const prev = [...matches].reverse().find(m => (m.line < line) || (m.line === line && m.col < col));
                 if (prev) return { ...state, cursor: prev };
                 return { ...state, cursor: matches[matches.length - 1] }; // wrap
             }
        }
        
    default:
      return state;
  }
}

// ... Need to ensure all helper functions (handleMoveWord, etc) are present or imported.
// Since I am overwriting the file, I must include ALL logic.
// I will assume I need to copy-paste the previous helpers here.
// RE-INCLUDING HELPERS from previous file content to avoid breaking:

const handleMoveWord = (state: VimState, direction: 'w' | 'b' | 'e'): VimState => {
  let newCursor = state.cursor;
  switch (direction) {
    case 'w':
      newCursor = getNextWordStartSimple(state.lines, state.cursor);
      break;
    case 'b':
      newCursor = getPrevWordStart(state.lines, state.cursor);
      break;
    case 'e':
      newCursor = getNextWordEnd(state.lines, state.cursor);
      break;
  }
  return { ...state, cursor: newCursor };
};

const handleMoveLineBoundary = (state: VimState, boundary: '$' | '_'): VimState => {
  const { line } = state.cursor;
  const lineContent = state.lines[line];
  let newCol = 0;

  if (boundary === '$') {
    newCol = Math.max(0, lineContent.length - 1);
  } else if (boundary === '_') {
    const match = lineContent.match(/\S/);
    newCol = match ? match.index! : Math.max(0, lineContent.length - 1);
  }

  return {
    ...state,
    cursor: { line, col: newCol },
  };
};

const handleEnterMode = (state: VimState, mode: Mode): VimState => {
  if (state.mode === mode) return state;
  return {
    ...state,
    mode,
    visualStart: mode.startsWith('VISUAL') ? { ...state.cursor } : null,
    commandBuffer: '',
  };
};

const handleExitMode = (state: VimState): VimState => {
  let newCol = state.cursor.col;
  if (state.mode === Mode.INSERT) {
    newCol = Math.max(0, state.cursor.col - 1);
  }
  return {
    ...state,
    mode: Mode.NORMAL,
    cursor: { ...state.cursor, col: newCol },
    visualStart: null,
    waitingForChar: false,
    findDirection: null,
    commandBar: null,
    commandBuffer: '',
  };
};

const handleTypeChar = (state: VimState, char: string): VimState => {
  if (state.mode !== Mode.INSERT) return state;
  const { line, col } = state.cursor;
  const currentLine = state.lines[line];
  const newLineContent = currentLine.slice(0, col) + char + currentLine.slice(col);
  const newLines = [...state.lines];
  newLines[line] = newLineContent;

  return {
    ...state,
    lines: newLines,
    cursor: { ...state.cursor, col: col + 1 },
  };
};

const handleDeleteChar = (state: VimState): VimState => {
  if (state.mode !== Mode.INSERT) return state;
  const { line, col } = state.cursor;
  
  if (col > 0) {
    const currentLine = state.lines[line];
    const newLineContent = currentLine.slice(0, col - 1) + currentLine.slice(col);
    const newLines = [...state.lines];
    newLines[line] = newLineContent;
    return {
      ...state,
      lines: newLines,
      cursor: { ...state.cursor, col: col - 1 },
    };
  } else if (line > 0) {
    const prevLineLength = state.lines[line - 1].length;
    const newLines = [...state.lines];
    const currentLineContent = newLines[line];
    newLines[line - 1] += currentLineContent;
    newLines.splice(line, 1);
    
    return {
      ...state,
      lines: newLines,
      cursor: { line: line - 1, col: prevLineLength },
    };
  }
  return state;
};

const handleNewLine = (state: VimState): VimState => {
  if (state.mode !== Mode.INSERT) return state;
  const { line, col } = state.cursor;
  const currentLine = state.lines[line];
  const beforeCursor = currentLine.slice(0, col);
  const afterCursor = currentLine.slice(col);
  
  const newLines = [...state.lines];
  newLines.splice(line, 1, beforeCursor, afterCursor);

  return {
    ...state,
    lines: newLines,
    cursor: { line: line + 1, col: 0 },
  };
};

const handleSubstitute = (state: VimState): VimState => {
  const { line, col } = state.cursor;
  const currentLine = state.lines[line];
  
  if (currentLine.length === 0) {
    return { ...state, mode: Mode.INSERT };
  }

  const newLineContent = currentLine.slice(0, col) + currentLine.slice(col + 1);
  const newLines = [...state.lines];
  newLines[line] = newLineContent;
  
  return {
    ...state,
    lines: newLines,
    mode: Mode.INSERT,
  };
};

const handleFindChar = (state: VimState, char: string): VimState => {
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

const handleVisualDelete = (state: VimState): VimState => {
  if (!state.mode.startsWith('VISUAL') || !state.visualStart) return state;
  const { start, end } = getRange(state.visualStart, state.cursor);
  
  const newLines = [...state.lines];
  let newCursor = { ...start };

  if (state.mode === Mode.VISUAL_LINE) {
     newLines.splice(start.line, end.line - start.line + 1);
     if (newLines.length === 0) newLines.push('');
     newCursor = { line: Math.min(start.line, newLines.length - 1), col: 0 };
  } else if (state.mode === Mode.VISUAL_BLOCK) {
     const startCol = Math.min(start.col, end.col);
     const endCol = Math.max(start.col, end.col);
     
     for (let i = start.line; i <= end.line; i++) {
         const line = newLines[i];
         if (line.length > startCol) {
             newLines[i] = line.slice(0, startCol) + line.slice(endCol + 1);
         }
     }
     newCursor = { line: start.line, col: startCol };
  } else {
    // Normal Visual
    if (start.line === end.line) {
        const lineContent = newLines[start.line];
        const newLineContent = lineContent.slice(0, start.col) + lineContent.slice(end.col + 1);
        newLines[start.line] = newLineContent;
    } else {
        const startLineContent = newLines[start.line].slice(0, start.col);
        const endLineContent = newLines[end.line].slice(end.col + 1);
        newLines.splice(start.line, end.line - start.line + 1, startLineContent + endLineContent);
    }
  }
  
  // Clamp cursor
  newCursor.line = clamp(newCursor.line, 0, Math.max(0, newLines.length - 1));
  newCursor.col = Math.min(newCursor.col, Math.max(0, (newLines[newCursor.line]?.length || 0) - 1));

  return {
    ...state,
    lines: newLines,
    mode: Mode.NORMAL,
    cursor: newCursor,
    visualStart: null,
    commandBuffer: '',
  };
};

const handleVisualYank = (state: VimState): VimState => {
  if (!state.mode.startsWith('VISUAL') || !state.visualStart) return state;
  const { start, end } = getRange(state.visualStart, state.cursor);
  
  let yankedText = '';
  
  if (state.mode === Mode.VISUAL_LINE) {
      for (let i = start.line; i <= end.line; i++) {
          yankedText += state.lines[i] + '\n';
      }
  } else if (state.mode === Mode.VISUAL_BLOCK) {
      const startCol = Math.min(start.col, end.col);
      const endCol = Math.max(start.col, end.col);
      for (let i = start.line; i <= end.line; i++) {
          const line = state.lines[i];
          const segment = line.slice(startCol, endCol + 1);
          yankedText += segment + '\n';
      }
  } else {
    if (start.line === end.line) {
        yankedText = state.lines[start.line].slice(start.col, end.col + 1);
    } else {
        yankedText += state.lines[start.line].slice(start.col) + '\n';
        for (let i = start.line + 1; i < end.line; i++) {
        yankedText += state.lines[i] + '\n';
        }
        yankedText += state.lines[end.line].slice(0, end.col + 1);
    }
  }

  return {
    ...state,
    clipboard: yankedText,
    mode: Mode.NORMAL,
    visualStart: null,
    cursor: { ...start },
    commandBuffer: '',
  };
};

const handlePaste = (state: VimState): VimState => {
  if (!state.clipboard) return state;
  const text = state.clipboard;
  const { line, col } = state.cursor;
  const lines = [...state.lines];
  
  const isLineWise = text.endsWith('\n') && text.split('\n').length > 1;

  if (isLineWise) {
      const pasteLines = text.split('\n').slice(0, -1);
      lines.splice(line + 1, 0, ...pasteLines);
      return { ...state, lines, cursor: { line: line + 1, col: 0 }, commandBuffer: '' };
  }

  const insertCol = col + 1;
  const currentLine = lines[line];

  if (!text.includes('\n')) {
    lines[line] = currentLine.slice(0, insertCol) + text + currentLine.slice(insertCol);
  } else {
    const pasteLines = text.split('\n');
    const prefix = currentLine.slice(0, insertCol);
    const suffix = currentLine.slice(insertCol);
    
    const firstLinePaste = pasteLines[0];
    const lastLinePaste = pasteLines[pasteLines.length - 1];
    const middleLines = pasteLines.slice(1, -1);
    
    lines[line] = prefix + firstLinePaste;
    lines.splice(line + 1, 0, ...middleLines, lastLinePaste + suffix);
  }

  return {
    ...state,
    lines,
    commandBuffer: '',
  };
};
