import { type VimState, Mode } from '../../types';

export const INITIAL_LINES = [
  'Welcome to Vim Playground!',
  'Try navigating with h, j, k, l.',
  'Explore word navigation: w (next), b (prev), e (end).',
  'Jump to line boundaries: $ (end), _ (start non-blank).',
  'Find chars: f + char (forward), F + char (backward).',
  'Visual modes: v (char), V (line), Ctrl+v (block).',
  "Press 'i', 'a', 's' to enter Insert mode.",
  '',
  '// Happy Vimming!',
];

export const INITIAL_STATE: VimState = {
  lines: INITIAL_LINES,
  cursor: { line: 0, col: 0 },
  mode: Mode.NORMAL,
  visualStart: null,
  clipboard: null,
  waitingForChar: false,
  findDirection: null,
};
