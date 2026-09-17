---
id: TRANSCRIPT-2026-09-14-sprint-planning-sp11
project: up1
type: transcript
module: curriculum-mapping
---

## Metadata de la reunion

- **date:** 2026-09-14
- **duration:** 01:15:39
- **sprint:** SP11 (se planifica SP11; los restantes se mueven a SP12)
- **participants:**
  - Esteban Cortes Sandoval (lead / conduccion del planning) — email no confirmado
  - Eduardo Bacon (eduardo.bacon@uplanner.com) — dev, dominio MCP/curriculum
  - Francisco Navarro (francisco.navarro@uplanner.com) — dev, migracion curriculum-mapping / MCP
  - Gian Adofacci (gian.adofacci@uplanner.com) — dev, curriculum-design (replica de estructura, carga IBERO)
  - Alexander Reisenegger — dev, se suma a exploracion CM/config UP1 — email no confirmado
- **external_refs:** UPONE-1693 (core-extension, En revision), UPONE-1748 (CD carga IBERO, Developing, Gian), UPONE-1756 (Tributacion CRUD grilla, Finalizada), UPONE-1757 (CD MCP diagnostico, Finalizada), UPONE-1758 (CM MCP diagnostico, Developing, Francisco). "ticket 404" (auth multi-tenant UPC) y "ticket 1170" (exploratorio CM) citados en reunion pero NO confirmados como claves UPONE.
- **covers_questions:** foco del sprint bajo capacidad reducida; migracion de curriculum-mapping al MCP; fix de bloqueo de mutaciones genericas y su impacto en Academic Scheduling; guardados parciales vs validacion estricta; matriz de funcionalidad; auth multi-tenant UPC; recorte de tributacion; postergacion de reportes CCB.
- **extracted:** 2026-09-14 (por kn-identify-scroll)
- **procedencia:** PDF "Sprint planning - 2026_09_14 11_01 GMT-03_00 - Notes by Gemini.pdf" (notas + transcripcion generadas por Gemini; grabacion referenciada). Notas de IA, pueden contener errores de transcripcion (nombres fonetizados: MCP aparece como "NCP/MCT/NP"; Claude/Claus como "Claus/Claudito"; el diseno base "Elric/Elrick").

## Resumen

Planificacion de SP11 con capacidad reducida (ausencia de Dani y Yova por ~2-3 semanas; equipo en modo alerta atendiendo soporte legacy). El esfuerzo principal del sprint se orienta a **curriculum mapping** y la homologacion de sus logicas al MCP, segun la capacidad real. Tributacion se acota a una sola tarea autocontenida. Los reportes de CCB se posponen por capacidad.

## Decisiones

**Acordadas**
- **Foco del sprint en curriculum mapping** y homologacion de sus logicas al MCP segun capacidad.
- **Tributacion acotada a 1 tarea** autocontenida (continuacion de lo del sprint anterior).
- **Se avanza en MCP y curriculum mapping aunque el fix de bloqueo (rama del core) no este aprobado** (es camino de seguridad, no bloqueante para seguir).
- **Preservar la flexibilidad de usuario en validaciones**: permitir guardados parciales; no forzar validaciones estrictas al backend que perjudiquen la usabilidad. Las validaciones "de diseno" del front se mantienen; la validacion completa ocurre en el paso a vigente.
- **Generar una matriz de funcionalidad + checklist** para trazar el estado de los mantenedores y dimensionar la deuda de curriculum mapping con el MCP.
- **Postergar los reportes de CCB** por capacidad.
- **Implementar auth multi-tenant en UPC QA** durante el sprint (deadline tentativo 30-sept, sujeto a validacion con consultoria).
- **Alcance inicial de migracion de curriculum mapping al MCP**: comenzar por los dos mantenedores previos a la matriz de competencia (escala de cobertura y niveles de desempeno).

**Requiere mas debate**
- **Validacion del fix con Academic Scheduling**: el bloqueo de mutaciones genericas rompe un patron de codigo que Academic Scheduling usa (los deja con undefined). Se propone pedir a Academic Scheduling que corrija su patron de acceso al contexto en su lado, en vez de que el core absorba ese flujo. Queda sujeto a validacion con ese equipo y aviso a Claus.

## Proximos pasos (acciones)

- [Esteban] Planificar el fix de bloqueo para la segunda mitad de la 2da semana del sprint.
- [Eduardo] Seguimiento del ticket 1693 (core) sobre el estado.
- [Esteban] Consultar a Claus la ubicacion de la informacion en el panel.
- [Eduardo] Seleccionar UNA tarea de extension de tributacion autocontenida.
- [Eduardo] Informar a Claus el contexto y motivos tecnicos del ajuste del MCP (block generic).
- [Eduardo] Crear ticket Curriculum Design: implementar la logica faltante en el cliente de CD.
- [Francisco] Continuar migracion e integracion de Curriculum Mapping con el MCP.
- [Eduardo] Crear ticket exploratorio: estado de Curriculum Mapping respecto al MCP.
- [Esteban] Crear matriz funcional: matriz de funcionalidades actuales a partir del codigo + MCP para trazabilidad.
- [Eduardo] Crear tickets curricular: implementacion de mantenedores en el mapeo curricular dentro del MCP.
- [Eduardo] Gestionar merge request: aprobacion del fix en el core + coordinar validacion con Academic Scheduling.
- [Gian] Compartir documentacion: subir los MD generados (progreso) para que revisen Alex y Dani (ticket 1748).
- [Esteban] Coordinar con Luis la config de auth multi-tenant para QA.
- [Eduardo] Configurar auth multi-tenant en el ambiente QA de UPC (ticket 404).
- [Esteban] Agendar reunion de revision del avance de diseno curricular con Gian y Alex (manana 11:00).

## Detalles (con timestamps)

- **00:00-00:11 Capacidad reducida y foco:** equipo reducido ~2-3 semanas (sin Dani ni Yova), modo alerta por soporte legacy. Planificacion acotada de UP1 y Legacy. Tributacion: ~13 puntos ya cubren harto del sprint anterior; se deja 1 tarea. Seguimiento a ticket 1693 (core, en desarrollo, detectado por Giovanni).
- **00:04-00:07 Estado de Curriculum Design:** Gian replica estructura (cuadro resumen, cambio de workflow, tabs de secciones dinamicas) contra un MD dejado por Dani; pruebas locales para resolver fallas de login y probar el traspaso de datos. Aun no se envio nada al tenant de test (solo bases locales).
- **00:12-00:20 Bloqueo de mutaciones genericas y su impacto en Academic Scheduling:** el core permitia mutaciones genericas que evitaban las reglas/validaciones de los mods. El fix (rama de Francisco) bloquea update/delete directo sobre tablas prohibidas por el mod, exigiendo pasar por las tools del mod. Efecto colateral: rompe un patron que Academic Scheduling usa (undefined). Se acuerda validar con ese equipo si pueden corregirlo de su lado, e informar a Claus la propuesta.
- **00:22-00:29 Continuacion sin aprobacion + brecha de CM:** avanzar aunque el fix no este aprobado (es camino de seguridad). Curriculum Design quedo casi MCP-compatible (base del diseno inicial de "Elric"); falta un ticket menor (~2 SP) para cerrar unas logicas que hoy viven solo en el cliente. Curriculum Mapping es la brecha grande (~13 puntos): sus logicas de flujo no se alinearon con el diseno inicial y requieren homologacion considerable al MCP.
- **00:30-00:47 Guardados parciales vs validacion estricta:** al migrar validaciones al servidor se decide que reglas mantener en el front para permitir guardados parciales (ej. guardar competencias sin sumar 100% durante el diseno), reservando la validacion estricta para el paso a vigente. Se acuerda que el MCP valide la estructura completa al intentar publicar la matriz; Francisco propone alimentar al MCP con ejemplos/formatos esperados para guiar sus respuestas. Los mantenedores previos a la matriz ya tienen validacion en el backend; falta incorporar su contexto dentro de la carpeta del MCP.
- **00:47-00:57 Matriz de funcionalidad y mantenedores:** se generara una matriz/checklist para dimensionar la deuda tecnica y el porcentaje de compatibilidad de curriculum mapping con el MCP. El ticket del bloqueo de mutaciones se cerrara al aprobar el PR del core y validar con Academic Scheduling; luego se crean tareas para implementar los mantenedores pendientes en el MCP. La migracion arranca por los dos mantenedores previos a la matriz (escala de cobertura, niveles de desempeno).
- **00:51-00:53 Arquitectura MCP:** hay un repo de MCP para el core (logicas); la declaracion de objetos y servicios (tools) vive dentro de cada mod. Los mods se mantienen solos mandando los datos al MCP. Mismo patron que UP1 core (record detail con metodos/datos; se declaran objetos para que el MCP los lea).
- **00:57-01:08 Tributacion, migracion y auth UPC:** Eduardo toma una parte acotada de la continuacion de tributacion; Francisco completa la migracion basandose en pruebas previas y un PR pendiente (para probar local hay que levantar el MCP con un comando de Claus y simular un usuario real). Curriculum mapping se enfoca en mantenedores; Alexander se suma a Gian en la exploracion de config de programa/plan de estudio en UP1. Reportes CCB pospuestos. Tickets de soporte Legacy se analizan a las 15:00 (estimado <10 tickets, varios sobre datos). Auth multifactor/multi-tenant UPC (ticket 404): Dani no dejo documentacion; se hara la config en UPC QA, deadline tentativo 30-sept, con soporte de Legacy y coordinacion con Luis.
- **01:08-01:12 Alcance de tickets y revision:** Eduardo estructura los tickets segmentados de matrices y mantenedores (parte por los 2 mantenedores previos a la matriz); revisa el merge del fit/merge con Claus y conversa con Academic Scheduling. Se agenda revision de diseno curricular con Gian y Alex (manana 11:00) y revision de tickets de soporte Legacy (15:00). Se corrige la config del calendario de la daily de UP1 (aparecia sabados y domingos).
