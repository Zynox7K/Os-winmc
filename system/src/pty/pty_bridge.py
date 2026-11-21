#!/usr/bin/env python3
"""
ARQON OS — PTY Bridge
=====================
Pont qui ouvre un VRAI pseudo-terminal système (module `pty` du standard Python)
et exécute un shell dedans. La communication avec Node.js passe par stdout
(carrée) / stdin (JSON) sur fd 3/4 pour éviter de polluer le flux terminal.

Protocole (framing par longueur, 8 octets big-endian) :
  - Node -> Python (stdin) :  {"op":"write","data":"<base64>"} | {"op":"resize","cols":..,"rows":..}
  - Python -> Node (stdout) : {"op":"data","data":"<base64>"}      | {"op":"exit","code":..}

Le shell tourne dans un vrai PTY : tab-completion, couleurs, TUI et historique
sont ceux du système. Aucune commande n'est simulée.
"""
import os
import sys
import json
import base64
import pty
import fcntl
import termios
import struct
import signal
import select


def send(obj):
    raw = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack(">Q", len(raw)))
    sys.stdout.buffer.write(raw)
    sys.stdout.buffer.flush()


def read_frame_stdin():
    """Lit une trame `{8 octets longueur}{json}` sur stdin via le fd brut.
    Retourne None si fermé ou si trame incomplète."""
    fd_in = sys.stdin.fileno()
    header = b""
    while len(header) < 8:
        chunk = os.read(fd_in, 8 - len(header))
        if not chunk:
            return None
        header += chunk
    (length,) = struct.unpack(">Q", header)
    if length == 0:
        return None
    body = b""
    while len(body) < length:
        chunk = os.read(fd_in, length - len(body))
        if not chunk:
            return None
        body += chunk
    try:
        return json.loads(body.decode("utf-8"))
    except Exception:
        return None


def main():
    # Récupère les paramètres initiaux passés par Node via argv JSON.
    if len(sys.argv) > 1:
        try:
            cfg = json.loads(sys.argv[1])
        except Exception:
            cfg = {}
    else:
        cfg = {}

    shell = cfg.get("shell") or os.environ.get("SHELL") or "/bin/bash"
    cwd = cfg.get("cwd") or os.getcwd()
    cols = int(cfg.get("cols") or 120)
    rows = int(cfg.get("rows") or 30)

    # Ouvre un vrai PTY et forke le shell dedans.
    pid, fd = pty.fork()
    if pid == 0:  # processus fils : le shell
        try:
            os.chdir(cwd)
        except Exception:
            pass
        # Environnement de shell réaliste.
        env = os.environ.copy()
        env.setdefault("TERM", "xterm-256color")
        env.setdefault("LANG", env.get("LANG", "C.UTF-8"))
        os.execvpe(shell, [shell], env)
    else:  # processus père : relais
        # Initialisation de la taille du terminal.
        try:
            winsz = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(fd, termios.TIOCSWINSZ, winsz)
        except Exception:
            pass

        send({"op": "started", "pid": pid, "shell": shell, "cwd": cwd})

        alive = True
        while True:
            # Priorité : données PTY à envoyer vers Node.
            rlist = [fd, sys.stdin.fileno()]
            try:
                readable, _, _ = select.select(rlist, [], [], 0.05)
            except Exception:
                break

            # 1) Données PTY (shell -> Node). On lit fd UNIQUEMENT s'il est prêt,
            #    sinon os.read bloquerait et on ne pourrait jamais lire stdin.
            if fd in readable:
                try:
                    data = os.read(fd, 65536)
                except OSError:
                    data = b""
                if data:
                    send({"op": "data", "data": base64.b64encode(data).decode("ascii")})
                    continue

            # 2) Commandes Node (Node -> shell). On lit stdin seulement s'il est prêt.
            if sys.stdin.fileno() not in readable:
                continue
            frame = read_frame_stdin()
            if frame is None:
                # stdin fermé : on demande la sortie propre.
                if alive:
                    try:
                        os.kill(pid, signal.SIGHUP)
                    except Exception:
                        pass
                    alive = False
                # draine les dernières données avant exit
                try:
                    while True:
                        rest = os.read(fd, 65536)
                        if not rest:
                            break
                        send({"op": "data", "data": base64.b64encode(rest).decode("ascii")})
                except OSError:
                    pass
                break

            op = frame.get("op")
            if op == "write":
                raw = base64.b64decode(frame.get("data", ""))
                try:
                    os.write(fd, raw)
                except OSError:
                    break
            elif op == "resize":
                c = int(frame.get("cols", cols))
                r = int(frame.get("rows", rows))
                cols, rows = c, r
                try:
                    winsz = struct.pack("HHHH", r, c, 0, 0)
                    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsz)
                except Exception:
                    pass
            elif op == "signal":
                try:
                    os.kill(pid, signal.SIGINT if frame.get("sig") == "int" else signal.SIGTERM)
                except Exception:
                    pass

        # Collecte du code de sortie.
        try:
            _, status = os.waitpid(pid, 0)
            code = os.WEXITSTATUS(status) if os.WIFEXITED(status) else -1
        except Exception:
            code = -1
        send({"op": "exit", "code": code})


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        send({"op": "error", "message": str(e)})
