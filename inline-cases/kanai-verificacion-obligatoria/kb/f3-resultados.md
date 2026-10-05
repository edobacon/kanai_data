# F3 — Resultado: el cierre exige la verificación resuelta

Fecha: 2026-10-05. **Fase cerrada** (juez de fase: aprobable_con_nits, aprobatorio, tras dos iteraciones).

## Qué se cambió

| Pieza | Cambio |
|---|---|
| Guard del cierre (DET-36) | Con la política en `required`, el cierre exige que cada ítem **pase** o quede **no ejecutado con su motivo**. Bloquean los sin resolver (`pending`, o `not_run`/`skipped` sin causa) **y los que fallaron** |
| El mensaje | Dice qué quedó sin correr **y por qué**, con el estado real de cada ítem: `fallo`, `sin resolver (pendiente)`, `no ejecutado (causa): nota` |
| Gate de la sesión (DET-20) | La política puede volver **bloqueante** el gate de la sesión de verificación, sin cambiar el default |
| Escape auditado | `verificationAck` con su motivo: se evalúa después de mirar los ítems (si no hay nada que reconocer, no hace falta), queda en el payload del evento de cierre y lo confirma la persona por el host, igual que el teach |
| Catálogo | `DET-36` figura como guard de `ticket → closed` (antes solo como revisión) |

## Medición real (sobre una copia del store, con una sesión de verificación real)

Sin reconocer el motivo, el cierre **traba**:

> *La verificación de este ticket es OBLIGATORIA y quedan 1 item(s) sin resolver o fallidos: "…ItemsPickerTable…" (sin resolver (pendiente)). Ya quedaron sin correr (con su motivo): "…La query paginada…" (no ejecutado (sin-pw): MARCA-F2-DEFECTO).*

Con el motivo reconocido, **destraba**.

## Lo que el juez encontró

- **Iteración 1 — defecto**: un ítem con `fail` contaba como resuelto, así que un ticket obligatorio podía cerrar con una **verificación fallida**. Corregido: ahora el guard bloquea por fallidos también, y el registro sigue aceptando reportar un `fail` (lo que no se puede es cerrar con él).
- **Iteración 2 — aprobado**, con dos reservas y dos nits:
  - **Reserva**: el guard no excluye las sesiones de verificación **superseded** (una verificación rehecha sigue trabando por sus ítems viejos). El juez sugiere resolverlo en F4, donde la política pasa a ser el default.
  - **Reserva**: sin sesión de verificación el cierre no exige nada (es el contrato declarado: se omite). La cadena depende de que F4 garantice la sesión y F5 lo verifique de punta a punta.
  - **Nits**: un detalle corrupto se saltea en silencio (fail-open improbable) y un comentario sobre la confirmación humana no describe bien el mecanismo.

## Un hallazgo técnico en el camino

Importar los helpers del detalle desde `dispatch/verification` creaba un **ciclo de módulos** que rompía la inicialización del registro de guards (`Cannot access 'det42CloseAuthorized' before initialization`). Se movieron a `engine/verificationDetail` (puros, sin dependencias).

## Estado del cierre

- Código: `534f8aa` (el guard), `322ba93` (el ítem fallido + nits). Data repo: `5e51beb`.
- Verificación: `pnpm typecheck` exit 0 y **9/9** (corridos por el dev al HEAD final); suite completa **356 archivos / 2803 tests en verde**.
- Lo que sigue: **F4**, la épica con la verificación obligatoria por defecto, incorporando las dos reservas.
