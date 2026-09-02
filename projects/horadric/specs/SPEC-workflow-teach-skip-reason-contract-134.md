---
id: SPEC-workflow-teach-skip-reason-contract-134
project: horadric
ticket: HOR-134
status: done
---

# Una sola forma para la razon del teach skip, con los tres consumidores alineados y una matriz que lo pruebe

# Una sola forma para la razon del teach skip, con los tres consumidores alineados y una matriz que lo pruebe

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Fix scope, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: cuando un ticket saltea el material educativo, la razon del skip es el unico
registro de por que. Hoy esa razon se escribe de dos formas distintas y ningun consumidor lee las
dos: el gate de cierre rechaza tickets bien escritos y el viewer muestra `null` en la mitad del
corpus. Este ticket fija **una sola forma** (`**Status**: skipped` + `**Razon**:` en linea propia),
alinea a los cuatro lugares que la producen o consumen, migra las 460 secciones que ya existen en
los 5 proyectos, y deja una matriz de prueba que hace fallar la proxima divergencia en CI en vez de
en un cierre.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | La forma canonica es la **separada** (`**Razon**:` en linea propia), no la inline | Es la unica con enforcement automatico hoy (G7), y un campo por linea no se puede satisfacer a medias: la inline admite `**Status**: skipped` a secas, que es valido y pierde la razon en silencio. Ese es el modo de falla que produjo 43 de las secciones rotas |
| 2 | El corpus se migra entero (380 secciones escritas), no se tolera legacy | Lo pediste explicito: una forma y los tickets alineados hacia ella. Implica escribir sobre tickets cerrados de 5 proyectos — es la task de mayor superficie y la unica con gate fuerte y dry-run |
| 3 | Las 315 secciones sin razon reciben un backfill generico | Decision tuya. Deja el corpus 100% legible, al costo de una razon que no es la razon real de cada ticket. Se redacta para que sea honesta sobre eso, no para simular una justificacion |
| 4 | El viewer se estrecha DESPUES de migrar, no antes | Si `teaches.ts` deja de leer la inline antes de que los datos esten migrados, HC pierde 65 secciones durante la ventana. Es la unica dependencia dura del plan |

**Riesgos principales y como los mitigamos**:

- **La migracion corrompe tickets cerrados de 5 proyectos** → el script es idempotente y con
  `--dry-run` obligatorio revisado antes de aplicar; la reversion es un `git checkout` acotado a
  `projects/*/tickets/`; se corre proyecto por proyecto, no los 5 de una.
- **El backfill generico se lee como si alguien hubiera justificado el skip** → el texto declara
  explicitamente que es un backfill retroactivo y que la razon original no quedo registrada. Se
  distingue de una razon real por su literal, verificable con grep.
- **Estrechar `teaches.ts` deja secciones invisibles** → orden forzado S2 → S3 y la validacion de S3
  corre sobre el corpus ya migrado, no sobre uno sintetico.
- **La matriz se escribe para pasar en vez de para detectar** → se escribe el baseline ANTES del fix
  (`RULE-workflow-sentinel-producer-consumer-contract-020` paso 2): las celdas que cambian son el
  fix, las que no, la regresion.

**Que NO se hace en este ticket** (limites explicitos del scope):

- El contenido de los teachings ni la politica de cuando skipear (HOR-106) — solo el formato de la
  razon y su lectura.
- El resto de los gates de `dkc-verify-gate` (G1..G6, G8+) — solo G7 y solo su comentario.
- El `--help` rezagado de `dkc-record-decision:30`, que no lista `delegation-policy` pese a que el
  schema lo acepta. Es el mismo patron en otra superficie; va a backlog.
- Cambiar el enum de `teach-intake-0b`. Se alinea el step al enum existente, no al reves: el enum
  tiene tres valores con semantica util (`skip-tactico` vs `skip-otra-razon`) que `skipped` perderia.

**Tamano estimado**: 4 sessions, ~6-8h. La mas riesgosa es S2 (migracion del corpus): escribe sobre
380 secciones en tickets mayormente cerrados de 5 proyectos.

**Como vas a saber que funciona**: corres la medicion del intake despues de S2 y da 0 secciones en
forma inline y 0 sin razon. Abres el tab Teaching de HC en un ticket skipeado de cualquier proyecto y
ves la razon en vez de vacio. Y si alguien vuelve a desalinear un consumidor, la matriz de S4 falla
sola.

## Purpose

Alinear el contrato de formato de la razon del teach skip entre sus cuatro superficies (prompts
productores, gate `dkc-verify-gate` G7, comentario del propio gate, y parser `teaches.ts` del
viewer), migrar el corpus existente a la forma canonica, y dejar una matriz de prueba que cubra los
tres consumidores contra ambas formas. Afecta a todo dev que cierra un ticket con `teach_policy:
skip` y a todo lector del tab Teaching de HC. Origen: HOR-134, spinoff del cierre de HOR-133.

## Requirements

### REQ-FIX-01: La forma canonica de la razon del skip es la separada

> **Que cambia**: cuando escribas un skip de teach, la razon va en su propia linea `**Razon**:`
> debajo del `**Status**: skipped`. Es la unica forma valida, y es la que el gate ya exigia.
> **Por que**: hoy los prompts te dictan una forma que el gate de cierre rechaza, asi que cerrar un
> ticket siguiendo las instrucciones al pie falla.

El sistema MUST aceptar como valida UNA sola forma de la razon del teach skip: la linea
`**Status**: skipped` seguida de una linea `**Razon**: {razon}` con contenido no vacio, dentro de la
seccion `## Teaching — Intake` o `## Teaching — Close` del ticket.

El sistema MUST NOT emitir la forma inline (`**Status**: skipped — {razon}`) desde ninguna superficie
productora.

<details><summary>Scenarios de validacion</summary>

#### Scenario: un ticket escrito siguiendo el step productor pasa el gate
- **GIVEN** un ticket con `teachings.intake: skipped`
- **WHEN** se escribe la seccion `## Teaching — Intake` copiando literalmente el bloque markdown que
  emite `prompts/steps/teach-intake/instructions.md`
- **THEN** `./commands/dkc-verify-gate G7 {TICKET} --project {project}` retorna exit 0

#### Scenario: el viewer extrae la razon del mismo ticket
- **GIVEN** el ticket del scenario anterior
- **WHEN** `extractSkipReason` de `horadric-cube:server/deckard/teaches.ts` lo parsea
- **THEN** devuelve el texto de la razon, no `null`

#### Scenario: ninguna superficie productora sigue emitiendo la inline
- **GIVEN** el repo deckard post-fix
- **WHEN** se corre `grep -rn 'Status\*\*: skipped —' prompts/`
- **THEN** retorna 0 coincidencias en bloques de template (las menciones en prosa historica o en el
  registro de este ticket no cuentan y se distinguen por contexto)

</details>

### REQ-FIX-02: El comentario del gate coincide con lo que el gate hace

> **Que cambia**: el comentario de `validate_teach_section` deja de prometer que acepta la forma
> inline, porque su codigo nunca la acepto.
> **Por que**: es la unica divergencia que vive dentro de un mismo archivo, y es la que hace que
> leer el gate para entender el contrato te devuelva la respuesta equivocada.

El sistema MUST mantener el comentario de `commands/dkc-verify-gate:441-442` consistente con el
predicado que implementa la funcion. El cuerpo de `validate_teach_section` NO cambia.

### REQ-FIX-03: El choice que instruye el step existe en el enum del schema

> **Que cambia**: seguir el paso 0b del step de teach-intake al pie deja de producir un error que
> descarta silenciosamente la entry de auditoria.
> **Por que**: hoy el step ordena `--choice skipped`, el schema solo admite
> `generate|skip-tactico|skip-otra-razon`, y el comando falla sin escribir nada.

El sistema MUST instruir en `prompts/steps/teach-intake/instructions.md:117` un `choice` presente en
el enum de `commands/lib/schemas/decisions.ts` para el step `teach-intake-0b`. El enum NO cambia.

<details><summary>Scenarios de validacion</summary>

#### Scenario: el comando registra la entry en vez de fallar
- **GIVEN** un ticket con `teach_policy: skip`
- **WHEN** se ejecuta `dkc-record-decision --step teach-intake-0b --choice {el valor que instruye el
  step}` sobre ese ticket
- **THEN** exit 0 y la entry queda escrita en `decisions_log`

</details>

### REQ-FIX-04: El corpus existente queda en la forma canonica

> **Que cambia**: las 460 secciones de skip que ya existen en los 5 proyectos quedan todas en la
> forma separada, incluidas las 315 que hoy no tienen razon en ninguna forma.
> **Por que**: una decision de formato que no toca los datos deja el 69% del corpus ilegible para
> ambos consumidores igual.

El sistema MUST convertir toda seccion `## Teaching — {Intake|Close}` de un ticket con
`teachings.{intake|close}: skipped` a la forma canonica, preservando la razon original cuando existe.

El sistema MUST distinguir en el literal del texto una razon original de un backfill retroactivo, de
modo que el backfill no se lea como una justificacion que alguien dio. El texto del backfill queda
**fijado aqui**, no a criterio del ejecutor:

```markdown
**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.
```

El literal `backfill retroactivo (HOR-134)` es el discriminante: `grep` sobre el corpus separa las
razones reales de las backfilleadas sin ambiguedad.

<details><summary>Scenarios de validacion</summary>

#### Scenario: la razon original se preserva al convertir
- **GIVEN** una seccion en forma inline con una razon real
- **WHEN** corre la migracion
- **THEN** la seccion queda en forma separada y el texto de la razon es identico al original

#### Scenario: la migracion es idempotente
- **GIVEN** el corpus ya migrado
- **WHEN** corre la migracion por segunda vez
- **THEN** `git diff --stat` sobre `projects/*/tickets/` no reporta cambios

#### Scenario: la medicion post-migracion da cero
- **GIVEN** el corpus migrado
- **WHEN** se corre el script de medicion del intake
- **THEN** 0 secciones solo-inline, 0 secciones con ambas formas, 0 secciones sin razon

</details>

### REQ-REGRESSION-01: Los tickets que ya estaban bien no se rompen

> **Que cambia**: nada, y eso es el requisito. Las 80 secciones que ya estaban en la forma canonica
> y todos los tickets que no skipearon teach salen intactos de la migracion.
> **Por que**: la migracion escribe sobre 5 proyectos de tickets mayormente cerrados, asi que el
> riesgo real no es que falte convertir algo sino que toque lo que no debia.

El sistema MUST mantener el resultado de G7 y de `extractSkipReason` sobre las 80 secciones que ya
estaban en la forma separada y sobre las secciones con `teachings.*: done` o `pending`, que este
ticket no toca.

<details><summary>Scenarios de validacion</summary>

#### Scenario: las secciones ya canonicas quedan intactas
- **GIVEN** las 80 secciones solo-separada del baseline
- **WHEN** corre la migracion
- **THEN** ninguna de esas 80 aparece en el diff

#### Scenario: los tickets no skipeados no se tocan
- **GIVEN** los tickets con `teachings.intake: done` o `pending`
- **WHEN** corre la migracion
- **THEN** ninguno aparece en el diff

</details>

### REQ-REGRESSION-02: Las suites existentes siguen verdes

El sistema MUST mantener verdes `server/tests/` de deckard (pytest) y `npm test` de horadric-cube
(vitest), incluidos `test_delegation_policy.py`, `delegation.test.ts` y `teaches.test.ts`.

## Fix scope

### Antes (comportamiento actual)

Cuatro superficies con dos contratos incompatibles. Un ticket escrito siguiendo los prompts falla
G7; un ticket corregido para pasar G7 queda ilegible para HC. En el corpus: 48 secciones legibles
solo por HC, 80 solo por el gate, 17 por ambos, y 315 por ninguno.

### Despues (comportamiento esperado)

Una sola forma, emitida por los prompts, validada por G7, leida por HC. Corpus entero en esa forma.
Una matriz que corre los tres consumidores sobre ambas formas y falla si alguno se desalinea.

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `prompts/steps/teach-intake/instructions.md` | `:171` bloque template emite la forma separada; `:117` la forma separada + `choice` valido del enum | Todo ticket futuro con skip de intake |
| `prompts/steps/_design-shared.md` | `:30` (GATE 1 Ruta B) y `:41` (fallback manual) describen la forma separada | El gate de entrada de los 4 design-{tipo} |
| `prompts/steps/request-close/checkpoints-and-close.md` | `:332` emite la forma separada | Todo ticket futuro con skip de close |
| `commands/dkc-verify-gate` | `:441-442` comentario alineado al predicado. Cuerpo sin cambios | Lectores del gate; cero cambio de comportamiento |
| `commands/lib/measure-teach-skip-forms.py` (nuevo) | Medicion versionada del corpus por forma. Es el artefacto que produce el baseline de S1.T2 y el que validan S2.T1 y S2.T3 | Herramienta de verificacion reutilizable; no se invoca desde el flujo |
| `commands/lib/migrations/teach-skip-reason.py` (nuevo) | Script de migracion idempotente con `--dry-run` y `--project` | Herramienta one-shot; no se invoca desde el flujo |
| `server/tests/fixtures/teach-skip-contract-matrix.json` (nuevo) | La matriz RULE-020: casos x consumidores con esperado-declarado y observado-actual, escrita antes del codigo | Fixture que implementan las matrices de S4.T1 y S4.T2 |
| `server/tests/fixtures/teach-skip-baseline.json` (nuevo) | Conteos pre-fix por forma y proyecto | Verificacion de la migracion de S2 |
| `server/tests/fixtures/teach-skip-original-reasons.json` (nuevo) | Las 65 razones originales, literales, antes de migrar | Permite probar preservacion (REQ-REGRESSION-01) en vez de asumirla |
| `projects/*/tickets/*.md` | 380 secciones convertidas o backfilleadas | HC muestra la razon; G7 pasaria si alguno se reabriera |
| `server/tests/test_teach_skip_reason_contract.py` (nuevo) | Matriz: formas x consumidores del lado deckard | CI de deckard |
| `docs/teach-skip-reason-contract.md` (nuevo) | El contrato documentado con sus 4 superficies | Dev que escribe o consume la razon del skip |
| `projects/horadric/rules/workflow/RULE-workflow-teach-skip-reason-canonical-form-021.md` (nuevo) | La forma canonica como rule `must` del KB | KB-first de tickets futuros del modulo workflow |
| `horadric-cube:server/deckard/teaches.ts` | `extractSkipReason` lee la forma separada | Tab Teaching del viewer |
| `horadric-cube:server/deckard/teaches.test.ts` | Matriz espejo con los mismos nombres de caso | CI de horadric-cube |

## Tasks

### Session 1 — Alinear productores y gate en deckard

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | **Escribir la MATRIZ antes que el codigo** (RULE-020 paso 1): tabla de casos (forma separada · forma inline · solo `**Status**: skipped` · seccion sin razon · seccion ausente · razon multilinea · separador `--` y `-`) x consumidores (productor, G7, `teaches.ts`) con el **resultado esperado por celda escrito antes de mirar el codigo**. Correrla contra los consumidores ACTUALES y guardar ese resultado como baseline (RULE-020 paso 2): las celdas que cambien son el fix, las que no, la regresion | REQ-FIX-01, REQ-REGRESSION-01 | tester | — | `server/tests/fixtures/teach-skip-contract-matrix.json` | El fixture contiene, por celda, el esperado-declarado y el observado-actual, y ambos difieren exactamente en las celdas que S1.T3/S1.T4/S3.T1 van a cambiar. Si no difieren en ninguna, la matriz no discrimina y hay que rehacerla | `git checkout` del fixture | RULE-workflow-sentinel-producer-consumer-contract-020, DET-4, DET-7 | done | 1 |
| S1.T2 | Medicion versionada del corpus por forma: script ejecutable + su output actual (48/78/17/45/272) como fixture. Es el artefacto que S2.T1 y S2.T3 invocan, no uno ad-hoc por task. Distinto de la matriz de S1.T1: esta cuenta DATOS, la matriz prueba CONSUMIDORES | REQ-FIX-04 | tester | — | `commands/lib/measure-teach-skip-forms.py`, `server/tests/fixtures/teach-skip-baseline.json` | El script existe, es ejecutable, y su output sobre el corpus actual reproduce exactamente los conteos del fixture | `git checkout` del script y el fixture | DET-4, DET-13 | done | 1 |
| S1.T3 | Cambiar las 5 superficies de prompts a la forma separada | REQ-FIX-01 | developer | S1.T2 | `prompts/steps/teach-intake/instructions.md`, `prompts/steps/_design-shared.md`, `prompts/steps/request-close/checkpoints-and-close.md` | Positiva por superficie (no basta la ausencia de la inline, que un borrado tambien satisface): las 5 superficies siguen existiendo y cada una emite `**Status**: skipped` seguido de `**Razon**:` con contenido. Y negativa: `grep -rn 'Status\*\*: skipped —' prompts/` sin coincidencias en bloques de template | `git checkout` de los 3 archivos | DET-16, RULE-workflow-sentinel-producer-consumer-contract-020 | done | 1 |
| S1.T4 | Alinear el comentario de `validate_teach_section` al predicado (REQ-FIX-02) y el `choice` del paso 0b al enum (REQ-FIX-03). **Va DESPUES de S1.T3**: ambas tocan `teach-intake/instructions.md` — T2 es dueña del bloque template (`:171`) y de la forma en `:117`, T3 solo del `--choice` de `:117`. Sin este orden, dos ejecutores razonables producen resultados distintos sobre la misma linea | REQ-FIX-02, REQ-FIX-03 | developer | S1.T3 | `commands/dkc-verify-gate`, `prompts/steps/teach-intake/instructions.md` | Tres condiciones: (a) el comentario de `:441-442` ya NO declara aceptada la forma inline y SI nombra `**Razon**:` — contrastado literal contra el predicado de `:457`, que no cambia; (b) `dkc-record-decision --step teach-intake-0b --choice {el del step}` retorna exit 0; (c) `dkc-verify-gate G7 HOR-134` sigue pasando | `git checkout` de los 2 archivos | DET-4, DET-16 | done | 1 |
| S1.GATE | Gate S1: quality review tier T1 + persistir session + commits granulares | — | reviewer | S1.T3, S1.T4 | — | Un ticket escrito copiando el step al pie pasa G7. Suites de deckard verdes | — | DET-23, DET-27, DET-33 | done | 1 |

### Session 2 — Migrar el corpus

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S2.T1 | Escribir el script de migracion idempotente con `--dry-run` y `--project`. Antes de escribir, volcar las 65 razones originales (48 inline + 17 ambas) a un fixture de preservacion, para poder compararlas literal despues | REQ-FIX-04, REQ-REGRESSION-01 | developer | S1.GATE | `commands/lib/migrations/teach-skip-reason.py`, `server/tests/fixtures/teach-skip-original-reasons.json` | `--dry-run` sobre horadric reporta exactamente los conteos del baseline de S1.T2, medidos con el script de S1.T2 | borrar el script y el fixture (no se invocan desde el flujo) | DET-8, RULE-workflow-sentinel-producer-consumer-contract-020 | done | 2 |
| S2.T2 | Revisar el dry-run de los 5 proyectos con el dev y aplicar proyecto por proyecto | REQ-FIX-04, REQ-REGRESSION-01 | developer | S2.T1 | `projects/*/tickets/*.md` | Tres condiciones: (a) cada una de las 65 razones originales aparece literal en su `**Razon**:` post-migracion, comparada contra el fixture de S2.T1; (b) segunda corrida sin diff (idempotencia); (c) las 80 secciones ya canonicas y los tickets no skipeados no aparecen en el diff | `git checkout -- projects/*/tickets/` | DET-8, DET-13 | done | 2 |
| S2.T3 | Re-correr la medicion post-migracion con el script de S1.T2 y registrarla en el ticket como evidencia | REQ-FIX-04 | tester | S2.T2 | `projects/horadric/tickets/HOR-134.md` | `commands/lib/measure-teach-skip-forms.py` reporta 0 solo-inline, 0 ambas, 0 sin razon sobre las 460 secciones | — | DET-13, DET-25 | done | 2 |
| S2.GATE | Gate S2 ⚑ fuerte: quality review tier T2 + dual-judge + persistir + commits | — | reviewer | S2.T3 | — | Diff revisado sobre 5 proyectos. Suites verdes. Reversion probada en un proyecto | `git checkout -- projects/*/tickets/` | DET-23, DET-27, DET-33, DET-35 | done | 2 |

### Session 3 — Estrechar el viewer

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S3.T1 | Crear rama HOR-134 en horadric-cube y cambiar `extractSkipReason` a la forma separada | REQ-FIX-01 | developer | S2.GATE | `horadric-cube:server/deckard/teaches.ts` | El parser devuelve la razon sobre el corpus migrado, no `null` | `git checkout` del archivo | DET-16, RULE-workflow-sentinel-producer-consumer-contract-020 | done | 3 |
| S3.T2 | Verificar en el HC corriendo que el tab Teaching muestra la razon en tickets skipeados de 2+ proyectos | REQ-FIX-01 | tester | S3.T1 | — | Evidencia runtime (screenshot o DOM) del tab Teaching con la razon visible | — | DET-36, DET-13 | done | 3 |
| S3.GATE | Gate S3: quality review tier T1 + persistir + commits en horadric-cube | — | reviewer | S3.T2 | — | `npm test` verde en horadric-cube. Guarda de rama verificada en el repo destino | — | DET-23, DET-27, DET-30, DET-33 | done | 3 |

### Session 4 — Matriz de prueba y regression

parallel_groups: [[S4.T1, S4.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S4.T1 | Matriz del lado deckard: formas (separada, inline, solo-status, ausente) x consumidores (G7, productor) con los nombres de caso de la matriz de S1.T1 | REQ-FIX-01, REQ-REGRESSION-01 | tester | S3.GATE | `server/tests/test_teach_skip_reason_contract.py` | La matriz falla si se revierte cualquier cambio de S1. Modelada sobre `test_delegation_policy.py` | borrar el archivo de test | DET-7, RULE-workflow-sentinel-producer-consumer-contract-020 | done | 4 |
| S4.T2 | Matriz espejo en horadric-cube con los MISMOS nombres de caso, para que divergir rompa una de las dos | REQ-FIX-01 | tester | S3.GATE | `horadric-cube:server/deckard/teaches.test.ts` | La matriz falla si se revierte S3.T1. Nombres de caso identicos a S4.T1 | `git checkout` del archivo | DET-7, RULE-workflow-sentinel-producer-consumer-contract-020 | done | 4 |
| S4.T3 | Documentar el contrato: la forma canonica, sus 4 superficies y su matriz. Dentro del `execute_scope` declarado (`docs/` de deckard + KB del proyecto) | REQ-FIX-01, REQ-FIX-02 | developer | S4.T1, S4.T2 | `docs/teach-skip-reason-contract.md`, `projects/horadric/rules/workflow/RULE-workflow-teach-skip-reason-canonical-form-021.md` | La doc nombra las 4 superficies con path:linea y apunta a las dos matrices. La rule declara la forma canonica como `must` y referencia RULE-...-020 como su meta-principio | `git checkout` de ambos archivos | DET-37, DET-16, DET-2 | done | 4 |
| S4.T4 | Correr las dos suites completas y registrar el resultado con su output crudo en la tabla Regression del ticket. Es task propia, no solo criterio de gate: sin esto el plan puede completarse sin que nadie haya corrido las suites enteras | REQ-REGRESSION-02 | tester | S4.T3 | `projects/horadric/tickets/HOR-134.md` | `pytest server/tests/` de deckard y `npm test` de horadric-cube, ambas con conteo pasados/fallidos registrado y comparado contra el baseline pre-fix. Cualquier fallo clasificado introducido vs preexistente | — | DET-7, DET-13, DET-33 | done | 4 |
| S4.GATE | Gate S4 ⚑ fuerte: quality review tier T2 + dual-judge + verificacion final + commits | — | reviewer | S4.T4 | — | Verifica independientemente lo reportado por S4.T4 (DET-33), no lo asume. Ambas matrices fallan al revertir su fix respectivo | — | DET-23, DET-27, DET-33, DET-35 | done | 4 |

## Constraints

- `RULE-workflow-sentinel-producer-consumer-contract-020`: un contrato de formato solo existe si
  productor y consumidor coinciden, y se prueba con la matriz, no con el caso feliz. Escribir el
  baseline ANTES del codigo (S1.T1) y replicar la matriz en cada consumidor con los mismos nombres
  de caso (S4.T1/T2) son obligaciones directas de esta rule, no adornos del plan.
- `DET-16` (propagacion): al cambiar la forma, preguntar donde mas se refleja. Las 4 superficies del
  Fix scope salieron de aplicar esto; el `--help` de `dkc-record-decision` tambien, y va a backlog.
- `DET-4` (hechos vs inferencias): los conteos de este spec vienen de un script ejecutado sobre el
  corpus, no de estimacion. El intake tenia 40/44 por un grep sin acotar; la medicion real es
  460 secciones.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `horadric-cube` (repo aparte) | internal | S3 y la mitad de S4 viven ahi; requiere rama propia | Hoy esta en `HOR-133-delegation-off-contract`; la rama de HOR-134 sale de ahi o de `main` segun donde este mergeado HOR-133 |
| Backend codex (delegacion activa) | external | `reviewer` y `tester` se delegan en los gates | Verificado en intake: binario v0.146.0-alpha.9.2, sesion iniciada. Si falla, `dkc-delegate` degrada al host local |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| La migracion corrompe tickets cerrados de 5 proyectos | medium | alto — 380 secciones de KB | `--dry-run` obligatorio revisado por el dev; aplicar por proyecto; idempotencia probada; reversion por `git checkout` acotado |
| El backfill generico se lee como justificacion real | high si no se cuida el texto | medio — falsea el registro de por que se skipeo | El literal declara que es retroactivo y que la razon original no quedo registrada; distinguible por grep |
| Estrechar `teaches.ts` antes de migrar deja 65 secciones invisibles | low (el plan lo ordena) | medio | Dependencia dura S2 → S3 declarada en el plan y en `Depends on` de S3.T1 |
| La matriz se escribe para pasar en vez de para detectar | medium | alto — reintroduce el drift que el ticket cierra | Baseline capturado en S1.T1 antes de tocar codigo; el gate de S4 exige que la matriz falle al revertir el fix |
| El fix del comentario de G7 se confunde con un cambio de comportamiento | low | bajo | REQ-FIX-02 declara explicito que el cuerpo de `validate_teach_section` no cambia |

## Open questions

Ninguna. La decision de forma canonica (H6) y la de legado (H8) las cerro el dev en intake-explore.

## Decisions

### DEC-LOCAL-01: La forma canonica es la separada
- **Contexto**: dos formas en el repo, tres consumidores, ninguna superficie declara precedencia
- **Drivers**: criterio del dev — una sola forma, corpus alineado, y que sea la que asegure su uso
  futuro
- **Opcion elegida**: `**Status**: skipped` + `**Razon**: {razon}` en linea propia
- **Alternativas**: (a) la inline gana y se ajusta G7 — descartada porque obliga a reescribir el
  unico enforcement existente y conserva una forma que admite cumplimiento parcial; (c) los
  consumidores toleran ambas — descartada por el dev, que pidio una sola forma
- **Consecuencias**: gana un contrato con enforcement ya existente y sin ambiguedad de separador;
  pierde las 65 secciones inline, que hay que migrar (S2)
- **Session**: intake-explore (pre-S1)

### DEC-LOCAL-02: El corpus se migra entero, incluido el backfill de las sin razon
- **Contexto**: 315 de 460 secciones no exponen razon a ningun consumidor, casi todas en tickets cerrados
- **Drivers**: decision del dev; y que una decision de formato que no toca datos deja el 69% del
  corpus roto igual
- **Opcion elegida**: backfill con razon generica declaradamente retroactiva
- **Alternativas**: legacy declarado sin tocar; ticket aparte; que HC muestre el estado explicito
- **Consecuencias**: corpus 100% legible y matriz corriendo sobre datos limpios; al costo de 380
  escrituras sobre tickets cerrados y una razon que no es la real de cada ticket
- **Session**: intake-explore (pre-S1)

## Technical reference

Predicado actual del gate (`commands/dkc-verify-gate:457`):

```bash
grep -qE '^\*\*Razon\*\*:[[:space:]]+[^[:space:]].+'
```

Regex actual del viewer (`horadric-cube:server/deckard/teaches.ts:124`):

```js
/\*\*Status\*\*:\s*skipped\s*[—\-]+\s*(.+?)(?=\n\n|\n\*\*|$)/i
```

Enum actual del schema (`commands/lib/schemas/decisions.ts:74`):

```ts
choice: z.enum(['generate', 'skip-tactico', 'skip-otra-razon'])
```

Distribucion del corpus al 2026-08-02, medida con `commands/lib/measure-teach-skip-forms.py` y congelada en `server/tests/fixtures/teach-skip-baseline.json` (460 secciones con `teachings.{intake,close}: skipped`). Corrige los conteos del intake, que venian de un script ad-hoc:

| Estado | Secciones | horadric | jormat-evolution | pehuen | up1 | bayley |
|--------|-----------|----------|------------------|--------|-----|--------|
| Solo inline | 48 | 27 | 7 | 5 | 8 | 1 |
| Solo separada | 80 | 53 | 12 | 0 | 11 | 4 |
| Ambas | 17 | 2 | 8 | 7 | 0 | 0 |
| Seccion sin razon | 43 | 12 | 16 | 3 | 7 | 5 |
| Sin seccion | 272 | 78 | 127 | 40 | 27 | 0 |

## Rules discovered

Pendiente — se captura durante execute.

## Bugs found

Pendiente — se captura durante execute.

## Backlog

Hallazgos del mismo patron productor/consumidor detectados mientras se diseñaba este fix, fuera de
su alcance (DET-17).

| # | Item | Priority | Status | Detectado en |
|---|------|----------|--------|--------------|
| B1 | El `--help` de `commands/dkc-record-decision:30` no lista `delegation-policy` pese a que `decisions.ts:209` lo acepta. Un dev que lea la ayuda concluye que el step no existe | could | open | intake-explore, al registrar el trigger `codex on` |
| B2 | `dkc-validate SpecTask` retorna `valid: true` ignorando en silencio las filas con id no canonico (`S1.T1b` se conto como 0 de 17). Un spec puede tener tasks invisibles al validador y pasar el gate | should | open | design-fix, al renumerar S1 tras el juicio |
| B4 | `horadric-cube:shared/types.ts` conserva un comentario que describe el regex inline de `extractSkipReason`. Quinta superficie con la descripcion desalineada del contrato — mismo patron que H7, que es lo que este ticket cierra. Detectado por el juez de S3.GATE (no bloqueante). **Fuera del `execute_scope` aprobado** (`server/deckard` no cubre `shared/`), por eso no se toco | should | open | S3.GATE |
| B3 | `dkc-delegate` emite `WARN: no se pudo registrar la entry agent-invocation` en las 4 corridas; las entries hubo que registrarlas a mano. El auto-registro del comando esta roto o mal invocado | should | open | design-fix, en las 4 delegaciones al juez |

## Acceptance checkpoints

- [x] **Funcional**: la matriz cierra 30/30 celdas, 0 divergentes — productor, G7 y viewer coinciden.
      Verificado con `build-teach-skip-contract-matrix.py` contra los consumidores reales
- [x] **Tests**: las dos matrices existen (deckard 42 tests, HC 31), leen los casos de la MISMA
      fuente (`server/tests/fixtures/teach-skip-cases.json`) y fallan al revertir el fix de su lado.
      5 escenarios de reversion probados y persistidos en `teach-skip-falsability-evidence.txt`
- [x] **Datos**: 461/461 secciones en forma canonica. 0 inline, 0 parentesis, 0 `Razon del skip`,
      0 sin razon. Ver "### Medicion del corpus" del ticket
- [x] **Rules**: RULE-020 respetada — baseline capturado antes del codigo, matriz replicada en cada
      consumidor con los mismos nombres de caso y cruce entre repos verificado. Nacieron ademas
      `RULE-workflow-teach-skip-reason-canonical-form-021` y
      `RULE-workflow-heading-anchored-markdown-edits-024` (del learn L1)
- [x] **Integration**: deckard **303 passed / 0 failed** (el fallo del inventario de
      delegation se cerro al cierre agregando HOR-135 a `TICKETS_REALES`), horadric-cube 366
      passed / 1 failed — `flowInference.test.ts`, preexistente y ajeno, probado en un worktree
      limpio del punto de partida de la rama
- [x] **Runtime**: DET-36 `smoke-executed`. El API del server corriendo devuelve la razon en 5
      tickets de 4 proyectos; el tab Teaching la renderiza en HOR-040 (forma C) y TICKET-031
      (forma D), ambos casos que el parser viejo mostraba vacios. Consola sin errores
- [x] **Docs**: `docs/teach-skip-reason-contract.md` con las 5 superficies (path:linea), la matriz,
      la cascada de 4 fuentes y los casos que el migrador rehusa

## Archiving

Cuando la spec deje de ser fuente de verdad: `/dkc-archive-spec SPEC-workflow-teach-skip-reason-contract-134 "{razon}"`.
