import { useVim } from './hooks/useVim';
import { VimEditor } from './components/VimEditor';
import { StatusBar } from './components/StatusBar';

function App() {
  const { state } = useVim();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] overflow-hidden">
      {/* Header / Title (Optional, let's keep it clean like IDE) */}
      
      {/* Main Editor Area */}
      <div className="flex-1 overflow-hidden relative">
        <VimEditor vimState={state} />
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
