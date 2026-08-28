---
id: RULE-dev-test-real-shape-not-mocked
project: up1
type: rule
module: dev
tags:
  - testing
  - mocks
  - integration
  - evaluation
  - persistence
  - rt-projection
  - decorator
---

# Para logica de evaluacion/persistencia con inputs estructurados, testear contra la forma REAL (o la dependencia real), no una fixture mockeada/pelada

## What

Cuando el codigo bajo prueba consume un input **estructurado** o llama a una **dependencia con contrato no trivial** (arbol de requisitos del editor, proyeccion RT anidada, firma de un decorator del core, shape de Prisma), el test DEBE ejercitar la **forma real** de ese input/dependencia, no una version simplificada, pelada o mockeada que "parece" el shape. Un mock reproduce lo que el autor CREE que es el contrato; si el autor se equivoca en el contrato, el mock consagra el error y el test da verde con el runtime roto.

Regla: para logica de **evaluacion** (satisfacibilidad, clasificacion, derivacion) y de **persistencia/side-effects** (writes, auditoria, eventos), incluir al menos un test que use el shape/dependencia REAL:
- **Evaluacion**: fixtures con la forma que produce la fuente real (ej. el editor de requisitos envuelve TODO en `Group(OR)>Group(AND)>hoja`; testear con esa via unica, no con `RecordState`/`Group` pelados).
- **Persistencia**: un test no-mockeado contra la dependencia real (ej. `recordMutationDataLog` del core con un prisma fake que captura el write) que asevere el efecto observable (recordId, historyKey, filas escritas), no solo que "se llamo".

Un test 100% mockeado sirve para el contrato del adaptador, pero NO puede cazar un shape incompleto pasado a la dependencia: la dependencia real es la unica que lo delata.

## Why

Recurrencia en UPONE-1539 (3 veces, mismo patron):
- **TICKET-120 L9**: la clasificacion de borrado testeada con formas peladas (rs/grp sin envoltorio) OCULTABA el bug de colapso de via unica; solo la forma real del editor lo mostraba.
- **TICKET-125 L1**: la faceta de creditos del co-add se descubrio probando en RUNTIME; las entries sinteticas mockeadas no llevaban los creditos reales, asi que el umbral nunca se evaluaba de verdad.
- **TICKET-127 L1**: el shape de `recordMutationDataLog` sin `args` pasaba todos los tests mockeados en verde, pero el core real no escribia (create) o dejaba la entrada huerfana (delete). Solo el test contra el core real lo cazo (via spec-judge, DET-38).

En los tres, el mock consagro el error del autor sobre el contrato. El costo fue descubrirlo tarde (runtime o re-juez), no en el test.

## Where

- **Files**: suites de tests del mod (`tests/unit`, `tests/integration`) que cubren evaluacion de requisitos, clasificacion de borrado, resolvers con writes/auditoria/eventos.
- **Layers**: testing / backend / frontend-logic.

## When

Siempre que el test cubra: (a) logica de evaluacion sobre un input estructurado que produce una fuente real con forma canonica; (b) un resolver/helper que escribe o dispara side-effects via una dependencia del core con firma no trivial. NO aplica a logica pura sobre tipos simples (un mock del input trivial alcanza).

## Verification

- Por cada suite de evaluacion: al menos un caso con la forma canonica de la fuente real (no la pelada).
- Por cada helper de persistencia/side-effect: al menos un test no-mockeado que ejercite la dependencia real y asevere el efecto observable (write con sus campos poblados), no solo la llamada.
- Si un defecto aparece en runtime/re-juez que un test mockeado dejo pasar: identificar QUE test debio atraparlo y por que el mock lo escondio (falso-verde).

## Source

- **Discovered in**: UPONE-1539, recurrente en TICKET-120 (L9, S9), TICKET-125 (L1, S1), TICKET-127 (L1, S1). Promovido a rule por recurrencia (mismo hallazgo 3 veces).
- **Evidence**: cada caso quedo cubierto con un test de forma real: clasificacion de borrado con la via unica del editor (`deletionImpact.logic.spec.ts`), co-add con creditos reales (`prereqCheck.logic.spec.ts`), auditoria contra el core real (`planEntryDataLog.realcore.test.js`).
- **Related**: [[RULE-curriculum-design-deletion-collapse-single-path]] (forma real del editor), [[RULE-curriculum-design-batch-coadd-carries-real-credits]] (data real en entries sinteticas), [[RULE-dev-restitute-rbac-on-nondelegating-resolver]] (shape real del decorator). Alinea con la memoria global "tests mockeados consagran bugs de runtime".
