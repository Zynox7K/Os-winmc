// ============================================================================
// ARQON OS — ARQON Code (éditeur de code réel)
// Explorateur de fichiers + éditeur qui lit/écrit les VRAIS fichiers du système.
// Coloration syntaxique via un highlighter léger (regex), gestion de projet.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { FileText, Folder, FolderOpen, ChevronRight, Save, X, FolderPlus, FilePlus, Terminal as TermIcon } from "lucide-react";
import { api } from "../api/client.js";
import type { FileEntry } from "../../../shared/types/api";

interface Props {
  winId: string;
}

const LANGS: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
  ".json": "json", ".py": "python", ".rs": "rust", ".go": "go", ".md": "markdown",
  ".css": "css", ".html": "html", ".sh": "bash", ".c": "c", ".cpp": "cpp",
  ".java": "java", ".toml": "toml", ".yaml": "yaml", ".yml": "yaml", ".txt": "text",
};

export default function CodeApp({ winId }: Props) {
  const [path, setPath] = useState<string>("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [openFiles, setOpenFiles] = useState<{ path: string; content: string; saved: boolean }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const fileCache = useRef<Record<string, string>>({});

  const roots = useRef<string[]>([]);

  useEffect(() => {
    api.roots().then((r) => {
      roots.current = r.roots;
      setPath(r.roots[0] || ".");
    }).catch(() => { setPath("."); });
  }, []);

  const loadDir = (p: string) => {
    setPath(p);
    api.listDir(p).then(setEntries).catch(() => setEntries([]));
  };

  useEffect(() => { loadDir(path); /* eslint-disable-next-line */ }, [path]);

  const openFile = async (f: FileEntry) => {
    const full = f.path;
    if (fileCache.current[full] !== undefined) {
      addOpen(full, fileCache.current[full]);
      return;
    }
    const { content } = await api.readFile(full);
    fileCache.current[full] = content;
    addOpen(full, content);
  };

  const addOpen = (full: string, content: string) => {
    setOpenFiles((prev) => {
      if (prev.find((o) => o.path === full)) { setActive(full); return prev; }
      return [...prev, { path: full, content, saved: true }];
    });
    setActive(full);
  };

  const onEdit = (content: string) => {
    setOpenFiles((prev) => prev.map((o) => (o.path === active ? { ...o, content, saved: false } : o)));
    setDirty(true);
    fileCache.current[active!] = content;
  };

  const save = async () => {
    if (!active) return;
    const f = openFiles.find((o) => o.path === active);
    if (!f) return;
    await api.writeFile(active, f.content);
    setOpenFiles((prev) => prev.map((o) => (o.path === active ? { ...o, saved: true } : o)));
    setDirty(false);
  };

  const activeFile = openFiles.find((o) => o.path === active);
  const lang = activeFile ? LANGS[activeFile.path.slice(activeFile.path.lastIndexOf(".")).toLowerCase()] || "text" : "text";

  // Raccourci Ctrl/Cmd + S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, openFiles, dirty]);

  return (
    <div className="aq-code">
      {/* Explorateur */}
      <div className="aq-code-sidebar aq-glass">
        <div className="aq-code-pathbar">
          <FolderOpen size={14} />
          <input className="aq-code-pathinput" value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadDir((e.target as HTMLInputElement).value)} />
        </div>
        <div className="aq-code-actions">
          <button className="aq-iconbtn" onClick={() => api.mkdir(path + "/arqon-new").catch(() => {})} title="Nouveau dossier"><FolderPlus size={14} /></button>
        </div>
        <div className="aq-code-tree aq-scroll">
          {entries.map((e) => (
            <div key={e.path} className={`aq-tree-item ${e.type === "directory" ? "dir" : "file"}`} onClick={() => (e.type === "directory" ? loadDir(e.path) : openFile(e))}>
              {e.type === "directory" ? <Folder size={15} /> : <FileText size={15} />}
              <span className="aq-truncate">{e.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Éditeur */}
      <div className="aq-code-main">
        <div className="aq-code-tabs">
          {openFiles.map((f) => (
            <div key={f.path} className={`aq-code-tab ${f.path === active ? "active" : ""}`} onClick={() => setActive(f.path)}>
              <FileText size={13} />
              <span className="aq-truncate">{f.path.split("/").pop()}</span>
              {!f.saved && <span className="aq-dot-save" />}
              <button className="aq-tab-close" onClick={(e) => { e.stopPropagation(); setOpenFiles((p) => p.filter((x) => x.path !== f.path)); if (active === f.path) setActive(null); }}><X size={11} /></button>
            </div>
          ))}
        </div>
        <div className="aq-code-editor">
          {activeFile ? (
            <Editor key={active} initial={activeFile.content} lang={lang} onChange={onEdit} onSave={save} />
          ) : (
            <div className="aq-code-empty">
              <TermIcon size={42} />
              <p>ARQON Code — ouvrez un fichier pour commencer à éditer.</p>
              <p className="aq-muted">Éditeur réel : les modifications s'écrivent sur le système. ⌘S pour sauvegarder.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .aq-code { display: flex; height: 100%; background: var(--aq-bg); }
        .aq-code-sidebar { width: 240px; display: flex; flex-direction: column; border-right: var(--aq-glass-border); }
        .aq-code-pathbar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: var(--aq-border); color: var(--aq-text-dim); }
        .aq-code-pathinput { flex: 1; background: var(--aq-secondary); border: var(--aq-border); border-radius: var(--aq-radius-sm); padding: 5px 8px; font-size: 12px; color: var(--aq-text); }
        .aq-code-pathinput:focus { outline: none; border-color: var(--aq-accent); }
        .aq-code-actions { display: flex; gap: 6px; padding: 6px 10px; }
        .aq-iconbtn { padding: 5px; border-radius: var(--aq-radius-sm); color: var(--aq-muted); }
        .aq-iconbtn:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-code-tree { flex: 1; padding: 4px 8px 10px; }
        .aq-tree-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--aq-radius-sm); font-size: 12.5px; cursor: pointer; }
        .aq-tree-item:hover { background: var(--aq-surface-hover); }
        .aq-tree-item.dir { color: var(--aq-text-dim); font-weight: 600; }
        .aq-code-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .aq-code-tabs { display: flex; background: var(--aq-glass-strong); border-bottom: var(--aq-glass-border); overflow-x: auto; }
        .aq-code-tab { display: flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 12px; color: var(--aq-muted); border-right: var(--aq-border); max-width: 200px; }
        .aq-code-tab.active { background: var(--aq-bg); color: var(--aq-text); }
        .aq-dot-save { width: 7px; height: 7px; border-radius: 50%; background: var(--aq-warning); }
        .aq-code-tab .aq-tab-close { display: inline-flex; padding: 1px; border-radius: 4px; color: var(--aq-muted); }
        .aq-code-tab .aq-tab-close:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-code-editor { flex: 1; min-height: 0; overflow: hidden; position: relative; }
        .aq-code-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--aq-muted); text-align: center; padding: 30px; }
      `}</style>
    </div>
  );
}

function Editor({ initial, lang, onChange, onSave }: { initial: string; lang: string; onChange: (c: string) => void; onSave: () => void }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const highlighted = useRef<string>("");
  const render = (text: string) => {
    highlighted.current = highlight(text, lang);
    if (preRef.current) preRef.current.innerHTML = highlighted.current;
  };

  useEffect(() => { render(initial); /* eslint-disable-next-line */ }, [initial]);

  const syncScroll = () => {
    if (taRef.current && preRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  return (
    <div className="aq-editor-wrap">
      <pre ref={preRef} className="aq-editor-highlight" aria-hidden="true" />
      <textarea
        ref={taRef}
        className="aq-editor-textarea"
        defaultValue={initial}
        spellCheck={false}
        onInput={(e) => { onChange((e.target as HTMLTextAreaElement).value); render((e.target as HTMLTextAreaElement).value); syncScroll(); }}
        onScroll={syncScroll}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); onSave(); } if (e.key === "Tab") { e.preventDefault(); document.execCommand("insertText", false, "  "); } }}
      />
      <style>{`
        .aq-editor-wrap { position: relative; height: 100%; overflow: hidden; }
        .aq-editor-highlight, .aq-editor-textarea {
          position: absolute; inset: 0; margin: 0; padding: 14px 16px;
          font-family: var(--aq-font-mono); font-size: 13.5px; line-height: 1.6;
          white-space: pre; overflow: auto; tab-size: 2;
          border: none; border-radius: 0;
        }
        .aq-editor-highlight { pointer-events: none; color: var(--aq-text); background: var(--aq-bg-soft); z-index: 1; }
        .aq-editor-textarea {
          background: transparent; color: transparent; caret-color: var(--aq-accent);
          resize: none; outline: none; z-index: 2;
        }
        .aq-editor-textarea::selection { background: var(--aq-accent-soft); }
      `}</style>
      <HighlightStyle />
    </div>
  );
}

function HighlightStyle() {
  return (
    <style>{`
      .tok-kw { color: #c792ea; } .tok-str { color: #c3e88d; } .tok-num { color: #f78c6c; }
      .tok-com { color: var(--aq-muted); font-style: italic; } .tok-fn { color: #82aaff; }
      .tok-type { color: #ffcb6b; } .tok-punc { color: var(--aq-text-dim); }
    `}</style>
  );
}

// Highlighter léger par langage (regex). Fiable et sans dépendance.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function highlight(code: string, lang: string): string {
  let src = escapeHtml(code);
  const kws: Record<string, string[]> = {
    typescript: ["const","let","var","function","return","if","else","for","while","import","export","from","class","new","await","async","interface","type","extends","implements","public","private","readonly","enum","as","default"],
    javascript: ["const","let","var","function","return","if","else","for","while","import","export","from","class","new","await","async","of","in","default"],
    python: ["def","class","return","if","elif","else","for","while","import","from","as","with","try","except","finally","yield","lambda","global","pass","raise","async","await"],
    rust: ["fn","let","const","mut","struct","enum","impl","trait","pub","use","mod","return","if","else","for","while","match","as","async","await","ref","self"],
    go: ["func","package","import","var","const","type","struct","interface","return","if","else","for","range","go","chan","map","make"],
    java: ["public","private","class","interface","void","return","if","else","for","while","import","package","new","static","final","this","extends","implements"],
    json: [], css: [], html: [], toml: [], yaml: [], text: [], bash: ["if","then","else","fi","for","in","do","done","case","esac","function","echo","export","local","return"],
    c: ["int","void","char","struct","return","if","else","for","while","include","define","const","static","unsigned","long"],
    cpp: ["int","void","char","struct","class","return","if","else","for","while","include","define","const","static","namespace","using","public","private","virtual","new"],
    markdown: [],
  };
  const kw = kws[lang] || [];

  if (lang === "json" || lang === "toml") {
    src = src.replace(/(&quot;.*?&quot;)(\s*:)?/g, '<span class="tok-str">$1</span>$2');
    src = src.replace(/\b(true|false|null|none)\b/g, '<span class="tok-kw">$1</span>');
    src = src.replace(/(\b\d+(\.\d+)?\b)/g, '<span class="tok-num">$1</span>');
    return src;
  }

  // Comments
  src = src.replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g, '<span class="tok-com">$1</span>');
  src = src.replace(/(#[^\n]*)/g, '<span class="tok-com">$1</span>');
  // Strings
  src = src.replace(/(&quot;.*?&quot;|'.*?')/g, '<span class="tok-str">$1</span>');
  // Numbers
  src = src.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  // Keywords
  if (kw.length) {
    src = src.replace(new RegExp(`\\b(${kw.join("|")})\\b`, "g"), '<span class="tok-kw">$1</span>');
  }
  // Function calls
  src = src.replace(/(\b[a-zA-Z_]\w*)(\s*\()/g, '<span class="tok-fn">$1</span>$2');
  return src;
}
