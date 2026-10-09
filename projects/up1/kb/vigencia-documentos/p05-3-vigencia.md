---
id: DOC-kb-vigencia-documentos-p05-3-vigencia
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

# Vigencia 05: 3 Estado de vigencia

> Grupo: Parte funcional · Parte 5 de 17 · Líneas 557 a 617 del original · [Índice](00-indice.md)

**Ver en HTML (mismo estilo del original):** [p05-3-vigencia.html](p05-3-vigencia.html)

## Qué dice esta parte

Define los cinco valores calculados: Sin vigencia, Programado, Vigente, En extinción, Cerrado. Explica por qué rol y vigencia no son lo mismo: el rol dice qué decidió la institución, la vigencia dice si el documento opera hoy, y un mismo rol puede dar dos vigencias según la fecha o los dependientes. Lista los dependientes que mantienen un documento 'en extinción' (matrículas activas, sílabos con estudiantes, adopciones abiertas). Fecha de vigencia obligatoria y periodo opcional. Es la otra decisión **acordada** (vigencia calculada, nunca escrita a mano).

## Dónde se habló en la reunión (6 oct 2026)

00:22:50 a 00:24:02 y 00:47:25 a 00:53:13. Transcripción: `TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment` (records).

## Verificado contra el código (8 oct 2026)

- `PlanEnrollment` tiene `status` Active o Closed (`planenrollment.json`): sirve de dependiente del plan.
- `MatrixAdoption` tiene fechas de vigencia propias (`mods/curriculum-mapping/objects/MatrixAdoption.json`). El nombre exacto del campo de término (`effectiveTo`) no se verificó.
- Plan de estudio y programa de asignatura no tienen fechas de vigencia propias hoy.

## Decisiones y preguntas ligadas

Qué pasa con los documentos ya existentes en Active sin fechas (regla de migración): pregunta abierta.

## Fragmento del documento (texto del artefacto)

```text
3 · Estado de vigencia
Un estado calculado, nunca escrito a mano
El segundo estado. Lo calcula el sistema a partir de las fechas de vigencia y de quién usa el documento; nadie lo marca a mano. Cómo se calcula técnicamente está en la sección 10.
Sin vigenciaNotInForce
No publicado, o con la publicación retirada. No tiene validFrom.
ProgramadoScheduled
Publicado con inicio a futuro, o con autorización externa pendiente.
VigenteInForce
Hoy ≥ validFrom y sin admissionUntil vencido. Recibe ingresos.
En extinciónPhasingOut
Ingreso cerrado, pero con dependientes activos.
CerradoClosed
Ingreso cerrado y sin dependientes. Histórico.
Edición libre
Protegido: solo corrección, ajuste o reforma
Solo lectura
¿Por qué los roles y los estados de vigencia no son los mismos?
Responden preguntas distintas. El rol clasifica un estado del flujo de trabajo: dice qué decidió la institución. La vigencia es el resultado calculado: dice si el documento opera hoy. Un mismo rol puede dar dos vigencias distintas según la fecha o los dependientes, sin que nadie mueva el flujo.
Rol del estado del flujo (sección 2) | Vigencia posible (sección 3) | Qué decide entre una y otra
authoring review approved | Sin vigencia | No está publicado
inForce | Programado o Vigente | La fecha: antes de validFrom o con autorización externa pendiente es Programado; desde esa fecha, Vigente
retired | En extinción o Cerrado | Los dependientes: con estudiantes, sílabos o adopciones activas es En extinción; sin ellos, Cerrado
Si fueran lo mismo, volveríamos al problema de hoy: un solo campo para dos cosas, y alguien tendría que mover el flujo a mano el día que empieza a regir un plan o cuando egresa su último estudiante. Con dos estados, el flujo de trabajo registra decisiones y la vigencia se mueve sola con el calendario y la operación.
Documento | Dependientes activos que lo mantienen en extinción
Plan de estudios | PlanEnrollment con status=Active y ese curriculumId
Programa de asignatura | Sílabos (Offering) de periodos abiertos con estudiantes (OfferingEnrollment); planes vigentes o en extinción que lo usan
Matriz de competencias | MatrixAdoption abiertas (effectiveTo vacío). Predicado isInForceOn, que ya existe, subido al core
Fecha obligatoria, periodo opcional
Term 2027-1opcional · validFromTermId
completa →
validFrom = 2027-03-01obligatoria al entrar a inForce · se calcula con esta fecha
al publicar →
Fecha congeladasi cambia Term.startDate, la vigencia no se mueve
Por qué sumar el periodo
Las instituciones piensan en "rige desde 2027-1".
Se alinea con el sílabo, que ya usa Offering.termId.
Evita errores de días entre fecha y periodo.
```
