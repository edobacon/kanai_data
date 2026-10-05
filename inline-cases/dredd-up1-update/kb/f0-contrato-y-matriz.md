# F0: contrato 1.1 y matriz de aceptación

Fecha: 2026-10-05. Las partes marcadas "según D#" dependen de `f0-propuesta-decisiones.md` y se ajustan si el dev cambia esa decisión.

## 1. Entorno de ejecución y verificación

- Sistema verificado: macOS. Linux y Windows: diseño portable, sin verificar (`verificacion-solo-macos.md`).
- Python: mínimo según D7; la suite se corre con el mínimo y con 3.14 (`/opt/homebrew/bin/python3.9` y `/opt/homebrew/bin/python3.14`), indicando la ruta absoluta del intérprete en el registro.
- git: mínimo según D8. Sin dependencias de terceros: solo biblioteca estándar.

## 2. Interfaces (contrato)

| Pieza | Interfaz | Regla |
|---|---|---|
| Helper Bitbucket | `bb.py <subcomando> ...` con los subcomandos v1 (parse, meta, diff, diffstat, file, commits, commitfiles, statuses, list, comment) | Salida JSON o texto como v1; listas completas siguiendo `next`; HTTP 4xx/5xx y timeout salen con código distinto de 0 y mensaje en stderr; nunca imprime el token. Según D9. |
| Progreso | `dredd-progress.py init/plan/phase/note/estimate/say/end/close/show/line/wait/watch` | Mismos comandos v1; `init` devuelve `run_id`; todo opera sobre la corrida propia. Según D10 y D11. |
| Guard | hook PreToolUse que lee JSON por stdin | Inerte sin corrida vinculada; deniega instalación de paquetes, egress fuera de `bb.py`, lectura de secretos y binarios; permite runners ya instalados. |
| Estado | `<DREDD_HOME>/runs/<run_id>/` con `schema_version` | Escritura atómica; parent único escritor. Según D10 y D12. |
| Hallazgo | JSON con id, repo, archivo, mecanismo, severidad o consulta, evidencia, ref, fundamento | Severidad exige mecanismo e impacto verificables. Según D4. |
| Veredicto | calculado por función pura desde los hallazgos | Tabla de D4; el informe muestra emitido y calculado. |
| Expediente | por repo y PR o rama, con rondas, decisiones y cobertura por blob | full/partial/not-read; solo full cuenta como revisado. |
| Métricas | `dredd-metrics.py record` (interno) y `report --repo --from --to --output [--include-links]` | Markdown UTF-8; `null` cuando no hay dato; anonimizado por defecto. Según D6. |

## 3. Convención de tests

- Carpeta: `.claude/skills/dredd/scripts/tests/`.
- Archivos: `test_fN_<area>.py`, una suite por área nombrada en el criterio de la fase.
- Comando por fase: `python -m unittest discover -s .claude/skills/dredd/scripts/tests -p "test_fN_*.py" -v` (con el intérprete del punto 1).
- Aislamiento: cada test usa `tempfile` para repos git y `DREDD_HOME`; HTTP simulado con un servidor local en `127.0.0.1` (sin red externa); sin tocar el checkout real.
- Un caso de la matriz equivale a uno o más tests; el mínimo por fase es la cantidad de casos.

## 4. Matriz de aceptación y mínimos

### F1 (mínimo 24)
- test_f1_helper (8): paginación de más de 100 resultados siguiendo `next`; 401; 403; 404; timeout; 429 con reintento y límite declarado; ruta y nombre Unicode; ref exacta por hash.
- test_f1_sessions (7): dos corridas concurrentes sin pérdida de eventos; guard de una sesión no afecta a la otra; `session_id` ausente; TTL vencido con actividad reciente no retira protección; `close` cierra solo la corrida propia; lock vencido se recupera; escritura interrumpida no deja archivo corrupto.
- test_f1_guard (5): inerte sin corrida; deniega `npx` y `pip install`; permite runner ya instalado; deniega egress fuera de `bb.py`; deniega lectura de secretos.
- test_f1_checkout (4): chequeo de merge sin modificar el checkout; cambios dirty, stashes y worktrees intactos; limpieza solo de temporales propios; rutas con espacios.

### F2 (mínimo 23)
- test_f2_protocol (3): mapa de capacidades v1 cubierto; sin referencias a herramientas excluidas; funciona con KB de archivos y sin KB.
- test_f2_triage (4): señales mecánicas detectadas; JSON o config que cambia comportamiento no se marca inocuo; descarte de señal con motivo; fases aplicables calculadas.
- test_f2_rubric (8): S0; S1; S2; S3; consulta sin severidad; piso informativo no cuenta para dos S2; S2 de contrato compartido eleva a iterar; dedup por mecanismo.
- test_f2_config (8): campo válido; campo inexistente; objeto no resuelto; unión de definiciones core y mod con el mismo nombre; record type o extensión; referencia anidada; config usada fuera del render; preexistente contra nuevo.

### F3 (mínimo 16)
- test_f3_orchestration (4): trivial sin fanout; paralelo con límite de workers; prefetch compartido; degradación sin subagentes declarada.
- test_f3_jury (4): coincidencia K2; desacuerdo visible; worker fallido con cobertura parcial; K3 hallazgo de un solo revisor pasa a consulta.
- test_f3_verifier (4): hallazgo confirmado; refutado; evidencia insuficiente pasa a consulta; veredicto recalculado.
- test_f3_consent (4): sin consentimiento no publica; publica el cuerpo aprobado exacto; fallo HTTP no se anuncia como éxito; candidato Core Extension queda en el parent.

### F4 (mínimo 17)
- test_f4_case (3): id por repo, archivo y mecanismo; migración de esquema con respaldo; decisión aceptada o pospuesta conserva historia.
- test_f4_scope (4): snapshot de staged, unstaged y untracked; cobertura por blob full, partial y not-read; delta más consumidores afectados; huecos previos incluidos.
- test_f4_rounds (4): cierre correcto exige criterio y head verificado; no corregido sigue abierto; escalado tras tres rondas sin avance; pre-envío y revisión ajena con salidas distintas.
- test_f4_invalidation (6): interdiff vacío con archivos nunca leídos; renombre; binario; cambio de base; rebase o force-push con recálculo; abandono y reanudación.

### F5 (mínimo 15)
- test_f5_capture (3): campos del esquema; corrida abortada como incompleta; tokens `null` sin fuente.
- test_f5_report (4): genera .md UTF-8 legible; política con archivo existente; filtros inválidos; intervalo sin datos.
- test_f5_aggregates (4): costo parcial no se promedia como completo; dedup separado del costo; outcomes con denominador visible; percentiles con tamaño de muestra.
- test_f5_anonymize (4): sin rutas personales; sin autores; enlaces solo con `--include-links`; registros corruptos o duplicados reportados.

### F7
Suite completa: al menos 95 tests (suma de mínimos) y las 20 suites presentes.

## 5. Evidencia que no se cubre con tests
- F1.C2: matriz por sistema (documento).
- F2.C2: mapa de capacidades v1 a fases 1.1 (documento).
- F6.C2: blobs v1 iguales a `f0-baseline-v1-y-preservacion.md`.
- F7.C2: smoke de Claude Code en macOS (dev).
