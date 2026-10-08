---
id: DOC-vigencia-documentos-12-10-calculo-vigencia
project: up1
type: doc
module: curriculum-design
tags: [vigencia, workflow, estados, versionamiento, curriculum-design, curriculum-mapping, sp12]
source: https://claude.ai/artifact/RQyrVMBvpq7WQTQb15CHdo
---
# Parte 12: 10 · Cómo se calcula la vigencia

> Grupo: Parte técnica · Parte 12 de 17 · Líneas 1063 a 1128 del original · [Índice](../00-INDICE.md)

**Ver en HTML (mismo estilo del original):** [12-10-calculo-vigencia.html](12-10-calculo-vigencia.html)

## Qué dice esta parte

Una función del core, `computeValidity`, deduce el estado de fechas, autorización externa y dependientes. Dos usos: **en vivo** para proteger cada escritura y **valor guardado** (`validityStatus`) para listados, filtros e insignias. Cinco disparadores actualizan la copia guardada (transición, corrección de fechas, nueva versión, cambio de dependientes y tarea diaria). Aquí aclaró Esteban lo que Eduardo planteó: la columna sí guarda el valor; lo calculado es quién lo escribe, no que la columna esté vacía.

## Dónde se habló en la reunión (6 oct 2026)

00:51:01 a 01:02:52. Transcripción: `records/TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment.md`.

## Verificado contra el código (8 oct 2026)

- No existe scheduler en el core según el artefacto; no se verificó. Si la tarea diaria hace falta, es una pieza nueva.
- Duda de Eduardo sobre columnas calculadas en tablas: no bloquea si el valor está guardado. Falta confirmar en `layout/src/composables/useColumnConfiguration.ts`.

## Decisiones y preguntas ligadas

Disparador 'paso del tiempo' (job BullMQ o flujo n8n): decisión técnica pendiente.

## Fragmento del documento (texto del artefacto)

```text
10 · Cómo se calcula la vigencia
Una función del core, dos usos y cinco disparadores
La sección 3 explica qué significa cada estado de vigencia. Aquí, cómo lo obtiene el sistema.
¿Qué significa "calculada"? ¿Quién la calcula y cuándo?
Nadie la escribe a mano, ni el usuario ni el mod. Una sola función del core la deduce de hechos que ya están registrados.
Entradas
Rol del estado del flujo · ¿está publicado?
validFrom · admissionUntil
Autorización externa · ApprovalAct
Hoy · zona horaria de la institución
Dependientes activos · PlanEnrollment, OfferingEnrollment, MatrixAdoption
→
computeValidity(documento, fecha)
sin validFrom (no publicado o retirado) → NotInForce
autorización pendiente o fecha < validFrom → Scheduled
sin admissionUntil o fecha ≤ admissionUntil → InForce
con dependientes activos → PhasingOut
si no → Closed
Uso 1 · ProtegerCálculo en vivo, en cada escrituraLo ejecuta el guard de edición con la hora actual, sobre el documento o el dueño del hijo que se edita. La protección nunca depende de un valor guardado.
Uso 2 · MostrarValor guardado validityStatusPara listados, filtros ("solo vigentes"), insignias en la UI, reportes y el evento validity.changed. Lo actualizan los disparadores de abajo.
validityStatus es la copia guardada del cálculo, no un dato aparte. Es de solo lectura: ningún usuario, mod, transición ni carga lo escribe; solo la función del core. El guard no lo lee: siempre recalcula en vivo. Si al recalcular encuentra que la copia quedó atrasada (p. ej. falló la tarea diaria), protege con el valor en vivo y corrige la copia en ese momento.
Disparador del valor guardado | Cuándo ocurre | Ejemplo en el caso ICI
a Transición del flujo hacia o desde un rol inForce / retired | Síncrono, en la misma transacción | El consejo marca "Decretado" con inicio 2020-1: queda Programado
b Corrección de fechas o de la autorización externa | Síncrono | Llega la autorización del MEN: pasa a Vigente si ya llegó la fecha
c Publicar una nueva versión | Síncrono; cierra el ingreso de la anterior | Se publica v2: v1 recibe admissionUntil 2026-2
d Cambio en los dependientes | Al cerrarse una matrícula, un periodo o una adopción | Egresa el último estudiante de v1: v1 pasa a Cerrado
e Paso del tiempo | Tarea diaria en la zona horaria de la institución, para documentos con validFrom o admissionUntil igual a hoy | 1-mar-2020: v1 pasa de Programado a Vigente sin que nadie toque nada
Qué ofrece hoy el core
Los campos fórmula se calculan solo al escribir. Solo LATEST() se recalcula al leer (UPONE-1685).
Una fórmula no ve el paso del tiempo si nadie escribe el registro.
Las conditions de transición no cuentan dependientes de otros objetos; por eso documentDependents.js vive en un resolver.
No hay un scheduler en el core: el disparador e es una pieza nueva (job repetible de BullMQ o flujo programado de n8n).
Por qué híbrido
Solo al leer, como LATEST(): siempre exacto, pero no se puede filtrar ni indexar, no emite eventos al cambiar por fecha y cuenta dependientes en cada fila.
Solo guardado: filtrable, pero si la tarea diaria falla, la protección quedaría desfasada.
Híbrido: protege en vivo y muestra lo guardado. Si la tarea falla, solo se desactualiza la insignia.
Por qué la fecha es la fuente del cálculo
Por qué la fecha manda
ProgramEnrollment.cohort y admissionPeriod son texto libre; entryDate sí es fecha.
PlanEnrollment y MatrixAdoption ya usan effectiveFrom/To como fechas.
Postgrado, modulares, admisión continua y "rige desde la aprobación del MEN" no tienen periodo.
```
