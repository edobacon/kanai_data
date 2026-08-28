---
id: RULE-mods-056
project: up1
type: rule
module: mods
tags:
  - seed
  - verification
  - counts
  - multi-mod
  - idempotency
  - canary
---

# Un seed de mod se verifica por conteos ACOTADOS al mod, nunca por `COUNT(*)` crudo

## What

La verificacion de que el seed de un mod cargo correctamente MUST hacerse con conteos **filtrados al
scope del mod** (prefijo de `code`, join al owner, o el discriminador que corresponda). Un
`COUNT(*)` crudo de la tabla NO es criterio de exito ni de falla, porque los tenants contienen data
de **otros mods**.

Complementos obligatorios del conteo acotado:

1. **Invariante canario**: sembrar un campo con un valor constante y propio del seed (ej.
   `versionLabel='v2026-actual'`) y verificar que TODAS las filas del mod lo tienen. Es lo unico que
   detecta una **colision de `code` con otro mod**: el guard de idempotencia (`if (!x) create`)
   saltea la fila ajena, asi que ni su estado ni sus FK son de este seed — pero el conteo total
   igual da bien.
2. **Cero-silencioso**: verificar explicitamente los campos que el loader resuelve **por nombre** o
   por lookup blando (`termId`, `executionUnitId`). El sync no aborta si un loader hace skip, asi
   que la fila se crea incompleta sin error visible.
3. **Elegir el filtro con cuidado**: un filtro derivado (ej. el canario) NO sirve para entidades
   hijas cuando el padre es la excepcion conocida. Ver "Where".

## Why

Tres razones, las tres verificadas con datos:

- **Los tenants no estan vacios**: [DECISION-010](../../decisions/DECISION-010-revert-to-dedicated-tenants.md) ya documento en
  2026-04-28 que `UPU` trae "uPlanner University" completa (100 personas, 3 campus, facultades,
  carreras) y que la convivencia con la data del mod es obligada. En TICKET-113 eso se traduce en:
  `AcademicProgram` crudo **32** vs **20** del mod; `Activity` **370** vs **301**; `Offering`
  **150** vs **120**. La UI tiene el mismo efecto (el RecordList muestra *"10 de 32"*), asi que el
  smoke tampoco se salva leyendo el paginador.
- **El sync no falla ruidosamente**: es el learn **L10 de TICKET-018** (registrado 2026-05-13 como
  candidato a promocion y nunca promovido): *"el sync de UP1 NO detiene la ejecucion si un seed
  falla silenciosamente — un seed roto puede ser invisible si no se monitorean los conteos
  finales"*. Esta regla es esa promocion.
- **Los tests con mock no cubren esto**: los tests de seed corren sobre un Prisma mock donde el
  lookup del entity que el loader crea siempre devuelve `null`. El guard de idempotencia nunca se
  ejercita y **las colisiones de `code` entre mods son estructuralmente invisibles**. Confiar en
  ellos consagra bugs de runtime (ver [feedback: unit tests mockeados][mocked]).

## Where

- Contrato de conteos del mod: `mods/{mod}/docs/reference/seed-counts.md` — cada count con su
  filtro. Ejemplo vivo: `mods/curriculum-design/docs/reference/seed-counts.md`.
- Loaders: `mods/{mod}/seed/_data-*.js`.

**Trampa concreta, encontrada 5 veces en TICKET-113**: para las entidades **hijas** de una Activity
(`Offering`, `ActivityLine`) filtrar por el canario da **110** en vez de 120, porque hereda la
excepcion del padre (`RED109` la siembra otro mod antes, queda con `versionLabel NULL`, pero sus
offerings SI son nuestras). El scope correcto ahi es por los **codes del mesh**, no por el canario.
Regla practica: el filtro se elige por **quien crea la fila**, no por un campo heredado del padre.

## When

Al escribir o revisar la verificacion post-deploy de un seed de mod; al documentar conteos
esperados; y al cerrar un ticket que cambia data de seed.

## Verification

Correr el SQL acotado del `seed-counts.md` del mod y confirmar que devuelve los valores publicados
(no un total crudo). Mas el canario agrupado por el campo constante: una sola fila, con las
excepciones inter-mod declaradas y explicadas.

> **Corolario operativo, no opcional**: un cambio de ancla o de valor en un seed idempotente **no se
> observa hasta un reset**, porque el guard protege las filas que ya existen. Si cambiaste el seed y
> los conteos no se mueven, no es que el cambio falle: es que no hubo reseed. En TICKET-113 esto
> paso **4 veces** (una designacion de estado que nunca se aplicaba, un ancla re-apuntada, y dos
> conteos leidos antes de reseedear).

## Source

- **Discovered in**: TICKET-113 / UPONE-1456 (sustitucion del seed de demo de `curriculum-design`).
- **Promociona**: learn L10 de TICKET-018.
- **Contexto**: [DECISION-010](../../decisions/DECISION-010-revert-to-dedicated-tenants.md) (convivencia de data en tenants
  compartidos).
- **Relacionada**: [RULE-mods-047](rule-mods-047.md) (seed del mod idempotente en `mods/{mod}/seed/`).

[mocked]: ../../../../.claude/projects/-Users-edobacon-Workspace-up1/memory/feedback_mocked_tests_consecrate_runtime_bugs.md
