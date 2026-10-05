# F0: decisiones aprobadas

Fecha: 2026-10-05. Responsable: el dev (solicitante del caso). Registro: aprobación en el chat ("ok, apruebo, ejecuta todas las fases").

Se aprueba la opción A (recomendada) de las 12 decisiones de `f0-propuesta-decisiones.md`, con el motivo escrito en cada una:

| # | Decisión aprobada |
|---|---|
| D1 | Jurado K2 por riesgo en alcance acotado; K3 solo explícito; amplio por módulos declarado; trivial un revisor. |
| D2 | Sin presupuesto monetario; control por workers y timeout blando; tokens/costo solo de fuente real, si no null. |
| D3 | Jira obligatorio en revisión de PR; opcional en pre-envío y local; sin AC, "verificación no ejecutada". |
| D4 | Veredictos v1 (rechazado, iterar, aprobable con reservas, aprobable con nits, aprobable) con la tabla y la excepción de pisos informativos; incertidumbre como consulta. |
| D5 | Máximo 4 workers configurable; Haiku triage, Sonnet revisión, Opus verificación/trazado; modelo pedido y usado registrados; timeout blando 60 min. |
| D6 | Métricas opt-out (DREDD_METRICS=off), locales, sin borrado automático, prune manual; reporte anonimizado por defecto, --include-links explícito. |
| D7 | Python mínimo 3.9, solo stdlib; tests con 3.9 y 3.14. |
| D8 | git mínimo 2.38 con merge-tree --write-tree; fallback worktree temporal propio. |
| D9 | bb.py (urllib) reemplaza a bb.sh; paginación completa, errores como salida distinta de 0, timeout, reintento 429; guard permite egress solo vía bb.py. |
| D10 | Directorio por corrida en DREDD_HOME; parent único escritor; escritura atómica con os.replace; lock O_CREAT|O_EXCL con recuperación. |
| D11 | Vínculo de sesión por el comando init visto por el guard; guard solo para la sesión vinculada; sin session_id, corridas activas del mismo repo; TTL no retira protección con actividad reciente. Sonda en F1 sobre session_id de subagentes. |
| D12 | DREDD_HOME configurable, schema_version; active.json v1 ignorado y avisado una vez, sin borrar. |

Autorización de implementación: vigente desde esta aprobación, para todas las fases, en el modo autónomo registrado en el intake.
