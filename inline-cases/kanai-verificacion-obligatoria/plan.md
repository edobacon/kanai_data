# Plan inline: Verificacion obligatoria por ticket, obligatoria por defecto en epica

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Que la sesion de verificacion de un ticket sea OBLIGATORIA cuando el ticket la tiene: cada item pasa o queda no ejecutado con su motivo, Kanai informa por que, y en la epica la politica se vuelve obligatoria por defecto (fuera de ella sigue advisory).
**Tags:** repos: kanai-app · labels: verificacion, contrato, calidad, rearme
**Estado:** 0 de 5 fases cerradas. Juez: por fase (ver el registro de cada fase).

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F1 La politica de verificacion, su migracion y su supervivencia al rearme | Que un ticket tenga una politica de verificacion persistida EN EL TEXTO (para que sobreviva a un rearme de la DB), con default advisory, sin cambiar el comportamiento de ningun ticket existente. | Pendiente | - → - | - | 0/4 | F1.1; F1.2; F1.3; F1.4; F1.5 |
| F2 El motivo estructurado y el reporte del porque | Que un item no ejecutado tenga un MOTIVO estructurado, y que Kanai pueda informarlo; y que `pending` deje de ser un estado de reposo cuando la politica es obligatoria. | Pendiente | - → - | - | 0/3 | F2.1; F2.2; F2.3; F2.4 |
| F3 El guard del cierre | Que con la politica obligatoria el cierre exija los items resueltos y pueda REPORTAR que quedo sin correr y por que. | Pendiente | - → - | - | 0/3 | F3.1; F3.2; F3.3 |
| F4 La epica: obligatoria por defecto | Que en la ejecucion de epica la verificacion sea obligatoria por defecto, en el mismo lugar donde se fuerza autonomo, y que el contrato de entrega lo diga. | Pendiente | - → - | - | 0/3 | F4.1; F4.2; F4.3 |
| F5 Verificacion de punta a punta | Verificar el conjunto de punta a punta, con un item que NO se puede correr y su motivo registrado. | Pendiente | - → - | - | 0/2 | F5.1; F5.2 |

## Riesgos

- La migracion toca el store vivo: exige backup previo y verificacion posterior
- Las politicas del ticket NO estan en el frontmatter: un db:rebuild --fresh las devuelve a su default EN SILENCIO. Por eso F1 las materializa en el texto y mide el rearme antes y despues
- Volver bloqueante el cierre cambia el comportamiento de tickets EN CURSO: la politica nace en ask, asi que nadie se ve afectado sin pedirlo
- El motivo estructurado toca el contrato de una tool que ya usaron 28 sesiones: la compatibilidad hacia atras importa (pass/fail/pending siguen valiendo con la politica en ask)

## Fuera de alcance

- Tickets sin sesion de verificacion: se omiten, como pidio el dev
- Cambiar como corre el smoke (Playwright) o su infraestructura
- Revisar el resto del contrato de sesiones mas alla de blocksClose

## Fases

### F1. La politica de verificacion, su migracion y su supervivencia al rearme

**Meta:** Que un ticket tenga una politica de verificacion persistida EN EL TEXTO (para que sobreviva a un rearme de la DB), con default advisory, sin cambiar el comportamiento de ningun ticket existente.
**Esfuerzo:** 4 a 6 horas
**Cómo deshacerla:** Revertir el commit y el down de la migracion; la columna nueva con default no afecta a nadie
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F1** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F1.pre1: Backup del store vivo hecho FUERA de los repos (lo pide el contrato del repo antes de tocar datos)
  - [x] F1.pre2: MEDICION PREVIA del rearme sobre una COPIA del store: correr `pnpm db:rebuild --fresh` contra la copia y registrar QUE SOBREVIVE, en particular si teachPolicy/draftPolicy/reviewPolicy vuelven a su default. Va ANTES del backup: convierte la sospecha en dato (Medición del rearme sobre COPIA, no sobre el vivo. Copia: /tmp/kanai-rearme-XeYx4E (306MB->190MB; kanai.db por `sqlite3 .backup` = snapshot consistente del WAL, + projects/ + teach/ + events.ndjson). Verifiqué antes que la resolución apuntara a la copia: {repo:null, root:/tmp/kanai-rearme-XeYx4E, dbPath:/tmp/kanai-rearme-XeYx4E/kanai.db}. Comando: `KANAI_DATA_ROOT=<copia> KANAI_DATA_REPO= pnpm db:rebuild --fresh` -> 'rebuild OK', 606 tickets antes y 606 después, 606 ids en ambos, cuarentena 0. RESULTADO: (1) POLÍTICAS: 56 tickets con teach/draft/review no-default antes -> 0 después; las 56 volvieron a ask/ask/auto EN SILENCIO (testigos: KT-002 skip->ask; JOR-166 skip/skip->ask/ask; TICKET-152 skip/skip/skip->ask/ask/auto; TAO-008 skip->ask). (2) AUTOPILOT: 51 tickets cambian (48 autonomous->manual, 3 per_session->manual). Desglose por origen: en los 4 proyectos NATIVOS de Kanai sin carpeta DKC (taomangalam, kn_bench, kanai_self, kanai_test) se pierde el 100% (40/40: taomangalam 37/37, kn_bench 2/2, kanai_self 1/1); en los proyectos con carpeta en /Users/edobacon/Workspace/deckard/projects se recupera mayormente porque el --fresh los RE-MIGRA desde DKC (jormat 113/116, up1 75/79, horadric 39/39, pehuen 22/23), o sea NO por el texto de Kanai. (3) CAUSA RAÍZ DOBLE: server/engine/render.ts:41 escribe en el frontmatter solo `autopilot` (teach/draft/review nunca llegan al texto), y server/migrate-up1/parse.ts:514 hace `autopilot: AUTOPILOT_MAP[String(fm.autopilot)] ?? 'manual'` con un mapa que solo entiende las claves de DKC (super/strict/true/manual), así que un `autonomous` o `per_session` nativo cae a `manual`. La sospecha del análisis previo queda confirmada y AMPLIADA: no alcanza con materializar la política nueva en el frontmatter; el importador tiene que leerla y el round-trip de autopilot tiene que dejar de degradar los valores nativos.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F1.1** pendiente: Agregar la columna `verification_policy` a `tickets` (ask|required, default ask) con su migracion
  - **F1.2** pendiente: Que `set_ticket_config` acepte y muestre la politica, con su validacion
  - **F1.3** pendiente: Tests: persistencia, default y rechazo de un valor invalido
  - **F1.4** pendiente: Materializar la politica en el TEXTO del ticket como estado (frontmatter, al lado de autopilot)
  - **F1.5** pendiente: Volver a medir el rearme: el ticket conserva su politica tras un --fresh
- **Criterios cumplidos:**
  - **F1.c1** pendiente (command): `pnpm typecheck` termina con codigo 0.
  - **F1.c2** pendiente (command): Los tests de la config del ticket pasan en verde, incluida la politica nueva.
  - **F1.c3** pendiente (evidence): Evidencia: la migracion aplicada sobre el store vivo, con su verificación posterior.
  - **F1.c4** pendiente (evidence): Evidencia: el rearme medido sobre una COPIA antes y despues, y el ticket conservando su politica.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: F1 incorpora el riesgo de REARME de la DB, que el dev pidio verificar antes del backup: (a) prerequisito nuevo F1.pre2 con la medicion del rearme sobre una copia, previa al backup; (b) tarea F1.4 que materializa la politica en el TEXTO del ticket como ESTADO (frontmatter, al lado de autopilot), porque al 2026-10-05 teach/draft/review solo existen en la DB y en la auditoria y un db:rebuild --fresh los devolveria a su default en silencio; (c) tarea F1.5 que repite la medicion DESPUES de implementar; (d) criterio F1.c4 con la evidencia de las dos mediciones.. Motivo: El dev pidio verificar, antes del backup, que lo implementado no se pierda cuando se rearme la DB. La medicion mostro que las politicas del ticket no estan en el frontmatter, asi que F1 tiene que materializarlas en el texto y medir el rearme antes y despues.
- **Hallazgos:**
  - preexistente · server/engine/render.ts:41 (ida) + server/migrate-up1/parse.ts:514 (vuelta): El round-trip frontmatter->DB del ticket NO es idempotente fuera de `manual`: render.ts escribe los valores nativos de autopilot (per_session/autonomous) pero parse.ts los traduce con AUTOPILOT_MAP, que solo tiene las claves de DKC (super/strict/true/manual), y cae a `?? 'manual'`. Medido en el rearme sobre copia: 48 tickets autonomous->manual y 3 per_session->manual; en los proyectos nativos de Kanai la pérdida es del 100% (40/40). Además setTicketConfig (server/repo/tickets.ts:154) NO re-renderiza el .md (no llama logTicket, a diferencia de setTicketExternal), así que el frontmatter puede quedar desactualizado respecto de la DB aunque el campo exista. Consecuencia para F1.4: escribir `verification_policy` en el frontmatter es necesario pero NO suficiente; hay que (a) re-renderizar el .md al setear la config, (b) que toTicketInsert lea la política nueva y (c) corregir el mapa de autopilot para que la ida y la vuelta coincidan.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - Sin registros.
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
