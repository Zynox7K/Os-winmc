// ============================================================================
// ARQON OS — Assistant de premier démarrage (Onboarding)
// 10 écrans : Welcome → Langue → Clavier → Compte → Réseau → Profil
//            → Outils → Thème → Finalisation → Welcome to your workspace.
// Fonctionnel : détection réseau réelle, installation réelle d'outils,
// personnalisation du thème appliquée au bureau.
// ============================================================================
import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, Globe, Keyboard, User, Wifi, Cpu, Palette,
  Sparkles, Loader2, CircleCheck, Boxes,
} from "lucide-react";
import { api } from "../api/client.js";

export interface OnboardingResult {
  language: string;
  keyboard: string;
  user: { name: string; username: string };
  network: string;
  profile: string;
  tools: string[];
  accent: string;
  dark: boolean;
}

const ACCENTS = [
  { id: "blue", color: "#328BFF", label: "Bleu ARQON" },
  { id: "purple", color: "#765BFF", label: "Violet" },
  { id: "green", color: "#25C98A", label: "Vert" },
  { id: "amber", color: "#F5B942", label: "Ambre" },
  { id: "rose", color: "#F05D6C", label: "Rose" },
];

const LANGUAGES = [
  { id: "fr", label: "Français", flag: "🇫🇷" },
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "de", label: "Deutsch", flag: "🇩🇪" },
  { id: "es", label: "Español", flag: "🇪🇸" },
];

const KEYBOARDS = [
  { id: "azerty", label: "AZERTY (FR)" },
  { id: "qwerty", label: "QWERTY (US)" },
  { id: "afnor", label: "Bépo / AFNOR" },
  { id: "dvorak", label: "Dvorak" },
];

const PROFILES = [
  { id: "web", label: "Web Developer", desc: "React, TypeScript, Node.js, outils front", icon: "🌐" },
  { id: "software", label: "Software Engineer", desc: "Rust, C/C++, Java, Go, tests", icon: "⚙️" },
  { id: "system", label: "System Developer", desc: "Noyau, système, bas niveau, conteneurs", icon: "🖥️" },
  { id: "devops", label: "DevOps Engineer", desc: "Docker, automatisation, CI/CD", icon: "📦" },
  { id: "data", label: "Data Scientist", desc: "Python, Jupyter, ML, analytique", icon: "📊" },
  { id: "custom", label: "Custom Setup", desc: "Configuration manuelle", icon: "🛠️" },
];

// Outils provisionnables (installation réelle via pip/npm si disponibles).
const TOOLS = [
  { id: "python3", label: "Python 3", cat: "pip" },
  { id: "pip", label: "pip", cat: "pip" },
  { id: "node", label: "Node.js", cat: "node" },
  { id: "git", label: "Git", cat: "system" },
  { id: "docker", label: "Docker CLI", cat: "system" },
  { id: "vim", label: "Vim", cat: "system" },
  { id: "tmux", label: "tmux", cat: "system" },
  { id: "rust", label: "Rust (rustup)", cat: "curl" },
];

interface Props {
  onDone: (result: OnboardingResult) => void;
  onAccentChange: (color: string) => void;
  onDarkChange: (dark: boolean) => void;
}

export default function Onboarding({ onDone, onAccentChange, onDarkChange }: Props) {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState("fr");
  const [kb, setKb] = useState("azerty");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("dev");
  const [network, setNetwork] = useState("");
  const [profile, setProfile] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [accent, setAccent] = useState("blue");
  const [dark, setDark] = useState(true);
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [netInterfaces, setNetInterfaces] = useState<{ name: string; state: string; ip: string }[]>([]);

  useEffect(() => {
    api.network().then((n) => {
      setNetInterfaces(n);
      const up = n.find((i) => i.state === "up");
      if (up) setNetwork(up.name);
    }).catch(() => {});
  }, []);

  const total = 10;
  const canNext = () => {
    if (step === 3) return name.trim().length > 0;
    if (step === 4) return network !== "";
    if (step === 5) return profile !== "";
    return true;
  };

  const next = () => {
    if (step === 7) {
      // Finalisation : on applique le thème sélectionné.
      const a = ACCENTS.find((x) => x.id === accent)!;
      onAccentChange(a.color);
      onDarkChange(dark);
    }
    setStep((s) => Math.min(s + 1, total - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = () => {
    onDone({
      language: lang, keyboard: kb,
      user: { name, username },
      network, profile,
      tools, accent, dark,
    });
  };

  const toggleTool = (id: string) =>
    setTools((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const provision = async () => {
    for (const t of tools) {
      setInstalling((s) => ({ ...s, [t]: true }));
      setInstallLog((l) => [...l, `→ Provisionnement de « ${t} »…`]);
      try {
        const tool = TOOLS.find((x) => x.id === t)!;
        if (tool.cat === "pip") {
          const r = await api.installPackage(t, "pip");
          setInstallLog((l) => [...l, `✓ ${t} : ${r.output.split("\n").pop()?.slice(0, 80) || "installé"}`]);
        } else if (tool.cat === "node") {
          const r = await api.installPackage(t, "npm");
          setInstallLog((l) => [...l, `✓ ${t} : installé`]);
        } else {
          const r = await api.installPackage(t, "apt");
          setInstallLog((l) => [...l, `✓ ${t} : ${r.output.split("\n").pop()?.slice(0, 80) || "installé"}`]);
        }
      } catch (e: any) {
        setInstallLog((l) => [...l, `✗ ${t} : ${e.message}`]);
      } finally {
        setInstalling((s) => ({ ...s, [t]: false }));
      }
    }
  };

  return (
    <div className="aq-onboarding">
      <div className="aq-onb-progress">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`aq-onb-dot ${i <= step ? "done" : ""} ${i === step ? "current" : ""}`} />
        ))}
      </div>

      <div className="aq-onb-card aq-glass">
        {/* ---- Écran 1 : Welcome ---- */}
        {step === 0 && (
          <div className="aq-onb-screen aq-center">
            <div className="aq-onb-logo">A</div>
            <h1>Welcome to ARQON</h1>
            <p className="aq-muted">Build. Code. Create.</p>
            <p className="aq-onb-sub">Préparez votre environnement de développement en quelques étapes. ARQON OS vous guide.</p>
          </div>
        )}

        {/* ---- Écran 2 : Langue ---- */}
        {step === 1 && (
          <Screen icon={<Globe size={20} />} title="Choix de la langue" sub="Sélectionnez la langue de l'interface ARQON.">
            <div className="aq-onb-grid2">
              {LANGUAGES.map((l) => (
                <button key={l.id} className={`aq-onb-option ${lang === l.id ? "active" : ""}`} onClick={() => setLang(l.id)}>
                  <span className="aq-onb-flag">{l.flag}</span> {l.label}
                  {lang === l.id && <Check size={16} className="aq-onb-check" />}
                </button>
              ))}
            </div>
          </Screen>
        )}

        {/* ---- Écran 3 : Clavier ---- */}
        {step === 2 && (
          <Screen icon={<Keyboard size={20} />} title="Configuration du clavier" sub="Disposition de frappe pour votre environnement.">
            <div className="aq-onb-grid2">
              {KEYBOARDS.map((k) => (
                <button key={k.id} className={`aq-onb-option ${kb === k.id ? "active" : ""}`} onClick={() => setKb(k.id)}>
                  {k.label}
                  {kb === k.id && <Check size={16} className="aq-onb-check" />}
                </button>
              ))}
            </div>
          </Screen>
        )}

        {/* ---- Écran 4 : Compte ---- */}
        {step === 3 && (
          <Screen icon={<User size={20} />} title="Création du compte utilisateur" sub="Identifiant utilisé dans ARQON OS.">
            <div className="aq-onb-form">
              <label className="aq-onb-label">Nom complet</label>
              <input className="aq-input" placeholder="Jean Dupont" value={name} onChange={(e) => setName(e.target.value)} />
              <label className="aq-onb-label" style={{ marginTop: 14 }}>Nom d'utilisateur</label>
              <input className="aq-input" placeholder="dev" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
          </Screen>
        )}

        {/* ---- Écran 5 : Réseau ---- */}
        {step === 4 && (
          <Screen icon={<Wifi size={20} />} title="Connexion réseau" sub="Interfaces réseau détectées sur le système.">
            <div className="aq-onb-net">
              {netInterfaces.map((n) => (
                <button key={n.name} className={`aq-onb-option ${network === n.name ? "active" : ""}`} onClick={() => setNetwork(n.name)}>
                  <div className="aq-onb-net-head">
                    <span className="aq-onb-net-name">{n.name}</span>
                    <span className={`aq-badge ${n.state === "up" ? "aq-badge-success" : ""}`}>{n.state}</span>
                  </div>
                  {n.ip && <span className="aq-mono aq-muted">{n.ip}</span>}
                  {network === n.name && <Check size={16} className="aq-onb-check" />}
                </button>
              ))}
              {netInterfaces.length === 0 && <div className="aq-muted">Aucune interface réseau détectée.</div>}
            </div>
          </Screen>
        )}

        {/* ---- Écran 6 : Profil développeur ---- */}
        {step === 5 && (
          <Screen icon={<Cpu size={20} />} title="Choix du profil développeur" sub="ARQON configure l'environnement selon votre domaine.">
            <div className="aq-onb-grid2">
              {PROFILES.map((p) => (
                <button key={p.id} className={`aq-onb-option aq-onb-profile ${profile === p.id ? "active" : ""}`} onClick={() => setProfile(p.id)}>
                  <span className="aq-onb-profile-icon">{p.icon}</span>
                  <span className="aq-onb-profile-label">{p.label}</span>
                  <span className="aq-onb-profile-desc aq-muted">{p.desc}</span>
                  {profile === p.id && <Check size={16} className="aq-onb-check" />}
                </button>
              ))}
            </div>
          </Screen>
        )}

        {/* ---- Écran 7 : Outils ---- */}
        {step === 6 && (
          <Screen icon={<Boxes size={20} />} title="Sélection des outils à installer" sub="Ne pas installer de centaines d'outils inutiles. Choisissez ce dont vous avez besoin.">
            <div className="aq-onb-tools">
              {TOOLS.map((t) => (
                <label key={t.id} className={`aq-onb-tool ${tools.includes(t.id) ? "checked" : ""}`}>
                  <input type="checkbox" checked={tools.includes(t.id)} onChange={() => toggleTool(t.id)} />
                  <span className="aq-onb-tool-label">{t.label}</span>
                  {installing[t.id] && <Loader2 size={14} className="aq-onb-spin" />}
                </label>
              ))}
            </div>
            {tools.length > 0 && (
              <button className="aq-btn aq-btn-primary aq-onb-provision" onClick={provision}>
                <Sparkles size={14} /> Provisionner {tools.length} outil(s)
              </button>
            )}
            {installLog.length > 0 && (
              <div className="aq-onb-log">
                {installLog.map((l, i) => <div key={i} className="aq-mono">{l}</div>)}
              </div>
            )}
          </Screen>
        )}

        {/* ---- Écran 8 : Thème ---- */}
        {step === 7 && (
          <Screen icon={<Palette size={20} />} title="Personnalisation du thème" sub="Personnalisez l'apparence de votre bureau ARQON.">
            <div className="aq-onb-label">Accent</div>
            <div className="aq-onb-accents">
              {ACCENTS.map((a) => (
                <button key={a.id} className={`aq-onb-accent ${accent === a.id ? "active" : ""}`} onClick={() => setAccent(a.id)} title={a.label}>
                  <span className="aq-onb-accent-swatch" style={{ background: a.color }} />
                </button>
              ))}
            </div>
            <div className="aq-onb-label" style={{ marginTop: 18 }}>Mode</div>
            <div className="aq-onb-mode">
              <button className={`aq-onb-option ${dark ? "active" : ""}`} onClick={() => setDark(true)}>Sombre</button>
              <button className={`aq-onb-option ${!dark ? "active" : ""}`} onClick={() => setDark(false)}>Clair</button>
            </div>
            <div className="aq-onb-preview">
              <span className="aq-badge" style={{ background: `${ACCENTS.find((a) => a.id === accent)!.color}22`, color: ACCENTS.find((a) => a.id === accent)!.color }}>
                Prévisualisation accent
              </span>
            </div>
          </Screen>
        )}

        {/* ---- Écran 9 : Finalisation ---- */}
        {step === 8 && (
          <Screen icon={<CircleCheck size={20} />} title="Finalisation" sub="Vérifiez la configuration avant de démarrer votre workspace.">
            <div className="aq-onb-summary">
              <Row k="Langue" v={LANGUAGES.find((l) => l.id === lang)!.label} />
              <Row k="Clavier" v={KEYBOARDS.find((k) => k.id === kb)!.label} />
              <Row k="Utilisateur" v={`${name} (${username})`} />
              <Row k="Réseau" v={network} />
              <Row k="Profil" v={PROFILES.find((p) => p.id === profile)?.label || "—"} />
              <Row k="Outils" v={tools.length ? tools.join(", ") : "Aucun"} />
              <Row k="Accent" v={ACCENTS.find((a) => a.id === accent)!.label} />
              <Row k="Mode" v={dark ? "Sombre" : "Clair"} />
            </div>
          </Screen>
        )}

        {/* ---- Écran 10 : Welcome to your workspace ---- */}
        {step === 9 && (
          <div className="aq-onb-screen aq-center">
            <div className="aq-onb-logo aq-onb-logo-big">A</div>
            <h1>Welcome to your workspace</h1>
            <p className="aq-muted">ARQON OS est prêt.</p>
            <p className="aq-onb-sub">Votre environnement de développement est configuré. Build. Code. Create.</p>
            <button className="aq-btn aq-btn-primary aq-onb-launch" onClick={finish}>
              <Sparkles size={15} /> Entre dans ARQON OS
            </button>
          </div>
        )}

        {/* ---- Navigation ---- */}
        {step < 9 && (
          <div className="aq-onb-nav">
            <button className="aq-btn aq-btn-ghost" onClick={back} disabled={step === 0}><ArrowLeft size={15} /> Retour</button>
            <span className="aq-onb-step-count">{step + 1} / {total}</span>
            <button className="aq-btn aq-btn-primary" onClick={next} disabled={!canNext()}>
              {step === 8 ? "Terminer" : "Continuer"} <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .aq-onboarding {
          position: fixed; inset: 0; z-index: 100000;
          background:
            radial-gradient(1000px 600px at 50% -10%, rgba(50,139,255,0.16), transparent 55%),
            radial-gradient(900px 500px at 100% 100%, rgba(118,91,255,0.14), transparent 55%),
            var(--aq-bg);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 40px 20px;
          animation: aq-fade-in var(--aq-dur-slow) var(--aq-ease-out);
        }
        .aq-onb-progress { display: flex; gap: 6px; margin-bottom: 28px; }
        .aq-onb-dot { width: 28px; height: 4px; border-radius: 999px; background: var(--aq-surface-hover); transition: background var(--aq-dur) var(--aq-ease); }
        .aq-onb-dot.done { background: var(--aq-accent); }
        .aq-onb-dot.current { background: var(--aq-accent); box-shadow: 0 0 8px var(--aq-accent); }
        .aq-onb-card {
          width: min(620px, 96vw);
          padding: 40px;
          border-radius: var(--aq-radius-xl);
          box-shadow: var(--aq-shadow-lg);
          animation: aq-scale-in var(--aq-dur) var(--aq-ease-out);
        }
        .aq-onb-screen { text-align: center; }
        .aq-onb-screen h1 { font-size: 28px; margin: 16px 0 6px; }
        .aq-onb-sub { margin-top: 14px; color: var(--aq-text-dim); font-size: 14px; max-width: 420px; }
        .aq-onb-logo {
          width: 64px; height: 64px; border-radius: 18px;
          background: linear-gradient(135deg, var(--aq-accent), var(--aq-accent-2));
          color: #06121f; font-weight: 800; font-size: 34px;
          display: inline-flex; align-items: center; justify-content: center;
          box-shadow: var(--aq-shadow-glow);
        }
        .aq-onb-logo-big { width: 88px; height: 88px; font-size: 48px; border-radius: 26px; }
        .aq-onb-launch { margin-top: 28px; padding: 12px 28px; font-size: 15px; }
        .aq-onb-nav { display: flex; align-items: center; justify-content: space-between; margin-top: 32px; }
        .aq-onb-step-count { font-size: 13px; color: var(--aq-muted); font-weight: 600; }
        .aq-onb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
        .aq-onb-option {
          display: flex; align-items: center; gap: 10px;
          padding: 16px; border-radius: var(--aq-radius);
          background: var(--aq-surface); border: var(--aq-border);
          text-align: left; font-size: 14px; font-weight: 600;
          transition: all var(--aq-dur) var(--aq-ease); position: relative;
        }
        .aq-onb-option:hover { background: var(--aq-surface-hover); }
        .aq-onb-option.active { border-color: var(--aq-accent); background: var(--aq-accent-soft); }
        .aq-onb-check { position: absolute; right: 14px; color: var(--aq-accent); }
        .aq-onb-flag { font-size: 18px; }
        .aq-onb-form { margin-top: 18px; }
        .aq-onb-label { display: block; font-size: 13px; font-weight: 600; color: var(--aq-text-dim); margin-bottom: 8px; }
        .aq-onb-net { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
        .aq-onb-net-head { display: flex; align-items: center; justify-content: space-between; width: 100%; }
        .aq-onb-net-name { font-weight: 600; }
        .aq-onb-profile { flex-direction: column; align-items: flex-start; gap: 4px; }
        .aq-onb-profile-icon { font-size: 22px; }
        .aq-onb-profile-label { font-size: 15px; }
        .aq-onb-profile-desc { font-size: 11.5px; font-weight: 400; }
        .aq-onb-tools { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
        .aq-onb-tool {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: var(--aq-radius);
          background: var(--aq-surface); border: var(--aq-border);
          font-size: 13.5px; cursor: pointer; transition: all var(--aq-dur-fast) var(--aq-ease);
        }
        .aq-onb-tool.checked { border-color: var(--aq-accent); background: var(--aq-accent-soft); }
        .aq-onb-tool input { accent-color: var(--aq-accent); width: 16px; height: 16px; }
        .aq-onb-tool-label { flex: 1; font-weight: 600; }
        .aq-onb-spin { animation: spin 1s linear infinite; color: var(--aq-accent); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .aq-onb-provision { margin-top: 16px; width: 100%; }
        .aq-onb-log { margin-top: 14px; padding: 12px; background: var(--aq-secondary); border-radius: var(--aq-radius); font-size: 12px; max-height: 140px; overflow-y: auto; }
        .aq-onb-log div { padding: 2px 0; }
        .aq-onb-accents { display: flex; gap: 12px; margin-top: 12px; }
        .aq-onb-accent { width: 40px; height: 40px; border-radius: 12px; border: 2px solid transparent; transition: border-color var(--aq-dur) var(--aq-ease); }
        .aq-onb-accent.active { border-color: var(--aq-text); }
        .aq-onb-accent-swatch { width: 100%; height: 100%; border-radius: 10px; display: block; }
        .aq-onb-mode { display: flex; gap: 10px; margin-top: 12px; }
        .aq-onb-mode .aq-onb-option { flex: 1; justify-content: center; }
        .aq-onb-preview { margin-top: 20px; text-align: center; }
        .aq-onb-summary { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; }
        .aq-onb-row { display: flex; justify-content: space-between; padding: 11px 14px; background: var(--aq-surface); border-radius: var(--aq-radius); }
        .aq-onb-row-k { font-size: 13px; color: var(--aq-muted); }
        .aq-onb-row-v { font-weight: 600; font-size: 13px; text-align: right; max-width: 60%; word-break: break-word; }
      `}</style>
    </div>
  );
}

function Screen({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <>
      <div className="aq-onb-head">
        <span className="aq-onb-head-icon">{icon}</span>
        <div>
          <h2>{title}</h2>
          <p className="aq-muted">{sub}</p>
        </div>
      </div>
      {children}
      <style>{`
        .aq-onb-head { display: flex; align-items: flex-start; gap: 14px; }
        .aq-onb-head-icon {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--aq-accent-soft); color: var(--aq-accent);
        }
        .aq-onb-head h2 { font-size: 19px; }
        .aq-onb-head p { font-size: 12.5px; margin-top: 2px; }
      `}</style>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="aq-onb-row">
      <span className="aq-onb-row-k">{k}</span>
      <span className="aq-onb-row-v">{v}</span>
    </div>
  );
}
