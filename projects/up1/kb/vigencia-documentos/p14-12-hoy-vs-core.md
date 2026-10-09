---
id: DOC-kb-vigencia-documentos-p14-12-hoy-vs-core
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

# Vigencia 14: 12 Qué se puede hoy y qué requiere core

> Grupo: Parte técnica · Parte 14 de 17 · Líneas 1283 a 1331 del original · [Índice](00-indice.md)

**Ver en HTML (mismo estilo del original):** [p14-12-hoy-vs-core.html](p14-12-hoy-vs-core.html)

## Qué dice esta parte

Separa lo que ya da el motor de transiciones (aristas, condiciones, permisos por arista, evento al transicionar) de lo que falta: estados y transiciones por institución para el `status` de los documentos, rol por estado, gobierno del estado inicial, comentario obligatorio, hook de borrado, guard exportado y versionar solo desde la última. Recomienda guardar `status` como texto validado contra un catálogo por tenant en vez de un enum físico de Postgres. Propone pasar las piezas de core por Aduana y formalizarlas como Core Extension.

## Dónde se habló en la reunión (6 oct 2026)

00:40:22 y 01:22:50. Transcripción: `TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment` (records).

## Verificado contra el código (8 oct 2026)

- Confirmado: motor de transiciones (UPONE-1293 a 1296, Finalizadas) y estados fijos por objeto.
- Confirmado: workflow relacional retirado (UPONE-1381, UPONE-1459).
- No verificado: la ubicación `prisma/BASEMODEL/schema.prisma:460` del enum físico.

## Decisiones y preguntas ligadas

D5, D6, D7. La frontera core/mod la decide el equipo de core.

## Fragmento del documento (texto del artefacto)

```text
12 · Qué se puede hoy y qué requiere core
El motor de estados del core ya cubre una parte
Base: object-manager/docs/enum-transitions.md (AP-01 a AP-04), features/validation-rules.md y versioning-capability.md.
Restricción técnica: status es un enum físico de Postgres (enum CurriculumStatus, prisma/BASEMODEL/schema.prisma:460). Para que cada institución tenga sus estados, core debe elegir entre (a) convertir el status de los documentos gobernados en texto validado contra un catálogo de estados por tenant, editable en runtime, o (b) generar el enum por tenant con codegen y una migración por cada cambio. Recomendación: (a).
Ya existe en el motor
from/to: aristas permitidas
conditions: fórmula sobre el registro, con mensaje
requiredCapabilities: permiso por arista
onTransition: evento asíncrono (no garantiza la escritura)
getValidTransitions y previewBulkTransition en la UI
No existe hoy
Estados y transiciones del status de los documentos por institución: son build-time e iguales para todos (el editor por institución de up1-manager solo cubre campos custom)
Metadata por valor del enum: no hay dónde declarar un rol
Gobierno del estado inicial: crear en un estado avanzado se salta el guard
requiresComment como clave del motor
Enforcement de escritura en RecordTypes editados desde el objeto base
Pieza | Hoy, en el mod | Extensión de core
Exigir fecha de vigencia y acto al publicar | Se puede: conditions en la transición + campos nuevos | -
Permiso por acción (publicar, retirar, corregir, ajustar) | Se puede: requiredCapabilities + capabilities.json | -
Cerrar el ingreso de la versión anterior al publicar | Se puede: override del resolver del mod, en la transacción | Recomendado si se vuelve transversal
N estados de flujo de trabajo por institución | No: solo campos custom tienen editor por tenant; en ext__ se descartan | Requiere
Rol por estado | No | Requiere
Todo nace en authoring | Parcial por objeto (Activity ya lo hace) | Requiere para que sea general
Comentario obligatorio en transiciones | No | Requiere
Bloqueo único por vigencia + changeClass por campo | Parcial: guards por mod (lo que hoy está fragmentado) | Requiere guard en los hooks + metadata changeClass; updateBulkInstances debe pasar por él
Vigencia declarativa (validityStatus, predicado único) | Parcial: por mod, duplicando isInForceOn | Requiere bloque tipo metadata.versioning
Proteger el borrado de lo publicado | No: no existe hook beforeDelete | Requiere
Guard exportado para resolvers de mods + test de contrato | No: cada mod valida a su manera | Requiere
Versionar solo desde la última versión | No: el core permite ramas (max(linaje)+1) | Requiere como opción de política
ChangeRequest (corrección y ajuste) | Parcial: en el mod, pero lo usan dos mods | Candidato cross-mod
Referencia a Term | Parcial: Term vive en academic-scheduling; startDate es texto | A validar
Proceso sugerido: pasar las piezas de core por Aduana y formalizarlas como Core Extension. La frontera entre core y mod la decide el equipo de core.
```
