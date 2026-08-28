---
id: DOC-kb-sp5-SP5-alcance-y-justificacion
project: up1
type: doc
---

# SP5 — Alcance y justificación de la frontera (qué entra, qué sale y por qué)

> **Propósito.** Documento para **validar la frontera de alcance** de SP5. Por cada bloque de trabajo: qué hace, su esfuerzo, y la **justificación técnica** de por qué entra al sprint o por qué se difiere. El foco es entender el **tamaño del esfuerzo técnico** de lo que queda fuera, para sustentar la decisión de no incluirlo.
> **Base:** estimaciones recalibradas (`SP5-plan-malla-curricular.md` §4.1), validación técnica (`auditoria-viabilidad_2026-06-23.md`), decisiones de reunión (`decisiones-reunion_2026-06-23.md`).
> **Fecha:** 2026-06-23.
> 🧭 Para la visión general en lenguaje claro y el glosario de términos, ver el **[README](README.md)**.

---

## 1. Resumen de la frontera

| Bloque | SP | ¿Entra? | Razón (categoría) |
|---|---:|---|---|
| Demoable formal malla (Must + Should) | ~34 | ✅ **SÍ** | Núcleo estipulado + camino crítico viable |
| **MCP F1 — contratos de los 3 objetos** | ~3 | ✅ **SÍ (requerido, barato)** | **Política §1.7**; declarativo, objetos operables vía MCP |
| MCP F2 — `cd_*` ergonómicos | ~6 | 🟡 Could/SP6 | Ergonómico, NO requerido para "estar en el MCP" |
| Tier Could (B6, B8, C3, C4, D2) | ~10 | 🟡 Si sobra velocity | **Capacidad** (cabe técnicamente, no hay holgura) |
| Épica E — Versionado con hijos (E1–E4) | ~13 | ❌ NO (→SP6) | **Bloqueado por fix de core no anticipado** |
| Épica D editor (D1, D3) | ~7 | ❌ NO (→SP6) | **Emergente fuera de lo estipulado** |
| Modular, vigencia auto, milestone, motor, RT futuros | — | ❌ NO | **Fuera de alcance ya declarado** |

**Lectura del esfuerzo:** la feature completa con todo ≈ **~73 SP**. **Entra el demoable ~34 (malla) + ~3 (MCP contratos requeridos, baratos)**. Fuera: **~10 por capacidad** (bajo riesgo), **~13 bloqueados por core** que la validación destapó (no es "no quisimos", es "no se puede sin arreglar core primero"), **~7 un segundo componente no pedido**, **~6 `cd_*` MCP ergonómicos** (opcionales), y el resto ya fuera de alcance. **Meter los objetos al MCP es barato** (contratos declarativos, F1); solo los `cd_*` de dominio costarían y son opcionales.

> **Categorías de exclusión** (por qué algo NO entra):
> - **(C) Capacidad** — cabe técnicamente y es bajo riesgo, pero no hay tiempo en el sprint. Se difiere por holgura, no por dificultad.
> - **(B) Bloqueado por core** — depende de un fix de plataforma **no anticipado** que la validación probó como necesario. No se puede entregar sin resolverlo antes.
> - **(E) Emergente** — no estaba en lo estipulado (handoff + reunión); surgió del mockup o de la validación.
> - **(X) Fuera de alcance declarado** — el handoff ya lo puso explícitamente fuera de este sprint.

---

## 2. Lo que ENTRA en SP5 (demoable formal ≈ 34 SP)

### 2.1 MUST — compromiso firme (~27 SP)

| Ticket | Qué hace | SP | Por qué entra (justificación técnica) |
|---|---|---:|---|
| **BE-0** | Enum `progression` {Sequential, Modular} | 1 | Trivial; hoy es string libre con NEEDS CLARIFICATION. Habilita el discriminador de modo. |
| **BE-1** | Campo `isCurrent` (bool) en Activity | 1 | Booleano aditivo simple; lo necesita el picker de cursos (B4). Sin lógica de versionado. |
| **A1** | Objeto `planEntry` (secuencial) | 3 | Patrón establecido (copiable de `CurricularSection`). Entidad central de la malla. |
| **A2** | Objeto `requirementCategory` | 2 | Objeto simple + validación + guard de borrado. |
| **A3** | Objeto `requirement` (3 RTs, árbol) | 5 | El más complejo, pero FK polimórfica + self-FK + multi-RT **ya existen en producción** (`CurricularSection`). |
| **A5** | Registro en config (capabilities/layouts/MCP) | 2 | Cierra la Épica A: deja los objetos operables. |
| **B1** | Ver malla (solo lectura) | 3 | Precedente directo `CompositeSectionTree` (full-page + GraphQL). |
| **B2** | Modo edición (gating por estado) | 1 | Lógica de UI simple. |
| **B3** | Barra de resumen del plan | 1 | Cálculo sobre datos ya cargados. |
| **B4** | Agregar obligatorias (modal 2 pasos + picker) | 3 | Patrón de modal del precedente; filtro por `executionUnitId`. **Flujo estrella.** |
| **B7** | Editar / quitar planEntry | 2 | Modal de edición sobre datos existentes. |
| **C1** | Ver líneas de formación (RecordList) | 1 | RecordList estándar. |
| **C2** | Crear / editar línea | 2 | Modal de form estándar. |

**Por qué este conjunto es el compromiso:** es el **camino crítico mínimo coherente** — objetos (A) + ver/editar malla (B básico) + líneas (C básico). Sin cualquiera de ellos no hay demo. Todo se apoya en patrones probados → bajo riesgo de implementación.

### 2.2 SHOULD — objetivo del demo (+7 SP → ~34 SP)

| Ticket | Qué hace | SP | Por qué entra |
|---|---|---:|---|
| **A4 + B5** | Agregar electivas a un bloque OptionPool | 2+3 | Eleva el demo de "básico" a "vendible": muestra el modelo de electivos. Reusa el motor `requirement(Group)`. |
| **B9** | Filtros por línea / bloque electivo | 2 | Alto impacto visual, bajo costo (chips sobre datos ya cargados). |

**Por qué entra:** con las estimaciones recalibradas hay holgura para estas dos capacidades, que son las que hacen el demo **convincente** (un plan real tiene electivos y se filtra). Bajo riesgo técnico.

---

## 3. Lo que QUEDA FUERA — con el tamaño del esfuerzo que lo justifica

### 3.1 Tier COULD — diferible por capacidad (~10 SP) · categoría (C)

> Cabe técnicamente y es bajo riesgo; se difiere **solo por tiempo de sprint**. Entra si el velocity de la semana 1 lo permite.

| Ticket | Qué hace | SP | Por qué NO entra (esfuerzo + razón) |
|---|---|---:|---|
| **B6** | Bloqueo por prerrequisitos al agregar | 2 | **Lógica de dominio nueva:** recorrer el árbol `requirement(owner=activity)` de cada curso y comparar la posición temporal contra los períodos del plan. No es difícil, pero es lógica que no existe en ningún componente actual → requiere diseño y pruebas propias. No esencial para "construir una malla". |
| **B8** | Drag & drop entre períodos + agregar período | 3 | `sortablejs` ya está instalado, pero la **lógica cross-columna es nueva**: recalcular `period`/`position` de los hermanos y persistir. Es el FE más caro del tier. Se puede agregar/quitar sin reordenar → no bloquea el demo. |
| **C3 + C4** | Borrar línea con guard + integración fina | 2 | Bajo esfuerzo; se difiere por capacidad, no por dificultad. El guard ya existe en BE (A2). |
| **D2** | Validación restrictiva en planes publicados | 3 | **Cross-check** Activity↔planEntry↔`Curriculum.status=Active` + modal de alerta. Esfuerzo medio (BE+FE). Es **backend, no aporta al demo visual** → se difiere; pero priorizar temprano en SP6 (protege integridad de datos). |

**Tamaño del esfuerzo de este bloque:** ~10 SP. Es el "colchón" del sprint: si el núcleo cierra antes, se tira de aquí en orden de valor (B6 → B9 ya está → B8 → C3/C4 → D2).

### 3.2 Épica E — Versionado/clonado con hijos (~13 SP) · categoría (B) BLOQUEADO POR CORE

> Esta es la exclusión **más importante de justificar**: se quiso incorporar como carryover de SP4, pero **la validación en vivo (DB + GraphQL) probó que está bloqueada por trabajo de core no anticipado**.

**Qué se descubrió validando (no es una estimación, es un hecho probado en runtime):**
- **H-7 — versionar un Curriculum CRASHEA.** Al ejecutar el versionado real vía GraphQL, Prisma falla con `Unknown argument 'updatedById'` en el write del ext-base (`ext__uplanner__curriculum` solo tiene la columna `curriculumId`). Versionar un plan **no completa hoy**.
- **H-3 — el versionado DROPEA los campos del plan.** El payload de create que arma el resolver **no incluye `rt__Plan__curriculum`** ni `progression`/`totalCredits`/`totalPeriods`/`periodType`. Aun arreglando H-7, la v2 nacería sin sus datos temporales → malla rota.

**Por qué eso lo deja fuera (tamaño del esfuerzo):**
- Arreglarlo es **E4 (~5 SP) en core (`object-manager`)**, con **rama de épica + review del team de core** (RULE-dev-004) — no es trabajo mod-only que el equipo de la malla pueda ce
