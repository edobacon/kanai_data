---
id: SPEC-JOR-135-cierre-coverage-storybook
project: jormat-evolution
ticket: JOR-135
status: done
---

# Cierre de coverage de la ola: gate global >= 90/85 + Storybook completo

# Cierre de coverage de la ola: gate global >= 90/85 + Storybook completo

## Executive summary — lo que estas aprobando

**Que se cierra**: es el ultimo ticket de la ola (120..134, mas 136/137). Tras mergear la ola se re-evalua el coverage GLOBAL del front y se verifica que el gate configurado se sostiene: statements/functions/lines >= 90, branches >= 85 (`vitest run --coverage` debe terminar exit 0). Ademas se completa el Storybook de las piezas visibles que quedaron sin story tras la ola.

**Resultado medido (2026-08-08, verificacion independiente del orquestador)**: el gate se sostiene con holgura (~5pt sobre los pisos), NO hubo que agregar tests para alcanzarlo — la ola vino bien cubierta por cada ticket. Statements 94.93 / Branches 90.68 / Functions 95.05 / Lines 95.70, `vitest run --coverage` exit 0, 2007 tests pass / 11 skip.

**Lo que SI se hizo**:
- Se agregaron las STORIES de PagosAP (JOR-131) que faltaban (7/7 play verde).
- Se desbloqueo la suite: `nav-data.test.ts` estaba desalineado (asumia 1 vista visible en Finanzas y la regla "1 vista por grupo salvo Inventario"; JOR-132 sumo 'Pagos sucursal' como 2a vista visible con su capability). Se alineo el invariante a la taxonomia real (aprobado por el dev), con aserciones de valores concretos (labels/caps/conteo=2). No se toco logica de produccion.

**Lo que NO se hizo (por criterio, no por omision)**: los archivos con coverage por-archivo bajo umbral (builders, office-payments, PagosAP list, etc.) NO se forzaron. El gate es GLOBAL y pasa con holgura; forzar tests artificiales sobre stubs y ramas defensivas seria gold-plating. Quedan como margen.

## Purpose

- **Problema**: tras mergear una ola de tickets, el coverage global y la cobertura de Storybook pueden degradarse sin un chequeo de cierre explicito. La meta del ticket ES el testing: sostener el gate y completar stories faltantes.
- **A quien afecta**: al equipo que mantiene el front (garantia de que la ola no bajo el piso de calidad) y a los consumidores de Storybook (piezas visibles documentadas).
- **Sintoma potencial**: componentes nuevos/modificados de la ola sin story, o coverage global cayendo bajo el gate sin que nadie lo note.

## Requirements

### REQ-01: el coverage GLOBAL sostiene el gate del proyecto tras la ola
> Que cambia: se verifica (y, si hiciera falta, se restaura) que el coverage global cumple el gate configurado tras mergear la ola.
> Por que: el gate es la garantia objetiva de que la ola no degrado la cobertura; debe medirse al cierre, no asumirse.

MUST: `vitest run --coverage` MUST terminar exit 0 con el gate configurado del proyecto (statements >= 90, branches >= 85, functions >= 90, lines >= 85). El coverage es GLOBAL: un archivo puntual bajo umbral NO es brecha del ticket mientras el global pase. MUST NOT agregarse tests artificiales sobre stubs o ramas defensivas solo para subir un numero por-archivo (anti gold-plating).

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN la ola 120..134 (+136/137) mergeada WHEN se corre `vitest run --coverage` THEN termina exit 0 y el reporte global cumple statements/functions/lines >= 90 y branches >= 85.
- Scenario (suite bloqueada): GIVEN un test de la suite desalineado con la taxonomia real tras la ola WHEN bloquea la corrida THEN se alinea el invariante del test a la realidad (con aprobacion del dev si toca aserciones), sin tocar logica de produccion.
- Scenario (archivo bajo umbral): GIVEN un archivo con coverage por-archivo bajo el piso WHEN el gate GLOBAL pasa con holgura THEN NO se fuerzan tests artificiales; queda como margen documentado.
</details>

### REQ-02: Storybook de las piezas visibles de la ola queda completo
> Que cambia: se agregan las stories faltantes de componentes visibles introducidos/modificados por la ola.
> Por que: cada pieza visible debe tener story (DET-23 dim Storybook); PagosAP (JOR-131) quedo sin sus stories.

MUST: los componentes visibles nuevos/modificados por la ola MUST tener su story con play verde. En particular, PagosAP (JOR-131) MUST tener stories con play (7/7).

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN PagosAP introducido por JOR-131 sin stories WHEN se ejecuta el cierre de la ola THEN PagosAP tiene sus stories y los 7 plays pasan verde.
</details>

## Tasks

### Session 1 — Cierre de coverage + Storybook de la ola [tipo: ⚑ fuerte] [tier: T2]

**Task S1.T1 — Medir coverage global + desbloquear la suite**
- source_ref: REQ-01
- agent: developer
- validation: `vitest run --coverage` exit 0 con el gate del proyecto (statements/functions/lines >= 90, branches >= 85); si un test bloquea, alinear su invariante a la taxonomia real (con aprobacion del dev si toca aserciones), sin tocar produccion; aserciones con valores concretos
- rollback: git revert
- rules: [DET-4, DET-40]

**Task S1.T2 — Stories faltantes (PagosAP)**
- source_ref: REQ-02
- agent: developer
- validation: stories de PagosAP con play verde (7/7); el resto de piezas visibles de la ola con story
- rollback: git revert
- rules: [DET-23, DET-32]

**S1.GATE**: quality review (DET-23, tier T2 → standard), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- Alcance transversal pero acotado a tests y stories: sin cambio de comportamiento de produccion (a lo sumo un refactor de testabilidad menor aprobado por el dev).
- Coverage GLOBAL, no por-archivo: no forzar tests artificiales sobre stubs/ramas defensivas (anti gold-plating).
- No modificar tests sin necesidad; alinear invariantes obsoletos a la realidad solo con evidencia y aprobacion del dev cuando toca aserciones.

## Dependencies

- Depende de que la ola 120..134 (mas 136/137) este mergeada (frontmatter `depends_on`). Es el ultimo ticket de la ola.

## Risks

| Riesgo | Donde | Mitigacion |
|--------|-------|-----------|
| Invariante de test obsoleto tras la ola bloquea la suite | nav-data.test.ts | Alinear a la taxonomia real (JOR-132 sumo 2a vista visible), con aprobacion del dev; aserciones de valor concreto; sin tocar produccion |
| Forzar coverage por-archivo introduce tests fragiles | builders/office-payments/PagosAP list | Gate GLOBAL con holgura; no forzar; documentar como margen |

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Alinear `nav-data.test.ts` a la taxonomia real (2a vista visible en Finanzas) | JOR-132 sumo 'Pagos sucursal' como 2a vista con su cap; el invariante viejo ("1 vista por grupo salvo Inventario") quedo obsoleto. Aprobado por el dev; aserciones de valor concreto; sin tocar produccion |
| 2 | No forzar coverage por-archivo (margen, no brecha) | El gate es GLOBAL y pasa con holgura (~5pt); tests artificiales sobre stubs/ramas defensivas serian gold-plating |

## Acceptance checkpoints

- [x] AC-1 (REQ-01): `vitest run --coverage` exit 0; global statements 94.93 / branches 90.68 / functions 95.05 / lines 95.70 (pisos 90/85/90/85).
- [x] AC-2 (REQ-01): suite desbloqueada; nav-data.test 7/7 con aserciones de valor (labels/caps/conteo=2).
- [x] AC-3 (REQ-02): PagosAP con stories 7/7 play verde.

## Technical reference

- Gate de coverage del proyecto: statements/functions >= 90, lines >= 85, branches >= 85 (config vitest; corrida medida 94.93/90.68/95.05/95.70).
- Suite desbloqueada: `nav-data.test.ts` (invariante alineado tras JOR-132 'Pagos sucursal' como 2a vista visible de Finanzas con su capability).
- Stories agregadas: PagosAP (JOR-131), 7 plays.
