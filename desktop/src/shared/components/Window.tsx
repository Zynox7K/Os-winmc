// ============================================================================
// ARQON OS — Composant Window (chrome de fenêtre)
// ============================================================================
import { useEffect, useRef, type ReactNode } from "react";
import { X, Minus, Square, ChevronsUp } from "lucide-react";

export interface WindowState {
  id: string;
  title: string;
  icon?: ReactNode;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

interface WindowProps {
  win: WindowState;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  children: ReactNode;
}

export default function Window({ win, onClose, onMinimize, onMaximize, children }: WindowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizing = useRef<{ dir: string; sx: number; sy: number; ow: number; oh: number } | null>(null);

  // Position par défaut déterminée par l'ordre d'ouverture.
  useEffect(() => {
    if (ref.current) {
      const el = ref.current;
      el.style.left = "50%";
      el.style.top = "45%";
      el.style.transform = "translate(-50%, -50%)";
    }
  }, [win.id]);

  // Drag du titre
  const onTitleDown = (e: React.PointerEvent) => {
    if (ref.current?.classList.contains("maximized")) return;
    const rect = ref.current!.getBoundingClientRect();
    drag.current = { mx: e.clientX, my: e.clientY, ox: rect.left, oy: rect.top };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (drag.current) {
        const el = ref.current!;
        const nx = drag.current.ox + (e.clientX - drag.current.mx);
        const ny = drag.current.oy + (e.clientY - drag.current.my);
        el.style.left = `${nx}px`;
        el.style.top = `${ny}px`;
        el.style.transform = "none";
      } else if (resizing.current) {
        const el = ref.current!;
        const d = resizing.current.dir;
        const dx = e.clientX - resizing.current.sx;
        const dy = e.clientY - resizing.current.sy;
        const ow = resizing.current.ow;
        const oh = resizing.current.oh;
        let w = ow, h = oh, left = 0, top = 0;
        if (d.includes("e")) w = ow + dx;
        if (d.includes("s")) h = oh + dy;
        if (d.includes("w")) { w = ow - dx; left = dx; }
        if (d.includes("n")) { h = oh - dy; top = dy; }
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        if (left) el.style.left = `${parseFloat(el.style.left) + left}px`;
        if (top) el.style.top = `${parseFloat(el.style.top) + top}px`;
      }
    };
    const up = () => { drag.current = null; resizing.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const startResize = (dir: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = ref.current!.getBoundingClientRect();
    resizing.current = { dir, sx: e.clientX, sy: e.clientY, ow: rect.width, oh: rect.height };
  };

  return (
    <div
      ref={ref}
      className="aq-window aq-glass"
      style={{
        width: win.defaultWidth ?? 720,
        height: win.defaultHeight ?? 480,
        minWidth: win.minWidth ?? 360,
        minHeight: win.minHeight ?? 240,
      }}
    >
      <div className="aq-window-titlebar" onPointerDown={onTitleDown} onDoubleClick={onMaximize}>
        <div className="aq-window-traffic">
          <span className="aq-dot aq-dot-red" onClick={onClose}><X size={13} /></span>
          <span className="aq-dot aq-dot-yellow" onClick={onMinimize}><Minus size={13} /></span>
          <span className="aq-dot aq-dot-green" onClick={onMaximize}><Square size={11} /></span>
        </div>
        <div className="aq-window-title">
          {win.icon} {win.title}
        </div>
        <button className="aq-window-max" onClick={onMaximize}><ChevronsUp size={14} /></button>
      </div>
      <div className="aq-window-body">{children}</div>
      {/* Poignées de redimensionnement */}
      <div className="aq-resize aq-resize-n" onMouseDown={startResize("n")} />
      <div className="aq-resize aq-resize-s" onMouseDown={startResize("s")} />
      <div className="aq-resize aq-resize-e" onMouseDown={startResize("e")} />
      <div className="aq-resize aq-resize-w" onMouseDown={startResize("w")} />
      <div className="aq-resize aq-resize-ne" onMouseDown={startResize("ne")} />
      <div className="aq-resize aq-resize-nw" onMouseDown={startResize("nw")} />
      <div className="aq-resize aq-resize-se" onMouseDown={startResize("se")} />
      <div className="aq-resize aq-resize-sw" onMouseDown={startResize("sw")} />
    </div>
  );
}
