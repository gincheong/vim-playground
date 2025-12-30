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
    case 'U': // Shift+u
      e.preventDefault();
      dispatch({ type: 'VISUAL_CASE', caseType: 'upper' });
      break;
    case '>': // Shift+.
      e.preventDefault();
      dispatch({ type: 'VISUAL_INDENT', direction: 'in' });
      break;
    case '<': // Shift+,
      e.preventDefault();
      dispatch({ type: 'VISUAL_INDENT', direction: 'out' });
      break;
    case 'J': // Shift+j
      e.preventDefault();
      dispatch({ type: 'VISUAL_JOIN' });
      break;
    case 'r':
      e.preventDefault();
      // Need to wait for next char. Reducer handles this if we dispatch without char or separate action?
      // In Reducer: VISUAL_REPLACE w/o char -> waitingForChar=true
      // But wait, our reducer handles generic WAIT_FOR_CHAR only for f/F?
      // Let's use a specific action or pass empty char to signal wait.
      dispatch({ type: 'VISUAL_REPLACE', char: '' });
      break;
    case 'I': // Shift+i
      e.preventDefault();
      // Block insert logic works for Visual Block.
      // For Visual Line, usually 'I' inserts at start of every line?
      // Standard Vim: 'I' in Visual Line mode inserts at start of *first* line only? No, it enters Insert mode.
      // But typically Visual Block 'I' does multi-line.
      // If we want multi-line insert for Visual Line, we can treat it as Block Insert covering full lines?
      // Or just switch to Block Insert mode with col=0?
      dispatch({ type: 'VISUAL_BLOCK_INSERT', side: 'before' });
      break;
    case 'A': // Shift+a
      e.preventDefault();
      dispatch({ type: 'VISUAL_BLOCK_INSERT', side: 'after' });
      break;
    case 's':
    case 'c':
      e.preventDefault();
      // Change selection: Delete + Insert
      dispatch({ type: 'VISUAL_DELETE' });
      dispatch({ type: 'ENTER_MODE', mode: Mode.INSERT });
      break;
  }
};
