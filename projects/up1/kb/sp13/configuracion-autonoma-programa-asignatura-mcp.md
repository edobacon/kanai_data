---
id: DOC-kb-sp13-configuracion-autonoma-programa-asignatura-mcp
project: up1
type: doc
module: curriculum-design
tags:
  - UPONE-1748
  - mcp
  - layouts
  - fuente
  - esteban-cortes
---

# Configuración autónoma del programa de asignatura vía MCP

Fuente original: documento de Esteban Cortes del 2026-10-09 (artifact de Claude Docs, "Configuración autónoma del programa de asignatura vía MCP"). Copiado tal cual al KB para dejar trazabilidad. Los documentos derivados son [[dossier-core-configuracion-layouts-mcp]] y [[explicativo-gian-esteban-layouts-mcp]].

## Resumen

Hoy un consultor no puede configurar por MCP la ficha del programa de asignatura de su cliente. Lo validamos en dos ambientes (DEV y STAGING) y las cinco limitaciones encontradas son reales y bloqueantes.

La necesidad es que cada cliente organice a su manera la información del programa de asignatura y que el consultor lo configure solo, conversando con un asistente vía MCP. Para lograrlo proponemos tres frentes: ampliar el canal MCP, crear herramientas específicas para configurar vistas y definir una versión de la ficha por cliente que las actualizaciones no sobrescriban.

## La necesidad

Cada cliente organiza de forma distinta la información que llena en el programa de asignatura: qué pestañas usa, en qué orden, qué campos muestra y cómo los nombra. Hoy todos los clientes ven la misma ficha estándar.

Queremos que cada consultor pueda adaptar esa ficha para su cliente de forma autónoma, sin depender del equipo de desarrollo ni de un despliegue. El canal elegido es el MCP: el consultor describe el cambio a un asistente de IA y el asistente lo aplica sobre la configuración de la vista.

En términos técnicos, la ficha es un layout de tipo `RecordDetail` sobre el objeto `Activity` (`default_Activity_view` para ver y `default_Activity_edit` para editar). Su estructura vive en el campo `layoutConfig`, un JSON con el `schema` de campos y las `tabs` que los agrupan.

## El flujo esperado del consultor

Este es el recorrido que debería poder hacer un consultor, conversando con el asistente, para configurar la ficha de su cliente:

1. **Revisar** cómo está configurada la ficha hoy.
2. **Ajustar la estructura:** agregar, quitar u ocultar pestañas.
3. **Ordenar** las pestañas según cómo trabaja el cliente.
4. **Ajustar campos:** etiquetas, anchos y campos visibles por pestaña.
5. **Previsualizar** el cambio y confirmarlo.
6. **Publicar** la ficha para los usuarios del cliente.
7. **Mantenerla** en el tiempo: nuevos ajustes y actualizaciones de la plataforma.

Los hallazgos de este documento se leen contra estos siete pasos.

## Lo que probamos

Hicimos dos rondas de pruebas independientes sobre el canal MCP de uPlanner One, con el mismo resultado.

| | Gian Adofacci | Esteban Cortés |
|---|---|---|
| Fechas | 6 al 8 de octubre de 2026 | 9 de octubre de 2026 |
| Ambiente | up1-dev, tenant TEST | STAGING, tenant UPU |
| Caso | Publicar los layouts Ibero de `Activity` (UPONE-1748) | Validar los hallazgos de Gian sobre un layout de prueba aislado |
| Método | 8 pruebas: bisección de tamaño, actualización parcial, objetos desechables | Vistas previas de tamaño y orden; escrituras sobre `probe_secciones_personalizadas` |
| Resultado | No logró publicar el layout por MCP; lo hizo por sincronización del repositorio | Confirmó las limitaciones; el umbral de tamaño es incluso más bajo |

En STAGING, la prueba central fue crear una ficha de prueba con dos pestañas (General y Secciones personalizadas) para el programa Ecuaciones Diferenciales y luego enviar un cambio que solo incluía la pestaña General. El resultado quedó registrado en capturas: la ficha perdió la otra pestaña y toda la definición de campos.

## Hallazgos: impacto en el consultor

Las cinco limitaciones bloquean los pasos 2 a 7 del flujo. Solo el paso 1, revisar la configuración, funciona completo.

| Limitación | Pasos afectados | Qué le pasa al consultor |
|---|---|---|
| **Tamaño** | 2, 3 y 4 | El cliente pide renombrar "Resultados de aprendizaje" a "Logros de aprendizaje". Aunque es una palabra, hay que enviar la ficha entera, de más de 30 KB, y el canal la rechaza con un error genérico. No puede hacer ningún ajuste, por chico que sea. |
| **Todo o nada** | 2 y 4, con riesgo sobre el 6 | El cliente quiere ocultar Secciones personalizadas. El asistente envía solo la parte modificada y la ficha queda únicamente con eso, para todos los usuarios del cliente a la vez. |
| **Orden** | 3, y el 2 al agregar pestañas | El cliente quiere Evaluación antes que Contenidos. Las pestañas se guardan en orden alfabético por su clave interna: Secciones personalizadas (`custom`) queda antes que General (`general`). |
| **Sin aviso previo** | 5 | Un campo mal escrito pasa la vista previa y falla al guardar con "error inesperado", sin decir qué corregir. Y un guardado exitoso no muestra qué quedó, así que el consultor puede borrar media ficha sin notarlo. |
| **No persistente** | 6 y 7 | Una ficha propia del cliente no es alcanzable desde el listado, que siempre abre la estándar. Y si se modifica la estándar, la siguiente actualización de la plataforma la sobrescribe. |

A esto se suma que no hay forma de deshacer: si un ajuste deja mal la ficha, el número de versión indica cuántas veces cambió, pero no guarda el contenido anterior.

## Hallazgos: detalle técnico

### 1. Tamaño

El canal rechaza cualquier llamada de `up1_create_object` o `up1_update_object` sobre cierto tamaño de payload. En DEV el umbral quedó entre 5,4 y 15 KB; en STAGING, entre 4 KB (pasa) y 8 KB (falla).

El rechazo ocurre incluso en la vista previa, sin `confirm`, y con un payload de relleno sin campos especiales (`req_011CfrgdeVM7sYoosqHK6hKD`). Como nunca llega un error de validación de negocio, el corte está antes del servidor de UP1: en el servidor MCP, en un gateway o en el transporte. No sabemos cuál.

`default_Activity_view` (13 pestañas, 11 `record-list`, un `composite-section-tree`) supera los 30 KB por estimación. Cada `record-list` cuesta unos 1.200 caracteres. Gian intentó adelgazar el layout Ibero de 14,8 KB y llegó a 8,3 KB sacrificando funcionalidad, sin entrar en el límite.

### 2. Todo o nada

`up1_update_object` reemplaza el campo completo. No soporta merge parcial (RFC 7396), rutas con punto ni operaciones de patch; su esquema tiene `additionalProperties: false` y solo acepta `id`, `objectType`, `data` y `confirm`.

Sobre el layout de prueba `activity_detail_88c224` enviamos `{"layoutConfig": {"tabs": {"general": …}}}`. Después de guardar, `layoutConfig` contenía solo `tabs.general`: se perdieron `mode`, `relationDisplayFields`, todo el `schema` y la otra pestaña. Combinado con el punto 1, no se puede fragmentar un cambio en llamadas chicas: la última siempre lleva el JSON completo.

### 3. Orden

Las claves de los objetos JSON llegan ordenadas alfabéticamente, y `RecordDetail` dibuja las pestañas en el orden de las claves de `tabs`. Armamos las pestañas como `zeta`, `alfa`, `beta` y la llamada salió ordenada antes de llegar al servidor.

El problema está en el cliente MCP, no en el servidor: `default_Activity_view` conserva sus pestañas en orden no alfabético porque se carga por la sincronización del repositorio. El parche de prefijar claves (`01_general`) rompe las traducciones centralizadas. Lo de fondo es que un objeto JSON no garantiza orden; `tabs` debería ser un arreglo o tener un campo `order`.

### 4. Sin aviso previo

La vista previa solo devuelve el payload recibido, sin validar campos ni tipos. Aceptó `campoInexistente` sin advertencia; al confirmar, el servidor lo rechazó con "An unexpected error occurred in UP1", sin nombrar el campo. Los errores de tamaño son igual de genéricos.

Tras una escritura exitosa la respuesta es `{"data": null}`; para saber qué quedó hay que leer el registro aparte. Gian reportó en DEV que un fallo por tamaño modificó `updatedAt` sin persistir datos ni dejar auditoría; en STAGING, con un fallo por validación, el registro quedó intacto.

### 5. No persistente

Los layouts `default_*` se cargan desde `mods/curriculum-design/config/layouts/` con el initContainer `sync-schema`, que escribe directo en Postgres vía Prisma en cada despliegue. Los de UPU en STAGING tienen `updatedById: null` y se actualizaron el 9 de octubre de 2026 a las 11:51 UTC sin edición manual.

Además, `default_Activity_list` apunta de forma fija a `default_Activity_view` en `associatedLayoutConfigs`, así que un layout del cliente no es alcanzable sin modificar también el listado.

### Versionado

`version` sube solo cuando el update toca `layoutConfig`: pasó de 1 a 2 al cambiarlo y no se movió al cambiar `label`. Cuenta cambios, pero no guarda el contenido anterior.

## Qué sí funciona hoy

Con el canal actual el consultor puede diagnosticar y armar prototipos, pero no configurar la ficha real del cliente.

- **Revisar la configuración:** lectura completa de layouts con `up1_query_records` y `up1_get_object`.
- **Ajustes menores:** cambios de metadatos chicos como `label`, `isActive`, `applicationId` y `ownerId`.
- **Fichas chicas:** creación de layouts de menos de 4 KB, por ejemplo una ficha resumida de dos o tres pestañas sin tablas. Gian creó uno de 444 caracteres en DEV; nosotros uno de unos 2 KB en STAGING.

## Lo que queremos lograr

El objetivo es que el consultor recorra los siete pasos del flujo conversando con el asistente, sin riesgo de romper la ficha y sin que las actualizaciones borren su trabajo.

### Capacidades objetivo

| Paso del flujo | Lo que el consultor debería poder pedir | Garantía esperada |
|---|---|---|
| 2. Ajustar la estructura | "Oculta la pestaña Secciones personalizadas" o "agrega una pestaña Adjuntos" | Solo cambia lo pedido; el resto de la ficha queda intacto |
| 3. Ordenar | "Pon Evaluación antes de Contenidos" | El orden es el que define el consultor |
| 4. Ajustar campos | "Renombra Resultados de aprendizaje a Logros" o "muestra Créditos a media columna" | El cambio se aplica igual en la vista y en la edición |
| 5. Previsualizar | Ver el resultado antes de confirmar | La vista previa valida y explica cualquier error con el campo exacto |
| 6. Publicar | Que los usuarios del cliente vean su ficha al abrir un programa | La navegación lleva a la ficha del cliente sin tocar la de otros |
| 7. Mantener | Volver a una versión anterior si algo sale mal | Las actualizaciones no sobrescriben la ficha del cliente y hay historial recuperable |

### Propuesta técnica

1. **Ampliar el canal y aclarar los errores (infraestructura).** Subir el límite de payload a 50 KB o más y devolver errores específicos: 413 con el límite informado, y el campo inválido en los errores de validación. Desbloquea layouts grandes, aunque se siga enviando el JSON completo.
2. **Herramientas MCP para configurar vistas (producto).** Operaciones de negocio chicas, como agregar, mover u ocultar pestañas y campos, que el servidor aplique sobre el JSON guardado. Cada llamada pesa unos cientos de bytes, el servidor controla el orden y valida antes de guardar (elementos presentes en el `schema`, campos existentes en el objeto, capabilities válidas), y mantiene sincronizados los layouts de vista y edición. Como paso intermedio, soportar JSON Merge Patch en `up1_update_object`.
3. **Versión de la ficha por cliente (producto y plataforma).** Un mecanismo de override para que el layout del cliente tenga prioridad sobre el default, que la sincronización del repositorio no lo sobrescriba y que la navegación resuelva cuál abrir. Debe incluir historial de versiones del contenido para poder volver atrás.

## Decisiones pendientes y próximos pasos

Antes de construir hay que cerrar tres definiciones; el orden importa porque la primera condiciona el diseño de las herramientas.

- [ ] **Modelo de override por cliente:** cómo convive la ficha del cliente con la default, cómo resuelve la navegación cuál abrir y cómo se protege de la sincronización del repositorio. Responsable: [por definir].
- [ ] **Límite y errores del canal MCP:** evaluar con infraestructura subir el límite a 50 KB o más y devolver errores específicos. Responsable: [por definir].
- [ ] **Alcance de las herramientas de configuración de vistas:** qué operaciones entran en una primera versión y si se agrega JSON Merge Patch como paso intermedio. Responsable: [por definir].
- [ ] **Orden de pestañas:** decidir si `tabs` pasa a ser un arreglo o incorpora un campo `order`, para que el orden no dependa de las claves. Responsable: [por definir].
- [ ] **Revisión del bug de `updatedAt`:** confirmar en el servidor si un fallo puede modificar el registro sin persistir datos ni dejar auditoría. Responsable: [por definir].
- [ ] **Limpieza:** borrar el layout de prueba `probe_secciones_personalizadas` (`activity_detail_88c224`) de STAGING una vez revisado.

## Referencias

- MCP payload: bloqueo UPONE-1748, reporte de Gian Adofacci, v3 del 8 de octubre de 2026 (DEV, tenant TEST).
- Documentación funcional del mod Curriculum Design, en Confluence (https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2364866565/Curriculum+Design).
- RecordDetail (ES), guía de configuración de layouts de detalle (https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1944780813/RecordDetail+ES).
- Validación en STAGING, tenant UPU, 9 de octubre de 2026: layout de prueba `probe_secciones_personalizadas` (`activity_detail_88c224`) sobre el programa Ecuaciones Diferenciales; request de la prueba de tamaño `req_011CfrgdeVM7sYoosqHK6hKD`.
- Sprint Review 28, slide 68: resumen visual de los hallazgos con las capturas de la prueba.
