---
id: DOC-kb-sp6-preguntas-abiertas
project: up1
type: doc
---

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
1. **FKs reales:** declarar `onDelete` correcto en los 4 objet
