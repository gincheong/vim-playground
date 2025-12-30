import { useVim } from './hooks/useVim';
import { VimEditor } from './components/VimEditor';
import { StatusBar } from './components/StatusBar';

function App() {
  const { state } = useVim();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] overflow-hidden relative">
      {/* Header / Title (Optional, let's keep it clean like IDE) */}
      
      {/* Main Editor Area */}
      <div className="flex-1 overflow-hidden relative">
        <VimEditor vimState={state} />
      </div>

      {/* Footer Links */}
      <div className="absolute bottom-10 right-4 text-xs text-gray-500 opacity-50 hover:opacity-100 transition-opacity z-10 flex gap-4">
        <a href="https://gincheong.github.io/" target="_blank" rel="noopener noreferrer" className="hover:text-white">
          Blog
        </a>
        <a href="https://github.com/gincheong/vim-playground" target="_blank" rel="noopener noreferrer" className="hover:text-white">
          GitHub
        </a>
      </div>

      {/* Status Bar */}
      <StatusBar 
        mode={state.mode} 
        cursor={state.cursor} 
        waitingForChar={state.waitingForChar}
        message={state.clipboard ? "Text yanked/deleted!" : undefined}
        commandBar={state.commandBar}
      />
    </div>
  );
}

export default App;
