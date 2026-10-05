# F1: matriz por sistema

Fecha: 2026-10-05. macOS verificado con la suite de F1 (Python 3.9.25 y 3.14.4, git 2.54.0). Linux y Windows: **diseño portable sin verificar** (decisión `verificacion-solo-macos.md`).

| Mecanismo | Implementación | macOS | Linux | Windows | Límite conocido |
|---|---|---|---|---|---|
| Helper Bitbucket | `bb.py`, `urllib` de la stdlib | Verificado | Diseño | Diseño | Usa el almacén de certificados de Python; en Windows con proxy corporativo puede requerir configuración del sistema. |
| Credenciales | `Path.home()/.bitbucket.env` y `.bitbucket_token`, leídos sin `source` | Verificado | Diseño | Diseño (`USERPROFILE`) | La guía de creación del token usa `read -rs` + `chmod 600` (bash); en Windows se documentará el equivalente en F6. |
| Estado por corrida | `<DREDD_HOME>/runs/<id>/state.json`, `Path` y `os.replace` | Verificado | Diseño | Diseño | `os.replace` en Windows falla si otro proceso tiene el destino abierto sin `FILE_SHARE_DELETE`; los lectores abren y cierran rápido, el lock serializa escritores. |
| Lock | archivo con `O_CREAT|O_EXCL`, retiro de locks de más de 30 s | Verificado (8 escritores concurrentes por corrida) | Diseño | Diseño | Sin `fcntl` ni `msvcrt`. Un proceso colgado más de 30 s con el lock puede perderlo. |
| Identidad de sesión | `session_id` del JSON del hook; vínculo al ver `dredd-progress.py ... --run <id>` | Verificado con payloads simulados | Diseño | Diseño | Pendiente sonda real en Claude Code 2.1.278: qué `session_id` llega en hooks de subagentes. Hasta su primer comando con `--run`, un subagente con sesión propia no está vinculado. |
| Guard | hook PreToolUse en Python; patrones de comandos POSIX y PowerShell (`Invoke-WebRequest`, `iwr`, `certutil`, `Get-Content`) | Verificado | Diseño | Diseño | Análisis de comandos por texto: un comando ofuscado puede evadirlo; es defensa en profundidad, no sandbox. |
| Chequeo de merge | `dredd-git.py`: `git merge-tree --write-tree` (git 2.38+) o worktree temporal en `tempfile.gettempdir()` | Verificado ambos caminos | Diseño | Diseño | Necesita `git` en el PATH. En Windows, rutas largas pueden requerir `core.longpaths`. |
| Instalador de hooks | `dredd-install.py`; copia a `<hooks>/dredd/`; registra `"<sys.executable>" "<ruta>"` | Verificado con settings temporales | Diseño | Diseño | Comillas dobles en el comando: válido en sh y cmd; no se probó PowerShell como shell de hooks. |
| Consola UTF-8 | `reconfigure(encoding="utf-8")` en stdout/stderr | Verificado | Diseño | Diseño (motivo original del fix v1) | Requiere Python 3.7+. |

## Resolución de Python y git

- Mínimo Python 3.9, solo stdlib (D7). Los hooks se registran con el intérprete que corrió el instalador, no con `python3` del PATH; los scripts invocados por el protocolo usan `python3` (en Windows, `py -3` o `python`, a documentar en F6).
- Mínimo git 2.38 para `merge-tree`; con git anterior el chequeo usa el worktree temporal (D8). `dredd-git.py version` informa versión y capacidad.

## Evidencia

`python -m unittest discover -s .claude/skills/dredd/scripts/tests -p "test_f1_*.py" -v`: 42 tests, OK, en `/opt/homebrew/bin/python3.9` y `/opt/homebrew/bin/python3.14`.
