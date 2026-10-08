---
id: DOC-vigencia-documentos-04-2-flujo-roles
project: up1
type: doc
module: curriculum-design
tags: [vigencia, workflow, estados, versionamiento, curriculum-design, curriculum-mapping, sp12]
source: https://claude.ai/artifact/RQyrVMBvpq7WQTQb15CHdo
---
# Parte 04: 2 · Estado del flujo de trabajo y sus roles

> Grupo: Parte funcional · Parte 4 de 17 · Líneas 512 a 554 del original · [Índice](../00-INDICE.md)

**Ver en HTML (mismo estilo del original):** [04-2-flujo-roles.html](04-2-flujo-roles.html)

## Qué dice esta parte

Cada institución define sus estados de flujo (por ejemplo Borrador, Revisión Facultad, Decretado) pero cada estado declara uno de cinco roles predefinidos: `authoring`, `review`, `approved`, `inForce`, `retired`. Las reglas del core miran el rol, no el nombre ni la cantidad de estados. El core valida que todo flujo nazca en `authoring` y tenga al menos un `inForce`. Esta fue una de las dos decisiones **acordadas** en la reunión.

## Dónde se habló en la reunión (6 oct 2026)

00:16:56 a 00:21:39 y 00:25:39 a 00:28:03. Transcripción: `records/TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment.md`.

## Verificado contra el código (8 oct 2026)

- Hoy los estados son un enum fijo e igual para todas las instituciones (ver sección 12 del documento, archivo 14). El motor relacional de workflow configurable por institución se retiró en UPONE-1381 y UPONE-1459 (ambas Finalizada). Esta parte reintroduce configurabilidad sobre un enum que hoy no la tiene.
- No hay metadata por valor de enum donde declarar un rol.

## Decisiones y preguntas ligadas

D4 (qué significa `retired` en cada tipo de documento) y D5 (cómo se configuran y guardan los estados por institución).

## Fragmento del documento (texto del artefacto)

```text
2 · Estado del flujo de trabajo
Cada institución define sus estados; cada estado declara un rol
El primer estado. La regla no mira el nombre ni la cantidad de estados del flujo: mira el rol que declara cada uno. Ese rol controla cuándo se piden los datos de vigencia y cuándo se activan.
authoringredacción
reviewen aprobación
approvedaprobado, aún no rige
inForcepublicado
retiredcerrado a ingreso
Universidad A
BorradorObservado
Revisión EscuelaRevisión Facultad
Aprobado ConsejoPendiente MEN
Decretado
Derogado
Universidad B
Borrador
Revisión
Publicado
Cerrado
Sin vigencia. Edición libre.
Sin vigencia. Edición según la institución.
Sin vigencia. Bloqueado. Incluye trámites externos pendientes (MEN, RVOE).
Para entrar exige fecha de inicio y acto. Activa la vigencia y bloquea.
Para entrar exige fecha de fin de ingreso. Pasa a En extinción o Cerrado.
Validaciones del core
Al menos un estado inForce. Todo registro nace en un estado authoring.
Retiro de publicación
Volver de un estado inForce a authoring solo si el documento está Programado o Vigente y sin dependientes. Desde retired no se vuelve. Generaliza REVERT_HAS_ACTIVE_DEPENDENTS. Detalle en Vías de cambio.
Flujo ≠ operación
El estado dice si se publicó. Las fechas y los dependientes dicen si opera hoy.
```
