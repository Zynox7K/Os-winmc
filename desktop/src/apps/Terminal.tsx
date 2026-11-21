// ============================================================================
// ARQON OS — Terminal (application native)
// Émulation terminal xterm.js connectée à un VRAI PTY système (pont Python).
// Onglets multiples, recherche, profils/thèmes. Aucune commande simulée.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm, type ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Plus, X, Search, ArrowDown } from "lucide-react";
import { TerminalSocket } from "../api/client.js";

interface Tab {
  id: string;
  title: string;
}

const THEMES: Record<string, ITheme> = {
  arqon: { background: "#0c1220", foreground: "#e6ecf7", cursor: "#328bff", cursorAccent: "#0c1220", selectionBackground: "rgba(50,139,255,0.25)" },
  midnight: { background: "#0a0f1c", foreground: "#cfe0ff", cursor: "#765bff", cursorAccent: "#0a0f1c", selectionBackground: "rgba(118,91,255,0.25)" },
  forest: { background: "#0c1a14", foreground: "#e2f5e9", cursor: "#25c98a", cursorAccent: "#0c1a14", selectionBackground: "rgba(37,201,138,0.25)" },
  mono: { background: "#0b0b0b", foreground: "#d4d4d4", cursor: "#e6ecf7", cursorAccent: "#0b0b0b", selectionBackground: "rgba(255,255,255,0.15)" },
};

export default function TerminalApp({ winId, onNotify }: { winId: string; onNotify: (t: string, b: string) => void }) {
  const [tabs, setTabs] = useState<Tab[]>([{ id: `t-${winId}-0`, title: "bash" }]);
  const [active, setActive] = useState(0);
  const [theme, setTheme] = useState("arqon");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containers = useRef<Record<string, { term: XTerm; fit: FitAddon; socket: TerminalSocket }>>({});
  const hostRef = useRef<HTMLDivElement>(null);

  const openTab = (title = "bash") => {
    const id = `t-${winId}-${Date.now()}`;
    setTabs((t) => [...t, { id, title }]);
    setActive(tabs.length);
    return id;
  };

  const closeTab = (idx: number) => {
    if (tabs.length === 1) return;
    const tab = tabs[idx];
    const c = containers.current[tab.id];
    c?.socket.disconnect();
    delete containers.current[tab.id];
    const next = tabs.filter((_, i) => i !== idx);
    setTabs(next);
    setActive((a) => Math.min(a, idx - 1));
  };

  // Initialise chaque contenteur de terminal quand le tab est visible.
  useEffect(() => {
    const tab = tabs[active];
    if (!tab || !hostRef.current) return;
    const host = hostRef.current;
    // Si déjà créé, on ne recrée pas.
    if (containers.current[tab.id]) {
      // Réfit
      const c = containers.current[tab.id];
      try { c.fit.fit(); } catch { /* */ }
      return;
    }

    const term = new XTerm({
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      fontSize: 14,
      cursorBlink: true,
      scrollback: 5000,
      theme: THEMES[theme],
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    try { fit.fit(); } catch { /* */ }

    const socket = new TerminalSocket();
    socket.onData = (d) => term.write(d);
    socket.onExit = (code) => term.write(`\r\n\x1b[32m[processus terminé — code ${code}]\x1b[0m\r\n`);
    socket.onError = (m) => term.write(`\r\n\x1b[31m[erreur PTY : ${m}]\x1b[0m\r\n`);
    socket.connect(term.cols || 120, term.rows || 30);

    term.onData((d) => socket.send(d));
    term.onResize(({ cols, rows }) => socket.resize(cols, rows));

    containers.current[tab.id] = { term, fit, socket };
    onNotify("ARQON Terminal", "Session PTY démarrée (shell système réel).");

    const ro = new ResizeObserver(() => { try { fit.fit(); socket.resize(term.cols, term.rows); } catch { /* */ } });
    ro.observe(host);

    return () => { ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tabs, theme, winId]);

  // Nettoyage à la fermeture de la fenêtre.
  useEffect(() => {
    return () => {
      Object.values(containers.current).forEach((c) => c.socket.disconnect());
    };
  }, [winId]);

  // Changement de thème
  useEffect(() => {
    Object.entries(containers.current).forEach(([, c]) => {
      c.term.options.theme = THEMES[theme];
    });
  }, [theme]);

  const current = containers.current[tabs[active]?.id];

  return (
    <div className="aq-terminal-app">
      <div className="aq-terminal-toolbar">
        <div className="aq-tabs">
          {tabs.map((t, i) => (
            <div key={t.id} className={`aq-tab ${i === active ? "active" : ""}`} onClick={() => setActive(i)}>
              <span className="aq-tab-dot" />
              <span className="aq-tab-title">{t.title}</span>
              {tabs.length > 1 && (
                <button className="aq-tab-close" onClick={(e) => { e.stopPropagation(); closeTab(i); }}><X size={12} /></button>
              )}
            </div>
          ))}
          <button className="aq-tab-add" onClick={() => openTab()}><Plus size={14} /></button>
        </div>
        <div className="aq-terminal-actions">
          <select className="aq-terminal-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="arqon">Thème ARQON</option>
            <option value="midnight">Midnight</option>
            <option value="forest">Forest</option>
            <option value="mono">Mono</option>
          </select>
          <button className="aq-terminal-btn" onClick={() => setSearchOpen((v) => !v)}><Search size={14} /></button>
        </div>
      </div>

      {searchOpen && (
        <div className="aq-terminal-search">
          <Search size={14} />
          <input
            autoFocus
            placeholder="Rechercher dans la sortie…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && current && (
            <button className="aq-terminal-btn" onClick={() => {
              (current.term as unknown as { find: (t: string) => unknown }).find(search);
              current.term.focus();
            }}><ArrowDown size={14} /></button>
          )}
        </div>
      )}

      <div className="aq-terminal-host" ref={hostRef} />

      <style>{`
        .aq-terminal-app { display: flex; flex-direction: column; height: 100%; background: var(--aq-bg); }
        .aq-terminal-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 8px;
          background: var(--aq-glass-strong);
          border-bottom: var(--aq-glass-border);
          flex-shrink: 0;
        }
        .aq-tabs { display: flex; align-items: center; gap: 4px; }
        .aq-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px; border-radius: 8px 8px 0 0;
          font-size: 12.5px; color: var(--aq-muted);
          border: var(--aq-border); border-bottom: none;
          transition: all var(--aq-dur-fast) var(--aq-ease);
        }
        .aq-tab:hover { background: var(--aq-surface-hover); }
        .aq-tab.active { background: var(--aq-bg); color: var(--aq-text); }
        .aq-tab-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--aq-accent); }
        .aq-tab-close { display: inline-flex; padding: 2px; border-radius: 5px; color: var(--aq-muted); }
        .aq-tab-close:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-tab-add { display: inline-flex; padding: 6px 8px; border-radius: 8px; color: var(--aq-muted); }
        .aq-tab-add:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-terminal-actions { display: flex; gap: 6px; }
        .aq-terminal-select, .aq-terminal-btn {
          background: var(--aq-surface); border: var(--aq-border);
          border-radius: var(--aq-radius-sm); color: var(--aq-text-dim);
          padding: 5px 8px; font-size: 12px;
        }
        .aq-terminal-select:hover, .aq-terminal-btn:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-terminal-search {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px; color: var(--aq-text-dim);
          background: var(--aq-bg-soft); border-bottom: var(--aq-border);
        }
        .aq-terminal-search input { flex: 1; background: none; border: none; outline: none; font-size: 13px; color: var(--aq-text); }
        .aq-terminal-host { flex: 1; min-height: 0; padding: 0; }
      `}</style>
    </div>
  );
}
