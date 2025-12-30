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

      // Handle Waiting for Char (f/F command)
      if (waitingForChar) {
        e.preventDefault();
        if (e.key.length === 1) {
          dispatch({ type: 'FIND_CHAR', char: e.key });
        } else {
          if (e.key === 'Escape') dispatch({ type: 'FIND_CHAR', char: '' });
        }
        return;
      }
      
      // Handle Replace Single Char Mode (r command)
      if (mode === Mode.REPLACE) {
          e.preventDefault();
          if (e.key === 'Escape') {
               dispatch({ type: 'EXIT_MODE' });
          } else if (e.key.length === 1) {
               dispatch({ type: 'TYPE_CHAR', char: e.key });
          }
          return;
      }

      // Handle Command Mode (Search)
      if (mode === Mode.COMMAND) {
          if (e.key === 'Enter') {
              e.preventDefault();
              dispatch({ type: 'SEARCH_EXEC' });
          } else if (e.key === 'Escape') {
              e.preventDefault();
              dispatch({ type: 'EXIT_MODE' });
          } else if (e.key === 'Backspace') {
              e.preventDefault();
              dispatch({ type: 'DELETE_CHAR' });
          } else if (e.key.length === 1) {
              e.preventDefault();
              dispatch({ type: 'SEARCH_TYPE', char: e.key });
          }
          return;
      }

      switch (mode) {
        case Mode.NORMAL:
          handleNormalModeKey(e, dispatch, state); // Pass state for commandBuffer access
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
