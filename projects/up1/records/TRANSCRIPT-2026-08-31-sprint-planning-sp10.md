---
id: TRANSCRIPT-2026-08-31-sprint-planning-sp10
project: up1
type: transcript
module: curriculum-mapping
---

Fuente: notas por Gemini de la reunion "Sprint Planning uP1" del 2026-08-31 11:00 GMT-04:00.
Asistentes: Esteban Cortes Sandoval, Eduardo Bacon, Francisco Navarro, Gian Adofacci, Giovanni Gonzalez, Alexander Reisenegger, Daniel Galvez.
Sprint: SP10. Continuacion del refinamiento SP10 del 2026-08-26 (record TRANSCRIPT-2026-08-26-refinamiento-up1-sp10).

## Resumen
Planificacion de sprint enfocada en funcionalidades de curriculo (matriz de competencia, medicion, tributacion, dashboard) y estrategia de migracion tecnica hacia la plataforma MCP. El alcance de desarrollo se limita a configuracion, carga de datos y diagnostico; se prohibe implementar nuevas extensiones salvo validacion explicita.

## Decisiones acordadas
- Alcance del sprint limitado a configuracion, carga de datos y diagnostico. Prohibido implementar nuevas extensiones.
- Estimacion de 13 puntos para las nuevas tareas de carga/config (Gian + Daniel), utiles tambien como onboarding.
- Estimacion de 5 puntos para el ajuste de roles (Eduardo), dado que gran parte de la exploracion se hizo el sprint anterior.
- Adopcion del diseno existente de programas de estudio por sobre la maqueta para los modulos de curriculum mapping (prevalece lo que ya existe en UP1).
- Estrategia MCP: priorizar diagnostico de reconciliacion por modulo (curriculum-design y curriculum-mapping) para evaluar conformidad con el MCP, evitando modificar logica existente salvo que sea de implementacion simple.
- Alcance inicial de tributacion: habilitar al menos un flujo funcional operativo para alimentar la visualizacion de datos.
- Nuevo criterio de aceptacion transversal: los desarrollos deben considerar la conexion con MCP a nivel de servicios; la logica de negocio no debe residir exclusivamente en el cliente/front (evita duplicar mantencion). En alta carga se podria lanzar funcionalidad solo por MCP si reduce tiempo de desarrollo.

## Proximos pasos (asignados)
- [Giovanni, Alex] Revisar descripcion del ticket del dashboard en pestaña Home (Curriculum Design). Levantar dudas durante el dia.
- [Gian, Daniel] Configurar programa asignatura: cargar datos desde legacy (Ibero) al tenant TEST de UP1 y diagnosticar que estructuras/configuraciones no se pueden mapear. Documentar hallazgos.
- [Esteban] Habilitar cuentas de servicio para carga programatica.
- [Esteban] Consultar a Klaus por el flujo de despliegue de las apps de assessment/evaluacion en el tenant TEST.
- [Francisco] Configurar acceso al rol de administrador global segun restricciones del sistema.
- [Francisco] Ajustar interfaz del modulo: ordenar mantenedores, actualizar nombres de vistas en matrices de competencia, y que los sub-mantenedores aparezcan como botones.
- [Esteban] Transformar la maqueta a requerimientos tecnicos y contrastar con develop para identificar brechas.
- [Esteban] Publicar artefactos/maqueta con desagregaciones en linea, separando alcance de tributacion vs malla.
- [Eduardo] Diagnostico MCP: analisis de conciliacion de los modulos con la plataforma central; identificar logicas de negocio a migrar de cliente hacia servicios.
- [Eduardo] Cargar inventario de elementos pendientes de ajuste para la reconciliacion con MCP.
- [Esteban] Consultar a Klaus si los objetos se sincronizan automaticamente entre tenants (test vs produccion).
- [Gian, Daniel] Extender la configuracion de layouts (hoy limitada al tenant UPU) para incluir el tenant TEST y permitir que las apps sean visibles alli.
- [Esteban] Agregar a Daniel, Jar, Alex y Giovanni a los canales de comunicacion de migracion/soporte.

## Detalles tecnicos relevantes
- Acceso dev/test via Clerk: usar correo con sufijo "+clerk_test" antes de la arroba y codigo fijo 4242 (evita el limite mensual de correos de Clerk).
- Tenant = cliente; cada tenant es una base de datos distinta, misma aplicacion. Se trabaja en tenant "test" (slash test en vez de slash UPU).
- Cuentas de servicio: permiten permisos por objeto y accion con fecha de expiracion, para carga programatica hacia la BD del servidor. Ya existen en UP1.
- Dashboard Home: usar capacidades existentes del report; solo extender si tras validacion no alcanza. Debe quedar como vista home del modulo curriculum-design.
- Matriz de competencia v26: unificar mantenedores bajo "Matrices de competencia" con sub-mantenedores (escalas de desempeno, niveles de desarrollo) como botones en vez de pestanas; normalizar terminologia y que no salga el nombre crudo del objeto; respetar el patron ya existente en UP1 (programa asignatura), no la maqueta.
- Pestana Medicion: consolida escalas de desempeno + niveles de desarrollo + modelo de medicion (competencia / competencia-criterio / competencia-resultado de aprendizaje), con guia visual (modal) y opciones preestablecidas (estandar=promedio, escalonado=nivel representativo con promedio, mejor evidencia) mas personalizacion total.
- Niveles de desarrollo en competencias: introduce/reinforce/master, provenientes de la asociacion del esquema de nivel de desarrollo (antes "esquema de cobertura").
- Tributacion: capability habilitada por tener curriculum-mapping, pero la accion se ejecuta desde curriculum-design (plan de estudio). Vistas por asignatura y por competencia. Config de tipo de contribucion (desarrolla/evalua) y nivel de desarrollo; calculo automatico de porcentajes (reparto ponderado, ej. 50/50). Tributacion masiva: una competencia a muchas asignaturas de distintos periodos, o muchas competencias a una asignatura. Peor escenario del sprint: solo visualizar y cargar datos sin accion completa. Ideal: dejar al menos un flujo de tributacion operativo. La vista es muy similar al componente de malla ya existente (habria que ampliarlo).
- MCP: el MCP MVP oficial ya esta listo. La migracion no es 1:1 (formato y base tecnologica distintos). Se detecto logica de negocio en el cliente (front) en curriculum-design y curriculum-mapping que deberia migrarse a los servicios. El sprint hace diagnostico de reconciliacion por modulo, no implementacion.
- Layouts multi-tenant: las configuraciones de layout (JSON) que definen visibilidad de apps estan hoy limitadas al tenant UPU; hay que agregar el tenant test. Duda abierta: si los objetos existen ya en el tenant test o quedaron atras por trabajar solo en UPU (bloqueo por rapidez). Klaus indico que hacer visibles las apps en un tenant es "decision de programacion" (hay que mandar codigo/config).
- Roles: el rol admin todavia no esta normalizado; el rol administrador global es el unico que no se puede asignar desde la aplicacion.
- Problemas de acceso: Gian debe usar Edge en vez de Chrome por un error al ingresar.
- Documentacion tecnica: en formato markdown dentro de cada repositorio (decisiones, BD, arquitectura).
- Cliente objetivo de la carga: Ibero (ambiente legacy).
