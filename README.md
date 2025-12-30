# Vim Playground

A web-based Vim key mapping practice tool built with React, TypeScript, and Tailwind CSS.
This project allows you to practice basic Vim movements and modes in a safe, isolated environment.

## Features

### 1. Navigation (Normal Mode)
- `h`: Move Left
- `j`: Move Down
- `k`: Move Up
- `l`: Move Right

### 2. Insert Mode
- `i`: Enter Insert Mode (before cursor)
- `a`: Append (enter Insert Mode after cursor)
- `s`: Substitute (delete character under cursor and enter Insert Mode)
- `Esc`: Exit Insert Mode to Normal Mode

### 3. Visual Mode
- `v`: Enter Visual Mode
- `d`: Delete selected text (and switch to Normal Mode)
- `y`: Yank (copy) selected text (and switch to Normal Mode)
- `p`: Paste yanked text (after cursor)

### 4. Search
- `f` + `{char}`: Find the next occurrence of `{char}` in the current line and move cursor to it.

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Architecture

- **`useVim` Hook**: Manages the state machine for the editor (Modes, Buffer content, Cursor position).
- **`VimEditor`**: Renders the lines and cursor based on the current state.
- **`StatusBar`**: Displays current mode and cursor position.
