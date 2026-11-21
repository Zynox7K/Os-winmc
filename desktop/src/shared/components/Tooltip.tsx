// ============================================================================
// ARQON OS — Tooltip
// ============================================================================
import type { ReactNode } from "react";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="aq-tooltip">
      {children}
      <span className="aq-tooltip-bubble">{label}</span>
      <style>{`
        .aq-tooltip { position: relative; display: inline-flex; }
        .aq-tooltip-bubble {
          position: absolute; bottom: calc(100% + 8px); left: 50%;
          transform: translateX(-50%) translateY(4px);
          background: var(--aq-glass-strong);
          color: var(--aq-text);
          border: var(--aq-glass-border);
          padding: 5px 10px;
          border-radius: var(--aq-radius-sm);
          font-size: 11.5px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--aq-dur) var(--aq-ease), transform var(--aq-dur) var(--aq-ease);
          z-index: 10000;
          box-shadow: var(--aq-shadow);
        }
        .aq-tooltip:hover .aq-tooltip-bubble {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>
    </span>
  );
}
