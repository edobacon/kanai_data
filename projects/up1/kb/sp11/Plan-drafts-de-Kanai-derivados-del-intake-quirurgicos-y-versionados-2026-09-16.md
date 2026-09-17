---
id: DOC-kb-sp11-Plan-drafts-de-Kanai-derivados-del-intake-quirurgicos-y-versionados-2026-09-16
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - curriculum-mapping
  - UPONE-1770
  - plan
  - kanai-tooling
  - meta
---

# Plan - drafts de Kanai derivados del intake, quirurgicos y versionados (2026-09-16)

Plan acordado el 2026-09-16 a partir del trabajo en TICKET-149 (UPONE-1770). Nace de un problema de raiz: el generador de drafts de Kanai se guiaba por la maqueta en vez de por el intake, se confundia de ticket y ademas cada regeneracion pisaba el preview anterior (perdida de contexto).

## Principio rector

La maqueta de 1756 (`sp10/UPONE-1756-maqueta-slice.html`) es la maqueta de TODA la tributacion. La particion en tickets (1756, 1769, 1770, 1771, 1772, 1773) fue decision del equipo porque el feature era muy grande para un solo ticket; la maqueta sigue conteniendo el feature completo.

De ahi la regla: **el alcance y el contenido de cada ticket salen del intake (spec + reqs + "fuera de alcance"), no de la maqueta**. El draft/preview debe ser un RESULTADO del intake que USA la maqueta solo como referencia visual de las vistas en alcance. No son dos fuentes paralelas. Si el spec va por un lado y la maqueta por otro, la ejecucion del ticket se vuelve confusa.

Mapeo de vistas de la maqueta completa a tickets (para no confundir alcance):
- Vista 1-5 (grilla, ficha, detalle, flujo de asignacion, retiro simple): 1756.
- Vista 6 Malla por periodo: 1770.
- Vista 7 Via masiva: 1770.
- Vista 8 Peso / porcentaje eje 1: 1770.
- Vista 9 Indicadores (dashboard): 1771.
- Vista 10 Retiro con aviso R-7: 1772.
- Vista 11 Versionado R-8: 1771.
- Vista 12 outcomeAlignment F6: 1772.
- (Migracion de niveles: 1773.)

El marco "dentro / diferido" de la maqueta esta escrito desde el sprint de 1756, por eso marca como "fuera/diferido" cosas que son el nucleo de 1770. Ese marco viejo es lo que despista; el contenido de la maqueta esta bien.

## Estado (actualizado 2026-09-16)

Commiteado en kanai-app rama `setup` (nada pusheado), migracion 0040 aplicada, MCP reiniciado:
- **Fase 0 HECHA** (snapshot v3 + este plan).
- **Fase 1 B2+B3 HECHAS** (`2d776ce`): edicion quirurgica (`edit_design_artifact`, `edit_kb_file`) + versionado (tabla `design_artifact_versions`, archivado en `writeDesignArtifact`, tools `list_design_artifact_versions`, `read_design_artifact(version)`, `diff_design_artifact`, `restore_design_artifact`). **B1 segmentado PENDIENTE** (ver abajo).
- **Fase 2 HECHA** (`bc7997e` + fixes `5c7cab8` cupo semantico y `4e8ebc5` auditor no marca formato del preview): prompts derivan el alcance del spec, la maqueta es referencia visual; validador `check_draft_coherence` (determinista + LLM on-demand) + aviso advisory en regenerate_drafts.
- **Fase 3 HECHA**: preview de 149 regenerado (v5; v4 archivada), coherencia 17/17, ya no arrastra vistas de otros tickets (las lista como fuera de alcance). El auditor marco un "leak de D1" pero el preview YA maneja D1 bien (señal, no bloqueo, ticket aparte); decision del dev: **A = dejar v5 como esta**.

## Fase 1 pendiente: B1 - drafts segmentados (checklist)

Enfoque decidido (recomendaciones 1a/2a/3a): **marcadores de seccion sobre UN HTML compuesto** (el preview sigue siendo un solo HTML renderable/aprobable; las secciones son direccionables por marcador). Aditivo y de bajo riesgo, reusa B2/B3.
- Marcadores en la generacion: el prompt derivado envuelve cada seccion con `<!-- KSEC:id -->` ... `<!-- /KSEC:id -->`, ids semanticos: `ds` (Sistema de diseño), `v-1`, `v-2`... (una por vista en alcance), `delta`, `scope`.
- Utilidad `server/dispatch/draftSections.ts`: `splitSections(html)` -> `[{id,title,content}]`; `replaceSection(html,id,newHtml)`; tolerante a marcadores ausentes (degrada a una sola seccion = comportamiento actual).
- Tools: `read_design_artifact` + param `section`; `list_draft_sections`; `regenerate_draft_section` (llamada enfocada por seccion, splice por marcador, pasa por writeDesignArtifact -> B3 archiva).
- Decisiones: (1a) granularidad por-vista + ds + delta + scope; (2a) marcadores sobre un HTML compuesto (no multi-call desde cero); (3a) regen de seccion = call enfocada spec + contenido actual.
- **Estado: NO arrancado.** Se posterga: primero el frente web (ver abajo).

## Frente WEB de kanai-app (PRIORIDAD antes de B1) - decidido 2026-09-16

Motivo: de nada sirve segmentar y versionar en el backend si la web no lo puede VISUALIZAR ni permite manejar el cambio de versiones. Diagnostico del codigo hoy:
- La web lista artefactos (`GET /api/tickets/:id/artifacts` -> `listDesignArtifacts`, solo HEAD) y muestra el numero de version (`ArtifactsModal.vue`, `v{{ a.version }}`) + estado aprobado/pendiente.
- El contenido se sirve por `GET /api/tickets/:id/artifacts/:artifactId` (`readDesignArtifact`, SOLO el HEAD actual) y se renderiza en un iframe.
- **NO se puede ver una version anterior desde la web.** El historial existe (B3: tabla + tools MCP list/read/diff/restore) pero NO hay endpoint ni UI web que lo exponga: no hay selector de versiones, ni diff, ni restore en la web. Solo se ve el numero y el contenido HEAD.

Trabajo del frente web (antes de B1):
1. Endpoints: `GET /api/tickets/:id/artifacts/:artifactId/versions` (lista), `GET .../:artifactId?version=N` o `.../versions/:n` (contenido de una version), diff, y accion restore. Envuelven las funciones ya existentes en `repo/designArtifacts.ts`.
2. UI en `ArtifactsModal.vue` (o vista de artefacto): selector/historial de versiones, ver una version anterior en el iframe, comparar (diff), restaurar. Manejo del cambio de version visible para el dev.
3. Despues, visualizacion de SEGMENTOS (para B1): navegar el preview por seccion (ds/v-1/.../delta/scope), leer/regenerar una seccion desde la web.

Orden nuevo: **frente web (versiones -> segmentos) ANTES que B1 backend**, o al menos la parte de versiones antes, para que el ciclo de vida del draft sea usable desde la web y no solo por tools MCP.

## Orden y dependencias

Fase 0 -> Fase 1 (B2+B3 hechas; B1 pendiente) -> Fase 2 (hecha) -> Fase 3 (hecha). Pendientes: **frente web (prioridad)**, luego **B1 segmentado**, y el ciclo de TICKET-149 (juez + aprobacion). Todo kanai-app rama `setup`, requiere restart MCP; nada pusheado.

## Estado de correcciones ya aplicadas a TICKET-149 (contexto)

Antes de este plan ya se enmendo el spec de 149 (REQ-05/09 modal en dos estados reutilizando CompetencyAlignmentDetailModal; REQ-16 regla unica sin drag = seleccion lateral + click; REQ-17 modo por malla con competencia en mano) y se corrigio la Vista 4 del slice de 1756 (de arrastre a seleccion + click). Esa correccion del slice queda a revisar bajo el principio rector (la maqueta es de todo el feature): decidir si se mantiene, se revierte o se reencuadra el marco de alcance.
