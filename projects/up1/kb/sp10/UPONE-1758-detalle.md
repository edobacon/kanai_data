---
id: DOC-kb-sp10-UPONE-1758-detalle
project: up1
type: doc
module: mcp
tags:
  - sp10
  - mcp
  - curriculum-mapping
  - detalle
  - UPONE-1758
  - elric
  - diagnostico
  - endurecimiento-mcp
---

# UPONE-1758 Detalle (Curriculum Mapping MCP: diagnostico de reconciliacion Elric a MCP online)

> **Referencia externa:** UPONE-1758 · **Tipo:** explore · **Prioridad:** Mayor · **Epica:** UPONE-1452 (Curriculum Mapping) · **Asignado:** Eduardo Bacon · **Story Points:** 5
>
> Contrato del ticket (que conseguir). La guia de implementacion vive en `UPONE-1758-pre-intake`. La fuente de dominio vive en sp9: `sp9/ANALISIS-backend-vs-client-cd-cm-endurecimiento-mcp.md` (Anexo A), `sp9/PLAN-integracion-elric-mcp-por-capas.md`, `sp9/PLAN-migracion-cd-cm-al-mcp-online.md`.

## Fuente canonica (PO)

La descripcion en Jira esta vacia. El alcance lo fija el titulo y el reencuadre acordado:

> Curriculum Mapping | MCP | Diagnostico de reconciliacion a nueva arquitectura MCP.

Reencuadre: el diagnostico original (sp9) clasifico de forma preliminar los casos solo-cliente de Curriculum Mapping. Este ticket vuelve a ser exploratorio, no ejecuta la migracion: evalua cada caso contra la rubrica del analisis, corre un spike acotado del camino critico, y deja redactados los tickets de ajuste que materializaran la migracion como follow-up. Respeta la restriccion de sprint (sin 13 SP de implementacion cabiendo en el ciclo).

## Historia de usuario

Como equipo de plataforma/dev, quiero evaluar y clasificar las reglas de Curriculum Mapping que hoy solo viven en el cliente (rubricas, gate de publicacion, unicidad de codigo frente al bulk-edit generico), spikear el camino critico, y dejar redactados los tickets de ajuste correspondientes, para que la migracion real se ejecute despues sobre una decision ya validada y no sobre una hipotesis.

## Objetivo

Evaluar que logica hot de Curriculum Mapping vive en el cliente (rubricas del arbol de competencias) y decidir el camino de cada caso (A: extender `validateCompetencyTree`; B: `blockGenericMutation`; C: queda client-side por UX), con `file:line`. Ejecutar un spike acotado del camino critico para validar la hipotesis antes de comprometer la migracion. Dejar redactados los tickets de ajuste que la implementaran. Este ticket NO migra codigo productivo.

## Contexto (para dimensionar)

- **Vuelve a ser diagnostico, no ejecucion.** El diagnostico de sp9 (Anexo A) dejo la clasificacion preliminar; este ticket la confirma caso por caso, la valida con un spike, y redacta el trabajo de ajuste sin ejecutarlo.
- **cm nacio pensado para MCP:** cada escritura pasa por resolvers `*Validated` (rediseno M-12, 2026-08-25): "ninguna via de escritura, CRUD generico, MCP o API viejo, puede introducir una excepcion". Por eso cm ya esta mayormente en N0/N3 y el ajuste que se redacte sera acotado (no hay que construir gobernanza nueva, solo extender la existente).
- **Estado real de la cobertura MCP de cm:** `mods/curriculum-mapping/ai/index.js` con `tools: []` (read-only puro) y 3 contratos de lectura (`LEVEL_SCHEME_CONTRACT`, `COVERAGE_SCHEME_CONTRACT`, `COMPETENCY_NODE_CONTRACT`). Este ticket no cambia esa superficie de lectura.
- **Endurecimiento (`blockGenericMutation`):** mecanismo del motor generico que impide que `up1_create/update/delete_object` saltee un resolver `*Validated`. Hoy **no existe** en el repo `mcp` (verificado). Es el mismo mecanismo transversal que UPONE-1757: el spike de este ticket, si toca este camino, no lo implementa dos veces.
- **Frescura:** `mcp@30a032a`, `curriculum-mapping@584499e`; el analisis de sp9 sigue vigente para cm.

## Alcance

**Dentro:**

1. **Evaluacion/clasificacion** de los casos solo-cliente por camino A/B/C con `file:line` y motivo (ver `## Casos a explorar`).
2. **Spike acotado del camino critico**, sobre un camino-A: extender `validateCompetencyTree` con una sola regla de rubrica, para validar la hipotesis antes de comprometer la migracion completa. `blockGenericMutation` sobre `CompetencyNode` (camino B, motor MCP) no se spikea en este ticket, se valida en su propio follow-up.
3. **Redaccion de los tickets de ajuste** que ejecutaran la migracion real (fuera de este ticket).

**Fuera:**

- La migracion real de logica cliente a servidor: queda en los tickets de ajuste que este ticket redacta.
- `blockGenericMutation` sobre `CompetencyNode` (B-CM-1, motor MCP compartido con UPONE-1757): camino B, pasa por validador del MCP: follow-up. Se evalua el caso (ver `## Casos a explorar`), pero su spike e implementacion no son de este ticket.
- Exponer escritura de la matriz por MCP (competencias/subcompetencias, adopcion): el backend aun esta en construccion (B5).

## Caminos de reconciliacion (A/B/C)

Cada caso se clasifica por el camino que se propone para resolverlo. La columna "Camino hipotesis a confirmar" de la tabla de abajo es una **propuesta del analisis**: la evaluacion de este ticket la confirma o la corrige caso por caso contra el codigo. El criterio por defecto es **escalar al servicio** (regla del proyecto `RULE-server-side-logic-mcp-ready`); solo se aparta cuando el caso lo justifica.

- **A. Escalar al resolver (server-side).** La regla se mueve al resolver gobernado del mod (mutations `*Validated`). Se elige cuando es un **invariante de negocio** que debe valer por cualquier via (UI, API, MCP), no solo en el cliente. Es el camino preferido.
- **B. Ficha / `registerExtra` en el MCP, o `blockGenericMutation`.** Se elige cuando (1) hay que exponer la capacidad por el MCP y no es un simple upsert (saga, tree-op, custom-logic): va como ficha declarativa o `registerExtra`; o (2) un objeto ya gobernado queda expuesto a escritura por el generico y hay que **endurecerlo** con `blockGenericMutation` para que no salte sus reglas.
- **C. Queda client-side.** Se elige cuando la regla es **presentacion o UX pura**, no un invariante de negocio (ej. decimales de despliegue, reparto de pesos en partes iguales). Mover al servidor no aporta: no hay nada que otra via pueda violar.

**Desempate A vs C:** gana A si la regla, saltada, corrompe datos o deja el modelo inconsistente; gana C solo si su unico efecto es de interfaz. B no compite con A: es el "como" cuando A necesita ademas exponerse por MCP, o cuando hay que tapar el bypass del generico.

**Regla de alcance (mod vs MCP):** entra en el alcance ejecutable directo lo que se resuelve **en el mod** (camino A: escalar la regla al resolver del mod). Lo que **pasa por un validador del MCP** (camino B: `blockGenericMutation` y las fichas / `registerExtra` del repo `mcp`) **corresponde a follow-up**, no a este ticket: toca el mecanismo compartido del motor MCP y se coordina aparte. El camino C (UX pura) no se migra.

## Entregable: veredicto de blockGenericMutation

Este ticket debe **cerrar con un veredicto** sobre la necesidad y la urgencia de bloquear el update generico del MCP (`blockGenericMutation`) para los objetos gobernados que evalua. Es el insumo que decide si el follow-up de camino B se crea o no.

- **Necesidad.** Se decide por donde queda el invariante tras el ajuste de camino A: si se escala al **override de create/update del objeto (N3)**, el generico ejecuta la misma regla y el bloqueo es **innecesario**; si el invariante queda en una mutation `*Validated` **paralela** que el generico puede esquivar **(N1)**, el bloqueo es **necesario**.
- **Urgencia.** Se decide por el riesgo del acceso generico **abierto hoy**: si el objeto gobernado ya esta expuesto a escritura por el generico/MCP y una escritura que salta la regla corrompe datos, es **alta**; si el objeto aun no se expone por MCP, es **baja** (se resuelve antes de exponerlo); **media** si esta expuesto pero el dano es acotado o reversible.

**Consecuencia:** el follow-up de `blockGenericMutation` (camino B) **solo procede si el veredicto lo declara necesario** (N1). Si el veredicto es N3, ese bloqueo no se crea, salvo como defensa en profundidad o por politica de exposicion.

## Casos a explorar

| Caso | Donde | Camino hipotesis |
|---|---|---|
| Nombre de dimension + peso de rubrica | `rubric.ts:138-160,254`, `CompetencyTreeEditorElement.vue:1036` | A |
| Pesos de criterios suman 100 | `rubric.ts` | A |
| Peso por fila cuando la rama pondera | `rubric.ts` | A |
| Gate de publicacion (RT5 + rubrica completa) declarado-no-enforzado | logica cm | A |
| Bloqueo de administrar planes con alcance sin guardar | `rowActions.ts:249` + su `.vue:62` | A vs C (decidir) |
| cm.displayDecimals | `useDisplayDecimals.ts` | C (UX) |
| Reparto de pesos en partes iguales | `weights.ts:61` | C (UX) |
| Unicidad de codigo de CompetencyNode vs bulk-edit generico | mcp / config del mod | B (blockGenericMutation, B-CM-1) |

## Criterios de aceptacion (checkeables)

- [ ] Cada caso de la tabla `## Casos a explorar` queda clasificado A/B/C con fuente (`file:line`) y motivo.
- [ ] El spike del camino critico queda concluido, con evidencia de que la hipotesis se valido o se descarto.
- [ ] Los tickets de ajuste correspondientes a los casos A y B quedan redactados (contrato, alcance, criterio MCP).
- [ ] Los casos de camino C quedan documentados como decision explicita (no como pendiente), sin cambio de codigo.
- [ ] La regla "bloqueo de administrar planes con alcance sin guardar" queda clasificada A o C, decidida explicitamente (no heredada sin resolver de sp9).
- [ ] El ticket entrega, por objeto gobernado evaluado, el **veredicto de `blockGenericMutation`**: necesidad (N1 necesaria / N3 innecesaria, segun donde quede el invariante) y urgencia (alta / media / baja con su motivo).

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo (explore). Ademas:

- [ ] Evidencia del spike (codigo de prueba, resultado, conclusion) documentada en este ticket o en un anexo.
- [ ] Criterio MCP (RULE-server-side-logic-mcp-ready) citado como recomendacion por cada caso clasificado.
- [ ] La regla local del mod (`CLAUDE.md` de cm prohibe que el CRUD generico bypasee las `*Validated`) queda citada como el criterio que los tickets de ajuste cerraran.
- [ ] Los tickets de ajuste redactados quedan listos para intake (no requieren evaluacion adicional para arrancar).

## Tests minimos / verificacion (checkeables)

- [ ] El spike demuestra, con un caso concreto, que el camino elegido (A o B) funciona antes de comprometer el resto de la migracion a un ticket de ajuste.
- [ ] Los `file:line` citados en la clasificacion se verifican contra el codigo real, no se copian sin confirmar del analisis de sp9.

## Factores transversales (checkeables)

- [ ] Seguridad: **aplica** (el spike y la clasificacion determinan si hay bypass de unicidad por bulk-edit generico).
- [ ] Documentacion: **aplica** (los tickets de ajuste heredan el gate de publicacion declarado-no-enforzado como criterio de entrada).
- [ ] Capa de lenguaje / accesibilidad / Storybook / tokens: N/A (evaluacion y spike de backend, sin UI nueva).
- [ ] Convenciones de mod: aplica (escritura gobernada `*Validated`, patron ya establecido en cm).
- [ ] **Logica server-side / MCP-ready (RULE-server-side-logic-mcp-ready):** criterio de referencia para clasificar cada caso y para redactar los tickets de ajuste.

## Frontera core/mod (Aduana)

Evaluacion + spike de este ticket. El ajuste que resulte es del mod (`validateCompetencyTree`) y del repo `mcp` (`blockGenericMutation`, compartido con UPONE-1757). Sin Core Extension.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Rubrica: nombre de dimension + peso numerico; pesos suman 100; peso por fila | `mod` (extender `validateCompetencyTree`) | Invariante de objeto propio del mod, mismo patron que el resto de cm | analisis sp9 A-CM-1/2/3 |
| Gate de publicacion de matriz (RT5 + rubrica completa) | `mod` (override de `updateInstance`, patron cd) | Invariante de transicion de objeto, no de infraestructura MCP | analisis sp9 A-CM-4 |
| `blockGenericMutation` sobre `CompetencyNode` (B-CM-1) | `repo mcp` (motor) + config del mod | El mecanismo es del motor generico (compartido con UPONE-1757); la declaracion "este objeto esta gobernado" es del contrato del mod | analisis sp9 B-CM-1 |
| `displayDecimals`, reparto de pesos en partes iguales | `client-side` (sin endurecer) | Presentacion / UX deliberada, no invariante (camino C) | analisis sp9, seccion 6 |
| Bloqueo de administrar planes con alcance sin guardar | evaluar `mod` vs UX | El analisis no lo resolvia; este ticket lo decide en la fase de evaluacion | analisis sp9, Anexo A (fila "UI adopcion") |

**Veredicto global:** la evaluacion confirma que el ajuste futuro sera casi todo del mod (extender `validateCompetencyTree` y el override de `updateInstance`). El unico cruce a **repo `mcp`** es `blockGenericMutation` (compartido con UPONE-1757, no se duplica). cm no tiene artefactos que crucen a **object-manager como Core Extension**.

## Dependencias

- **Comparte con UPONE-1757** el mecanismo `blockGenericMutation` (una sola implementacion; coordinar orden de ejecucion en los tickets de ajuste).
- **Dependencia futura (fuera de este ticket):** la matriz en escritura por MCP espera a que cierre su backend (B5). Este ticket deja el criterio de entrada, no expone la tool.

## Estimacion

**Explore, 5 SP.** Descompuesto:

- Evaluacion de los casos contra codigo real: ~2 SP.
- Spike del camino critico: ~1 SP. Es un camino-A (extender `validateCompetencyTree`); `blockGenericMutation` (camino B, motor MCP) se valida en su propio follow-up.
- Redaccion de los tickets de ajuste: ~2 SP.

Esfuerzo: Considerable/Menor · Sensibilidad: Baja.

## Decisiones abiertas

- [ ] **"Bloqueo de administrar planes con alcance sin guardar":** invariante (camino A) o UX advisory (camino C). Se resuelve en la fase de evaluacion de este ticket.
- [ ] **Que camino-A spikear:** confirmar que el spike se hace sobre una regla de `validateCompetencyTree` (camino A). `blockGenericMutation` (camino B, motor MCP) no se spikea en este ticket, queda para su propio follow-up.
- [ ] **Momento de exponer la matriz en escritura:** este ticket deja el criterio de entrada ("cuando el backend cierre"); no se ejecuta aqui.

## Guia de ejecucion: reglas y patrones up1 a considerar

- **[A favor]** Extender `validateCompetencyTree` (ya existente) en vez de crear validacion nueva: es el patron de cm, a confirmar en el spike. _Fuente: analisis sp9 A-CM-1..3._
- **[Gate]** `blockGenericMutation` sobre `CompetencyNode` es el unico camino B limpio del analisis; pasa por validador del MCP, por lo que no es candidato al spike de este ticket: se spikea y se implementa en su propio follow-up.
- **[Advertencia]** El `CLAUDE.md` de cm prohibe que el CRUD generico bypasee las `*Validated`: citarlo en los tickets de ajuste como el criterio que cierran, no como novedad.
- **Transversal:** el online gana en cualquier empate contra Elric; migrar es reexpresar como ficha o `registerExtra` cuando aplique.

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1452 | Epic Curriculum Mapping | contenedor | Backlog |
| UPONE-1757 | Curriculum Design MCP | hermano: comparte la arquitectura MCP online y el mecanismo `blockGenericMutation` | Backlog |
| UPONE-1530 | Curriculum Mapping MCP sync | antecedente: dejo el pack `ai/` read-only y los 3 contratos de lectura de cm | Finalizada |
| UPONE-1756 | Tributacion | relacionado: define `CompetencyAlignment`, que queda fuera del subconjunto estable expuesto por MCP hasta cerrar su backend | Backlog |

## Referencias

- Fuente de dominio: `sp9/ANALISIS-backend-vs-client-cd-cm-endurecimiento-mcp.md` (Anexo A), los dos PLAN de sp9.
- Regla de proyecto: RULE-server-side-logic-mcp-ready.
- Guia de implementacion: `UPONE-1758-pre-intake` (este sprint).
- Working copy verificado: `mcp@30a032a`, `curriculum-mapping@584499e`.
