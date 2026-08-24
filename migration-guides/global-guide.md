# Guía global de migración DKC → Kanai
 
> Plan operativo para convertir los artefactos históricos de DKC de `up1`, `kanai_self`, `kanai_test` y `kn_bench` al formato tipado de Kanai. Esta guía es fuente de procedimiento; no ejecuta limpieza ni borrado.

> **Alcance corregido:** esta guía documenta el snapshot ya presente en Kanai. La fuente DKC completa y sus 523 tickets canónicos están inventariados en [dkc-source-inventory-2026-08-24.md](dkc-source-inventory-2026-08-24.md), con una matriz por proyecto `dkc-*-tickets.md`. Para migraciones nuevas, la guía DKC es la fuente de verdad.
 
## 1. Snapshot y alcance
 
- Proyectos: `up1` (138 tickets, 439 archivos KB), `kanai_test` (5), `kn_bench` (2) y `kanai_self` (1). Total: 146 tickets.
- Store actual: 56 specs, 468 learns, 1.712 test cases, 7 sessions, 499 records y 2 decisions; las cifras se deben volver a calcular durante la migración final.
- `up1` contiene 439 fuentes KB, incluyendo Markdown, HTML, PDF, imágenes, ZIP y archivos auxiliares. Se preservan como fuentes y assets; no se convierten todos automáticamente a records.
- La DB y los artefactos de origen están en `kanai_data`; el core solo contiene lógica, validadores, migradores y tests.
 
## 2. Formato canónico de destino
 
| Origen DKC | Destino Kanai | Regla |
| --- | --- | --- |
| `projects/{project}/config.yaml` / `project.yaml` | `projects` + `project_repos` | conservar ID; separar `origin` de `localPath`; no persistir rutas absolutas en artefactos |
| ticket Markdown + frontmatter | `tickets` | ID interno estable, `external`, `status`, `work_type`, `tier`, story points, body intacto |
| spec | `specs` + `reqs` + `drafts` | link nullable si el spec es huérfano; no inventar ticket |
| sessions/tasks inline o registradas | `sessions` + `tasks` | mantener numeración, gate y contract; resolver `session_id` antes de tasks |
| learn/discovery | `learns` | conservar orden cronológico, status y referencia; nunca reordenar ni borrar |
| test case | `test_cases` | exigir `discovery_ref` o REQ; conservar actual/evidence/status/session cuando exista |
| rule/bug/decision/transcript/doc | `records` | `type`, módulo, título, cuerpo, tags, source_ref; validar enums |
| teaching `.html` | `teachings` + archivo | conservar formato y path; validar `intake`/ `close` |
| KB Markdown | `projects/{project}/kb/` + referencia indexable | conservar path y hash; promover a record solo si tiene tipo/metadata suficiente |
| screenshots/PDF/ZIP/otros binarios | `assets` + archivo | no parsear destructivamente; registrar MIME, hash y origen |
 
## 3. Secuencia por ticket
 
1. **M1 — Captura**: congelar el archivo original, calcular SHA-256, asignar `source_ref` y registrar el snapshot.
2. **M2 — Parseo**: separar frontmatter y body; normalizar fechas, enums y paths sin cambiar el texto del request.
3. **M3 — Relaciones**: resolver proyecto, external, spec, sessions, learns, tests, records, assets y teachings. Las referencias ambiguas van a cuarentena.
4. **M4 — Validación**: validar Zod/TypeScript, constraints SQLite, foreign keys, unicidad y round-trip Markdown/render.
5. **M5 — Smoke**: cargar el ticket desde API/UI, consultar sus relaciones, verificar artefactos y comparar hashes/conteos.
6. **M6 — Registro**: escribir resultado `migrated|quarantined|skipped` con evidencia, causa y operador. No marcar `complete` si hay casos obligatorios en cuarentena.
 
## 4. Casos borde obligatorios
 
- Ticket sin `external`: conservar `TICKET-*`; no usar un external inventado. Registrar alias y posible colisión.
- External repetido en varios tickets: la identidad primaria sigue siendo `project_id + id`; external solo es índice auxiliar.
- Spec de módulo sin ticket: permitir `ticket_id = null`, conservar el spec y registrar relación diferida.
- Frontmatter ausente, YAML inválido o enum desconocido: preservar archivo, usar cuarentena y no aplicar defaults silenciosos.
- Ticket abierto, `in_progress` o `blocked`: migrar estado literal; no ejecutar cierre ni generar teaching-close artificial.
- Learn raw al cierre: conservarlo como raw; el cierre posterior debe aplicar la regla de refinamiento, no migrarla como rule automáticamente.
- Test sin REQ/discovery: conservarlo, marcar gap de trazabilidad y bloquear la aceptación de ese ticket si el plan lo exige.
- Sessions/tasks inline: parsear antes de validar tasks; nunca crear tasks huérfanas.
- Archivos duplicados o con el mismo nombre: usar path + hash; no sobrescribir.
- Rutas absolutas, symlinks y paths fuera del proyecto: registrar como referencia no portable y requerir mapping local.
- PDF, imagen, SVG, ZIP y otros binarios: copiar byte a byte, calcular hash y no convertirlos a Markdown.
- `.DS_Store`, logs y temporales: clasificar como auxiliares; excluir solo si la política de retención lo permite y registrar la exclusión.
- Unicode, acentos y nombres con espacios: conservar bytes/UTF-8 y probar lectura/render.
- Up1 con gran volumen: procesar por lotes/paginación, checkpoint por proyecto y reanudación idempotente.
 
## 5. Smoke tests de datos
 
### Smoke estructural
 
- Conteo de proyectos/tickets/specs/learns/tests/sessions/tasks/records antes y después.
- `PRAGMA foreign_keys=ON` y consulta de huérfanos para cada FK.
- Unicidad de `(project_id,id)` y detección de external duplicados informativos.
- Cada archivo migrado tiene `source_ref`, hash y destino; ningún destino se sobrescribe silenciosamente.
 
### Smoke por ticket
 
- Leer ticket por ID y por external; confirmar body, estado y work type.
- Cargar specs, learns, test cases, sessions/tasks, teachings y records vinculados.
- Renderizar Markdown/HTML y confirmar que no aparece texto raw donde la vista requiere formato.
- Verificar assets binarios por tamaño/MIME/hash.
 
### Smoke de aislamiento
 
- Repetir con el mismo external en proyectos distintos: no mezclar contexto.
- Confirmar que limpiar/reimportar `up1` no cambia `kanai_test`, `kn_bench` ni `kanai_self`.
- Confirmar que ningún `project_repos.origin` se modifica.
 
## 6. Plan de limpieza y recarga de up1 — fase posterior
 
1. Congelar escritura y crear backup verificable de DB, `projects/up1/kb`, teach y assets.
2. Ejecutar smoke baseline y guardar manifiesto.
3. Eliminar únicamente filas/archivos cuyo `project_id` o path pertenezca a `up1`; nunca usar un borrado global.
4. Importar de nuevo usando esta guía, por lotes y con cuarentena.
5. Ejecutar smoke estructural, por ticket y de aislamiento.
6. Comparar manifiestos y pedir aprobación antes de retirar la cuarentena o borrar backups.
 
**No ejecutar esta fase todavía.** Primero debe existir el migrador completo, el reporte de cuarentena y una corrida dry-run reproducible.
 
## 7. Entregables y evidencia
 
- Esta guía global.
- Una matriz completa por ticket en `migration-guides/{project}-tickets.md`.
- Manifiesto de hashes de origen/destino.
- Reporte de cuarentena con motivo y estrategia de resolución.
- Reporte de smoke con conteos, huérfanos, aislamiento y resultado por proyecto.
- Commit separado para código/migrador, tests, documentación y ejecución de datos.
 
