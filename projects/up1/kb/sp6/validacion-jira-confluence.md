# SP6 — Validación del listado contra Jira y Confluence

> Contraste del listado base de SP6 con las fuentes de verdad: **Jira** (proyecto UPONE) y **Confluence** (espacio uP1). Objetivo: ver qué está ticketeado, qué está especificado y dónde hay gaps.
> **Fecha:** 2026-07-03. **Método:** MCP de Atlassian (JQL + CQL). Citas literales de la fuente.

---

## 1. Hallazgo principal

- **Confluence tiene la especificación madura**: la página **"Curriculum Design"** (autor: Esteban Cortés, espacio `uP1`) es un **catálogo de capacidades `CAP-CUR-001…065`** con reglas de negocio y prioridad. El listado del SP6 mapea casi punto por punto a esas capacidades.
- **Jira casi no tiene tickets del SP6**: solo **UPONE-1367 "Cambiar log object a Core"** (Backlog, sin descripción). El resto del listado **no está bajado a historias**.
- **Conclusión:** el SP6 está **diseñado en Confluence pero no ticketeado en Jira**. Antes de ejecutar hay que crear las historias y resolver 2-3 desajustes fuente↔listado.

---

## 2. Mapa listado → Confluence (CAP-CUR) → Jira

| Punto del listado | Capacidad Confluence | Jira | Estado |
|---|---|---|---|
| **1. Requisitos de asignatura** | **CAP-CUR-004** "Definir prerrequisitos y correquisitos" (+ 051-053 categorías) · Must | Sin ticket (objeto `requirement` cerrado en SP5, UPONE-1346) | Especificado, no ticketeado |
| **2. Secciones configurables** | **CAP-CUR-012** (syllabus) + **CAP-CUR-012b** (plan) + 011 (curso) + 013 (wizard) · Must | Sin ticket | Especificado, no ticketeado. **Más grande de lo estimado — ver §3** |
| **3. Historial de cambios** | **CAP-CUR-050** "Log de transiciones de workflow" · Must | **UPONE-1367** "Cambiar log object a Core" (Backlog, sin descripción) | Ticketeado sin scope. **Desajuste de alcance — ver §4** |
| **4. Flujo de trabajo** | **CAP-CUR-009** (plan) + **CAP-CUR-019** (programa) + **CAP-CUR-035** (syllabus) + página "Flujo de trabajo" · Must | Sin ticket (modelo cerrado: UPONE-1099/1036) | Especificado, no ticketeado |
| **5. Eliminación estándar** | **ninguna** capacidad en el catálogo | Sin ticket | **Gap: no está en la fuente — ver §5** |

Tickets recientes en Jira que **no** son del listado pero están en backlog SP6:
- **UPONE-1340** "Versionamiento | Gestión de la versión actual (current version)" → vigencia/`isCurrent`.
- **UPONE-1366** "Unificación tipos de columnas: Core, base y custom" → plataforma.
- **UPONE-1358/1359** "Configuraciones UP1 / CONF-01" → sistema de settings de plataforma (`core_ConfigDefinition`/`ConfigPanel`). **NO** es el punto 2.

---

## 3. Punto 2 — corrección: NO es "solo pestañas de UI"

La fuente (CAP-CUR-011/012/012b) define un **modelo dual de secciones**, no una config simple de tabs:

- **Secciones estructurales** (estándar de plataforma, *"no eliminables"*, esquema fijo porque el sistema opera sobre ellas): datos generales, resultados de aprendizaje, componentes de evaluación, contenidos, sesiones, condiciones de aprobación… La institución solo configura **visibilidad y obligatoriedad**.
- **Secciones complementarias** (configurables por institución): *"formularios personalizables… la institución puede agregar, renombrar, reordenar o desactivar"*, con tipos de contenido *"texto, texto enriquecido, lista, tabla, archivo adjunto, JSON"*, **anidamiento sin límite** y **permisos por rol** por sección (BR-PRM-001).

**Implicaciones:**
- Es un **sistema configurable de secciones**, no `layoutConfig.tabs`. La presentación de las estructurales sí se apoya en el mecanismo de tabs existente (barato), pero el **motor de secciones complementarias tipadas/anidables/permisionadas es feature nueva** (probablemente core/layout).
- **Esfuerzo: Alto** (~8-13 SP o más), no ~2-3.
- **Ya NO es tarea de onboarding para Francisco.** Solo el slice de presentar las secciones estructurales (tabs) sería simple.

---

## 4. Punto 3 — desajuste de alcance

- El **listado** dice "Extensión del **historial de cambios**" (suena a auditoría de cambios general).
- La **capacidad** CAP-CUR-050 es *"Log de **transiciones de workflow**"*: registra *"cada cambio de estado… quién, cuándo, de qué estado a cuál, con qué justificación"*, inmutable, **acoplado al workflow**.
- El **ticket Jira** UPONE-1367 dice "Cambiar log object a Core" (sin descripción).
- Nuestro código tiene `ChangeLog` (mod, audita Create/Update/Delete/**StateTransition**) y core tiene `DataLog` (audit general).

**Pregunta a resolver:** ¿el punto 3 es (a) solo el **log de transiciones** (CAP-CUR-050), (b) el **audit general** (`DataLog`/`ChangeLog`), o (c) ambos unificados en core? El título del ticket ("log object a Core") sugiere la migración a core que ya decidimos, pero el alcance (transiciones vs general) hay que fijarlo.

---

## 5. Punto 5 — no está en la fuente

**No existe ninguna capacidad de eliminación** en el catálogo CAP-CUR. Las únicas menciones de borrado son negativas: secciones estructurales *"no eliminables"*, catálogos *"no pueden ser eliminados; pueden desactivarse"*, excepciones *"pueden desactivarse sin eliminarse"* (patrón de **desactivación, no borrado**). La única capacidad con borrado real es CAP-CUR-046 (archivos de evidencia).

**Pregunta a resolver:** ¿de dónde sale "Configuración de eliminación estándar"? ¿Es un requisito de plataforma que agregó el cliente fuera del catálogo, o se refiere al patrón de **desactivación** (soft-delete) que el catálogo sí usa? Esto conecta con nuestra Q3.b (soft vs hard delete).

---

## 6. Detalle de las capacidades (citas de Confluence)

**CAP-CUR-004 · Prerrequisitos y correquisitos** (punto 1): *"Establecer relaciones de prerrequisito (debe aprobar antes) y correquisito… entre cursos del plan"*. Reglas: sin dependencias circulares; en planes secuenciales el prerrequisito va en período anterior; en carrusel se expresan como curso/bloque de créditos/hito; *"validable al momento de la inscripción"*.

**CAP-CUR-009 · Workflow del plan** (punto 4): estados `Borrador → Revisión → Aprobado → Vigente → Deprecado → Archivado`. *"Solo las transiciones configuradas… son permitidas"*, role-gated, *"cada transición genera un registro de auditoría inmutable"*, *"un plan con estudiantes matriculados activos no puede transicionar a Archivado ni Deprecado"*.

**CAP-CUR-019 / 035 · Workflow de programa / syllabus** (punto 4): `Borrador → Revisión → Aprobado → Publicado`.

**CAP-CUR-050 · Log de transiciones** (punto 3): *"Registrar inmutablemente cada cambio de estado en planes de estudio, programas de curso y syllabi: quién ejecutó la transición, cuándo, de qué estado a cuál, con qué justificación"*. Inmutable, automático en cada transición.

---

## 7. Páginas de Confluence de respaldo

- **"Curriculum Design"** (`/spaces/uP1/pages/1989148681`) — catálogo CAP-CUR (fuente del listado).
- **"Flujo de trabajo"** (17-jun) — spec de workflow (punto 4).
- **"Modelo de objetos de negocio — Learning Assurance"** (23-jun) — modelo de objetos (`requirement` en 4 familias).
- **"Versionamiento de programas de cursos (documentación funcional y técnica)"** (act. 2-jul) — spec de versionado.

---

## 8. Acciones que salen de esta validación

1. **Bajar el listado a historias de Jira** — hoy solo existe UPONE-1367. Faltan puntos 1, 2, 4 (y definir 5).
2. **Fijar alcance de UPONE-1367** (punto 3): transiciones vs audit general vs ambos → decide qué migra a core.
3. **Reestimar el punto 2** (sistema dual de secciones, no tabs) y sacarlo de las tareas de onboarding.
4. **Aclarar el punto 5** con el cliente: origen y semántica (borrado vs desactivación).
