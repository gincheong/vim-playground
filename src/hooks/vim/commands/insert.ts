import { type VimAction } from '../../../types';

export const handleInsertModeKey = (e: KeyboardEvent, dispatch: React.Dispatch<VimAction>) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    dispatch({ type: 'EXIT_MODE' });
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    dispatch({ type: 'DELETE_CHAR' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    dispatch({ type: 'NEW_LINE' });
  } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    dispatch({ type: 'TYPE_CHAR', char: e.key });
  }
};
