---
id: DOC-kb-sp13-dossier-core-configuracion-layouts-mcp
project: up1
type: doc
module: curriculum-design
tags:
  - UPONE-1748
  - mcp
  - layouts
  - core-extension
  - dossier
---

# Dossier para Core: configuración de layouts por cliente vía MCP

Origen: UPONE-1748 (Carga de datos y configuración de cliente IBERO en tenant TEST), brecha detectada en el Frente 3. Fecha del dossier: 2026-10-09.
Estado: BORRADOR para revisión antes de enviar a Core. Proceso aplicable: `docs/guides/core-mod-boundary-workflow.md` (tickets Core Extension).

## 1. Resumen para decidir

Un consultor no puede hoy configurar por MCP la ficha del programa de asignatura (`default_Activity_view` y `default_Activity_edit`) de su cliente. Hay cinco causas, cada una verificada con pruebas en DEV y STAGING y, donde se indica, contrastada con el código. Se piden cuatro Core Extension y una verificación de bug. Las dos primeras desbloquean el uso; las otras dos lo hacen seguro y duradero.

| # | Solicitud | Tipo de cambio sugerido | Bloquea |
|---|---|---|---|
| CE-1 | Ubicar y subir el límite de payload del canal MCP, con errores específicos | Bug fix o mejora no rompiente (infra) | Todo cambio de layouts grandes |
| CE-2 | Operaciones de edición parcial de layouts (o JSON Merge Patch) | Nueva capacidad opcional | Pasos 2, 3 y 4 del flujo |
| CE-3 | Orden de pestañas explícito (campo `order` opcional) | Nueva capacidad opcional | Paso 3 |
| CE-4 | Layouts del cliente que el sync no sobrescribe, navegación que los resuelva e historial de contenido | Arquitectura o nueva capacidad (por definir en RFC) | Pasos 6 y 7 |
| BUG-1 | Verificar si un fallo por tamaño modifica `updatedAt` sin persistir ni auditar | Bug fix | Ninguno, riesgo de auditoría |

## 2. Contexto del ticket que origina el hallazgo

- Ticket: UPONE-1748, tarea hija de la épica UPONE-1267 (Curriculum Design). Estado: Developing. Asignado: Gian Adofacci. Reportó: Esteban Cortes. Creado el 2026-08-31.
- Objetivo del ticket: cargar en TEST una carrera completa de Ibero (elegida: Fisioterapia, 106 asignaturas, planes P4PFT y P5PFT) y producir dos inventarios de brechas. Regla explícita del ticket: las brechas se registran y "no se resuelven dentro de este ticket", quedan como candidatas a requerimiento de producto.
- El Frente 3 pide replicar la configuración legacy del programa de asignatura: 13 pestañas definidas en el comentario del 2026-09-15 (Información general, Estructura curricular, Rutas formativas, Presentación, Competencias, Contenidos, Justificación, Metodología, Evaluación, Recursos, Archivos adjuntos, Historial de cambios, Versión).
- Este dossier es la materialización de la brecha "capacidad de configuración del legacy que uP1 no ofrece" del Frente 3.

Tickets relacionados encontrados:

| Ticket | Estado | Relación |
|---|---|---|
| UPONE-1798 | Finalizada | Mismo patrón de causa raíz: el sync de mods forzaba `isActive: true` y revertía cualquier cambio manual. Se corrigió solo `isActive` (commit 338b8f5c, PR 559). El resto del layout se sigue sobrescribiendo (ver CE-4). |
| UPONE-1983 | Developing | Agrega la pestaña "Adjuntos" a `default_Activity_view` y `default_Activity_edit`. Hace crecer más un layout que ya excede el límite. |
| UPONE-1787 | Backlog | `syncLayoutRoles` no corre para layouts auxiliares y los deja públicos. Mismo subsistema de sync de layouts. |
| UPONE-1502 | Tareas por hacer | MGR-04, revisión de layouts. |
| UPONE-1359 | Finalizada | CONF-01, sistema de configuraciones de UP1. Posible base para el modelo de override (CE-4), a evaluar por Core. |
| UPONE-1682 | Backlog | POC de carga de datos curriculares de Ibero, antecedente. |

Ramas y commits: no hay ramas ni commits con la clave UPONE-1748 en `mcp`, `mods`, `layout` ni `object-manager`. El trabajo de Gian publicó los layouts Ibero por el sync del repositorio (archivo `.test.json` a `develop`), que es el camino alternativo documentado en su reporte. Commits relevantes encontrados:

| Repo | Commit | Qué aporta |
|---|---|---|
| object-manager | 338b8f5c (UPONE-1798) | Precedente de arreglo del sync de layouts. |
| mcp | 2a46827 (2026-09-28) | `graphqlError()` ya distingue fallos transitorios del error genérico. Muestra que el mensaje genérico es un hallazgo conocido y que hay un patrón seguro para mejorarlo. |
| curriculum-design | e31434a, beec8a4, d2d7118 (UPONE-1968, UPONE-1967) | Cambios recientes sobre `default_Activity_view`. Confirman que el layout sigue creciendo. |

## 3. Metodología de la evidencia

| Ronda | Quién | Fechas | Ambiente | Alcance |
|---|---|---|---|---|
| 1 | Gian Adofacci | 2026-10-06 al 2026-10-08 | up1-dev, tenant TEST | 8 pruebas: bisección de tamaño, actualización parcial, claves con prefijo, serialización como texto, creación sintética de 15 KB, recorte del layout Ibero a 8,3 KB. Reporte v3. |
| 2 | Esteban Cortes | 2026-10-09 | STAGING, tenant UPU | Replicó sobre un layout de prueba aislado (`probe_secciones_personalizadas`) con capturas y request id de la prueba de tamaño. |
| 3 | Revisión de código | 2026-10-09 | Repos locales en `develop` | Contraste de cada hallazgo con el código (ver sección 4). |

Versión de código revisada: object-manager `56013857` (develop), layout `ce174010`, mcp `b6185e9`.

Fuentes primarias:
- Documento "Configuración autónoma del programa de asignatura vía MCP" (Esteban Cortes, 2026-10-09).
- Reporte "MCP payload: bloqueo UPONE-1748", v3 del 2026-10-08 (Gian Adofacci), objeto `up1_layen_layout` id `01a0cee4-2f03-704a-ae41-78405185068d`.
- Request id de la prueba de tamaño en STAGING: `req_011CfrgdeVM7sYoosqHK6hKD`.
- Sprint Review 28, slide 68: capturas de la prueba.

## 4. Hallazgos con evidencia

### CE-1. Límite de payload del canal MCP y errores genéricos

Qué pasa: `up1_create_object` y `up1_update_object` fallan sobre un tamaño de payload. En DEV el umbral está entre 5,4 y 15 KB. En STAGING pasa con 4 KB y falla con 8 KB. Falla también en la vista previa (sin `confirm`) y con relleno sin campos especiales. El mensaje es siempre genérico ("The connector's server returned an error. You can try again." en DEV, "An unexpected error occurred in UP1" al confirmar en STAGING).

Impacto: `default_Activity_view` pesa 34.579 bytes (13 pestañas) y `default_Activity_edit` 23.742 bytes. Ninguno de los dos cabe. Cada `record-list` aporta cerca de 1.200 caracteres. Gian recortó el layout Ibero de 14,8 KB a 8,3 KB perdiendo funcionalidad y siguió sobre el límite.

Contraste con el código (lo que se descarta como causa):

| Capa | Límite encontrado | Archivo |
|---|---|---|
| object-manager (GraphQL) | `GRAPHQL_BODY_LIMIT`, por defecto 20 MB | `object-manager/src/index.js:337` |
| Servidor MCP | `express.json()` sin opción, es decir 100 KB por defecto de Express | `mcp/src/index.js:50` |
| Herramienta `up1_update_object` | Sin límite propio, `data` de tipo `any` | `mcp/src/tools/generic-tools.js:111` |

Ninguna capa de código de UP1 explica un corte entre 4 y 8 KB. La conclusión honesta es que el corte ocurre antes del servidor MCP de UP1, probablemente en el gateway, en el conector o en el transporte. No está verificado cuál. Hay un detalle que apunta a ese lado: el mensaje "The connector's server returned an error" no existe en el código de `mcp` (los mensajes del repositorio salen de `graphqlError()`).

Solicitud a Core: (a) identificar en qué capa se corta (gateway, conector o transporte de Claude), con el request id anterior como punto de partida; (b) subir el límite a 50 KB o más; (c) devolver un error específico (413 con el límite informado, y el campo inválido en los errores de validación). Tipo de cambio sugerido: bug fix o mejora no rompiente. Cambio de mensajes: aplicar el mismo criterio de seguridad del commit 2a46827 (seleccionar por forma, nunca copiar texto del backend, porque un error crudo ya filtró un secreto en el pasado).

### CE-2. Escritura todo o nada

Qué pasa: `up1_update_object` reemplaza el campo completo. Al enviar `{"layoutConfig":{"tabs":{"general":...}}}` sobre el layout de prueba `activity_detail_88c224`, `layoutConfig` quedó solo con `tabs.general`: se perdieron `mode`, `relationDisplayFields`, todo el `schema` y la otra pestaña. Afecta a todos los usuarios del cliente a la vez.

Contraste con el código: la mutación es `updateInstance(objectType, id, data)` y la herramienta no ofrece merge ni patch (`generic-tools.js:111-121`). No encontré lógica de merge profundo en `object-manager/src`.

Combinado con CE-1: no se puede fragmentar un cambio en llamadas chicas, porque la última siempre lleva el JSON completo.

Solicitud a Core: herramientas de negocio chicas que el servidor aplique sobre el JSON guardado (agregar, mover u ocultar pestañas y campos, renombrar etiquetas, ajustar columnas), con validación antes de guardar y con vista y edición sincronizadas. Como paso intermedio, JSON Merge Patch (RFC 7396) en `up1_update_object`. Tipo: nueva capacidad opcional (superficie pública nueva, sin consumidores existentes). Pregunta de frontera para Core: ¿viven estas herramientas en el MCP genérico o en `mcp/src/mods/curriculum-design`? Si son genéricas para cualquier layout, es core.

### CE-3. Orden de pestañas

Qué pasa: las pestañas se dibujan en el orden de las claves de `tabs`. Gian y Esteban armaron las claves como `zeta`, `alfa`, `beta` y la llamada salió ordenada alfabéticamente antes de llegar al servidor. Con claves `custom` y `general`, "Secciones personalizadas" queda antes que "General". El prefijo numérico (`01_general`) funciona para el orden pero rompe las traducciones centralizadas.

Contraste con el código:
- `layout/src/layouts/RecordDetail/RecordDetail.vue:6765` recorre `Object.entries(tabs)` y no existe ningún campo `order` para pestañas.
- El orden de claves se conserva en base de datos: `layoutConfig` es `Json @db.Json`, no `jsonb`. Por lo tanto el orden se pierde en el cliente MCP o en el transporte, no en Postgres. `default_Activity_view` conserva su orden (`general, requisitos, plans, ... custom, history, versions`) porque entra por el sync del repositorio.

Solicitud a Core: soportar un campo `order` opcional por pestaña (o `tabOrder` a nivel de layout) en `RecordDetail`, con fallback al orden de claves. Es aditivo y no rompe consumidores. Convertir `tabs` en arreglo sí sería un cambio rompiente (tipo 5, requiere RFC y guía de migración) y no se recomienda.

### CE-4. Persistencia: el sync sobrescribe y la navegación no llega al layout del cliente

Qué pasa: los layouts `default_*` se cargan desde `mods/curriculum-design/config/layouts/` con el initContainer `sync-schema` en cada despliegue. Los de UPU en STAGING tienen `updatedById: null` y se actualizaron el 2026-10-09 a las 11:51 UTC sin edición manual. Un cambio manual a un default se pierde en el siguiente despliegue. Además `default_Activity_list` apunta de forma fija a `default_Activity_view` y `default_Activity_edit` en `associatedLayoutConfigs`, así que un layout del cliente no es alcanzable sin tocar el listado.

Contraste con el código:

| Hecho | Evidencia |
|---|---|
| El sync actualiza el layout por nombre sin mirar `updatedById` (layouts de mod) | `object-manager/scripts/sync/dbSync.js:929` |
| Idem para layouts default | `object-manager/scripts/sync/dbSync.js:2224` |
| Otros recursos sí respetan la propiedad del cliente: seeds y reportes saltan filas con `updatedById != null` ("tenant-customized") | `dbSync.js:2665` y `dbSync.js:2812` |
| Roles de app y perfiles también respetan `updatedById` | `dbSync.js:1654` y `dbSync.js:1785` |
| Navegación fija al layout estándar | `mods/curriculum-design/config/layouts/default_Activity_list.json:78-81` |
| Mismo patrón ya reportado y corregido solo para `isActive` | UPONE-1798, commit 338b8f5c |

Es decir, existe en el propio sync el criterio de propiedad por `updatedById`; los layouts son la excepción. Esto baja el costo de la solicitud.

Versionado: `version` sube solo cuando el update toca `layoutConfig` (pasó de 1 a 2 al cambiarlo y no se movió al cambiar `label`). Cuenta cambios pero no guarda el contenido anterior, por lo que no hay deshacer.

Solicitud a Core: (a) que el sync no sobrescriba layouts con `updatedById != null`, siguiendo el patrón de seeds, o definir otro mecanismo de override por cliente; (b) que la navegación resuelva qué layout abrir (cliente antes que default); (c) historial de contenido de layouts para poder volver atrás. Tipo: arquitectura o nueva capacidad opcional, según el modelo de override que elija Core; (a) por sí sola podría ser una mejora no rompiente. Recomendamos abrir un RFC corto para el modelo de override, porque define el diseño de CE-2.

Riesgo a considerar por Core: `isActive` ya respeta el valor del mod (UPONE-1798) pero el resto del layout no. Un sync que respete `updatedById` hace que un default corregido en el repositorio deje de llegar a los clientes con layout propio, por lo que hace falta una señal de "default actualizado" para esos clientes.

### BUG-1. `updatedAt` modificado sin persistir datos

Qué pasa: Gian reportó en DEV que un fallo por tamaño modificó `updatedAt` sin persistir datos ni dejar auditoría. En STAGING, con un fallo por validación, el registro quedó intacto.

Estado: observación de una sola prueba, no reproducida. Se debe verificar en el servidor si algún camino de error escribe antes de validar. Los dos escenarios son distintos (tamaño versus validación), por lo que no se contradicen.

### Hallazgo menor: la vista previa no valida

La vista previa devuelve el payload recibido sin validar campos ni tipos. `campoInexistente` pasó la vista previa y falló al confirmar sin nombrar el campo. Tras una escritura exitosa la respuesta es `{"data": null}`, así que no se ve qué quedó guardado. Se incluye como parte de CE-1 (errores específicos) y CE-2 (validación antes de guardar). No pude verificar en el código dónde se arma la vista previa.

## 5. Qué funciona hoy (para dimensionar el alcance)

- Lectura completa de layouts con `up1_query_records` y `up1_get_object`.
- Cambios de metadatos chicos: `label`, `isActive`, `applicationId`, `ownerId`.
- Creación de layouts de menos de 4 KB (Gian: 444 caracteres en DEV; Esteban: unos 2 KB en STAGING).
- Workaround vigente: publicar el layout por el sync del repositorio (archivo `.test.json` a `develop`, CI, ArgoCD, initContainer). Funciona pero obliga a un despliegue, que es justo lo que el consultor autónomo debía evitar.

## 6. Flujo esperado del consultor y qué lo bloquea

| Paso | Estado hoy | Bloqueado por |
|---|---|---|
| 1. Revisar | Funciona | Ninguno |
| 2. Ajustar estructura | Bloqueado | CE-1, CE-2 |
| 3. Ordenar | Bloqueado | CE-1, CE-2, CE-3 |
| 4. Ajustar campos | Bloqueado | CE-1, CE-2 |
| 5. Previsualizar | Parcial (no valida) | CE-1 |
| 6. Publicar | Bloqueado | CE-4 |
| 7. Mantener | Bloqueado | CE-4 |

Orden de ataque sugerido: CE-1 (desbloquea todo), luego CE-4 en RFC (condiciona el diseño), luego CE-2 y CE-3.

## 7. Límites de esta evidencia

- El punto exacto del corte de tamaño no está identificado. Está descartado en `object-manager` y en el servidor MCP según el código; falta revisar gateway, conector y transporte.
- Los resultados de DEV y STAGING provienen de los reportes de Gian y Esteban y de sus capturas; no los reprodujimos en esta revisión.
- Los números de línea corresponden a las versiones indicadas en la sección 3 y pueden moverse.
- El comportamiento de orden de claves (CE-3) se atribuye al cliente MCP por las pruebas; falta confirmarlo en la capa exacta.
- No se revisó el comportamiento real del `updateInstance` del servidor ante errores (BUG-1).

## 8. Decisiones que se piden a Core

1. ¿Quién ubica el corte de payload y cuál es el límite objetivo? (CE-1)
2. ¿Las herramientas de edición de layouts son core o van en el mod curriculum-design? (CE-2)
3. ¿Orden de pestañas por campo `order` opcional? (CE-3)
4. ¿Qué modelo de override por cliente se adopta: `updatedById` como en seeds, un layout alterno por cliente u otro? ¿Se hace RFC? (CE-4)
5. ¿Responsable de verificar BUG-1?

## 9. Limpieza pendiente

- Borrar el layout de prueba `probe_secciones_personalizadas` (`activity_detail_88c224`) en STAGING (programa Ecuaciones Diferenciales) una vez revisado.

## 10. Documentos hermanos

- [[explicativo-gian-esteban-layouts-mcp]]
