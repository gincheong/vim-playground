import { type VimAction, Mode, type VimState } from '../../../types';

export const handleNormalModeKey = (e: KeyboardEvent, dispatch: React.Dispatch<VimAction>, state: VimState) => {
  const { commandBuffer } = state;

  // Handle Undo/Redo
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

  // Handle Multi-key sequences (including numbers)
  // We need to support {count}gg and {count}G
  // If e.key is a number, we should add it to buffer?
  // Current buffer logic is 'g', 'd', 'y', 'c'.
  // If we type '1', '2', 'g', 'g' -> 12gg

  if (/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    dispatch({ type: 'ADD_TO_COMMAND_BUFFER', char: e.key });
    return;
  }

  // Handle Multi-key sequences
  if (commandBuffer) {
    const countMatch = commandBuffer.match(/^(\d+)/);
    const count = countMatch ? parseInt(countMatch[1], 10) : null;
    // cmdPrefix is what remains after numbers. e.g. "12g" -> "g", "12" -> ""
    const cmdPrefix = countMatch ? commandBuffer.slice(countMatch[1].length) : commandBuffer;

    // 1. {count}G -> Jump to line {count}
    if (count !== null && cmdPrefix === '' && e.key === 'G') {
      dispatch({ type: 'JUMP_FILE', target: 'start', line: count });
      return;
    }

    // 2. {count}gg -> Jump to line {count} (or 1 if no count)
    // If buffer is "12g" and key is "g" -> Jump to 12
    // If buffer is "g" and key is "g" -> Jump to start
    if (cmdPrefix === 'g' && e.key === 'g') {
      if (count !== null) {
        dispatch({ type: 'JUMP_FILE', target: 'start', line: count });
      } else {
        dispatch({ type: 'JUMP_FILE', target: 'start' });
      }
      return;
    }

    // 3. Line Operations (dd, yy, cc)
    if (cmdPrefix === 'd' && e.key === 'd') {
      dispatch({ type: 'LINE_OP', op: 'delete' }); // {count}dd support can be added here
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

    // 4. Continue sequence (add to buffer)
    // Valid continuations:
    // - Number + g/d/y/c (e.g. "12" + "g" -> "12g")
    // - Empty + g/d/y/c (handled by single key logic if buffer was empty, but here buffer has something)
    //   (e.g. buffer="1", key="g" -> "1g")
    if (e.key === 'g' || e.key === 'd' || e.key === 'y' || e.key === 'c') {
      e.preventDefault();
      dispatch({ type: 'ADD_TO_COMMAND_BUFFER', char: e.key });
      return;
    }

    // 5. Invalid sequence -> Clear buffer
    dispatch({ type: 'CLEAR_COMMAND_BUFFER' });
    // Fall through?
    // If I typed "12" then "x" (delete char), "x" should execute with count?
    // Standard Vim: "12x" deletes 12 chars.
    // Currently we don't support count for other commands.
    // If we clear buffer, we lose the count.
    // For now, let's just clear.
    return;
  }

  // Single keys that initiate multi-key commands
  if (!e.ctrlKey && (e.key === 'g' || e.key === 'd' || e.key === 'y' || e.key === 'c')) {
    e.preventDefault();
    dispatch({ type: 'ADD_TO_COMMAND_BUFFER', char: e.key });
    return;
  }

  // {count}G where count is NOT in buffer?
  // No, count must be in buffer.
  // If I type 'G' without buffer, it goes to end.
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
