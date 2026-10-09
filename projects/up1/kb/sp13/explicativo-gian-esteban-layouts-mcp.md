---
id: DOC-kb-sp13-explicativo-gian-esteban-layouts-mcp
project: up1
type: doc
module: curriculum-design
tags:
  - UPONE-1748
  - mcp
  - layouts
  - explicativo
  - curriculum-design
---

# Qué están haciendo Gian y Esteban con la ficha del programa de asignatura, qué esperan lograr y qué los detiene

Tipo de documento: explicativo. Audiencia: cualquier persona del equipo que quiera entender el caso sin conocer el contexto. Estado verificado el 2026-10-09 contra los repos `object-manager` (develop, 56013857), `layout` (ce174010) y `mcp` (b6185e9), contra Jira (UPONE-1748, UPONE-1983, UPONE-1798) y contra dos documentos escritos por las personas involucradas.

Leyenda de fuentes: [Código] verificado en el repositorio. [Jira] leído en el ticket. [Doc] dicho en un documento de Gian o Esteban. [Inferido] deducido de varias fuentes, no escrito en ninguna.

## 1. En una frase

Gian y Esteban intentan que un consultor pueda cambiar, conversando con un asistente de IA, cómo se ve y se ordena la ficha del programa de asignatura de un cliente (Universidad Iberoamericana como primer caso). Hoy no pueden, por cinco limitaciones de la plataforma que ya están medidas y demostradas, y que solo el equipo de Core puede resolver.

## 2. Glosario mínimo

| Término | Qué significa en este caso |
|---|---|
| Programa de asignatura | El documento que describe una asignatura: resultados de aprendizaje, contenidos, evaluación, bibliografía, etc. En el sistema es un registro de tipo `Activity`. |
| Ficha | La pantalla donde se ve o se edita ese documento, organizada en pestañas. |
| Layout | La definición de cómo se dibuja una pantalla. Es un registro guardado en la base de datos. |
| `layoutConfig` | El campo del layout que contiene, en formato JSON, la lista de pestañas y de campos. Es "la receta" de la ficha. |
| `default_Activity_view` / `default_Activity_edit` | Los dos layouts estándar de la ficha: uno para ver y otro para editar. Todos los clientes usan los mismos. |
| Tenant | Un cliente dentro de la plataforma, con sus datos aislados. TEST es un tenant de pruebas. UPU es otro tenant, usado en STAGING. |
| MCP | El canal por el que un asistente de IA llama herramientas de UP1 (leer registros, crear, actualizar). |
| Payload | El contenido que se envía en una llamada. Aquí, el JSON del layout. |
| Sync del repositorio | El mecanismo que, en cada despliegue, copia los archivos de configuración del repositorio a la base de datos. |
| Core y mod | Core es el código compartido de la plataforma. Un mod es el módulo de un producto, aquí Curriculum Design. Core decide qué puede hacer la plataforma para todos. |
| Consultor | La persona que configura la plataforma para un cliente, sin ser desarrolladora. |

## 3. Quién es quién [Jira, Inferido]

- **Esteban Cortes** reportó UPONE-1748, eligió la carrera del caso (Fisioterapia), definió las 13 pestañas que debe tener la ficha y escribió los comentarios de alcance. Hoy además tiene asignada UPONE-1983 (pestaña Adjuntos), que toca los mismos layouts. El rol de producto o coordinación es una inferencia por lo que escribe y decide, no un dato del ticket.
- **Gian Adofacci** tiene asignado UPONE-1748, estado Developing. Es quien ejecutó las pruebas técnicas de la primera ronda.

## 4. Qué están haciendo

### 4.1 El trabajo de fondo: UPONE-1748 [Jira]

El ticket pide cargar en el tenant TEST una carrera completa de Ibero (Fisioterapia: dos planes, P4PFT con 54 cursos y P5PFT con 55, 106 asignaturas distintas) y replicar cómo el cliente organiza su programa de asignatura en el sistema anterior. Tiene dos resultados obligatorios: los datos cargados y dos inventarios de brechas, es decir, lo que el sistema nuevo todavía no puede replicar. El ticket dice expresamente que las brechas se registran y no se resuelven dentro de él: alimentan el roadmap de producto.

La ficha que Ibero espera tiene 13 pestañas [Jira, comentario del 2026-09-15]: información general, estructura curricular, rutas formativas, presentación, competencias y resultados, contenidos, justificación, metodología, evaluación, recursos, archivos adjuntos, historial de cambios y versión.

### 4.2 Lo que hizo cada uno en la práctica

| Persona | Fechas | Qué hizo | Fuente |
|---|---|---|---|
| Esteban | 2026-08-31 | Eligió Fisioterapia con conteos que lo justifican (52 programas publicados, 30 en edición, 24 abiertos) y las dos asignaturas para carga profunda. | Jira |
| Esteban | 2026-09-15 | Definió las 13 pestañas y qué hacer con cada una. | Jira |
| Gian | 2026-09-16 y 2026-09-23 | Dejó dos comentarios con capturas de pantalla. El contenido de las imágenes no es legible desde el ticket. | Jira |
| Gian | 2026-10-06 al 2026-10-08 | Intentó publicar el layout de Ibero por el canal MCP en el ambiente de desarrollo. Hizo 8 pruebas y documentó el resultado en un reporte (versión 3). | Doc |
| Gian | hasta 2026-10-08 | Terminó publicando el layout por el sync del repositorio, sin pasar por el MCP. | Doc |
| Esteban | 2026-10-09 | Repitió las pruebas en STAGING sobre un layout de prueba aislado, para confirmar que lo de Gian no era un problema de ese ambiente. | Doc |
| Esteban | 2026-10-09 | Escribió el documento "Configuración autónoma del programa de asignatura vía MCP", con los hallazgos y la propuesta técnica. | Doc |

## 5. Qué esperan lograr

Quieren que un consultor, sin pedir ayuda al equipo de desarrollo ni esperar un despliegue, pueda recorrer este flujo conversando con un asistente [Doc]:

1. Revisar cómo está configurada la ficha hoy.
2. Ajustar la estructura: agregar, quitar u ocultar pestañas.
3. Ordenar las pestañas según cómo trabaja el cliente.
4. Ajustar campos: etiquetas, anchos, campos visibles.
5. Previsualizar el cambio y confirmarlo.
6. Publicar la ficha para los usuarios del cliente.
7. Mantenerla en el tiempo, sin que las actualizaciones de la plataforma borren su trabajo.

Hay una razón de negocio detrás: cada cliente organiza distinto la información del programa de asignatura, y hoy todos ven la misma ficha estándar.

## 6. Qué los detiene

### 6.1 Cómo leer esta sección

Cada limitación tiene tres partes: qué le pasa al consultor, por qué pasa, y cómo se sabe. Solo el paso 1 del flujo funciona hoy. Los pasos 2 a 7 están bloqueados.

### 6.2 Límite 1: el tamaño

**Qué le pasa al consultor.** El cliente pide cambiar "Resultados de aprendizaje" por "Logros de aprendizaje". Es una palabra. Pero la ficha estándar pesa 34.579 bytes y la de edición 23.742 bytes [Código], y el canal rechaza cualquier llamada de más de unos pocos KB [Doc]. Ni el cambio más chico se puede enviar.

**Por qué pasa.** Para cambiar una palabra hay que reenviar la ficha entera (ver límite 2), y la ficha entera no cabe.

**Cómo se sabe.** En DEV el umbral está entre 5,4 y 15 KB. En STAGING pasa con 4 KB y falla con 8 KB [Doc]. Falla incluso en la vista previa y con relleno sin sentido, o sea que no depende del contenido [Doc].

**Qué NO se sabe.** Dónde se corta. Revisé el código: object-manager acepta hasta 20 MB (`object-manager/src/index.js:337`) y el servidor MCP acepta 100 KB, el valor por defecto de Express (`mcp/src/index.js:50`). Ninguno explica un corte entre 4 y 8 KB. El corte está antes del servidor de UP1: en el gateway, en el conector o en el transporte. Sin acceso a esas capas no se puede decir cuál [Código, Inferido].

### 6.3 Límite 2: todo o nada

**Qué le pasa al consultor.** Quiere ocultar la pestaña "Secciones personalizadas". El asistente envía solo la parte modificada, y la ficha queda únicamente con eso, para todos los usuarios del cliente a la vez.

**Por qué pasa.** La herramienta de actualizar reemplaza el campo completo, no lo fusiona. Es como pedir "cambia la fecha de este formulario" y que el sistema borre el formulario y escriba solo la fecha.

**Cómo se sabe.** Sobre un layout de prueba enviaron solo `tabs.general`. Después de guardar, el layout había perdido `mode`, `relationDisplayFields`, todo el `schema` y la otra pestaña [Doc]. En el código, la herramienta `up1_update_object` recibe `data` de tipo libre y llama a una mutación genérica sin lógica de fusión (`mcp/src/tools/generic-tools.js:111-121`). No encontré lógica de fusión de JSON en `object-manager/src` [Código].

**Por qué los límites 1 y 2 juntos son el problema real.** No se puede partir un cambio en llamadas chicas, porque la última siempre tiene que llevar el JSON completo.

### 6.4 Límite 3: el orden de las pestañas

**Qué le pasa al consultor.** Quiere Evaluación antes que Contenidos. Las pestañas salen en orden alfabético por su clave interna, así que `custom` (Secciones personalizadas) queda antes que `general`.

**Por qué pasa.** La pantalla dibuja las pestañas en el orden de las claves del JSON (`layout/src/layouts/RecordDetail/RecordDetail.vue:6765`, recorre `Object.entries(tabs)`), y no existe ningún campo `order` [Código]. Además, las claves llegan ordenadas alfabéticamente desde el cliente MCP [Doc].

**Cómo se sabe.** Armaron las pestañas como `zeta`, `alfa`, `beta` y la llamada salió ordenada antes de llegar al servidor [Doc]. La base de datos no es la culpable: el campo es `Json @db.Json` y no `jsonb`, así que conserva el orden [Código]. La ficha estándar conserva su orden no alfabético porque entra por el sync del repositorio [Código].

**Parche conocido y su costo.** Prefijar las claves (`01_general`) fija el orden, pero rompe las traducciones centralizadas [Doc].

### 6.5 Límite 4: sin aviso previo

**Qué le pasa al consultor.** Escribe un campo mal (`campoInexistente`). La vista previa lo acepta. Al confirmar, falla con "An unexpected error occurred in UP1", sin decir qué corregir. Y cuando una escritura sale bien, la respuesta es `{"data": null}`: no muestra qué quedó guardado, así que el consultor puede borrar media ficha sin notarlo.

**Cómo se sabe.** [Doc]. No pude verificar en el código dónde se arma la vista previa. Hay un antecedente en el repositorio: el commit `2a46827` en `mcp` ya mejoró el caso de errores transitorios para no mostrar el mensaje genérico, con la precaución de no copiar texto del backend porque un error crudo ya filtró un secreto una vez [Código]. Muestra que el mensaje genérico es un tema conocido.

### 6.6 Límite 5: lo que se hace no dura

**Qué le pasa al consultor.** Aunque lograra editar la ficha, el siguiente despliegue puede sobrescribirla. Además, el listado de programas siempre abre la ficha estándar, así que una ficha propia del cliente no es alcanzable.

**Por qué pasa.** En cada despliegue, un paso llamado `sync-schema` copia los layouts del repositorio a la base de datos. Lo hace actualizando por nombre sin mirar si alguien lo modificó (`object-manager/scripts/sync/dbSync.js:929` para layouts de mod y `:2224` para layouts por defecto) [Código]. Otros recursos sí respetan lo modificado por el cliente: seeds y reportes saltan filas con `updatedById` distinto de nulo (`dbSync.js:2665` y `:2812`), y roles y perfiles también (`:1654`, `:1785`) [Código]. Los layouts son la excepción.

**Antecedente.** UPONE-1798 (Finalizada) arregló exactamente este patrón, pero solo para `isActive`. El resto del layout sigue sobrescribiéndose [Jira, Código].

**La navegación.** `default_Activity_list` apunta de forma fija a `default_Activity_view` y `default_Activity_edit` (`mods/curriculum-design/config/layouts/default_Activity_list.json:78-81`) [Código].

**Sin deshacer.** El campo `version` sube solo cuando cambia `layoutConfig`, pero no guarda el contenido anterior [Doc].

### 6.7 Una observación sin confirmar

Gian reportó en DEV que un fallo por tamaño modificó `updatedAt` sin persistir datos ni dejar auditoría. En STAGING, un fallo por validación dejó el registro intacto. Son escenarios distintos y no se reprodujo. Queda como pendiente de verificar en el servidor, no como bug confirmado [Doc].

## 7. Qué sí funciona hoy

- Leer layouts completos con `up1_query_records` y `up1_get_object`.
- Cambiar metadatos chicos: `label`, `isActive`, `applicationId`, `ownerId`.
- Crear layouts de menos de 4 KB. Gian creó uno de 444 caracteres en DEV y Esteban uno de unos 2 KB en STAGING.
- Publicar por el sync del repositorio: es el camino que Gian usó. Funciona, pero exige un archivo en `develop`, la integración continua y un despliegue, que es justo lo que el consultor autónomo debía evitar.

Comparación de los dos caminos:

| Dimensión | Camino MCP (lo que quieren) | Camino sync del repositorio (lo que funciona) |
|---|---|---|
| Quién lo hace | Consultor | Desarrollador |
| Tamaño máximo | Unos pocos KB | Sin límite relevante (el layout estándar de 34 KB entra) |
| Requiere despliegue | No | Sí |
| Granularidad | Reemplazo total del campo | Archivo completo |
| Sobrevive al siguiente despliegue | No garantizado | Sí, pero sobrescribe lo manual |
| Se puede deshacer | No | Con git, sí |

## 8. Un caso de punta a punta

Pedido: "Renombra Resultados de aprendizaje a Logros de aprendizaje en la ficha de Ibero, y pon Evaluación antes de Contenidos."

1. El consultor lee el layout. Funciona.
2. El asistente arma el JSON entero con las dos modificaciones: pesa más de 30 KB. El canal lo rechaza con un error genérico (límites 1 y 4).
3. Si el asistente intenta enviar solo la pestaña modificada, la ficha queda con una sola pestaña y sin campos (límite 2).
4. Si lograra enviarlo, las pestañas saldrían alfabéticas, así que "Evaluación antes que Contenidos" no se respetaría (límite 3).
5. Si todo eso saliera bien, el siguiente despliegue puede devolver la ficha a su estado estándar (límite 5).

## 9. Qué se necesita de Core

Está detallado en el dossier para Core. En resumen: ubicar y subir el límite de payload con errores claros, operaciones de edición parcial de layouts, un campo `order` opcional para pestañas, un modelo de override por cliente que el sync respete, e historial de contenido.

## 10. Qué cubre este documento y qué no

Cubre: las cinco limitaciones, su evidencia y lo que Gian y Esteban hacen y esperan, según Jira, sus documentos y el código.
No cubre: el avance real de la carga de datos de Fisioterapia (no hay evidencia en los repos ni en Jira de cuántas asignaturas se cargaron), el contenido de las capturas que Gian dejó en Jira, ni la causa exacta del corte de tamaño.

## 11. Vigencia

Este documento envejece si Core sube el límite de payload, si cambia la herramienta de actualización, si se modifica el sync de layouts, o si UPONE-1983 agrega la pestaña Adjuntos (el layout crecerá). Re-verificar en cualquiera de esos casos. Las pruebas de DEV y STAGING no se reprodujeron en esta revisión.

## 12. Documentos hermanos

- [[dossier-core-configuracion-layouts-mcp]]
- Reporte "MCP payload: bloqueo UPONE-1748", versión 3, de Gian Adofacci (2026-10-08).
- Documento "Configuración autónoma del programa de asignatura vía MCP", de Esteban Cortes (2026-10-09).
