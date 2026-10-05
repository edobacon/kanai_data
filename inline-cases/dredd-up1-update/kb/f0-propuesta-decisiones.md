# F0: propuesta de decisiones (pendiente de aprobación)

Fecha: 2026-10-05. Autor: agente. Estado: PROPUESTA. Nada de esto es decisión hasta que el dev la apruebe; la aprobación se registra aparte en `f0-decisiones-aprobadas.md`.

Base: perfil observado en `investigacion-configuracion-local.md`, problemas de `contexto-y-alcance.md` sección 4, código v1 de up1 y entorno de `f0-baseline-v1-y-preservacion.md`.

## Políticas (F0.1)

### D1. Jurado
- **A (recomendada)**: alcance acotado con señal de riesgo usa K2 (dos revisores ciegos); K3 solo si se pide; alcance amplio reparte por módulos sin jurado por módulo y lo declara; trivial, un revisor. Motivo: es el perfil probado localmente y evita atribuir doble revisión que no ocurrió.
- B: K2 siempre. Más costo en PR triviales sin ganancia demostrada.
- C: un revisor más verificador. Más barato; pierde los desacuerdos visibles.

### D2. Costo y presupuesto
- **A (recomendada)**: sin presupuesto monetario. Control por máximo de workers (D5) y timeout blando; tokens y costo se registran solo si el cliente los expone, si no `null`. Motivo: no hay fuente de costo confiable (6 de 62 registros locales con costo completo).
- B: presupuesto de tokens por corrida con aborto. Requiere una fuente de tokens que hoy no está verificada.

### D3. Jira en revisión local y pre-envío
- **A (recomendada)**: Jira obligatorio en revisión de PR; opcional en pre-envío y en revisión local; sin criterios de aceptación, el contraste con AC queda como "verificación no ejecutada" en el informe y en métricas.
- B: siempre opcional.
- C: siempre obligatorio. Bloquea el pre-envío de trabajo sin ticket.

### D4. Severidad y veredictos
- **A (recomendada)**: mantener los nombres v1: rechazado, iterar, aprobable con reservas, aprobable con nits, aprobable. Reglas: S0 → rechazado; S1 → iterar; S2 → reservas; dos S2 sin piso informativo o un S2 sobre núcleo o contrato compartido → iterar; solo S3 o consultas → nits; sin hallazgos → aprobable. Un S2 cuyo único fundamento es un piso informativo (doc o test faltante) no cuenta para la regla de dos S2. La incertidumbre se expresa como "consulta", sin severidad.
- B: tres niveles (rechazado, iterar, aprobable). Más simple; rompe la comparación con la v1.

### D5. Workers, modelos y tiempo
- **A (recomendada)**: máximo 4 workers concurrentes, configurable. Modelos por rol configurables: triage Haiku, revisión Sonnet, verificación y trazado Opus. Se registra modelo pedido y usado; si un modelo no está, se informa y no se simula el rol. Timeout blando de 60 minutos por corrida: avisa y registra, no aborta. Valores a recalibrar con las métricas de F5.
- B: máximo 2 workers. Menos carga, revisiones amplias más lentas.

### D6. Retención, opt-in y anonimización de métricas
- **A (recomendada)**: métricas activas por defecto (opt-out con `DREDD_METRICS=off`), solo locales, sin borrado automático; borrado manual con `dredd-metrics.py prune --before AAAA-MM-DD`. El reporte Markdown sale anonimizado por defecto (sin rutas personales, autores, títulos ni código); enlaces a PR o tickets solo con `--include-links`.
- B: opt-in. Pocas corridas registradas y métricas poco útiles.

## Arquitectura portable (F0.2)

### D7. Python soportado
- **A (recomendada)**: mínimo 3.9, solo biblioteca estándar; tests en 3.9 y 3.14. Motivo: `/usr/bin/python3` de macOS es 3.9.6 y los hooks resuelven `python3` por PATH, así que puede tocar el del sistema. Con 3.9, `unittest` sale 0 con cero tests: los mínimos por fase lo cubren.
- B: mínimo 3.10. Rompe en macOS sin Python adicional.
- C: mínimo 3.12. Gana `unittest` con salida 5 sin tests; exige instalar Python.

### D8. git mínimo y chequeo de merge
- **A (recomendada)**: git 2.38 o superior para `git merge-tree --write-tree` (chequeo de conflictos sin tocar el checkout); con git más viejo, worktree temporal propio y borrado al final. Nunca `merge`, `reset` ni `clean` en el checkout del dev.
- B: siempre worktree temporal. Más lento y más disco.

### D9. Helper de Bitbucket
- **A (recomendada)**: `bb.py` con `urllib` reemplaza a `bb.sh` (sin Bash, curl ni jq), mismos subcomandos, paginación completa siguiendo `next`, errores HTTP como código de salida distinto de 0, timeout y reintento ante 429. `bb.sh` se retira con nota de migración; el guard pasa a permitir egress solo vía `bb.py`.
- B: `bb.py` más `bb.sh` como envoltorio. Doble superficie para el guard.

### D10. Estado y concurrencia
- **A (recomendada)**: directorio por corrida `<DREDD_HOME>/runs/<run_id>/`, con `DREDD_HOME` por defecto `Path.home()/.dredd`. El parent es el único escritor de expediente, memoria y métricas; los workers devuelven JSON. Escrituras atómicas con archivo temporal y `os.replace`. Exclusión para los pocos archivos compartidos (índice de corridas activas) con archivo de lock creado con `O_CREAT|O_EXCL` y recuperación de locks vencidos. Portable sin `fcntl` ni `msvcrt`.
- B: lock por sistema operativo (`fcntl` o `msvcrt`) en todas las escrituras. Más código por plataforma.

### D11. Identidad de sesión
- **A (recomendada)**: `init` genera `run_id`. El guard, que recibe `session_id` en el JSON de cada hook, ve el comando `dredd-progress.py init <run_id>` y vincula esa sesión con la corrida. El guard aplica solo a la sesión vinculada; `close` cierra solo su corrida. Si falta `session_id`, el guard aplica a las corridas activas del mismo repo y lo informa, en vez de mezclar todas las sesiones. La expiración (TTL) avisa pero no retira protección de una corrida con actividad reciente. Pendiente de sonda en F1: qué `session_id` reciben los hooks de subagentes en Claude Code 2.1.278.
- B: sin vínculo, guard por repo. Más simple; dos revisiones del mismo repo se pisan.

### D12. Ubicación y migración de datos locales
- **A (recomendada)**: `DREDD_HOME` configurable; cada archivo con `schema_version`. Al detectar `~/.dredd/active.json` de la v1, la 1.1 lo ignora para decidir y lo informa una vez; no lo borra.
- B: migrar y borrar el archivo v1. Irreversible.

## Qué queda fuera de estas decisiones
- Nombres finales de flags y archivos menores: se deciden en implementación y se documentan en F6.
- Verificación en Linux y Windows: aplazada (`verificacion-solo-macos.md`).
