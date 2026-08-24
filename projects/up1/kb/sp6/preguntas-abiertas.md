# SP6 — Preguntas abiertas / decisiones

> Estas decisiones **no se pueden inferir** del código ni del listado. Ordenadas por impacto.
> **Actualización 2026-07-03:** el dev tomó postura en Q1–Q4 (ver cada bloque). **Contexto habilitante:** en SP6 el equipo **sí tendrá capacidad de modificar core** si el cambio se valida correctamente (levanta la restricción histórica de "no tocar core"). Eso cambia las recomendaciones hacia llevar capacidades transversales a plataforma en vez de bespoke por mod.

## Decisiones tomadas (resumen)

- **Q2 — historial:** migrar a `DataLog` genérico de core, **absorber** lo nuestro y extender a los objetos que no lo tienen. Sin duplicación.
- **Q3 — eliminación:** implementar sobre lo que ya existe, con foco en **no dejar huérfanos** (el gap real son las referencias polimórficas).
- **Q4 — Syllabus:** es `Offering (recordType=Syllabus)`, **NO** el Currículo/Plan de estudio. Es del mod.
- **Q1 — ownership:** propuesta = llevar las 3 capacidades transversales (historial, workflow, eliminación) a **core** aprovechando la ventana de modificar core.

---

## Q1 — ¿Quién implementa los puntos 3 (audit) y 4 (workflow): el team core o nosotros? 🟡 PARCIALMENTE RESUELTA por el Sprint Review SP5

**Resuelto por el SR SP5 (autoritativo):**
- **Punto 3 (audit):** **core es dueño del genérico** — Klaus presentó el registro de cambios por tenant "para todos los objetos" (`DataLog`). SP6 = extenderlo + reconciliar nuestro `ChangeLog`, vía el action item *"[Klaus Molt] Coordinar con el equipo de mods... automatizar la actualización de cambios"*.
- **Punto 4 (workflow):** ⚠️ corrección — core **NO** tiene motor de transiciones (solo valida valores de enum, `instance.resolver.js:3066/3907`); lo presentado por Klaus corresponde al trabajo del mod. Decisión: **promover el motor del mod a core** para que regule a todos los objetos.

**Lo que sigue abierto:**
- **Alcance de la promoción a core**: el modelo del mod es aplicable desde core (ya diseñado genérico), pero para que core lo regule falta abrir el `scopeType`, agregar un flag "usa workflow" por objeto y mover el coordinador de transición al camino genérico. Esfuerzo Alto ~8-13 SP + review del team core. **Falta que el team core acepte tomar esta promoción en SP6.**
- **Alcance de la migración de `ChangeLog`**: la coordinación con Klaus define si reemplazamos (con pérdida de semántica) o coexistimos. → sigue en **Q2**.

**Evidencia de código de respaldo.**
- Punto 3: core `DataLog` genérico; mod `ChangeLog` bespoke (duplicación).
- Punto 4: core no tiene workflow formal; el seed del mod ya anticipa `curriculumPlan`/`competencyNode`/`changeRequest`. La auditoría sugiere que, **si se migra, ahora es el momento más barato** (antes de acoplar a más objetos).

### Propuesta de ownership (dev, 2026-07-03) — con core modificable este sprint

| Capacidad | Recomendación | Por qué |
|---|---|---|
| **3. Historial** | **CORE** — migrar a `DataLog`; si le faltan nuestras semánticas (`source`, `versionSourceId`, consolidación al padre Activity, vínculo con transiciones), **agregarlas al genérico de core**, no re-bespoke en el mod | Un solo sistema de audit; beneficia a todos los mods; es Q2 llevada a su conclusión limpia |
| **4. Workflow** | **CORE — promover el motor del mod a core** (core no tiene motor; solo valida valores de enum). Levantar y generalizar: abrir `scopeType`, flag "usa workflow" por objeto, mover el coordinador de transición. Esfuerzo Alto ~8-13 SP | Evita que el mod siga siendo "motor de workflow de facto"; una sola capacidad de plataforma; momento barato de hacerlo |
| **5. Eliminación/huérfanos** | **CORE** — declarar ownership polimórfico en el JSON del objeto para que el guard de borrado de core lo cubra (hoy solo ve FKs reales) | El patrón polimórfico lo usan varios mods; la protección debe ser plataforma, no un monkeypatch por mod (ver Q3) |
| **2. Secciones** | Depende de Q3.a | Pendiente de definición |
| **1. Requisitos** | **MOD** | Lógica de dominio de la malla, sin colisión |

**Síntesis:** llevar los 3 transversales (3, 4, 5) a **core**. Coherente con "no duplicar" (Q2) y con la ventana de modificar core. Convierte parches/duplicados del mod en capacidades de plataforma. Costo: review del team core (RULE-dev-004), que el sprint contempla. **Falta validar con el team core** que aceptan estas 3 como trabajo de plataforma en SP6.

---

## Q2 — Para los puntos genéricos: ¿REEMPLAZAN o EXTIENDEN lo nuestro? ✅ DECIDIDA

**Decisión (dev):** **absorber en el genérico de core, sin duplicar.** Implementar sobre lo que hizo el team core (`DataLog`), **migrar** la funcionalidad de `ChangeLog` que ya tenemos hacia ese genérico, y **extender la cobertura** a los objetos del mod que hoy no la tienen (AcademicProgram, Curriculum, Offering/Syllabus). *"No nos sirve tener funcionalidades duplicadas."*

**Consecuencia técnica.** Hay que reconciliar la semántica rica de `ChangeLog` con `DataLog`:
- Si `DataLog` no soporta hoy `source`, `versionSourceId`, consolidación al padre Activity y el vínculo con transiciones de workflow → **agregar esas capacidades al genérico de core** (posible este sprint, ver Q1), NO reimplementarlas bespoke en el mod.
- Retirar el resolver `auditCapture.resolver.js`, el flow n8n `audit-capture.json` y el objeto `changeLog.json` una vez migrado — evitando el periodo de doble sistema más de lo necesario.

**Aplica a.** Punto 3 directamente; el mismo principio ("no duplicar") guía punto 4 (workflow) y punto 5 (delete) en Q1.

---

## Q3 — Semántica exacta de dos términos del listado 🟠 alto

### Q3.a — "Secciones de datos curriculares configurables" (punto 2) ⚠️ RESUELTO POR LA FUENTE — es más grande de lo estimado
- La fuente (Confluence **CAP-CUR-012/012b**, Must) define un **sistema dual de secciones**, NO tabs de UI: **estructurales** (fijas, no eliminables) + **complementarias** configurables por institución (agregar/renombrar/reordenar/desactivar, tipos texto/lista/tabla/archivo/JSON, anidables, permisos por rol).
- La **presentación** de las estructurales sí se apoya en `layoutConfig.tabs` (barato; `Curriculum` ya lo usa). Pero el **motor de secciones complementarias es feature nueva** (probablemente core/layout) → **Alto ~8-13 SP**.
- **Corrige** la evaluación previa de "config barata" y **saca el punto 2 de las tareas de onboarding** de Francisco.
- **Pendiente de decidir con el cliente:** ¿SP6 incluye el motor completo de complementarias, o solo presentar las estructurales? Detalle en `validacion-jira-confluence.md` §3.

### Q3.b — "Configuración de eliminación estándar" (punto 5) ✅ ENFOQUE DECIDIDO: sin huérfanos

**Decisión (dev):** el objetivo no es solo "poder borrar", es **borrar sin dejar huérfanos**. Implementar sobre el borrado que ya existe, cerrando el gap de integridad referencial.

**Diagnóstico (grafo de dependencias levantado 2026-07-03).**
- La protección genérica de core (`referenceValidationService` + `onDelete`) **solo cubre FKs reales de DB**.
- Hoy en el mod hay **un solo `onDelete` declarado**: `planEntry.categoryId → requirementCategory` = `Restrict` (`objects/planEntry.json:45`).
- **El gap real: referencias polimórficas** (`ownerType/ownerId`, `entityType/entityId`), que **NO son FKs reales** → la DB no las protege:
  - Borrar `Curriculum` → huérfanos: `planEntry` (FK real), `requirementCategory` (FK real), `requirement(owner=curriculum)` (polimórfico).
  - Borrar `Activity` → huérfanos: `Offering` (FK real), `planEntry` (FK real), `CurricularSection(owner=Activity)` (polimórfico), `requirement(owner=activity)` (polimórfico).
  - Borrar `AcademicProgram` → huérfanos: `Curriculum` (owner polimórfico).
  - Borrar cualquier entidad auditada → `changeLog`/`workflowTransitionHistory` (`entityType/entityId` polimórficos) huérfanos.
- **Cadenas de versión** (`previousVersionId` self-FK): borrar una versión intermedia rompe el linaje.

**Solución propuesta (2 frentes).**
1. **FKs reales:** declarar `onDelete` correcto en los 4 objetos (Restrict para padres con hijos vivos; Cascade para hijos "poseídos"). Es config por campo, ya soportada por core (`generatePrismaSchema.js`).
2. **Referencias polimórficas (el gap):** la DB no puede → o generalizamos el guard del mod (`categoryGuard.js`), **o (recomendado)** core aprende ownership polimórfico declarado en el JSON del objeto y su guard de borrado lo cubre. → enlaza con **Q1 (recomendación: CORE)**.

**Pendiente de confirmar:** semántica por relación (Restrict "reasigna primero" vs Cascade "borra en cascada") — es decisión de negocio por cada padre→hijo. Y si "estándar" incluye **soft-delete** (no existe genérico en core hoy).

---

## Q4 — ¿Dónde vive `Syllabus`? ✅ RESUELTA

**Hallazgo (2026-07-03).** `Syllabus` **NO es el Currículo/Plan de estudio**. Es **`Offering` con `recordType=Syllabus`**: una asignatura (`Activity` recordType=Course) ofertada en un periodo. Es el mismo `Offering` que usa engagement, anclado a un Course en vez de a un Service.

**Evidencia (mod curriculum-design, CONFIRMADO):**
- `logic/syllabus-offering.resolver.js` — `createSyllabusOffering(activityId, termId, name, code): Offering!` + query `syllabusOfferings` (Offerings cuya cadena ActivityLine→Activity es recordType=Course).
- `logic/syllabus-offering.schema.graphql`.
- Layouts `config/layouts/default_Offering_syllabus_{list,create,view,edit}.json`.
- `Offering.recordType` = enum `[ServiceOffer, Syllabus]` (discriminador de 1 salto, DEC-LOCAL-04 de SPEC-023).

**Corrección.** Un análisis previo dijo "Syllabus no está en el mod" — era incorrecto. Sí es del mod, como `Offering(recordType=Syllabus)`. Los puntos 2/3/4/5 que tocan "Syllabus" apuntan al objeto **`Offering`**, no a `Curriculum`.

**Mapeo de dominio final:**
| Término | Objeto |
|---|---|
| Programa académico | `AcademicProgram` |
| Plan de estudio / Currículo | `Curriculum` (recordType Plan/Minor) |
| Programa de asignatura | `Activity` (recordType Course) |
| Syllabus / Sílabo | `Offering` (recordType Syllabus) |

---

## Q5 — ¿El listado de 5 puntos es el alcance completo de SP6, o un extracto? 🟡 medio

Confirmar si el versionado/clonado (S7-02/S7-03 del backlog — parcialmente abierto en core) y el resto del backlog diferido entran o no a SP6. Hoy **no aparecen en el listado**, pese a ser el camino crítico que SP5 difirió.

---

## Resumen para la reunión

| # | Decisión | Impacto | Estado |
|---|---|---|---|
| Q1 | ¿Core o mod implementan audit/workflow/delete? | Naturaleza del sprint | 🟢 propuesta dev: **CORE** los 3 transversales — falta validar con team core |
| Q2 | ¿Reemplazar o extender `ChangeLog`? | Pérdida de semántica + reescritura | ✅ **absorber en `DataLog` de core, sin duplicar** |
| Q3.a | Alcance del sistema de secciones (punto 2) | Alto (no era config barata) | ⚠️ fuente CAP-CUR-012/012b = sistema dual; decidir si SP6 incluye motor de complementarias |
| Q3.b | Eliminación estándar | Integridad referencial | ✅ enfoque: **sin huérfanos**; gap = refs polimórficas → CORE (Q1). Falta: semántica Restrict/Cascade + ¿soft-delete? |
| Q4 | ¿Dónde vive `Syllabus`? | Estimable 3 de 5 puntos | ✅ `Offering(recordType=Syllabus)`, del mod |
| Q5 | ¿El listado es completo? ¿Entra el versionado? | Alcance total | 🟡 medio — pendiente |

## Lo que queda por resolver (para reunión con cliente / team core)

1. **Q1:** validar con el **team core** que aceptan historial + workflow + eliminación como trabajo de plataforma en SP6 (review RULE-dev-004).
2. **Q3.a:** decidir el alcance del sistema de secciones (punto 2): motor completo de complementarias (CAP-CUR-012/012b) vs solo presentar las estructurales.
6. **Ticketing:** bajar el listado a historias de Jira — hoy solo existe UPONE-1367. Faltan puntos 1, 2, 4 y definir el 5 (ver `validacion-jira-confluence.md`).
7. **Punto 3 alcance:** ¿log de transiciones (CAP-CUR-050) o audit general (`DataLog`/`ChangeLog`)? UPONE-1367 no lo precisa.
8. **Punto 5 origen:** no hay capacidad de eliminación en el catálogo CAP-CUR (patrón = desactivar, no borrar). Confirmar de dónde sale.
3. **Q3.b:** semántica de borrado por relación (Restrict vs Cascade) + ¿incluye soft-delete?
4. **Q5:** confirmar si el listado es completo y si el versionado/deep-copy (S7-02/S7-03, parcialmente abierto en core) entra a SP6.
