---
id: DOC-kb-sp6-analisis-core-vs-mod
project: up1
type: doc
---

# SP6 — Análisis por punto: alternativa CORE vs alternativa MOD

> Cada punto del listado se puede abordar de dos maneras: como **capacidad de plataforma (core)** o **desde el mod** `curriculum-design`. El análisis previo asumía "todo a core"; este documento contrasta las dos vías por **esfuerzo** y **resultado posible**, porque el mod **ya tiene buena parte de la maquinaria** y en varios puntos la vía mod es más barata.
> **Fecha:** 2026-07-03. Esfuerzo: Bajo ~1-3 SP · Medio ~3-5 · Alto ~5-13. Sujeto a refinamiento (+~30% sesgo histórico).

---

## El trade-off de fondo

| | Vía CORE | Vía MOD |
|---|---|---|
| **Qué es** | Construir/generalizar la capacidad en `object-manager`/`layout` para cualquier objeto de cualquier mod | Reusar/extender lo que el mod ya tiene, sin tocar core |
| **Esfuerzo** | Mayor (generalizar + review del team core, RULE-dev-004) | Menor (maquinaria existente, sin cross-team) |
| **Velocidad** | Más lenta (dependencia de otro equipo) | Más rápida (el mod la cierra solo) |
| **Resultado** | Plataforma reutilizable, sin duplicar, deuda cero | Rápido y self-contained, pero **bespoke** y puede **duplicar/chocar** con un futuro genérico de core |
| **Riesgo** | Coordinación y calendario cross-equipo | El mod sigue siendo "motor de facto"; otros mods no reutilizan |

Se puede decidir **por punto** (híbrido). No es todo-o-nada.

---

## Punto 1 — Requisitos de asignatura (CAP-CUR-004)

**No hay dilema:** es un editor FE sobre el objeto `requirement` (ya modelado en SP5). Core no aporta nada.

- **Vía MOD (única sensata):** componente FE (pestaña + modal 2 pasos + árbol Composite + alerta de impacto), reusando el patrón `CompositeSectionTree`. **Alto ~5-8 SP.**
- **Vía CORE:** N/A — no es una capacidad transversal.

**Recomendación: MOD.**

---

## Punto 2 — Secciones de datos configurables (CAP-CUR-012/012b)

Sistema dual: secciones **estructurales** (fijas) + **complementarias** (custom, tipadas, anidables, permisos por rol).

- **Vía CORE:** capacidad genérica de "secciones configurables" (modelo `core_Section*` + render en `RecordDetail`) para cualquier objeto. **Alto ~13+ SP** + review core.
  - *Resultado:* cualquier mod define secciones por config; base limpia. Pero pesado y cross-team.
- **Vía MOD:** extender **`CurricularSection`**, que **ya ES un modelo de secciones polimórfico** — RecordTypes (LearningOutcome, Session, **CustomSection**…), `parentId` (anidamiento), `isVisible`/`isRequired`, owner **Activity|Offering (=Syllabus)**. Falta: agregar owner **Curriculum (=Plan)**, tipos de contenido (texto/lista/tabla/archivo/JSON) y permisos por rol. **Medio-Alto ~8-13 SP.**
  - *Resultado:* reusa maquinaria **muy alineada** con CAP-CUR-012; self-contained. Pero bespoke y no reutilizable por otros mods.

**Recomendación: MOD tiene ventaja real** — `CurricularSection` ya cubre ~70% del modelo pedido (incl. Syllabus vía owner Offering). Solo iría a CORE si se prioriza capacidad de plataforma para todos los mods.

---

## Punto 3 — Historial de cambios (CAP-CUR-050 / DataLog / ChangeLog)

- **Vía CORE:** migrar al `DataLog` genérico (ya existe en core) + activarlo en los 4 objetos + agregarle las semánticas del mod que falten. **Medio-Alto ~5-8 SP** + review core.
  - *Resultado:* un solo sistema de auditoría, sin duplicar, para todos los mods.
- **Vía MOD:** extender **`ChangeLog`** (agregar entity types + eventos para AcademicProgram/Curriculum/Offering al `ENTITY_TYPE_MAP` + flow n8n). **Medio ~3-5 SP.**
  - *Resultado:* rápido, reusa el engine. Pero **perpetúa DOS sistemas de audit** (ChangeLog mod + DataLog core) = deuda; **contradice el "no duplicar"** de la decisión Q2.

**Matiz decisivo:** si el punto 3 es **solo log de transiciones** (lo que dice CAP-CUR-050), el mod **ya lo tiene** (`workflowTransitionHistory`) → vía mod casi gratis. Si es **audit general de cambios**, CORE (DataLog) es lo limpio.

**Recomendación: CORE si es audit general** (evita la duplicación que ya decidimos eliminar); **MOD si el alcance real es solo transiciones**.

---

## Punto 4 — Flujo de trabajo (CAP-CUR-009/019/035)

- **Vía CORE:** promover el motor del mod a core (abrir `scopeType`, flag "usa workflow" por objeto, mover el coordinador de transición). **Alto ~8-13 SP** + review core.
  - *Resultado:* motor de workflow de plataforma, reutilizable por cualquier mod.
- **Vía MOD:** extender el motor **que ya existe en el mod** — activar `curriculumPlan-standard` (**ya sembrado**), agregar `workflowId`/`currentStatusId` a Curriculum/AcademicProgram/Offering + migración Prisma + adaptar `ActivityStatusBadge`. **Medio ~5-8 SP.**
  - *Resultado:* rápido, reusa engine + seed existentes (el seed **ya anticipa** estos scopeTypes). Pero el mod **sigue siendo el motor de workflow de facto**; otros mods no lo reutilizan limpio.

**Recomendación:** la **vía MOD es notablemente más barata** y el seed ya la anticipa. CORE solo si el negocio quiere workflow como capacidad de plataforma para otros mods **ahora**. → Reevaluar la decisión previa de "promover a core" contra este costo.

---

## Punto 5 — Eliminación estándar / sin huérfanos

- **Vía CORE:** que core entienda **ownership polimórfico declarado** en el JSON → el guard de borrado genérico cubre las relaciones polimórficas. **Medio-Alto ~5-8 SP** + review core.
  - *Resultado:* protección robusta de plataforma; sirve a todos los mods (varios usan polimorfismo).
- **Vía MOD:** generalizar el patrón que ya existe — el override de `deleteInstance` (`requirementCategoryDelete.resolver.js`) + `categoryGuard` para cubrir todas las relaciones polimórficas del mod. **Medio ~3-5 SP.**
  - *Resultado:* rápido, self-contained. Pero es el patrón **"monkeypatch del `deleteInstance` genérico"** (frágil: "el último gana" si otro mod hace lo mismo) y solo protege este mod.

**Recomendación:** **MOD resuelve el caso ya y barato**; CORE si se quiere robustez de plataforma (el polimorfismo lo usan varios mods y el override es frágil).

---

## Resumen comparativo

| Punto | Vía CORE (esfuerzo) | Vía MOD (esfuerzo) | Recomendación |
|---|---|---|---|
| 1. Requisitos | N/A | **Alto ~5-8** | MOD (única) |
| 2. Secciones | Alto ~13+ | **Medio-Alto ~8-13** | **MOD** (CurricularSection ya cubre ~70%) |
| 3. Historial | Medio-Alto ~5-8 | **Medio ~3-5** | CORE si audit general; MOD si solo transiciones |
| 4. Workflow | Alto ~8-13 | **Medio ~5-8** | **MOD** más barato (seed ya lo anticipa) — reevaluar |
| 5. Eliminación | Medio-Alto ~5-8 | **Medio ~3-5** | MOD resuelve; CORE por robustez |

**Totales aproximados:**
- **Todo CORE:** ~30-50 SP + review cross-equipo en 3-4 puntos.
- **Todo MOD:** ~24-39 SP, más rápido, sin dependencia de core — pero **deuda**: duplica audit (P3), mantiene el mod como motor de workflow de facto (P4), y usa el patrón frágil de override de delete (P5).
- **Híbrido razonable:** P1/P2/P4/P5 desde MOD (rápido, reusa lo existente) + P3 a CORE (el único donde duplicar es claramente malo, porque core YA tiene DataLog).

## Factibilidad y techo por vía

> No todo lo que se puede hacer desde el mod llega al mismo nivel que desde core. Aquí: ¿es posible? y ¿hasta qué nivel? (dónde está el techo).

**Escala:** ✅ Completo · ◐ Parcial (con techo) · ✗ No posible.

| Punto | Desde MOD | Techo del MOD (lo que NO alcanza) | Desde CORE |
|---|---|---|---|
| **1. Requisitos** | ✅ Completo | — (es mod-native, no hay techo) | N/A |
| **2. Secciones** | ✅ Completo para Plan/Syllabus/Activity | Solo los objetos del mod; **no** es capacidad genérica que otros mods usen por config | ✅ Completo + genérico (cualquier objeto) |
| **3. Historial** | ✅ Completo para los objetos del mod | Queda como **2º sistema** en paralelo a `DataLog` (duplicación); no puede ser el audit de plataforma | ✅ Completo + genérico |
| **4. Workflow** | ✅ Completo para los objetos del mod | `scopeType` cerrado → **migración Prisma por cada objeto nuevo**; no reutilizable por otros mods | ✅ Completo + genérico (opt-in por config) |
| **5. Eliminación** | ◐ **Parcial** | FK reales ✅; guard polimórfico **frágil** (override global de `deleteInstance`, "el último gana" entre mods); **soft-delete = techo duro** | ✅ Completo + robusto |

### Los dos techos duros del MOD (donde CORE es obligatorio)

1. **Que la capacidad la usen OTROS mods por configuración** (P2 secciones, P3 audit, P4 workflow como plataforma). Desde el mod solo se resuelve para *sus* objetos; volverlo genérico cross-mod **exige core**.
2. **Soft-delete real (P5).** Core no tiene borrado lógico genérico. Si el mod agrega un campo `deletedAt`/`active`, las **lecturas genéricas de core** (`listInstances`, pickers, layouts) **no lo respetarían** → los registros "borrados" seguirían apareciendo salvo que el mod intercepte *todos* los paths de lectura. Un soft-delete confiable **exige core**. El hard-delete con guards sí es mod-doable.

### Lo que SÍ alcanza el MOD a nivel funcional (para los objetos de curriculum-design)

- P1: editor de requisitos — completo.
- P2: secciones estructurales (tabs) + complementarias (reusando `CurricularSection`: recordTypes, anidamiento, CustomSection, visibilidad) — completo para Plan/Syllabus/Activity.
- P3: auditoría de cambios y transiciones de sus objetos — completo (con duplicación).
- P4: workflow de Plan/AcademicProgram/Offering — completo (con migración por objeto).
- P5: integridad en FK reales (Restrict/Cascade) + guards de dominio para polimórficas — funcional, aunque frágil; soft-delete no.

**Lectura:** para **el resultado funcional sobre los objetos del mod**, casi todo es posible desde el mod (excepción: soft-delete real). Lo que **solo** da core es el **alcance de plataforma** (reutilización por otros mods) y la **robustez** (soft-delete genérico, guards no-frágiles).

## Cómo decidir (criterio)

- **Elegir CORE** cuando: (a) core ya tiene el genérico y el mod solo duplicaría (P3/audit), o (b) el negocio quiere la capacidad como plataforma para otros mods **ya**, y hay cupo para el review cross-equipo.
- **Elegir MOD** cuando: el mod ya tiene la maquinaria (P2 secciones, P4 workflow, P5 delete), el objetivo es **cerrar SP6 rápido**, y la deuda de "bespoke/duplicado" es aceptable a corto plazo (se puede promover a core después).

> Nota: "promover a core después" es viable en P4 (el motor ya está diseñado genérico) y P2 (CurricularSection es un modelo limpio). En P3 la promoción tardía es cara (dos sistemas conviviendo), por eso P3 es el mejor candidato a ir a core **ya**.
