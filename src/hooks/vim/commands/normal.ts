import { type VimAction, Mode } from '../../../types';

export const handleNormalModeKey = (e: KeyboardEvent, dispatch: React.Dispatch<VimAction>) => {
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
    case 'i':
      e.preventDefault();
      dispatch({ type: 'ENTER_MODE', mode: Mode.INSERT });
      break;
    case 'a':
      e.preventDefault();
      dispatch({ type: 'ENTER_MODE', mode: Mode.INSERT });
      dispatch({ type: 'MOVE', direction: 'l' });
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
  }
};
