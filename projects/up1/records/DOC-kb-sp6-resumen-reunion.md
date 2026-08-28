---
id: DOC-kb-sp6-resumen-reunion
project: up1
type: doc
---

# SP6 — Resumen para reunión

> **Fecha:** 2026-07-03 · **Módulo:** curriculum-design (malla / assessment)
> **Objetivo de la reunión:** validar el alcance de SP6 y, sobre todo, **quién implementa las capacidades transversales** (historial, workflow, eliminación): core o mod. Análisis de respaldo en `README.md`, `analisis-por-punto.md`, `preguntas-abiertas.md`.

---

## 1. Contexto en 30 segundos

- El listado base de SP6 tiene **5 puntos** sobre 4 objetos curriculares.
- **Solo 1** (requisitos de asignatura) estaba en el backlog que SP5 difirió; los otros 4 son un tema nuevo: desplegar capacidades transversales (secciones, historial, workflow, eliminación) sobre esos objetos.
- **Hallazgo central:** el team core (Klaus, en el Sprint Review SP5) ya construyó las versiones **genéricas** de historial de cambios y transiciones-en-enum. Nosotros teníamos versiones **propias** en el mod. → riesgo de **duplicar** funcionalidad; hay que decidir quién es dueño.

## 2. Mapeo de dominio (confirmado en código)

| Listado | Objeto |
|---|---|
| Programa académico | `AcademicProgram` |
| Plan de estudio / Currículo | `Curriculum` (recordType Plan/Minor) |
| Programa de asignatura | `Activity` (recordType Course) |
| Syllabus / Sílabo | `Offering` (recordType Syllabus) — **no** es el Currículo |

## 3. Los 5 puntos — estado y clasificación

| # | Punto | Core ya lo tiene | Nuestro (mod) | Veredicto |
|---|---|---|---|---|
| 1 | Requisitos de asignatura | No | `requirement` (SP5) | **Mod** — sin colisión (= S7-01 del backlog) |
| 2 | Secciones config (Plan, Syllabus) | Sí (`layoutConfig.tabs`; Curriculum ya lo usa) | — | **Config barata** si es tabs UI; caro solo si es modelo de contenido |
| 3 | Historial de cambios | **Sí** (`DataLog` genérico) | `ChangeLog` bespoke (duplicado) | **Migrar a core, sin duplicar** |
| 4 | Flujo de trabajo (enums) | Parcial (transiciones-enum sí; motor formal no) | `workflow*` (motor completo) | **Config core** para estado-simple; decidir Activity |
| 5 | Eliminación estándar | Parcial (FKs reales sí; polimórficas no) | 1 guard puntual | **Foco: sin huérfanos**; gap = refs polimórficas |

## 4. Decisiones ya tomadas (dev)

- **Punto 3 (historial):** absorber en el `DataLog` genérico de core, migrar lo nuestro y extenderlo a los objetos sin cobertura. **Cero duplicación.**
- **Punto 5 (eliminación):** implementar sobre lo existente con foco en **no dejar huérfanos**. El gap real son las **referencias polimórficas** (`ownerType/ownerId`, `entityType/entityId`) que la DB no protege.
- **Ownership (propuesta):** llevar los 3 transversales (historial, workflow, eliminación) a **core** — aprovechando que este sprint sí se puede modificar core si se valida. Convierte parches/duplicados del mod en capacidades de plataforma.

## 5. Lo que necesitamos decidir/validar EN la reunión

1. **[con team core — Klaus]** ¿Aceptan **historial + workflow + eliminación** como trabajo de **plataforma (core)** en SP6? Es la decisión que define la naturaleza del sprint (review RULE-dev-004). Ya hay action item de Klaus: "coordinar con el equipo de mods para automatizar la actualización de cambios".
2. **[negocio/cliente]** "Secciones de datos configurables" (punto 2): ¿son **tabs/secciones de UI** (config barata, patrón que Curriculum ya usa) o un **modelo de contenido estructurado**? La evidencia inclina a lo primero.
3. **[negocio]** "Eliminación estándar" (punto 5): semántica por relación — **Restrict** ("reasigna primero") vs **Cascade** ("borra en cascada") — y **¿incluye soft-delete?** (no existe genérico en core hoy).
4. **[alcance]** ¿El listado es completo? ¿Entra el **versionado/deep-copy** (S7-02/S7-03)? Hoy no está en el listado, pese a ser el camino crítico que SP5 difirió. Estado: el crash de versionar Curriculum ya se arregló (TICKET-074); quedan abiertos el RT atómico (B1/TICKET-056) y el deep-copy de hijos, ambos **trabajo de core**.

## 6. Notas de alcance / capacidad

- **Backlog SP5 no reflejado en el listado:** S7-02/03 (versionado core, parcial), S7-04 (tools MCP), S7-05 (planEntry modular), S7-06 (vigencia auto). Confirmar si entran o se difieren de nuevo.
- **Refuerzo de equipo:** se anunció la incorporación de Francisco (Academy Management) al equipo de migración.
- **Riesgo de estimación:** si los transversales van a core, el costo incluye **review del team core** y coordinación cross-equipo — no es trabajo mod-only cerrable solo.
