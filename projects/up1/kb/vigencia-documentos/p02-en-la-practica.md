---
id: DOC-kb-vigencia-documentos-p02-en-la-practica
project: up1
type: doc
module: curriculum-design
tags:
  - vigencia
  - workflow
  - estados
  - versionamiento
  - sp12
---

# Vigencia 02: En la práctica, qué pasa cuando quiero cambiar un documento

> Grupo: En la práctica · Parte 2 de 17 · Líneas 449 a 480 del original · [Índice](00-indice.md)

**Ver en HTML (mismo estilo del original):** [p02-en-la-practica.html](p02-en-la-practica.html)

## Qué dice esta parte

Resume la regla en dos preguntas: (1) en qué situación está el documento (sin publicar, publicado, cerrado) y (2) qué tan de fondo es el cambio (corregir, proponer ajuste, nueva versión). También introduce el **retiro de publicación** como única forma de volver a edición, y solo si nadie lo usa. Es la vista que se puede mostrar a alguien no técnico.

## Dónde se habló en la reunión (6 oct 2026)

01:04:30 a 01:10:40. Transcripción: `TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment` (records).

## Verificado contra el código (8 oct 2026)

- No hay implementación de estas vías hoy. La vía de ajuste requeriría `ChangeRequest`; se vio en `curriculum-mapping` pero no se confirmó su alcance en esta pasada.

## Decisiones y preguntas ligadas

D3 (¿el ajuste tiene su propio flujo de aprobación?) nace aquí.

## Fragmento del documento (texto del artefacto)

```text
En la práctica
¿Qué pasa cuando quiero cambiar un documento?
Con esas piezas, cambiar un documento se resuelve con dos preguntas: en qué situación está y qué tan de fondo es el cambio.
1. ¿En qué situación está el documento?El sistema lo calcula solo, según el flujo de trabajo, las fechas y quién lo usa.
Todavía no se publicaSe edita libremente, siguiendo el flujo de trabajo de la institución.Sin vigencia
Publicado: programado, vigente o en extinciónEstá protegido. Pasa a la pregunta 2.Programado · Vigente · En extinción
CerradoSolo consulta. Sirve como base para clonar.Cerrado
2. ¿Qué quiero cambiar?Cada campo trae su clase de cambio; la institución la ajusta dentro de un rango.
CorregirUn error de forma. Se arregla en el mismo documento, con comentario.Ej.: falta una tilde en el nombre del plan
Proponer ajusteUn cambio menor. Lo aprueba una instancia liviana y queda la foto del antes.Ej.: mover Cálculo II al semestre 3
Nueva versiónUn cambio de fondo. Nace en borrador, recorre el flujo de trabajo y rige para nuevas cohortes.Ej.: nuevo perfil de egreso, menos créditos
¿Y si me equivoqué al publicar?
Retirar la publicaciónVuelve a borrador solo si todavía nadie lo usa: sin estudiantes, sílabos ni adopciones.Si ya se usa: corregir, ajustar o nueva versión
Cómo sigue la página: primero lo funcional, después lo técnico. La parte funcional parte por cómo lo viven las instituciones (1), sigue con los dos estados y su configuración (2 a 4), las reglas de cambio y las acciones (5 y 6), el detalle por documento (7) y el caso ICI completo (8). La parte técnica muestra qué hace hoy el código de uP1 (9), cómo se calcula la vigencia (10), cómo la aplica el core (11), qué requiere core (12), el impacto (13) y las decisiones (14).
```
