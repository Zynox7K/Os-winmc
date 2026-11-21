// ============================================================================
// ARQON OS — Dock personnalisable
// ============================================================================
import { useState } from "react";
import { Tooltip } from "../shared/components/Tooltip.js";
import type { AppId } from "../App.js";

interface Props {
  apps: { id: AppId; title: string; icon: React.ComponentType<{ size?: number; className?: string }> }[];
  windows: { id: string; appId: AppId; desktop: number; minimized: boolean }[];
  desktop: number;
  onOpen: (id: AppId) => void;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onSwitchDesktop: (n: number) => void;
  desktopCount: number;
}

export default function Dock({ apps, windows, desktop, onOpen, onFocus, onClose, onSwitchDesktop, desktopCount }: Props) {
  const [hover, setHover] = useState<AppId | null>(null);

  return (
    <div className="aq-dock-wrap">
      <div className="aq-dock">
        {apps.map((a) => {
          const Icon = a.icon;
          const running = windows.filter((w) => w.appId === a.id);
          const active = running.some((w) => !w.minimized);
          const isHover = hover === a.id;
          return (
            <div key={a.id} className="aq-dock-item-wrap">
              <Tooltip label={a.title}>
                <button
                  className={`aq-dock-item ${isHover ? "hover" : ""} ${active ? "active" : ""}`}
                  onClick={() => (active ? onFocus(running[0].id) : onOpen(a.id))}
                  onMouseEnter={() => setHover(a.id)}
                  onMouseLeave={() => setHover(null)}
                  onContextMenu={(e) => { e.preventDefault(); if (active) onClose(running[0].id); }}
                >
                  <Icon size={26} />
                  {running.length > 0 && (
                    <span className="aq-dock-running">
                      {running.filter((w) => w.desktop === desktop && !w.minimized).map((w) => (
                        <span key={w.id} className="aq-dock-dot" onClick={(e) => { e.stopPropagation(); onFocus(w.id); }} />
                      ))}
                    </span>
                  )}
                </button>
              </Tooltip>
            </div>
          );
        })}

        <div className="aq-dock-sep" />

        {/* Pagination bureaux */}
        {Array.from({ length: desktopCount }).map((_, i) => (
          <Tooltip key={i} label={`Bureau ${i + 1}`}>
            <button
              className={`aq-dock-desk ${desktop === i ? "active" : ""}`}
              onClick={() => onSwitchDesktop(i)}
            >
              <span>{i + 1}</span>
            </button>
          </Tooltip>
        ))}
      </div>
      <style>{`
        .aq-dock-wrap {
          position: fixed;
          bottom: 10px; left: 50%;
          transform: translateX(-50%);
          z-index: 8000;
        }
        .aq-dock {
          display: flex; align-items: flex-end; gap: 8px;
          padding: 8px 12px;
          background: var(--aq-glass);
          backdrop-filter: blur(var(--aq-glass-blur)) saturate(150%);
          -webkit-backdrop-filter: blur(var(--aq-glass-blur)) saturate(150%);
          border: var(--aq-glass-border);
          border-radius: 18px;
          box-shadow: var(--aq-shadow-lg);
        }
        .aq-dock-item-wrap { display: flex; }
        .aq-dock-item {
          position: relative;
          width: 52px; height: 52px;
          display: flex; align-items: center; justify-content: center;
          color: var(--aq-text);
          border-radius: 14px;
          transition: transform var(--aq-dur) var(--aq-ease-out), background var(--aq-dur) var(--aq-ease);
        }
        .aq-dock-item:hover, .aq-dock-item.hover {
          transform: translateY(-10px) scale(1.12);
          background: var(--aq-surface-hover);
        }
        .aq-dock-item.active::after {
          content: "";
          position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%);
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--aq-accent);
        }
        .aq-dock-running {
          position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
          display: flex; gap: 3px;
        }
        .aq-dock-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--aq-text-dim);
          cursor: pointer;
        }
        .aq-dock-dot:hover { background: var(--aq-accent); }
        .aq-dock-sep { width: 1px; height: 40px; background: var(--aq-glass-border); margin: 0 4px; align-self: center; }
        .aq-dock-desk {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: var(--aq-muted);
          background: var(--aq-surface); border: var(--aq-border);
          transition: all var(--aq-dur) var(--aq-ease);
        }
        .aq-dock-desk:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-dock-desk.active { background: var(--aq-accent); color: #06121f; border-color: transparent; }
      `}</style>
    </div>
  );
}
