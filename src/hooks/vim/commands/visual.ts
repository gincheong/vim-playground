import { type VimAction } from '../../../types';

export const handleVisualModeKey = (e: KeyboardEvent, dispatch: React.Dispatch<VimAction>) => {
  switch (e.key) {
    case 'Escape':
    case 'v':
      e.preventDefault();
      // v in Visual Mode returns to Normal (toggle)
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
    case 'd':
      e.preventDefault();
      dispatch({ type: 'VISUAL_DELETE' });
      break;
    case 'y':
      e.preventDefault();
      dispatch({ type: 'VISUAL_YANK' });
      break;
  }
};
