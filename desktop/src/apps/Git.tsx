// ============================================================================
// ARQON OS — ARQON Git (gestionnaire Git graphique réel)
// Dépôts réels, statut, branche, commits, pull/push via le binaire git.
// ============================================================================
import { useEffect, useState } from "react";
import { GitBranch, RefreshCw, RefreshCcw, Upload, FolderGit2, Check, AlertTriangle } from "lucide-react";
import { api } from "../api/client.js";
import type { GitStatus } from "../../../shared/types/api";

interface Repo {
  path: string;
  name: string;
  branch: string;
}

export default function GitApp({ onNotify }: { winId?: string; onNotify?: (t: string, b: string) => void }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [active, setActive] = useState<Repo | null>(null);
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const loadRepos = () => {
    api.gitRepos().then((r) => { setRepos(r); if (!active && r.length) setActive(r[0]); }).catch(() => {});
  };

  const loadStatus = () => {
    if (!active) return;
    api.gitStatus(active.path).then(setStatus).catch(() => {});
  };

  useEffect(() => { loadRepos(); }, []);
  useEffect(() => { loadStatus(); /* eslint-disable-next-line */ }, [active]);

  const runGit = async (args: string[], label: string) => {
    if (!active) return;
    setLoading(true);
    setOutput(`$ git ${args.join(" ")}\n`);
    try {
      const r = await api.gitExec(active.path, args);
      setOutput((o) => o + (r.stdout || r.stderr || "(aucune sortie)"));
      onNotify?.("ARQON Git", `${label} terminé sur « ${active.name} ».`);
      loadStatus();
      loadRepos();
    } catch (e: any) {
      setOutput((o) => o + `\n[erreur] ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aq-git">
      <div className="aq-git-sidebar aq-glass">
        <div className="aq-panel-head">
          <span>Dépôts</span>
          <button className="aq-iconbtn" onClick={loadRepos}><RefreshCw size={14} /></button>
        </div>
        <div className="aq-git-repos aq-scroll">
          {repos.map((r) => (
            <button key={r.path} className={`aq-git-repo ${active?.path === r.path ? "active" : ""}`} onClick={() => setActive(r)}>
              <FolderGit2 size={16} />
              <span className="aq-git-repo-name aq-truncate">{r.name}</span>
              <span className="aq-git-repo-branch aq-badge">{r.branch}</span>
            </button>
          ))}
          {repos.length === 0 && <div className="aq-empty">Aucun dépôt Git détecté.</div>}
        </div>
      </div>

      <div className="aq-git-main aq-scroll">
        {!active ? (
          <div className="aq-empty">Sélectionnez un dépôt Git.</div>
        ) : (
          <>
            <div className="aq-git-head">
              <div>
                <h2>{active.name}</h2>
                <div className="aq-git-path aq-mono aq-muted">{active.path}</div>
              </div>
              <div className="aq-git-actions">
                <button className="aq-btn" onClick={() => runGit(["status"], "Statut")} disabled={loading}><Check size={14} /> Status</button>
                <button className="aq-btn" onClick={() => runGit(["fetch"], "Fetch")} disabled={loading}><RefreshCcw size={14} /> Fetch</button>
                <button className="aq-btn aq-btn-primary" onClick={() => runGit(["pull"], "Pull")} disabled={loading}><RefreshCw size={14} /> Pull</button>
                <button className="aq-btn aq-btn-primary" onClick={() => runGit(["push"], "Push")} disabled={loading}><Upload size={14} /> Push</button>
              </div>
            </div>

            {status && (
              <div className="aq-git-statuscard aq-glass">
                <div className="aq-git-summary">
                  <span className="aq-badge"><GitBranch size={11} /> {status.branch || "—"}</span>
                  {status.clean && <span className="aq-badge aq-badge-success"><Check size={11} /> Propre</span>}
                  {!status.clean && <span className="aq-badge aq-badge-warning"><AlertTriangle size={11} /> {status.changes.length} chang.</span>}
                  {status.ahead > 0 && <span className="aq-badge aq-badge-accent">↑ {status.ahead} à pousser</span>}
                  {status.behind > 0 && <span className="aq-badge aq-badge-warning">↓ {status.behind} en retard</span>}
                  {status.remotes.map((r) => <span key={r} className="aq-badge">{r}</span>)}
                </div>
                <div className="aq-git-changes">
                  <div className="aq-proc-head">Changements</div>
                  {status.changes.map((c, i) => (
                    <div key={i} className="aq-git-change">
                      <span className={`aq-gc-status aq-gc-${c.status}`}>{c.status[0].toUpperCase()}</span>
                      <span className="aq-mono aq-truncate">{c.file}</span>
                      <span className="aq-muted">{c.status}</span>
                    </div>
                  ))}
                  {status.changes.length === 0 && <div className="aq-muted">Le working tree est propre.</div>}
                </div>
              </div>
            )}

            <div className="aq-git-output aq-glass">
              <div className="aq-git-output-head">Sortie</div>
              <pre className="aq-git-output-body aq-mono">{output || "Les commandes Git s'exécutent ici et affichent leur sortie réelle.\nUtilisez les boutons Pull / Push / Fetch pour interagir avec les distants."}</pre>
            </div>
          </>
        )}
      </div>

      <style>{`
        .aq-git { display: flex; height: 100%; background: var(--aq-bg); }
        .aq-git-sidebar { width: 250px; display: flex; flex-direction: column; border-right: var(--aq-glass-border); }
        .aq-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; font-weight: 700; font-size: 14px; }
        .aq-iconbtn { padding: 5px; border-radius: var(--aq-radius-sm); color: var(--aq-muted); }
        .aq-iconbtn:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-git-repos { flex: 1; padding: 0 8px 10px; }
        .aq-git-repo { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 10px; border-radius: var(--aq-radius); text-align: left; transition: background var(--aq-dur-fast) var(--aq-ease); }
        .aq-git-repo:hover { background: var(--aq-surface-hover); }
        .aq-git-repo.active { background: var(--aq-accent-soft); }
        .aq-git-repo-name { flex: 1; font-weight: 600; font-size: 13px; min-width: 0; }
        .aq-git-repo-branch { font-size: 10px; }
        .aq-git-main { flex: 1; padding: 20px; overflow-y: auto; }
        .aq-git-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
        .aq-git-head h2 { font-size: 19px; }
        .aq-git-path { font-size: 12px; margin-top: 4px; }
        .aq-git-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .aq-git-statuscard { padding: 16px; border-radius: var(--aq-radius); margin-bottom: 16px; }
        .aq-git-summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
        .aq-git-changes { max-height: 200px; overflow-y: auto; }
        .aq-git-change { display: flex; align-items: center; gap: 10px; padding: 7px 10px; background: var(--aq-surface); border-radius: var(--aq-radius-sm); font-size: 12.5px; }
        .aq-gc-status { width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; }
        .aq-gc-modified { background: var(--aq-warning-soft); color: var(--aq-warning); }
        .aq-gc-added { background: var(--aq-success-soft); color: var(--aq-success); }
        .aq-gc-deleted { background: var(--aq-error-soft); color: var(--aq-error); }
        .aq-gc-untracked { background: var(--aq-accent-soft); color: var(--aq-accent); }
        .aq-git-output { border-radius: var(--aq-radius); padding: 14px; }
        .aq-git-output-head { font-weight: 700; font-size: 13px; margin-bottom: 10px; }
        .aq-git-output-body { white-space: pre-wrap; font-size: 12px; color: var(--aq-text-dim); max-height: 240px; overflow-y: auto; margin: 0; }
        .aq-empty { padding: 40px; text-align: center; color: var(--aq-muted); }
      `}</style>
    </div>
  );
}
