---
id: TRANSCRIPT-2026-08-26-refinamiento-up1-sp10
project: up1
type: transcript
module: curriculum-mapping
---

## Metadata de la reunion
- date: 2026-08-26
- duration: 01h23m15s
- sprint: sp10
- module: curriculum-mapping (multi-dominio: tambien curriculum-design, MCP, tributacion, dashboard)
- participants:
  - esteban.cortes@uplanner.com (Esteban Cortes Sandoval - PO / modelador / define alcance)
  - eduardo.bacon@uplanner.com (Eduardo Bacon - dev / MCP / curriculum-design; asume la vista de tributacion)
  - francisco.navarro@uplanner.com (Francisco Navarro "Pancho" - dev / curriculum-mapping / MCP)
  - Gian Adofacci (dev / onboarding; dashboard home)
  - Giovanni Gonzalez (dev / onboarding; dashboard home; entorno local)
  - Alexander Reisenegger (dev / onboarding; dashboard home; QA despliegues)
  - Daniel Galvez (despliegues / QA; se va de vacaciones)
- external_refs: UPONE-1744 (MCP MVP, done), UPONE-1530 (MCP sync, done), UPONE-1633 / UPONE-1689 (matriz adopcion+competencias, developing), UPONE-1688 (gobernanza matriz por unidad, backlog), UPONE-1682 (POC carga Ibero, backlog), UPONE-1537 (matriz datos generales, done)
- covers_questions:
  - Que se refino para SP10: rediseno de la matriz en 3 pestanas, nomenclatura (niveles de desarrollo / escala de desempeno), reglas de agregacion, normalizacion del MCP, vista de tributacion, dashboard home de Curriculum Design, migracion Ibero y descentralizacion de despliegues Legacy?
- extracted: true (via kn-identify-scroll)
- extracted_at: 2026-08-28
- fuente / attachment: PDF "Refinamiento uP1 - Notes by Gemini" (resumen + proximos pasos + detalles + transcripcion verbatim ~1h23m). El verbatim integral vive en el PDF fuente y la grabacion.
- material derivado: doc de alcance sp10 = record DOC-refinamiento-up1-sp10 (artifact https://claude.ai/code/artifact/47750d63-9bdc-4f7a-971b-aea425de0fd8)

## Resumen
Se unifico el equipo hacia UP1 (se minimiza Legacy) y se definio la nueva estructura de la matriz de competencias. Tres ejes: reorganizacion hacia UP1, herramientas tecnicas (dashboards + MCP), y rediseno de la matriz en 3 pestanas con configuraciones preestablecidas.

## Decisiones
### Requiere mas debate
- Automatizacion de despliegues en QA con 'Claudito' (Claude): requiere analisis de restricciones de seguridad antes de implementar.
### Acordadas
- Descentralizacion de despliegues Legacy (repartir la responsabilidad).
- Dashboard de Curriculum Design: prioridad crear el home usando Report Builder nativo, para validar limites tecnicos.
- Migracion del cliente Ibero: inicia el proximo sprint, con tenant especifico.
- Nomenclatura estandarizada de la matriz: "niveles de desarrollo" y "escala de desempeno".
- Ubicacion de asociacion de niveles: a nivel del desarrollo de la matriz, NO a nivel de tributacion.
- Estrategia de configuracion simplificada: modelo estandar predefinido + ajustes avanzados por pasos.

## Proximos pasos (tareas con responsable)
- [Daniel Galvez] Documentar despliegues (casos Rosario, version segura) y capacitar (Alex, Yan, Pancho) a nivel QA antes de sus vacaciones.
- [Daniel, Alex, Yan, Francisco, Eduardo, Esteban] Revisar flujo despliegue (reunion jueves; reducir tareas repetitivas).
- [Alexander Reisenegger, Giovanni Gonzalez] Configurar dashboard home de diseno curricular con Report Builder (plantillas de datos + visualizaciones).
- [Giovanni Gonzalez] Configurar entorno local (BD, permisos admin; rol via cor_role_assignment en PostgreSQL 5432).
- [Esteban Cortes] Migrar datos Ibero (nuevo tenant, carga inicial, estructuras dinamicas).
- [Daniel Galvez] Configurar programa de asignatura de Ibero y ajustes de config en UP1.
- [Francisco Navarro, Eduardo Bacon] Normalizar MCP: adaptar elementos y capacidades del MCP a la nueva estructura.
- [Francisco Navarro] Ajustar matriz de competencias: adecuaciones del formulario, cambio de nombres de mantenedores, nuevas reglas de agregacion.
- [Esteban, Francisco, Eduardo] Revisar maqueta de tributacion (reunion); Eduardo Bacon asumira el desarrollo de la vista de tributacion.

## Detalles (timestamps clave)
- 00:13:19 Migracion en tres apps: curriculum design, curriculum mapping (matrices + tributacion), learning assessment (reporteria, medicion de competencias, perfiles de egreso).
- 00:16:20 / 00:29:11 Dashboard Home en Curriculum Design con Report Builder + Flex Monster; base JSON + GraphQL; sirve para explorar el esquema y entender limites antes de migrar reporteria.
- 00:55:29 Normalizacion e integracion del MCP: el core sistematiza el PoC para liberarlo en la nube; criterio de aceptacion obligatorio: usar el MCP ante nuevas capacidades o modificaciones en UP1.
- 00:56:53 Pendiente con consultoras: edicion restringida de gobernanza de la matriz segun asignaciones de unidades (UPONE-1688).
- 00:59:58 Revision del flujo de la matriz (con Sandra y Cami): se mantiene; renombrar mantenedores a "niveles de desarrollo" y "escala de desempeno".
- 01:01:43 / 01:04:34 Niveles de desarrollo asociados a la matriz; agregacion cuantitativa para el perfil de egreso (promedios ponderados, notas maximas, mejor resultado); supliendo la falta de logica sistematica en BI.
- 01:08:38 / 01:14:35 Rediseno de la matriz en 3 pestanas: (1) informacion general con mapeo, (2) adopcion con reglas mejoradas para planes, (3) competencias con herramientas de diseno y alertas. Objetivo: persistir resultados calculados en el modelo de datos para que la reporteria muestre consolidado sin reglas en runtime.
- 01:18:53 Recetas globales preestablecidas + MCP para guiar la conversacion de diseno curricular.
- 01:23:15 Cierre: revision de tareas con Francisco y Eduardo; Eduardo Bacon asume la vista de tributacion en la nueva version.
