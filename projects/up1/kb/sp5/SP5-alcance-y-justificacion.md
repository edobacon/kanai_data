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
- Arreglarlo es **E4 (~5 SP) en core (`object-manager`)**, con **rama de épica + review del team de core** (RULE-dev-004) — no es trabajo mod-only que el equipo de la malla pueda cerrar solo.
- **E1, E2, E3 dependen de E4**: no se puede verificar ni copiar hijos si el padre no versiona bien. Y **E2 (deep-copy de hijos) depende además de toda la Épica A** terminada.
- Meter la Épica E en SP5 implicaría, **en cadena**: abrir core → pasar su ciclo de review → tener A completa → recién entonces E2/E3. Eso **compite con el camino crítico de la malla demoable** y arrastra una dependencia externa (equipo de core) que no controlamos en el sprint.

**Conclusión:** ~13 SP, de los cuales el desbloqueo (E4) es core con review externo. **No es "no quisimos hacerlo": es que la validación probó que requiere arreglar core primero, y esa cadena no cabe junto al demoable.** → SP6.

**Mitigación disponible (tier Could):** **E4 aislado (~5 SP) + E1 (~1 SP)** desbloquearía "versionar un plan" (aún sin copiar hijos). Si el negocio prioriza versionar por sobre parte de la malla, es la pieza de Épica E con mejor ROI para adelantar.

### 3.3 Épica D editor — Requisitos del curso (D1, D3) (~7 SP) · categoría (E) EMERGENTE

| Ticket | Qué hace | SP | Por qué NO entra |
|---|---|---:|---|
| **D1** | Editor de árbol de requisitos en Activity (modal 2 pasos + visualización Composite) | 5 | **No estaba en las épicas del handoff** (que scopea `requirement` a "solo modelar/persistir"). Surgió del mockup. Es un **segundo componente complejo** comparable en esfuerzo a varias features de la malla → meterlo en el mismo sprint **duplica el riesgo FE**. |
| **D3** | Modal de alerta de impacto en planes | 2 | Depende de D1/D2; complemento informativo. |

**Tamaño del esfuerzo:** ~7 SP FE de un editor de árbol nuevo. **No se necesita para el demo de la malla:** los `requirement` para probar prerrequisitos se cargan vía **seed** en SP5. → SP6.

### 3.4 Fuera de alcance ya declarado (categoría X)

> El handoff (`historias-malla_v1.md` §1, "Fuera de alcance") y la reunión ya pusieron esto fuera. Se lista para cerrar el mapa.

| Bloque | Por qué fuera | Tamaño del esfuerzo |
|---|---|---|
| **`planEntry` modular** (BL-6) | El sprint es **solo secuencial** (decisión de reunión). Modular = `period` nullable + orden derivado del DAG de prerrequisitos. | Medio: derivación de orden topológico desde el grafo — lógica nueva no trivial. SP6. |
| **Lógica de vigencia automática** (BL-1) | El **flag** `isCurrent` SÍ entra (BE-1); lo que sale es la **lógica** que al versionar marca/desmarca el linaje. | Medio: se engancha al path de versionado — que además está roto (ver §3.2). SP6. |
| **`milestone` / `specialization` / `planEntrySpecialization`** | Tributación/menciones; no requeridos para la malla secuencial. | Alto: objetos nuevos + relaciones. SP6+. |
| **Motor de ejecución (degree-audit)** | El handoff es explícito: "solo se **modela y persiste** `requirement`", sin evaluación en vivo del avance. | Muy alto: subsistema completo de evaluación de reglas. Futuro. |
| **RecordTypes futuros de `requirement`** (`AttributeMatch`, más targets/métricas) | El diseño es un **enum extensible**; agregar familias es incremental y no se necesita ahora. | Incremental por familia. Futuro. |

---

## 4. Cómo leer el tamaño del esfuerzo (cierre)

```
Feature completa (con todo) ≈ 73 SP
├─ ENTRA demoable malla ............ ~34 SP  ✅  núcleo estipulado, patrones probados, bajo riesgo
├─ ENTRA MCP F1 (contratos) ........ ~ 3 SP  ✅  REQUERIDO (§1.7) pero barato: declarativo, objetos operables vía MCP
├─ MCP F2 (cd_* ergonómicos) ....... ~ 6 SP  🟡  opcional, NO requerido para "estar en el MCP"
├─ Tier Could (capacidad) .......... ~10 SP  🟡  cabe, bajo riesgo, se difiere por tiempo
├─ Épica E (versionado) ............ ~13 SP  ❌  BLOQUEADO por fix de core no anticipado (H-7+H-3 validados)
├─ Épica D editor (requisitos) ..... ~ 7 SP  ❌  EMERGENTE, segundo componente no pedido en el handoff
└─ modular / motor / milestone / vigencia auto ... (s/e)  ❌  fuera de alcance ya declarado
```
> Demoable formal SP5 = **~34 SP de malla + ~3 SP de MCP (contratos)**. Meter los objetos al MCP es **bajo costo** (declarativo); los `cd_*` ergonómicos son opcionales.

**Cuatro mensajes para validar la frontera:**
1. **Lo que entra** se apoya en patrones ya en producción (`CurricularSection`, `CompositeSectionTree`, motor de cascada, contratos MCP) → riesgo de implementación bajo, estimación defendible.
2. **La cobertura MCP requerida es barata** (~3 SP, F1 contratos declarativos): los 3 objetos quedan operables vía MCP por tools genéricas. Política §1.7 cumplida sin inflar el demoable. Los `cd_*` ergonómicos (F2) son opcionales.
3. **Lo que se difiere por capacidad (~10 SP)** es bajo riesgo y reversible: es el colchón que absorbe la incertidumbre de velocity.
4. **Lo que se difiere por core (~13 SP, Épica E)** no es opcional ni evitable: la **validación empírica probó** que versionar un Curriculum está roto en core (crashea + dropea el RT) y que arreglarlo es trabajo de plataforma con review externo. Diferirlo es la decisión correcta, no una concesión.

---

## 5. Calibración con sprints anteriores (referencia empírica)

> Para validar que el alcance/estimación de SP5 es realista, lo contrastamos con lo **efectivamente ejecutado** en sprints previos del mismo proyecto (story points `executed` de los tickets DKC de up1).

### 5.1 Velocidad histórica (executed real)

| Sprint | Tema | Tickets | Est SP | **Exec SP** | Ratio exec/est |
|---|---|---:|---:|---:|---:|
| SP4 | Versionamiento de objetos | 26 | ~48 | **~63** | ~131% |
| SP4 | Cambios core/presentación + clonado/versionado Curriculum (UPONE-1270) | 19 | ~28 | **~34** | ~121% |

**Lectura:** un sprint de este equipo ha entregado entre **~34 (SP4) y ~63 (SP4) SP ejecutados**. SP4 es el comparable más reciente y más cercano en tipo de trabajo (objetos + UI + clonado/versionado).

### 5.2 Sesgo de estimación: subestimamos ~30-38%

De 47 tickets con `estimated` y `executed`: **ratio global ~138%**, Δ promedio **+1.2 SP/ticket**, **~60% subestimados**, ~20% exactos, ~20% sobreestimados. **Conclusión: tendemos a quedarnos cortos** — hay que leer las estimaciones de SP5 con ese sesgo.

### 5.3 Análogos directos para los tickets de SP5

| Tipo de trabajo SP5 | Ticket análogo (histórico) | Est → **Exec** | Implicación para SP5 |
|---|---|---|---|
| Objeto nuevo **simple** (sin RT) | ticket-006, 059, 063 | 2-3 → **2-3** | ✅ A1 (3), A2 (2) bien calibrados |
| **Objeto polimórfico con múltiples RecordTypes** | **ticket-009** (CurricularSection, 8 RT, UPONE-1035) | 2 → **7** (×3.5) | ⚠️ **A3 (`requirement`, 3 RT + polimórfico + árbol) está estimado en 5 — riesgo de quedar corto.** Ver §5.4 |
| Componente/layout UI nuevo (modsComponents/tab) | varios | 2 → **3-4** (×1.7) | ⚠️ B/C: MC-05/06/07 — la estimación de los sub-FE puede quedar corta |
| Clonado/versionado **primera vez** en un objeto | tickets-033/034/044 | → **5-8** | E (SP6): E2/E4 en 5 cada uno es coherente con "primera vez" |
| Clonado/versionado con primitivos **ya instalados** | tickets-062/065 | → **1-3** | confirma que el motor de cascada ya existente abarata E2 |

### 5.4 El riesgo de calibración #1: A3 (`requirement`)

`ticket-009` (el primer objeto con múltiples RecordTypes del mod) se estimó en 2 y **ejecutó 7 (×3.5)** — fue el **pionero** que pagó el costo de estrenar layouts-por-RT y el modelado polimórfico. **A3 es el análogo más directo** (3 RT + FK polimórfica + árbol Composite).
- **A favor de A3=5:** ese costo pionero **ya está pagado** — el patrón de RT-layouts y la FK polimórfica ya están en producción (H-4 resuelto, precedente `CurricularSection`). A3 **copia** un patrón probado, no lo estrena.
- **En contra:** sigue siendo el objeto más complejo del sprint y el historial dice que subestimamos. **A3=5 es un piso, no un techo; tratar como 5-8 y vigilarlo.**

### 5.5 Conclusión de calibración

- **Compromiso SP5 (demoable, ~37 SP estimados).** Aplicando el sesgo histórico (~130%), el esfuerzo real rondaría **~45-48 SP** → **alcanzable a velocidad tipo SP4 (~63), ajustado a velocidad tipo SP4 (~34)**.
- **Recomendación:** mantener el demoable Must+Should como objetivo, pero **proteger el compromiso**: no comprometer el tier Could (es el amortiguador del sesgo de subestimación), y **vigilar A3 y los componentes FE** como los puntos donde más probablemente nos quedemos cortos. Si a mitad de sprint A3 se infla (como ticket-009), recortar Should (B5/B9) antes que arriesgar el núcleo.
- La **recalibración a la baja** (que hicimos por "patrones ya existen") es válida para objetos simples y para E2 (motor ya existe), pero el historial obliga a **no sobre-optimizar A3 ni los componentes** — ahí el "patrón existe" reduce el riesgo pionero pero no elimina la complejidad.

---

## 6. Referencias

- `SP5-plan-malla-curricular.md` — plan maestro (§3 catálogo de tickets, §4 escenarios y estimaciones recalibradas).
- `SP5-historias-usuario.md` — historias consolidadas (9 tickets MC-*).
- `auditoria-viabilidad_2026-06-23.md` — evidencia de H-3/H-7 (bloqueantes de core probados en vivo); H-4 resuelto.
- `decisiones-reunion_2026-06-23.md` — decisiones de la reunión (secuencial-only, `isCurrent`, validación restrictiva).
- **Historial de calibración:** `deckard/projects/up1/tickets/ticket-*.md` (story_points executed de SP4/SP4).
