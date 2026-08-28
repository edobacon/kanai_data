---
id: DOC-kb-sp6-reunion-qa-2026-07-06
project: up1
type: doc
---

# Reunión QA sprint planning — 2026-07-06

**Participantes:** Eduardo Bacon, Esteban Cortés Sandoval
**Fuente:** transcript Gemini (`QA sprint planning - 2026_07_06 ... Notes by Gemini.pdf`), 00:00–00:26:36
**Propósito:** resolver alcances y dudas de SP6 sobre los 5 puntos del listado.

> Este documento registra las decisiones de la reunión y las contrasta con el código real del platform up1. Es doc local (no se commitea al mod). Alimenta `resumen-reunion.html`.

---

## Decisiones por punto (resueltas en la reunión)

### Punto 2 — Secciones configurables
- **Decidido:** replicar la config de `CurricularSection` (hijo polimórfico con `ownerType/ownerId`) a `Curriculum` (Plan) y `Offering` (Syllabus). Es **aplicar la config ya establecida en Activity**, no expandir el mod. Esteban corrige a Eduardo: "es mucho menos" de lo que parecía (00:02:49).
- **Fuera de alcance (aclaración):** NO es un motor de personalización por cliente (agregar/reordenar/desactivar secciones, permisos por rol — el sistema dual de CAP-CUR-012/012b). Eso es ambición de producto, no SP6. SP6 = **declaración por config** hecha por el dev.
- **Pendiente (por definir):** qué secciones específicas van a cada entidad. Curriculum tiene algunas particulares (ej. graduation profile); offering espeja a activity. → Eduardo envía los registros de `CurricularSection` a Esteban; Esteban define cuáles son específicas del currículo.

### Punto 3 — Historial de cambios
- **Decidido:** migrar a core (`DataLog`), **aceptando pérdida limitada de datos históricos a corto plazo** (00:08:58).
- **Lo que se pierde y se acepta:** hoy el historial consolida los cambios de los hijos polimórficos (`CurricularSection`) en el padre (`Activity`); con `DataLog`, cada objeto deja su histórico por separado → los cambios del hijo **no aparecerían** en el historial del padre. "yo sé que con eso lo perdemos" (Esteban, 00:08:00).
- **⚠️ Corrección post-reunión (dev):** **saber qué hijo polimórfico mutó es requisito, NO diferible.** En la reunión se habló de "aceptar la pérdida", pero eso solo aplica —a lo sumo— a la **vista consolidada** en la ficha del padre. El **dato de qué hijo cambió** debe preservarse: `DataLog` per-objeto no lo captura, así que la migración debe asegurar el `sourceRef*` (mod) o que core aprenda la auditoría de hijos polimórficos. Reconciliar con el equipo.
- **Action item:** Eduardo consulta con Klaus si el historial va en core o módulo.

### Punto 4 — Workflow / enum
- **Decidido:** adoptar la **lógica de enum de core** (entregada el sprint anterior); cada objeto principal (Curriculum, Offering, Activity) tendrá la lógica de Enum con estados + transiciones **configurables por metadata JSON** (00:09:56, 00:11:39).
- **Premisa clave:** el modelo de workflow del mod **se quita**; se parte del enum de core y se re-crea el flujo. "ese flujo que es el enum está viviendo en el mod... vamos a tenerlo en el core" (00:22:18+).
- **El punto técnico abierto (versionado):** el workflow del mod tenía `allowsVersioning` (qué estado permite versionar) e `initialStatusId` (estado inicial). Al quitar el workflow, **esa lógica hay que reubicarla** — probablemente a config JSON del versionado (00:20:53). Esteban: quizás no es propiedad del enum sino del versionamiento; a futuro un cliente podría definir desde qué estado se versiona.
- **Confirmación explícita en la reunión (00:18:44):** *"Core ya hace cooperar el estado con el versionado. Lo que falta es el motor de transiciones, no el estado en sí."*
- **Action items:** Eduardo verifica los detalles del Enum en core; el grupo define estados estándar + transiciones (JSON); el grupo define ubicación/almacenamiento de la config de estados permitidos para versionar.

### Punto 5 — Eliminación
- **Decidido:** **hard delete, NO soft delete** (00:13:06). El soft delete de Engagement (flag `active`) no es escalable y **tiene fuga** al consumir desde MCP / otro layout / otro mod ("no vas a saber que esos elementos están borrados").
- **Foco:** hard delete + manejo en cascada de **hijos polimórficos**, implementado en **core de forma transversal** (no parche por mod) (00:15:51).
- **Soft delete:** será una capacidad core futura (Klaus dijo que la implementarían eventualmente) — fuera de este alcance.
- **Action item:** consultar a Klaus si está planificado en core o si el equipo procede.

### Equipo — Pancho (Francisco)
- Primera semana de exploración/onboarding, sin carga de legacy. Tareas de la 2ª semana se ajustan según su avance.

---

## Verificación contra el código (¿es verdad lo que se dijo?)

| # | Afirmación en la reunión | Veredicto | Evidencia |
|---|---|---|---|
| 1 | "Core ya hace cooperar el estado con el versionado" | ✅ Verdadero | `version-from-source.js` (`prepareVersionData`): resuelve estado inicial al versionar. |
| 2 | "Falta el motor de transiciones en core" | ❌ **Falso** (corregido) | El motor **SÍ está en core**: épico AP — **UPONE-1293** (declarar `transitions` en el JSON), **UPONE-1294** (validación en `updateInstance`), **UPONE-1296** (editor visual), **todas Finalizadas el 2026-07-02**. No estaba en nuestro `develop` local (último commit 16:17; tickets cerraron 23:10) → por eso la inspección de código decía "no existe". |
| 3 | "El workflow tenía la config de qué estado permite versionar / estado inicial, y ahora hay que reubicarla" | ✅ Verdadero | `WorkflowStatus.allowsVersioning` + `Workflow.initialStatusId`. Si se quita el workflow, `version-from-source` cae a la rama `static_default` y pierde el gate. |
| 4 | "Los polimórficos tienen por defecto cascada y restrict (onDelete)" | ⚠️ **Impreciso** | `onDelete` (Cascade/Restrict) aplica a **FK reales** (110 Cascade / 2 Restrict). Las relaciones **polimórficas** (`ownerType/ownerId`) **NO son FK → NO tienen onDelete**; la BD no las protege. Es justamente el gap. |
| 5 | "Engagement implementó soft delete con `active`, no escalable, con fuga" | ✅ Verdadero | `softDeleteInstructorAvailability` (flag `active`), filtro por-layout inconsistente; el `listInstances` genérico no filtra. |
| 6 | "El historial hoy consolida en el padre (activity); los hijos no aparecen con DataLog" | ✅ Verdadero | Consolidación L40 en `auditCapture.resolver.js` redirige `entityType` al padre; `DataLog` es per-objeto. |
| 7 | "Se entregó el enum con los workflows el sprint anterior" | ✅ Verdadero | Se entregó el enum + versionado (TICKET-074/UPONE-1270) **y** el motor de transiciones config-driven (épico AP: UPONE-1293/1294/1296). El "flujo" que decían que estaba, sí está. |
| 8 | "El soft delete será capacidad core eventualmente (Klaus)" | ❓ Por confirmar | Dicho de Klaus, no verificable en código. No existe soft-delete genérico en core hoy. |

**Corrección clave (fila 4):** conviene aclararle al equipo que los hijos **polimórficos NO están cubiertos por `onDelete`** — ese es precisamente el trabajo del punto 5, no algo que "ya esté por defecto".

### Verificación en código (fetch/pull 2026-07-06)

- **Punto 4 — motor de transiciones confirmado en `origin/develop`** (28 commits por delante del local; PR #380 `integration-AP-tickets` y #385 `enums-transitions`). Archivos: `src/services/validation/enum-transition-guard.js` (guard puro), `enforceEnumTransitions` en `instance.resolver.js` (lee `properties.transitions`, evalúa condiciones, chequea capabilities, emite eventos `onTransition`), `src/services/codegen/helpers/enum-transitions.js`, editor en `fieldDefinition.resolver.js`, `docs/enum-transitions.md` + tests. **No está en la copia local** → pull pendiente para usarlo.
- **Punto 5 — la declaración de hijos polimórficos ya existe en core.** Bloque `metadata.polymorphicChildren` en el JSON del objeto, leído por `readPolymorphicChildren()` (`helpers/deep-clone-polymorphic.js`). **Hoy lo consume el deep-clone al versionar/clonar**, pero el borrado (`referenceValidationService`) NO lo usa (solo mira FK reales). → El "manejo polimórfico" del borrado es **reusar una declaración que ya existe** = fix, no feature nueva.

---

## Impacto en el análisis (resumen-reunion.html)

- Varias "decisiones a validar" quedan **resueltas** → sección 05 debe reflejar lo decidido, no lo abierto.
- Punto 4: **corregido tras revisar Jira.** El motor de transiciones **ya está en core** (épico AP, Finalizado 2026-07-02) — config-driven vía `transitions` en el JSON del objeto, validado en `updateInstance`. SP6 = **solo aplicar esa config** a Curriculum/Offering/Activity + migrar Activity + definir dónde vive el gate de versionado (`allowsVersioning`/estado inicial). No se re-crea motor. El punto 4 baja de ~8-13 a **~2-4 SP**. ⚠️ Nuestro `develop` local está desactualizado — pull pendiente para ver/usar el feature.
- Punto 5: **soft delete descartado** → los facets de soft-delete pasan a contexto ("capacidad core futura"), y el foco es hard delete + cascada polimórfica en core (config-driven).
- Punto 3 (enfoque, refinado): **abandonar `ChangeLog` (mod) y usar el history de core (`DataLog`)**, extendiéndolo. Un solo sistema de auditoría (el de core). La extensión clave: que un objeto con **hijos polimórficos que son RecordTypes** registre **qué RecordType mutó y con qué valor** (antes/después), no solo que el padre mutó. Se apoya en `metadata.polymorphicChildren` (ya declarado y ya consumido por el clonado y el borrado del punto 5) para saber qué hijos atribuir. Falta definir el diseño de esos campos en `DataLog` y el plan de retiro de `ChangeLog`.
- Punto 3: **saber qué hijo mutó es requisito (no diferible)** — corrige la lectura de "aceptar la pérdida". Diferible, a lo sumo, la vista consolidada en el padre; el dato del hijo debe preservarse (implica `sourceRef*` en el mod o auditoría de hijos polimórficos en core), por lo que la migración a `DataLog` pelado no basta.
