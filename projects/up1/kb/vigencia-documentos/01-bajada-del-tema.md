---
id: DOC-kb-vigencia-documentos-01-bajada-del-tema
project: up1
type: doc
module: curriculum-design
tags:
  - vigencia
  - workflow
  - estados
  - versionamiento
  - sp12
  - alcance
---

# Vigencia de documentos uP1: bajada del tema (alcance, hallazgos, candidatos, preguntas)

> Estado del material: borrador para iterar. No hay tickets creados. Los puntos "Por validar" requieren respuesta antes de que el PO redacte. Verificado contra el código y Jira el 8 oct 2026. Índice: [00-indice.md](00-indice.md)

Fuentes: transcripción (record `TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment`) y el documento presentado, guardado por partes en esta carpeta ([original](original-vigencia-documentos-up1.html), partes p01 a p17).

## 1. Qué se busca (en una frase)

Separar dos cosas que hoy viven mezcladas en un solo campo: **en qué etapa de diseño y aprobación está un documento curricular** (estado del flujo de trabajo) y **si ese documento opera hoy o no** (estado de vigencia), y sobre esa separación construir reglas de edición que protejan lo que ya está vigente. La versión une ambos estados: un cambio de fondo en algo vigente genera una versión nueva (ver [p01](p01-idea-central.md)).

## 2. Decisiones de la reunión

| Estado | Decisión |
|---|---|
| Acordada | La **vigencia es un valor calculado** por una función central del core a partir de fechas y dependientes activos. Ningún usuario ni mod la escribe a mano. Se guarda en una columna (`validityStatus`), que se actualiza por disparadores ([p05](p05-3-vigencia.md), [p12](p12-10-calculo-vigencia.md)). |
| Acordada | Cada institución define sus estados de flujo, pero **cada estado declara un rol predefinido** (`authoring`, `review`, `approved`, `inForce`, `retired`). Las reglas miran el rol, no el nombre ([p04](p04-2-flujo-roles.md)). |
| Requiere debate | Impedir volver atrás desde un estado publicado a uno de edición y qué mecanismo de excepción existe. El documento propone el retiro de publicación, solo sin dependientes ([p07](p07-5-vias-de-cambio.md)). |
| Requiere debate | Modelo de **clases de cambio por campo** (corrección, ajuste, nueva versión), con clase `structural` por defecto y excepciones por campo ([p07](p07-5-vias-de-cambio.md), [p13](p13-11-metodo-en-el-codigo.md)). |
| Pendiente | Consultar con Klaus el indicador visual de campo bloqueado y si exige cambio en el core (D8). |
| Pendiente | Validar con Sandra y Cami y con instituciones piloto (Ulima, Univay, desde octubre y noviembre). |
| Pendiente | Segunda sesión de revisión antes de presentar a Klaus. |

## 3. Decisiones D1 a D8 del documento y dónde se tocaron en la reunión

El documento cierra con dos decisiones definidas y ocho por decidir ([p16](p16-14-decisiones.md)). La reunión no las recorrió una por una.

| Decisión | Tema | Se habló en la reunión |
|---|---|---|
| Definida: retiro | Volver de publicado a edición solo como retiro, sin dependientes, con permiso y comentario | Sí, es el debate de Giovanni (00:41:27 a 00:45:06). La reunión lo dejó abierto; el documento ya propone el retiro |
| Definida: sílabo | Sin bloqueo durante el periodo, con registro; inmutable al cierre | Sí (00:13:48 a 00:15:16) |
| D1 | La malla apunta a versión o a linaje del programa | No. Aparece en el caso ICI, escenario F |
| D2 | La matriz de competencias pasa a tener linaje de versiones | Parcial: Francisco habló de reglas de la matriz (00:15:16) y Esteban de adopción (00:46:14) |
| D3 | El ajuste tiene su propio flujo de aprobación | Sí, Esteban lo planteó al final (01:18:34); Eduardo dijo que puede crecer (01:20:00) |
| D4 | Qué significa `retired` en cada tipo de documento | Sí, Esteban lo mencionó (00:19:24) |
| D5 | Cómo se configuran y guardan los estados por institución | Sí, por la duda de Giovanni (00:40:22); Esteban se comprometió a revisar el core |
| D6 | Dónde vive el guard | Tocado en 01:14:17 a 01:15:31, sin decidir |
| D7 | Ramas de versiones | No |
| D8 | Insignia por campo del formulario | Sí, Eduardo (01:21:50); a conversar con Klaus |

## 4. Qué existe hoy en el código (verificado)

Revisado en `up1/object-manager` (rama `develop`, al día con `origin`) y Jira UPONE.

| Pieza | Estado real | Evidencia |
|---|---|---|
| Estados de flujo | **Enum fijo y común a todas las instituciones**: Draft, InReview, Approved, Active, Deprecated, Archived. | `object-manager/objects/business/Base/curriculum.json` y `activity.json`, campo `status` |
| Transiciones y permisos | Declaradas por arista, con capability requerida (`curriculum:approve`, `:publish`, `:deprecate`, `:revert`, `:archive`). Se validan en `updateInstance`. | `object-manager/docs/enum-transitions.md`, `src/services/validation/enum-transition-guard.js`, `src/graphql/resolvers/instance.resolver.js:323` |
| Workflow configurable por institución | **Retirado.** El motor relacional (Workflow / WorkflowStatus / WorkflowTransition) se reemplazó por el enum del core. | UPONE-1381 y UPONE-1459, ambos Finalizada. Comentario del campo `status` en `activity.json` |
| Versionamiento | Existe. Se versiona desde Approved o Active, con capability `curriculum:version` / `activity:version`, enlace `previousVersionId` y campo `version`. | bloque `versioning` en `curriculum.json` y `activity.json`; UPONE-1450 Finalizada |
| Estado de vigencia | **No existe.** No hay `validityStatus`, ni clase de cambio, ni política de edición por estado. | búsqueda sin resultados en todo `up1` |
| Fechas de vigencia | Solo en adopción de matriz. Plan y programa no tienen fechas de vigencia propias. | `mods/curriculum-mapping/objects/MatrixAdoption.json` |
| Inscripciones como dependiente | `PlanEnrollment` con estado Active o Closed. | `object-manager/objects/business/Base/planenrollment.json` |
| Punto único de escritura | **No es único hoy.** El guard de transiciones se invoca en 4 puntos de `instance.resolver.js` y hay resolvers de mod que reescriben la mutación y operaciones masivas. | `instance.resolver.js`, `src/graphql/resolvers/mods/curriculum-design/`, `curriculum-mapping/` |
| Guards por mod con criterios distintos | Existen y cada uno usa su propia lista de estados editables. | `planEntryPlanStatusGuard.js`, `requirementActivityGuard`, `alignmentRules.js` ([p11](p11-9-hoy-en-up1.md)) |
| Hooks de escritura del core | Existen `runBeforeCreate` y `runBeforeUpdate`. No existe `beforeDelete` ni `getEditability`. | `instance.resolver.js` ([p13](p13-11-metodo-en-el-codigo.md)) |

### Hallazgo que corrige una asunción de la reunión

Giovanni preguntó si la configuración de nombres de estado por institución se retiró. **Sí se retiró** (UPONE-1381 y 1459). Esteban lo anticipó ("si efectivamente esta capacidad se retiró, ahí es donde tenemos que cambiar el core"). La propuesta de estados definidos por institución con rol predefinido no es un ajuste: **reintroduce** configurabilidad sobre un enum que hoy es fijo. Conviene decirlo así al priorizar.

### Conceptos con nombre parecido que no se deben mezclar

- **Vigencia de capabilities** (UPONE-1032 y 1118, Backlog): ventana temporal de permisos de rol. No es la vigencia de un plan.
- **Versión actual** (UPONE-1340, Backlog): se solapa con saber qué versión recibe ingresos. Revisar antes de crear un ticket paralelo.
- UPONE-1771 (Backlog, "Tributación | Indicadores y versionado del plan") toca versionado del plan. Revisar solapamiento.

## 5. Tickets candidatos (análisis, no tickets creados)

Esfuerzo grueso: Bajo, Medio o Alto.

### C1. Estado de vigencia calculado (validity status)
- **Alcance**: campo nuevo en plan, programa y matriz. Valores: Sin vigencia, Programado, Vigente, En extinción, Cerrado. Se escribe solo desde una función central del core, disparada por transición, corrección de fechas, nueva versión y cambio de dependientes. La tarea diaria por paso del tiempo es una pieza nueva (no hay scheduler en el core) y quedó sin decidir en la reunión.
- **Qué existe**: nada de esto. Hay `PlanEnrollment` y fechas en adopción de matriz como insumos.
- **Qué falta**: fechas de inicio y fin de ingreso en plan y programa, la función de cálculo, el campo, los disparadores.
- **Tipo**: feature de core. **Esfuerzo**: Alto. **Repo**: `object-manager`.

### C2. Roles de estado de flujo y validaciones del mantenedor
- **Alcance**: cada estado declara un rol; el core valida que el flujo nazca en `authoring`, tenga al menos un `inForce` y no permita retornos desde `inForce` o `retired` hacia edición, salvo el retiro de publicación.
- **Qué existe**: enum fijo con transiciones por arista (base reutilizable).
- **Qué falta**: rol por estado, validaciones del flujo, y decidir si los estados siguen fijos (opción 1) o configurables por institución (opción 2, reintroduce lo retirado; D5).
- **Tipo**: feature de core con decisión de producto previa. **Esfuerzo**: Medio (fijos con rol) a Alto (configurables). **Repo**: `object-manager` y `up1-manager` si hay editor.

### C3. Clases de cambio por campo y guard de edición central
- **Alcance**: cada objeto gobernado trae clase `structural` por defecto; los campos con excepción declaran `correctable` o `adjustable`; los técnicos son solo lectura. La tabla de decisión cruza vigencia, clase y canal.
- **Qué existe**: guard de transiciones de enum, auditoría (`enableDataLog`), clonado con `prefillFrom`.
- **Qué falta**: declaración de clase en el JSON, tabla de decisión, guard común a todos los caminos de escritura (incluye `beforeDelete`, `importInstances` y resolvers de mod), auditoría con antes y después, test de contrato (D6).
- **Tipo**: feature de core, la pieza más grande. **Esfuerzo**: Alto. **Repo**: `object-manager`, con adopción en `curriculum-design` y `curriculum-mapping`.

### C4. Corrección y solicitud de cambio sobre la misma versión
- **Alcance**: vía corrección (error material, queda registro) y vía ajuste con aprobación liviana y foto del antes. Falta definir si el ajuste tiene su propio flujo (D3).
- **Qué existe**: `ChangeRequest` en `curriculum-mapping`; su alcance no se confirmó.
- **Tipo**: feature, depende de C3. **Esfuerzo**: Medio a Alto. **Repo**: `object-manager` y mods de currículo.

### C5. Indicador visual de campo bloqueado en formularios
- **Alcance**: marca visual en el campo según vigencia y clase, con indicación de si requiere corrección, ajuste o nueva versión (query `getEditability`, D8).
- **Qué existe**: por validar en `layout`. La duda es si exige cambio en core o un fork del componente.
- **Tipo**: por definir. Se consulta con Klaus. **Esfuerzo**: Medio. **Repo**: `layout`.

### C6. Columna de vigencia visible en tablas
- **Alcance**: mostrar el estado de vigencia en listados.
- **Matiz**: Eduardo señaló una limitación con columnas calculadas. Esteban aclaró que la columna guarda el valor, así que no debería bloquear. Por validar contra `layout/src/composables/useColumnConfiguration.ts`.
- **Esfuerzo**: Bajo, si el valor está guardado.

### C7. Reglas que consumen la vigencia
- **Alcance**: no asociar a una malla una versión de programa en extinción o cerrada; retiro de publicación solo sin dependientes activos; matriz vigente que admite nuevos planes pero no cambia su tipo de medición.
- **Tipo**: feature, depende de C1. **Esfuerzo**: Medio.

### C8. Migración del enum y corrección de versión actual (nuevo, desde el documento)
- **Alcance**: fase 1 con equivalencias (Active a Vigente, Deprecated a En extinción, Archived a Cerrado) sin romper nada; fase 2 saca esos valores del enum. `Activity.isCurrent` pasa a calculado y corrige el caso de dos versiones en `true` tras `asNewVersion`. `versionableFromStates` pasa a "solo desde la última versión" (D7). Layouts y row actions con `status in [Approved, Active]` migran a `validityStatus` ([p15](p15-13-impacto.md)).
- **Riesgo de solape**: UPONE-1340 y UPONE-1771.
- **Tipo**: migración con riesgo. **Esfuerzo**: Alto. **Repo**: `object-manager`, `layout` y mods.

## 6. Fuera de alcance (por lo dicho en la reunión)

- Cambiar el flujo de aprobación de otros módulos sin trazabilidad de versiones (Esteban duda que aplique fuera de currículo).
- Sílabo: es operativo por periodo, no se bloquea por diseño ([p09](p09-7-por-documento.md)).
- Detalle de excepciones por campo: aún no está definido.
- Módulos que el catálogo de acciones todavía no cubre: academic-scheduling, uengagement y medición de logro ([p08](p08-6-acciones.md)).

## 7. Preguntas abiertas

### Al equipo de producto y diseño (Esteban, Sandra, Cami)
1. ¿Estados fijos con rol (opción 1) o configurables por institución con mapeo a rol (opción 2)? La opción 2 reintroduce lo retirado en UPONE-1381 y 1459. Esteban propuso un flujo de dos estados para clientes simples, lo que favorece partir con la 1.
2. ¿Qué mecanismo permite volver de publicado a edición cuando hay que ajustar? El documento propone el retiro de publicación; la reunión planteó además un rol con capability o un estado que admita ajuste en vigencia.
3. ¿Cuál es el umbral entre corrección y nueva versión? Falta la lista cerrada de campos por objeto.
4. ¿El ajuste necesita su propio flujo de aprobación (D3)?
5. ¿Qué pasa con los documentos ya existentes en Active sin fechas? Requiere regla de migración (carga histórica).
6. ¿Qué significa `retired` en programa y matriz (D4)?

### Al equipo de core y plataforma
7. ¿Es viable un guard único (D6) dado que hay resolvers de mod que reescriben `updateInstance` y operaciones masivas? Evidencia en la sección 4.
8. Con Klaus: ¿el indicador visual requiere cambio en `layout` o se resuelve en el mod (D8)?
9. ¿Cómo se relaciona esto con UPONE-1340 y UPONE-1771? Evitar tickets que se pisen.
10. ¿La tarea diaria de vigencia es un job de BullMQ o un flujo de n8n? El core no tiene scheduler.

### A clientes piloto (a través de Francisco y consultoría)
11. Validación del modelo con Ulima y Univay (octubre y noviembre). Francisco sugirió además una universidad más simple.

## 8. Observaciones sobre el material fuente

- La transcripción es automática y tiene errores fonéticos (por ejemplo "BRW", "Isaac" por IsActive, "UPW" por uP1). El record los documenta.
- El documento proyectado en la reunión ya está guardado en esta carpeta, con el JSON del objeto, la tabla de decisión y el caso ICI. Esteban dijo en la reunión que algunas secciones (vías de cambio, acciones) no las había terminado de revisar.
- Las citas normativas de la parte 1 del documento no se verificaron.
