# F4 — Resultado: la épica con la verificación obligatoria

Fecha: 2026-10-05. **Fase cerrada** (juez de fase: aprobable_con_nits, aprobatorio, **tras tres rondas**).

## Qué se cambió

| Pieza | Cambio |
|---|---|
| La política de la épica | `activeEpicPolicy` declara la verificación obligatoria, en el mismo lugar donde ya fuerza el autopilot autónomo |
| La herencia efectiva | **Una sola función** (`epicVerificationRequired`) resuelve la política en las cuatro rutas que pueden bloquear o cerrar: el guard del cierre (DET-36), el gate de la sesión (DET-20), el registro de resultados y la vista del ticket |
| Los estados vivos | Vale en `running`, `ready`, `review` y `paused`; no en los terminales `integrated` y `cancelled` |
| El contrato de entrega | Nombra la verificación como parte de lo que se entrega, resuelta o con su motivo |
| Fail-closed del guard | Una sesión de verificación **sin detalle**, con el detalle **ilegible** o con el detalle **vacío** bloquea; una sesión **reemplazada** no bloquea |
| Robustez | La proyección de la vista queda protegida: un store de épicas ilegible no tumba el detalle del ticket |

## Por qué costó tres rondas

1. **Ronda 1 — defecto real**: la herencia solo valía con la corrida en `running`, pero **la épica no cierra el ticket mientras corre**: lo cierra por lote al entregar, con la corrida en `ready`. Ahí la política se perdía y el guard caía al `ask` del ticket: un ticket con ítems sin resolver se integraba y se cerraba como si nada. Mi test usaba una combinación que el flujo real nunca produce, así que daba falsa confianza.
2. **Ronda 2 — dos reservas**: la corrida sigue siendo del ticket en `review` (tickets acumulados esperando el PR/CI final) y en `paused` (se reanuda), y el detalle del ticket podía decir `ask` mientras el guard exigía `required` cuando el plan de la épica tenía un problema.
3. **Ronda 3 — aprobado**, con tres nits: uno cosmético (declarado y no aplicado), y dos corregidos (robustez de la proyección y coherencia del fail-closed con el detalle vacío).

## Estado del cierre

- Código: `a976304` (la política), `fd2b917` (el cierre real), `fa84b72` (estados vivos y vista), `0d04d26` (nits).
- Verificación: typecheck 0 y **15/15** del archivo de tests (corridos por el dev al HEAD); suite completa **357 archivos / 2818 tests en verde**.
- Lo que queda: **F5**, la verificación de punta a punta, con el ticket de prueba **KT-013** ya creado en el proyecto KT (que no tiene `baseUrl`, así que el smoke no puede correr: es el caso real de un ítem no ejecutable con su motivo).
