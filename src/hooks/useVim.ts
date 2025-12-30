import { useReducer, useEffect, useCallback } from 'react';
import { Mode } from '../types';
import { INITIAL_STATE } from './vim/constants';
import { vimReducer } from './vim/vimReducer';
import { handleNormalModeKey } from './vim/commands/normal';
import { handleInsertModeKey } from './vim/commands/insert';
import { handleVisualModeKey } from './vim/commands/visual';

export function useVim() {
  const [state, dispatch] = useReducer(vimReducer, INITIAL_STATE);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { mode, waitingForChar } = state;

      if (waitingForChar) {
        e.preventDefault();
        if (e.key.length === 1) {
          dispatch({ type: 'FIND_CHAR', char: e.key });
        } else {
          if (e.key === 'Escape') dispatch({ type: 'FIND_CHAR', char: '' });
        }
        return;
      }

      switch (mode) {
        case Mode.NORMAL:
          handleNormalModeKey(e, dispatch);
          break;
        case Mode.INSERT:
          handleInsertModeKey(e, dispatch);
          break;
        case Mode.VISUAL:
        case Mode.VISUAL_LINE:
        case Mode.VISUAL_BLOCK:
          handleVisualModeKey(e, dispatch);
          break;
      }
    },
    [state]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { state, dispatch };
}
