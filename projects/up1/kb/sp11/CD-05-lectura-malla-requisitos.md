---
id: DOC-kb-sp11-CD-05-lectura-malla-requisitos
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - ticket
  - cd-plan
  - detalle
  - lectura
  - malla
  - requisitos
  - CD-05
---

# CD-05 · Lectura de dominio: construir + exponer malla y árbol de requisitos — detalle

**Identificador interno:** CD-05 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature (construir agregación + exponer). Epic probable: Curriculum Design (UPONE-1267). Asignado: propio. Story Points: 3-6. Parte de [Plan cd MCP-ready opción mod](PLAN-cd-mcp-ready-opcion-mod). Pre-intake en [CD-05-pre-intake](CD-05-pre-intake). Evidencia de frontera en [CD-05-aduana](CD-05-aduana).

> **Es el mayor salto de MCP-ready de cd.** Lectura hoy ~15% y la agregación NI existe (peor que cm, que al menos tiene las 6 queries construidas). Sin esto el asistente puede escribir pero no leer el estado agregado para decidir qué escribir.

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Matriz de MCP-readiness](Matriz-MCP-readiness-cm-y-cd-estado-dependencias-decisiones-esfuerzo-y-de-avance) (dimensión Lectura de cd, D4) + [Análisis cd para el MCP](Analisis-cd-para-el-MCP-paridad-1-1-postura-blockGeneric-y-gaps-client-side).

## 2. Historia de usuario
Como responsable del plan de estudios que opera up1 por el asistente, quiero que el asistente pueda leer la malla curricular y el árbol de requisitos como estado agregado, para decidir qué modificar sin reconstruirlo a mano desde objetos sueltos.

## 3. Objetivo
Construir la agregación de lectura de la malla curricular y del árbol de requisitos (hoy inexistente) y exponerla como tools de lectura del MCP.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature (construir + exponer). A diferencia de cm (que tenía 6 queries hechas y solo faltaba exponerlas), en cd **la agregación no existe**: hay que construir los resolvers de lectura primero.
- **Qué existe:** solo lectura por objeto (genérico). La malla y el árbol de requisitos se arman hoy en el cliente, no hay una query de dominio que los devuelva agregados.
- **Impacto:** es el cuello real; sin lectura agregada el agente no puede decidir bien qué escribir, y valida peor los cambios de CD-01/CD-03.
- **Peso alto:** Lectura pesa 20% en la matriz y está en ~15%: es el ticket que más sube el porcentaje.

## 5. Alcance
**Dentro:** construir la(s) query(s) de dominio que devuelven la malla curricular agregada y el árbol de requisitos, y exponerlas como tools de lectura. Alcance a decidir (ver Decisiones abiertas).
**Fuera:** escritura (CD-01..CD-04, CD-07, CD-08); la guía de campos (CD-06).

## 6. Criterios de aceptación (checkeables)
- [ ] Existe una query de dominio que devuelve la malla curricular de un plan como estado agregado (no objeto por objeto).
- [ ] Existe una query de dominio que devuelve el árbol de requisitos agregado.
- [ ] Ambas se exponen como tools de lectura del MCP, respetando RBAC.
- [ ] Cada lectura se pide para un plan por su identificador y, sobre un plan sembrado, devuelve el mismo conjunto (materias / estructura) que muestra la pantalla.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura por el camino gobernado del módulo (en cd, los overrides N0 del genérico) — N/A aquí (ticket de lectura); lógica server-side / MCP-ready (RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); RBAC efectivo, un rol sin capability no obtiene datos (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime: la lectura de malla y la de árbol sobre un plan sembrado devuelven el conjunto completo, comparado contra la pantalla.
- [ ] RBAC efectivo (un rol sin permiso no obtiene datos).
- [ ] Contrato/fieldDocs del resultado (coordinar con CD-06) para que el agente lo interprete.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] Query de malla de un plan con M materias -> devuelve las M materias con su período, posición y bloque.
- [ ] Query de árbol de un requisito con 2 vías -> devuelve OR(AND por vía) con las condiciones de cada uno.
- [ ] Rol sin capability -> no expone datos.

## 9. Factores transversales (checkeables)
- [ ] Logica server-side / MCP-ready: aplica (lectura de dominio).
- [ ] Permisos (RBAC): aplica.
- [ ] Convenciones de mod: aplica (resolvers de query + tools en `ai/`).
- [ ] i18n / a11y / Storybook / historial: N/A.

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Query(s) de dominio: malla agregada + árbol de requisitos | `mod-only` | Nuevos resolvers de lectura en el mod | logic (nuevos resolvers de query de cd) |
| Tools de lectura que las exponen (`operation:"query"`) | `mod-only` | Fichas en el pack del mod; el motor soporta queries nativas | mods/curriculum-design/ai/tools.js; up1/mcp/src/mods/types.js:14 |

**Veredicto global:** `todo-mod-only`. Se construye y expone dentro del mod; el motor del MCP ya soporta tools de lectura de forma nativa. Detalle en [CD-05-aduana](CD-05-aduana).

## 11. Dependencias
- **Habilita:** valida mejor CD-01 y CD-03 (leer el árbol para verificar los guards); insumo para las tools ergonómicas de CD-08.
- **Depende de:** una decisión de alcance (ver abajo).

## 12. Estimación
3-6 SP. Justificación: hay que CONSTRUIR la agregación (no solo exponer), más las tools y sus contratos. El rango lo mueve el alcance de la agregación (solo malla vs malla + árbol de requisitos completo).

## 13. Decisiones abiertas
- [ ] **D2 · Alcance de la agregación (PO + equipo cd):** ¿qué se construye de la malla y el árbol de requisitos, y con qué profundidad? Es lo que mueve el esfuerzo de 3 a 6 SP. Estado verificado 2026-09-14: la agregación no existe (hay que construirla). Ver [Decisiones para el PO](DECISIONES-PO-estado-verificado).

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** Exponer las tools de lectura como fichas `operation:"query"` (soporte nativo del motor). _Fuente: up1/mcp/src/mods/types.js:14._
- **[Advertencia]** La lógica de armado de la malla/árbol vive hoy en el cliente: al construir el resolver, reproducir esa semántica para que el agregado coincida con lo que ve la pantalla. _Fuente: CurriculumMesh/*, RequirementEditor/*._
- **[Transversal]** Tenant isolation + RBAC en cada query. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CD-01 | Prereq en el alta | La lectura del árbol ayuda a validarlo | Planeado |
| CD-03 | Ensamblado del árbol | La lectura valida la forma armada | Planeado |
| CD-06 | Guía | Contrato del resultado de estas queries | Planeado |
| CD-08 | Ergonomía (Requirement Editor tools) | Consume la lectura del árbol | Planeado (opcional) |

## 16. Referencias
Matriz de MCP-readiness (D4, dimensión Lectura), Análisis cd para el MCP, Decisiones para el PO (D2), motor del MCP (up1/mcp/src/mods/types.js:14), cliente (CurriculumMesh/*, RequirementEditor/*).
