---
id: DOC-refinamiento-up1-sp10
project: up1
type: doc
module: planning
---

Material de consulta del refinamiento uP1 del 2026-08-26, verificado contra codigo up1 (mods, mcp) y Jira UPONE. Son tickets CANDIDATOS (no creados): el PO los redacta en Jira, detective-mode los detalla. Todo es tarea nueva de sp10. Los UPONE-* citados son la base ya hecha/en curso (relacion, no duplicado).

Doc visual (iterable): https://claude.ai/code/artifact/47750d63-9bdc-4f7a-971b-aea425de0fd8
Transcript: record TRANSCRIPT-refinamiento-up1-2026-08-26.

## A. Curriculum Mapping - Matriz (Francisco, Eduardo)
Base: datos generales UPONE-1537 (Finalizada); niveles/cobertura UPONE-1454/1455 (Finalizadas); adopcion+competencias UPONE-1633/1689 (Developing). Ojo: M-12 (2026-08-25) volvio las matrices uniformes y quito las politicas de agregacion por competencia.
- **SP10-CM-1 Rediseno de la matriz en 3 pestanas** (info general con mapeo / adopcion con reglas mejoradas para planes / competencias con herramientas de diseno y alertas). Feature, Alto. Repo suite+mods. Q: rediseno de UI sobre 1633/1689 o cambia el modelo de datos?
- **SP10-CM-2 Nomenclatura "niveles de desarrollo" y "escala de desempeno"** (rename de mantenedores/objetos user-facing; interno LevelScheme/CoverageScheme). Fix, Bajo-Medio. Repo mods(lang/config)+suite. Q: solo UI/lang o renombra objetos/rutas/capabilities? Recomendacion: mantener nombres internos, renombrar solo lo visible para no romper el MCP.
- **SP10-CM-3 Persistir resultados consolidados en el modelo de datos** (reporteria muestra datos ya calculados, sin reglas en runtime). Feature, Alto. Q critica: vive en curriculum-mapping o en learning assessment (app no migrada)?
- **SP10-CM-4 Nuevas reglas de agregacion** (promedios ponderados, notas maximas, mejor resultado; competencia en multiples cursos/niveles, subcompetencias). Feature, Alto. Q critica: tension con M-12 que quito la agregacion por competencia; re-introduce agregacion configurable o vive en learning assessment sobre CM-3?
- **SP10-CM-5 Configuracion simplificada: recetas globales predefinidas** + ajustes avanzados por pasos, apoyado en el MCP. Feature, Medio-Alto. Cruza con SP10-MCP-1. Q: recetas por tenant o presets en UI, quien las define?
- **SP10-CM-6 Asociar niveles de desarrollo a la matriz (no a tributacion)**. Feature, Medio. Decision cerrada. Parte de la adopcion (1633).

## B. Normalizacion del MCP (Francisco, Eduardo)
Base: UPONE-1744 (MCP MVP) y UPONE-1530 (MCP sync) Finalizadas 2026-08-27. Insumo: doc KB sp9 "Analisis backend vs client-side y endurecimiento del MCP".
- **SP10-MCP-1 Normalizar elementos y capacidades del MCP a la nueva estructura** (packs declarativos, fichas, contratos; endurecimiento: mover invariantes al resolver, cerrar CRUD generico sobre objetos gobernados). Feature, Alto. Repo mcp+mods. Q: "normalizar" ejecuta el plan A/B del analisis sp9 (blockGenericMutation en cm, mover reglas de malla al resolver) o solo alinea naming/estructura?
- **SP10-MCP-2 Liberar el MCP en la nube** (HTTP+OAuth). Feature, Medio-Alto. Q: depende del OAuth productizado en object-manager (dependencia B2); esta mergeado a develop/staging?
- **SP10-MCP-3 DoD: uso obligatorio del MCP ante nuevas capacidades/modificaciones**. Proceso, Bajo. No es codigo, es criterio de aceptacion de equipo.

## C. Tributacion (Eduardo asume la vista)
Verificado: sin ticket Jira ni codigo previo; greenfield. Decision: niveles NO se asocian a tributacion.
- **SP10-TRIB-1 Revisar la maqueta de tributacion** (reunion + analisis de la propuesta). Analisis, Bajo. Q: existe la maqueta documentada (Confluence/Figma)? que objetos introduce y como se relacionan con malla y matriz?
- **SP10-TRIB-2 Desarrollar la vista de tributacion (nueva version)**. Feature, Alto. Depende de TRIB-1. Q: mod propio o parte de curriculum-mapping? Candidato a Aduana (frontera core/mod).

## D. Dashboard Home Curriculum Design (Alex, Gian)
Base: Report Builder e infra de dashboards Finalizada (UPONE-1508/1387/1286/1226/1088).
- **SP10-DASH-1 Disenar y configurar el Dashboard Home de Curriculum Design** con Report Builder + Flex Monster (vista de ingreso; JSON + GraphQL). Fix/config+exploracion, Medio. Proposito: validar limites tecnicos antes de migrar reporteria. Repo report-builder+suite. Q: que metricas debe mostrar el home? (el acta no las fija).

## E. Migracion cliente Ibero (Esteban, Daniel)
Ya existe UPONE-1682 "POC: Carga de datos curriculares de IBERO" (Backlog); el acta lo activa.
- **SP10-IBE-1 Migrar datos de Ibero: tenant y carga inicial** (nuevo tenant, estructuras dinamicas). Feature, Alto. Relacion: UPONE-1682. El PO decide si sp10 es ese ticket o uno hijo.
- **SP10-IBE-2 Configurar programa de asignatura de Ibero y detectar stoppers** vs capacidades estandar UP1 (config JSON). Fix/analisis, Medio. Q: los stoppers alimentan tickets de extension core/mod? registrar cada stopper como hallazgo.

## F. Legacy y despliegues (Daniel + equipo)
Mayormente proceso/ops, no desarrollo UP1.
- **SP10-DEP-1 Documentar y capacitar despliegues, descentralizar** (casos Rosario, version segura; capacitar Alex/Yan/Pancho a QA; antes de vacaciones de Daniel). Proceso/doc, Medio.
- **SP10-DEP-2 Revisar y optimizar el flujo de despliegue** (reunion jueves). Analisis, Bajo.
- **SP10-DEP-3 [Legacy] Bloqueo en generacion masiva de PDFs via MAT** (el volcado se bloquea al publicar y deja de generar; resuelto puntual regenerando 9,000 PDFs, root cause sigue). Bug soporte, Medio. Q: se aborda el root cause este sprint o queda reactivo?

## Preguntas dirigidas
- PM/negocio: CM-3/CM-4 viven en curriculum-mapping o learning assessment? CM-5 quien define las recetas? TRIB-1 existe la maqueta?
- Dev/core: CM-4 resolver tension con M-12; MCP-1 alcance de "normalizar"; MCP-2 OAuth mergeado?; TRIB-2 mod propio o cm (Aduana).
- Consultoras (Sandra/Cami): gobernanza de edicion de la matriz por asignacion de unidades (UPONE-1688 en Backlog).

## Fuera de alcance / decisiones cerradas
- Automatizacion de despliegues QA con Claudito: requiere analisis de seguridad primero (requiere mas debate).
- Actualizacion de Node/libreria en Legacy: descartada.
- Niveles de desarrollo a nivel de tributacion: descartado (van en la matriz).
- Politicas de agregacion por competencia (matrices no uniformes): ya eliminadas en M-12; no se revierte.
