"use client";

interface AgentModeToggleProps {
  thinkingMode: 'instant' | 'thinking';
  setThinkingMode: (mode: 'instant' | 'thinking') => void;
}

export function AgentModeToggle({ thinkingMode, setThinkingMode }: AgentModeToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-input bg-background p-0.5 text-xs">
      <button
        type="button"
        onClick={() => setThinkingMode('instant')}
        className={`rounded-full px-3 py-1 transition-colors duration-200 ${
          thinkingMode === 'instant'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Instant
      </button>
      <button
        type="button"
        onClick={() => setThinkingMode('thinking')}
        className={`rounded-full px-3 py-1 transition-colors duration-200 ${
          thinkingMode === 'thinking'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Thinking
      </button>
    </div>
  );
}
