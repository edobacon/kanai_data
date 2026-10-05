# Plan inline: Verificacion obligatoria por ticket, obligatoria por defecto en epica

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Que la sesion de verificacion de un ticket sea OBLIGATORIA cuando el ticket la tiene: cada item pasa o queda no ejecutado con su motivo, Kanai informa por que, y en la epica la politica se vuelve obligatoria por defecto (fuera de ella sigue advisory).
**Tags:** repos: kanai-app · labels: verificacion, contrato, calidad, rearme
**Estado:** 0 de 5 fases cerradas. Juez: por fase (ver el registro de cada fase).

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F1 La politica de verificacion, su migracion y su supervivencia real al rearme | Que un ticket tenga una politica de verificacion persistida EN EL TEXTO y que el rearme la reproduzca de verdad (frontmatter + importador, ida y vuelta idempotentes), con default advisory, sin cambiar el comportamiento de ningun ticket existente. | En curso | 2026-10-05 → - | d9d485b | 4/4 | - |
| F2 El motivo estructurado y el reporte del porque | Que un item no ejecutado tenga un MOTIVO estructurado, y que Kanai pueda informarlo; y que `pending` deje de ser un estado de reposo cuando la politica es obligatoria. | Pendiente | - → - | - | 0/3 | F2.1; F2.2; F2.3; F2.4 |
| F3 El guard del cierre | Que con la politica obligatoria el cierre exija los items resueltos y pueda REPORTAR que quedo sin correr y por que. | Pendiente | - → - | - | 0/3 | F3.1; F3.2; F3.3 |
| F4 La epica: obligatoria por defecto | Que en la ejecucion de epica la verificacion sea obligatoria por defecto, en el mismo lugar donde se fuerza autonomo, y que el contrato de entrega lo diga. | Pendiente | - → - | - | 0/3 | F4.1; F4.2; F4.3 |
| F5 Verificacion de punta a punta | Verificar el conjunto de punta a punta, con un item que NO se puede correr y su motivo registrado. | Pendiente | - → - | - | 0/2 | F5.1; F5.2 |

## Riesgos

- La migracion toca el store vivo: exige backup previo y verificacion posterior
- Las politicas del ticket NO estan en el frontmatter: un db:rebuild --fresh las devuelve a su default EN SILENCIO (medido el 2026-10-05: 56 -> 0). Por eso F1 las materializa en el texto y mide el rearme antes y despues
- El round-trip del frontmatter NO es idempotente (medido el 2026-10-05: 51 tickets pierden autopilot; en los 4 proyectos nativos de Kanai la perdida es del 100%). Materializar el campo no alcanza: el importador tiene que leerlo y el mapa de autopilot tiene que aceptar los valores nativos
- Volver bloqueante el cierre cambia el comportamiento de tickets EN CURSO: la politica nace en ask, asi que nadie se ve afectado sin pedirlo
- El motivo estructurado toca el contrato de una tool que ya usaron 28 sesiones: la compatibilidad hacia atras importa (pass/fail/pending siguen valiendo con la politica en ask)

## Fuera de alcance

- Tickets sin sesion de verificacion: se omiten, como pidio el dev
- Cambiar como corre el smoke (Playwright) o su infraestructura
- Revisar el resto del contrato de sesiones mas alla de blocksClose

## Fases

### F1. La politica de verificacion, su migracion y su supervivencia real al rearme

**Meta:** Que un ticket tenga una politica de verificacion persistida EN EL TEXTO y que el rearme la reproduzca de verdad (frontmatter + importador, ida y vuelta idempotentes), con default advisory, sin cambiar el comportamiento de ningun ticket existente.
**Esfuerzo:** 6 a 9 horas
**Cómo deshacerla:** Revertir los commits y el down de la migracion; la columna nueva con default no afecta a nadie (el round-trip del frontmatter es aditivo)
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F1** (estado: En curso)
- **Fecha real:** inicio 2026-10-05 · fin -
- **Antes de empezar:**
  - [x] F1.pre1: Backup del store vivo hecho FUERA de los repos (lo pide el contrato del repo antes de tocar datos) — CUMPLIDO el 2026-10-05: /Users/edobacon/.kanai/backups/kanai_data-20261004-221204 (integrity_check ok, 606 tickets, fuera de todo git) (Respaldo del store vivo FUERA de los repos: /Users/edobacon/.kanai/backups/kanai_data-20261004-221204 (190MB). Contenido: kanai.db tomada con `sqlite3 .backup` (snapshot consistente con el WAL activo, no copia cruda), projects/, teach/, inline-cases/, epics/, events.ndjson, relations.ndjson, audit-orphan.ndjson, .kanai.local.yaml, .kanai-integrity.json. Verificado: `git rev-parse --show-toplevel` sobre el backup NO devuelve repo (esta fuera de todo git, por lo tanto no se commitea ni contamina el data repo); `pragma integrity_check` = ok; 606 tickets en la DB respaldada. El store vivo no se modificó: la medición previa de F1.pre2 corrió sobre una copia en /tmp.)
  - [x] F1.pre2: MEDICION PREVIA del rearme sobre una COPIA del store: correr `pnpm db:rebuild --fresh` contra la copia y registrar QUE SOBREVIVE — CUMPLIDO el 2026-10-05: las 56 politicas no-default volvieron a su default y 51 tickets perdieron autopilot (100% en los 4 proyectos nativos de Kanai). Detalle en la revision del KB 'Que sobrevive a un rearme de la DB: medido, no supuesto' (Medición del rearme sobre COPIA, no sobre el vivo. Copia: /tmp/kanai-rearme-XeYx4E (306MB->190MB; kanai.db por `sqlite3 .backup` = snapshot consistente del WAL, + projects/ + teach/ + events.ndjson). Verifiqué antes que la resolución apuntara a la copia: {repo:null, root:/tmp/kanai-rearme-XeYx4E, dbPath:/tmp/kanai-rearme-XeYx4E/kanai.db}. Comando: `KANAI_DATA_ROOT=<copia> KANAI_DATA_REPO= pnpm db:rebuild --fresh` -> 'rebuild OK', 606 tickets antes y 606 después, 606 ids en ambos, cuarentena 0. RESULTADO: (1) POLÍTICAS: 56 tickets con teach/draft/review no-default antes -> 0 después; las 56 volvieron a ask/ask/auto EN SILENCIO (testigos: KT-002 skip->ask; JOR-166 skip/skip->ask/ask; TICKET-152 skip/skip/skip->ask/ask/auto; TAO-008 skip->ask). (2) AUTOPILOT: 51 tickets cambian (48 autonomous->manual, 3 per_session->manual). Desglose por origen: en los 4 proyectos NATIVOS de Kanai sin carpeta DKC (taomangalam, kn_bench, kanai_self, kanai_test) se pierde el 100% (40/40: taomangalam 37/37, kn_bench 2/2, kanai_self 1/1); en los proyectos con carpeta en /Users/edobacon/Workspace/deckard/projects se recupera mayormente porque el --fresh los RE-MIGRA desde DKC (jormat 113/116, up1 75/79, horadric 39/39, pehuen 22/23), o sea NO por el texto de Kanai. (3) CAUSA RAÍZ DOBLE: server/engine/render.ts:41 escribe en el frontmatter solo `autopilot` (teach/draft/review nunca llegan al texto), y server/migrate-up1/parse.ts:514 hace `autopilot: AUTOPILOT_MAP[String(fm.autopilot)] ?? 'manual'` con un mapa que solo entiende las claves de DKC (super/strict/true/manual), así que un `autonomous` o `per_session` nativo cae a `manual`. La sospecha del análisis previo queda confirmada y AMPLIADA: no alcanza con materializar la política nueva en el frontmatter; el importador tiene que leerla y el round-trip de autopilot tiene que dejar de degradar los valores nativos.)
- **Commits:**
  - `d9d485b` · feat(ticket): las politicas del ticket sobreviven al rearme (F1) · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F1.1** → Columna verification_policy (text, not null, default 'ask') en tickets, con su migracion de drizzle generada y revisada.. Dónde: server/db/schema.ts (tickets.verificationPolicy + VERIFICATION_POLICIES/TEACH/DRAFT/REVIEW + ticketInsertSchema) y server/db/migrations/0054_broken_harpoon.sql. Cómo se comprobó: Migracion revisada antes de usarla (ALTER TABLE `tickets` ADD `verification_policy` text DEFAULT 'ask' NOT NULL, registrada en el journal como idx 54). Aplicada sobre el store vivo y verificada: 55 filas en __drizzle_migrations, el hash registrado (62f2c1fd...) es identico al sha256 del archivo, `pragma_table_info('tickets')` incluye verification_policy, los 606 tickets quedaron en 'ask' (0 con otro valor) y `pragma quick_check` = ok. La aplico el propio runtime al abrir el store (bootDatabase corre al arrancar el MCP y en el plugin de dev), no un comando dedicado: es aditivo y el backup previo ya existia.
  - **F1.2** → setTicketConfig acepta y valida verificationPolicy (ask|required) y set_ticket_config la recibe y la muestra en el resumen; la descripcion de la tool explica los dos valores.. Dónde: server/repo/tickets.ts:154 (setTicketConfig) y server/mcp/tools.ts:951 (tool set_ticket_config). Cómo se comprobó: tests/unit/ticket-config.test.ts: persiste required, acepta volver a ask, devuelve el valor en la config resultante y rechaza 'obligatoria' con el motivo en el error. typecheck (nuxt) sin errores.
  - **F1.3** → Tests de la config del ticket: persistencia, default advisory en un ticket existente, rechazo de un valor invalido, patch vacio, materializacion en el texto y round-trip idempotente (incluye autopilot nativo y frontmatter corrupto).. Dónde: tests/unit/ticket-config.test.ts (archivo nuevo). Cómo se comprobó: `pnpm vitest run tests/unit/ticket-config.test.ts` -> 12 passed (12). Suite completa despues: 354 archivos / 2776 tests, 0 fallos.
  - **F1.4** → El frontmatter del ticket lleva las CUATRO politicas como estado (verification_policy, teach_policy, draft_policy, review_policy) y el .md se re-renderiza al setear la config, por las dos vias (tool y endpoint web).. Dónde: server/engine/render.ts:41 (ticketToMarkdown), server/repo/tickets.ts (re-render con logTicket) y server/api/tickets/[id]/config.post.ts. Cómo se comprobó: El test escribe la config y LEE el archivo del store: projects/p1/tickets/t1.md contiene `verification_policy: required` mas teach_policy/draft_policy/review_policy. Ademas se cerro el mismo agujero en la otra via de escritura (el endpoint web de config, que actualizaba la DB sin tocar el texto).
  - **F1.5** → El importador LEE las cuatro politicas del frontmatter (default ante ausencia o valor invalido) y el mapa de autopilot deja de degradar los valores nativos: la ida y la vuelta son idempotentes.. Dónde: server/migrate-up1/parse.ts (normAutopilot + normPolicy + TicketInsert + toTicketInsert). Cómo se comprobó: Tests del round-trip: `autonomous` y `per_session` nativos se conservan (antes caian a manual), las cuatro politicas vuelven del frontmatter, un frontmatter sin ellas cae al default y un valor corrupto ('si') NO entra crudo. Las claves de DKC (super/strict/true) siguen mapeando. Suite completa: 2776 tests en verde.
  - **F1.6** → Re-medicion del rearme: un ticket con la config fijada por el mecanismo nuevo conserva su politica Y su autopilot tras un --fresh, incluso en un proyecto NATIVO.. Dónde: /tmp/kanai-rearme2-A4Ea6v (copia) + proyecto kanai_test, testigo KT-002. Cómo se comprobó: Rearme --fresh sobre una copia NUEVA (/tmp/kanai-rearme2-A4Ea6v) con el codigo arreglado, en un proyecto NATIVO (kanai_test, sin DKC detras, donde antes la perdida era del 100%). Testigo KT-002: antes de tocar nada su DB decia teach=skip pero su .md solo tenia `autopilot: manual` (sin ninguna politica). Fije la config con el mecanismo nuevo (setTicketConfig sobre la copia) y el .md quedo con las cinco lineas; tras el --fresh el ticket conservo LOS CINCO valores: teach=skip, draft=skip, review=skip, verification=required, autopilot=autonomous. Antes del arreglo este mismo rearme devolvia todo al default. Medicion global del rearme: los autopilot degradados bajaron de 51 a 5; en los proyectos nativos kanai_self 1/1, kanai_test 2/2, kn_bench 2/2, taomangalam 33/37 (antes 0). PENDIENTE MEDIDO: 0 de las 56 politicas no-default sobrevivieron porque los 606 .md del store vivo todavia NO llevan las politicas (nadie los re-renderizo); el mecanismo esta bien y lo que falta es materializar el estado existente (ver el finding de drift y la pregunta al dev).
- **Criterios cumplidos:**
  - **F1.c1** `pnpm typecheck` termina con codigo 0. → Corrido por el dev en /Users/edobacon/Workspace/kanai/kanai-app el 2026-10-05 22:24. Salida: 'Type check passed in 34329ms' (nuxt typecheck). · ejecutó: dev, `pnpm typecheck`, salida 0, Type check passed in 34329ms · 0 errores
  - **F1.c2** Los tests de la config del ticket pasan en verde, incluida la politica nueva (crea tests/unit/ticket-config.test.ts). → Corrido por el dev en /Users/edobacon/Workspace/kanai/kanai-app el 2026-10-05 22:25. Salida: 'Test Files 1 passed (1) · Tests 12 passed (12)', incluidos los 5 casos de round-trip y los 2 del mapeo de autopilot. · ejecutó: dev, `pnpm vitest run tests/unit/ticket-config.test.ts`, salida 0, Test Files 1 passed (1) · Tests 12 passed (12) · 0 failing
  - **F1.c3** Evidencia: la migracion aplicada sobre el store vivo, con su verificación posterior. → Store vivo: 55 filas en __drizzle_migrations y el hash registrado (62f2c1fd6d6bfcc8fdb8e6b906b9510df3bcb0dec90cc8ea98ec3ee9b1ccf737) es IDENTICO al sha256 de server/db/migrations/0054_broken_harpoon.sql; `pragma_table_info('tickets')` incluye verification_policy; los 606 tickets quedaron con el default 'ask' (0 con otro valor); `pragma quick_check` = ok. Respaldo previo en /Users/edobacon/.kanai/backups/kanai_data-20261004-221204. La migracion la aplico el propio runtime al abrir el store (bootDatabase corre al arrancar el MCP y en el plugin de dev), no un comando dedicado.
  - **F1.c4** Evidencia: el rearme medido sobre una COPIA antes y despues, en un proyecto NATIVO de Kanai, con el ticket conservando su politica Y su autopilot. → Rearme --fresh sobre una copia del store real (con el backfill aplicado), en proyecto NATIVO (kanai_test) y comparacion 606 vs 606: POLITICAS no-default 56 -> 56 intactas (antes del arreglo: 0 de 56; con el arreglo pero sin backfill: 0 de 56); AUTOPILOT degradados 51 -> 5 -> 0; nativos taomangalam 37/37, kn_bench 2/2, kanai_self 1/1, kanai_test 2/2 (antes 0). El testigo KT-002 conservo sus cinco valores (teach=skip, draft=ask, review=auto, verification=ask, autopilot=manual) tras el rearme. Copias usadas: /tmp/kanai-rearme2-A4Ea6v (sin backfill) y /tmp/kanai-rearme3-ihISIL (con backfill).
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Backfill acotado de los .md del store vivo (56 tickets: los 56 con politica no-default, 4 de ellos ademas con el autopilot desalineado), no previsto como tarea.. Por qué: Sin el, las 56 politicas no-default seguian sin estar en el texto y un rearme las devolvia a su default.. Cambia la decisión: Se agrego un paso NO planificado al cierre de F1: un backfill acotado que re-renderiza los .md de los 56 tickets afectados en el store vivo. Se ejecuto con verificacion real por archivo (56 reescritos, 0 fallos) y se re-midio con un rearme sobre copia. Nace de la medicion: el arreglo materializa el estado al CAMBIAR la config y al crear el ticket, pero no reescribe el pasado, asi que sin el backfill el texto seguia sin contener las 56 politicas no-default. El dev lo autorizo explicitamente (backfill acotado a los afectados).
  - Enmienda: F1 incorpora el riesgo de REARME de la DB, que el dev pidio verificar antes del backup: (a) prerequisito nuevo F1.pre2 con la medicion del rearme sobre una copia, previa al backup; (b) tarea F1.4 que materializa la politica en el TEXTO del ticket como ESTADO (frontmatter, al lado de autopilot), porque al 2026-10-05 teach/draft/review solo existen en la DB y en la auditoria y un db:rebuild --fresh los devolveria a su default en silencio; (c) tarea F1.5 que repite la medicion DESPUES de implementar; (d) criterio F1.c4 con la evidencia de las dos mediciones.. Motivo: El dev pidio verificar, antes del backup, que lo implementado no se pierda cuando se rearme la DB. La medicion mostro que las politicas del ticket no estan en el frontmatter, asi que F1 tiene que materializarlas en el texto y medir el rearme antes y despues.
  - Enmienda: Ampliar F1 para cerrar el round-trip COMPLETO del estado del ticket, segun la medicion del 2026-10-05: (a) materializar en el frontmatter la politica nueva Y las tres existentes, (b) re-renderizar el .md al setear la config (setTicketConfig no lo hace), (c) que el importador las lea, (d) corregir el mapa de autopilot para que la ida y la vuelta sean idempotentes, y (e) re-medir en un proyecto NATIVO. F1 queda con 6 tareas: F1.4 materializa y re-renderiza, la nueva F1.5 hace la vuelta (importador + mapa) y la re-medicion pasa a F1.6. Los criterios se ajustan en el mismo sentido.. Motivo: La medicion de F1.pre2 del 2026-10-05 mostro que escribir el campo NO alcanza: 51 tickets pierden autopilot (100% en los 4 proyectos nativos de Kanai) y las 56 politicas no-default vuelven a su default en silencio. Sin la vuelta (importador que lea + mapa de autopilot sin degradar valores nativos), la politica nueva heredaria el mismo agujero y F1 no cumpliria su goal.
- **Hallazgos:**
  - preexistente · server/engine/render.ts:41 (ida) + server/migrate-up1/parse.ts:514 (vuelta): El round-trip frontmatter->DB del ticket NO es idempotente fuera de `manual`: render.ts escribe los valores nativos de autopilot (per_session/autonomous) pero parse.ts los traduce con AUTOPILOT_MAP, que solo tiene las claves de DKC (super/strict/true/manual), y cae a `?? 'manual'`. Medido en el rearme sobre copia: 48 tickets autonomous->manual y 3 per_session->manual; en los proyectos nativos de Kanai la pérdida es del 100% (40/40). Además setTicketConfig (server/repo/tickets.ts:154) NO re-renderiza el .md (no llama logTicket, a diferencia de setTicketExternal), así que el frontmatter puede quedar desactualizado respecto de la DB aunque el campo exista. Consecuencia para F1.4: escribir `verification_policy` en el frontmatter es necesario pero NO suficiente; hay que (a) re-renderizar el .md al setear la config, (b) que toTicketInsert lea la política nueva y (c) corregir el mapa de autopilot para que la ida y la vuelta coincidan.
  - preexistente · store vivo: projects/<p>/tickets/*.md (606 archivos) vs tabla tickets: DRIFT texto<->DB: los 606 tickets del store tienen .md pero NINGUNO declara las politicas en el frontmatter (606/606 sin teach/draft/review) y 4 tienen el autopilot desalineado (TAO-184, TAO-185, TAO-187, TAO-188: DB autonomous, .md manual). Consecuencia medida: aunque el mecanismo de ida y vuelta ya este arreglado, un proximo db:rebuild --fresh devolveria las 56 politicas no-default a su default, porque el texto no contiene ese estado. El arreglo hace que el estado se materialice al CAMBIARLO y al CREAR el ticket, pero no reescribe el pasado. Cerrarlo requiere un backfill: re-renderizar los .md desde la DB (que es la fuente de verdad), con la tool existente materialize_tickets force:true o con un script acotado a los tickets con valores no-default.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - 2026-10-05 · aprobable_con_reservas: RESERVA PRINCIPAL (de entrega, no de codigo): los 56 .md re-renderizados por el backfill estan SIN COMMITEAR en el git del data repo (56 archivos ' M'), asi que un checkout limpio o un clone los pierde y un db:rebuild --fresh vuelve a devolver esas 56 politicas a su default; el commit solo trae el codigo y no hay re-render automatico en boot. NITS: (1) render.ts emite las politicas incondicionalmente, asi que una fila parcial produce 'verification_policy: undefined' (mismo patron de degradacion silenciosa que la fase vino a eliminar); (2) la descripcion de la tool promete que 'required' resuelve los items antes de cerrar, pero ningun consumidor lee la politica: es un no-op hasta que lleguen F2/F3/F4; (3) se cita DET-40 como el contrato de la sesion de verificacion, pero el catalogo define DET-40 = 'Auditoria de reemplazo' y la verificacion es DET-36; (4) el '5' intermedio de autopilot degradados no cierra: en la copia sin backfill hay 4 (TAO-184/185/187/188) mas la diferencia de KT-002 que esa copia tenia fijado como testigo; (5) el test de la vuelta ejercita solo el parser, no el camino real de importacion (schema + insert). El juez verifico en el store vivo la migracion 0054 (hash identico, columna, 606 en 'ask') y en las copias de /tmp el rearme con y sin backfill. Los criterios c1/c2 los tomo como declarados (no ejecuto verificaciones). Veredicto: aprobable_con_reservas (NO aprobatorio) -> hay que corregir y re-juzgar.
- **Cierre y siguiente paso:** Sin cerrar.

### F2. El motivo estructurado y el reporte del porque

**Meta:** Que un item no ejecutado tenga un MOTIVO estructurado, y que Kanai pueda informarlo; y que `pending` deje de ser un estado de reposo cuando la politica es obligatoria.
**Esfuerzo:** 3 a 5 horas
**Cómo deshacerla:** Revertir el commit: la tool vuelve a aceptar solo pass/fail/pending y el motivo deja de registrarse
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F2** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F2.pre1: F1 cerrada (la politica existe, se persiste y sobrevive al rearme)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** pendiente: Extender `report_verification` con el estado de no-ejecucion y su causa
  - **F2.2** pendiente: `pending` deja de ser estado de reposo cuando la politica es obligatoria
  - **F2.3** pendiente: Superficie que INFORMA el porque de lo no ejecutado
  - **F2.4** pendiente: Tests del motivo en los dos sentidos
- **Criterios cumplidos:**
  - **F2.c1** pendiente (command): `pnpm typecheck` termina con codigo 0.
  - **F2.c2** pendiente (command): Los tests del reporte de verificacion pasan, incluido `not_run` con causa.
  - **F2.c3** pendiente (evidence): Evidencia: Kanai puede informar el porque de un item no ejecutado (causa y nota), leido desde el store.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F3. El guard del cierre

**Meta:** Que con la politica obligatoria el cierre exija los items resueltos y pueda REPORTAR que quedo sin correr y por que.
**Esfuerzo:** 3 a 5 horas
**Cómo deshacerla:** Revertir el commit: el cierre vuelve a no exigir la verificacion
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F3** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F3.pre1: F2 cerrada (el motivo estructurado existe)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** pendiente: El guard del cierre exige los items resueltos cuando la politica es obligatoria
  - **F3.2** pendiente: La politica puede volver bloqueante el gate de la sesion de verificacion
  - **F3.3** pendiente: El cierre reporta que quedo sin correr, con su motivo, y el escape del dev queda auditado
- **Criterios cumplidos:**
  - **F3.c1** pendiente (command): `pnpm typecheck` termina con codigo 0.
  - **F3.c2** pendiente (command): Los tests del guard del cierre pasan en los dos sentidos (con la politica exige, sin ella no).
  - **F3.c3** pendiente (evidence): Evidencia: el cierre se traba con un item sin resolver y se destraba reconociendo el motivo.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F4. La epica: obligatoria por defecto

**Meta:** Que en la ejecucion de epica la verificacion sea obligatoria por defecto, en el mismo lugar donde se fuerza autonomo, y que el contrato de entrega lo diga.
**Esfuerzo:** 2 a 3 horas
**Cómo deshacerla:** Revertir el commit: la epica vuelve a dejar la verificacion como advisory
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F4** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F4.pre1: F3 cerrada (el guard honra la politica)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.1** pendiente: `verification: 'required'` en la politica de epica
  - **F4.2** pendiente: El contrato de entrega de la epica nombra la verificacion
  - **F4.3** pendiente: El cierre del conjunto lo hereda
- **Criterios cumplidos:**
  - **F4.c1** pendiente (command): `pnpm typecheck` termina con codigo 0.
  - **F4.c2** pendiente (command): Los tests de la politica de epica pasan y afirman la verificacion obligatoria por defecto.
  - **F4.c3** pendiente (evidence): Evidencia: en una corrida de epica la politica sale obligatoria y el contrato de entrega la nombra.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F5. Verificacion de punta a punta

**Meta:** Verificar el conjunto de punta a punta, con un item que NO se puede correr y su motivo registrado.
**Esfuerzo:** 1 a 2 horas
**Cómo deshacerla:** No aplica: es una verificacion, no cambia codigo

**Registro F5** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F5.pre1: F4 cerrada
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F5.1** pendiente: Corrida real con un item no ejecutable y su motivo
  - **F5.2** pendiente: Comprobar que el cierre informa el motivo y que el escape auditado funciona
- **Criterios cumplidos:**
  - **F5.c1** pendiente (evidence): Evidencia: un ticket con la politica obligatoria, un item que no se pudo correr con su motivo, y el cierre informandolo.
  - **F5.c2** pendiente (evidence): Evidencia: el ticket cierra con el reconocimiento auditado y no queda ningun item sin causa.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
