# Arbiter ronda 1 sobre feat/medir-ejecucion-real

Fecha: 2026-10-06 (UTC). Base e2250a5 (setup), head 12c18ca (8 commits: 4 chore vacios, 3 fix y 1 docs; el brief decia 5 chore por error). 22 archivos y 668 lineas en un solo lote, juez opus de contexto limpio que leyo los 22 archivos completos, y re-verify sonnet sobre f1, f2 y f4. Corrida guardada en el historial de arbiter: plan kanai-medir-ejecucion-real, run kanai-medir-ejecucion-real-r1 (ledger en el data repo de Kanai, arbiter/plans/kanai-medir-ejecucion-real/).

## Veredicto: iterar

Maxima severidad S1. Conteos: S1 1, S2 2, S3 6, consulta 4.

| # | Sev. | Hallazgo | Dónde | Re-verify |
|---|---|---|---|---|
| f1 | S1 | reviewComplete queda en false para siempre si el ticket incluye un binario (png, fuente, pdf): git lo muestra como "Binary files differ", el N3 lo cuenta como contenido no leido y decideGate pasa approve a iterate sin salida del ejecutor. Un archivo nuevo grande y commiteado entra completo, el caso real es el binario o un archivo grande sin commitear. Es nuevo en este diff: en setup reviewComplete no existia. | server/dispatch/gateLevels.ts:312 | Sostenido; el reverificador propone S2, se mantiene S1 por la regla de sostenido. No hay salida por accept_gate_finding: el N3 corre sin sessionId. |
| f3 | S2 | En el rerun el juez no recibe la lista de archivos reutilizados y su contexto sigue diciendo "rama completa del ticket"; evalua todos los REQs contra codigo parcial. | server/dispatch/gateContext.ts:197 | No re-verificado (probable) |
| f6 | S2 | Un comentario promete "Fail-open" y ticketBranchRanges ahora propaga errores. | server/repo/preGate.ts:129 | Confirmado |
| f2 | consulta | El contexto de consumidores entra al codigo del juez sin hunks y el chequeo de evidencia no lo indexa; toda cita a un consumidor queda invalida. Solo con foto previa del N3. | server/dispatch/integralReview.ts:39 | Baja a consulta; NO explica la observacion de KT-018 ronda 1 (alli no habia foto previa y las citas eran a archivos nuevos del ticket). |
| f4 | consulta | La frontera toma el commit propio mas antiguo identificado; un commit propio previo sin hash ni marcador quedaria fuera. commitSessionWork registra hash y marcador a la vez, las brechas son sessionNumber nulo y los commits de refinamiento sin repo. | server/repo/ticketReviewBase.ts:16 | Baja a consulta |
| f5, f10 | consulta | Una rama acumuladora sin commits propios hace fallar ticketBranchRanges; la reutilizacion no invalida si cambia la base del diff. | ticketReviewBase.ts:25, integralReview.ts:13 | Sin re-verificar |
| f7 a f9, f11 a f13 | S3 | Marcador no anclado al inicio del subject, git log sin limite de rango, la foto del N3 exige package.json, impactRoots huerfano, hashes de Codex en el worklog, TICKET_DIFF_BUDGET sin uso. | varios | n/a |

## Lo que confirmo el juez como correcto

Primer commit propio incluido en el diff, rama sin commits propios y base no ancestro caen a la base configurada, dependencias integradas antes por merge o squash quedan fuera por first-parent, lo sin commitear siempre entra, la reutilizacion reabre cambiados, consumidores y archivos con hallazgos abiertos, y el presupuesto nunca corta un archivo.

## Efecto sobre las metas del caso

- N3 en 2 rondas o menos: en riesgo para tickets con binarios (f1) y reruns (f3), aunque las corridas de KT lo cumplieron.
- Menos de 1M de tokens por gate: el juez nota que el objetivo del diff del N3 subio de 80k a 400k caracteres por juez y que el contexto de consumidores no tiene tope; sin enforcement, solo aviso.
- La observacion de las citas fuera del diff de KT-018 sigue SIN explicar: el mecanismo de f2 no aplica a una primera ronda del N3.

## Decision pendiente del dev

F4-C2 exige arbiter aprobado o aprobable con nits y hallazgos graves corregidos; con S1 y S2 abiertos no se cumple. Opciones en el chat: corregirlos en una fase nueva, o aceptarlos como residuales y cerrar con reservas.
