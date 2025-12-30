import { type VimAction, Mode, type VimState } from '../../../types';

export const handleNormalModeKey = (e: KeyboardEvent, dispatch: React.Dispatch<VimAction>, state: VimState) => {
  const { commandBuffer } = state;

  // Handle Multi-key sequences
  if (commandBuffer) {
      if (commandBuffer === 'g' && e.key === 'g') {
          dispatch({ type: 'JUMP_FILE', target: 'start' });
          return;
      }
      if (commandBuffer === 'd' && e.key === 'd') {
          dispatch({ type: 'LINE_OP', op: 'delete' });
          return;
      }
      if (commandBuffer === 'y' && e.key === 'y') {
          dispatch({ type: 'LINE_OP', op: 'yank' });
          return;
      }
      if (commandBuffer === 'c' && e.key === 'c') {
          dispatch({ type: 'LINE_OP', op: 'change' });
          return;
      }
      
      // If key doesn't match expected sequence, clear buffer (or handle other cases)
      // e.g., 'd' + 'w' (not implemented yet, but good to clear for now)
      dispatch({ type: 'CLEAR_COMMAND_BUFFER' });
      // Fall through to process key as new command if acceptable?
      // Vim usually cancels pending op if invalid key.
      return;
  }

  // Single keys that initiate multi-key commands
  if (!e.ctrlKey && (e.key === 'g' || e.key === 'd' || e.key === 'y' || e.key === 'c')) {
      e.preventDefault();
      dispatch({ type: 'ADD_TO_COMMAND_BUFFER', char: e.key });
      return;
  }
  
  if (e.key === 'r') {
      e.preventDefault();
      dispatch({ type: 'REPLACE_CHAR', char: '' }); // Enter REPLACE mode
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
    case 'G': // Shift+g
      dispatch({ type: 'JUMP_FILE', target: 'end' });
      break;
    case '%': // Shift+5
      dispatch({ type: 'MATCH_BRACKET' });
      break;
    case 'J': // Shift+j
      e.preventDefault();
      dispatch({ type: 'JOIN_LINES' });
      break;
    case 'u':
       if (e.ctrlKey) {
           e.preventDefault();
           dispatch({ type: 'SCROLL', direction: 'up' });
       }
       break;
    case 'd': // Handle 'dd' via buffer above, but Ctrl+d here?
       // Issue: 'd' is caught by "Single keys that initiate multi-key commands" block (line 34).
       // We need to check for ctrlKey BEFORE adding to buffer.
       // The buffer logic at line 34 doesn't check modifiers.
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
    case 'O': // Shift+o
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
    case 'V': // Shift+v
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
