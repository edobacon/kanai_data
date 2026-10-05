# F2 — Resultado: el ítem no ejecutado tiene su motivo (y se informa)

Fecha: 2026-10-05. **Fase cerrada** (juez de fase: aprobable_con_nits, aprobatorio, tras tres
iteraciones). Todo medido sobre **copias** del store real.

## Qué se cambió

| Pieza | Cambio |
|---|---|
| Modelo | `not_run` como estado de ítem, con `cause` (sin-pw \| sin-ambiente \| sin-acceso \| no-aplica \| otro) y `note` |
| Validación | `not_run` exige causa; con la causa `otro`, la nota también. Se valida **antes** de escribir |
| Política obligatoria | Un `pending` no se acepta al registrar: hay que resolverlo (pass, fail o no ejecutado con motivo) |
| Excepción | El smoke automático hace un **registro parcial**: guarda lo que sí corrió y deja lo no cubierto **sin resolver**, sin inventarle el motivo |
| El porqué | Se informa ítem por ítem: respuesta del reporte, hallazgos del gate (por **ítem**, no por el agregado), vista de la sesión y panel Salud |
| Persistencia | El detalle se vuelca al sidecar de sesiones al registrar, y el import lo aplica con un **upsert acotado** a `kind` + el detalle |

## Lo medido

- Sobre la sesión real **`JOR-165-S4`** (8 ítems, todos en "pendiente"): tras el cambio, el detalle
  devuelve `paso` / `no ejecutado (sin-pw)` / `sin resolver (pendiente)`.
- Con la política del ticket en **obligatoria**, el mismo reporte que dejaba 6 pendientes **se rechaza**
  nombrándolos.
- **El motivo sobrevive al rearme**: `not_run|sin-pw|MARCA` pasó intacto por un `db:rebuild --fresh`.
- **Un heal no revierte nada**: los estados de sesión quedaron idénticos (continue 1197, open 311,
  iterate 1). Las 12 que quedan en `open` tras un `--fresh` son el comportamiento **preexistente** del
  plan (el estado vivo no se reaplica), no una regresión.

## Lo que el juez encontró (y por qué esta fase valió la pena)

El juez ciego rechazó dos veces antes de aprobar, y las dos veces tuvo razón sobre **mis propias
correcciones**:

1. **El upsert pisaba todo el estado de la sesión.** El import corre en cada arranque y en el heal, así
   que habría revertido 143 sesiones cerradas y borrado sus commits. Quedó acotado a lo que el spec no
   escribe (`kind` + detalle) y se verificó contra el store vivo: **0 discrepancias** en 382 sesiones.
2. **El smoke se auto-justificaba.** Convertía cada ítem sin cubrir en "no ejecutado" con una nota fija:
   con la política obligatoria, un smoke que no verificaba nada quedaba "resuelto" y habría pasado por
   verificación. Ahora deja constancia y el motivo lo aporta una persona.

## Alcance honesto

La exigencia de "ítems resueltos para cerrar" todavía **no** la aplica el cierre: eso es **F3**. Hoy la
política obligatoria se hace valer al **registrar** el resultado; un smoke puede dejar ítems pendientes y
el gate de la sesión (advisory) igual cierra. Ese es el punto de entrada de F3.

## Estado del cierre

- Código: `f4773cd`, `7238e65`, `32ab77c`, `c21575a`, `3252cc5`, `8921862`. Data repo: `b5a1a5f`.
- Verificación: `pnpm typecheck` exit 0 y **15/15** del archivo de tests (corridos por el dev al HEAD
  final); suite completa **355 archivos / 2794 tests en verde**.
- Lo que sigue: **F3**, el guard del cierre.
