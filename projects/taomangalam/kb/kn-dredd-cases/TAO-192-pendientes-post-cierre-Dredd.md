---
id: DOC-kb-kn-dredd-cases-TAO-192-pendientes-post-cierre-Dredd
project: taomangalam
type: doc
tags:
  - TAO-192
  - kn-dredd
  - pendientes
  - ep-01
---

# TAO-192 — pendientes post-cierre (Dredd)

Fecha: 2026-10-06 · Ticket: TAO-192 · Rama: `epic/EP-01a`

El ticket quedó cerrado y la revisión de PR (kn-dredd, pre-envío) cerró con veredicto **cerrable**: 14/14 puntos verificados en la ronda de cierre (incluido el S0 de la página legal en la imagen). Quedan estos pendientes, ninguno bloqueante.

## Consultas al autor (esperan confirmación)

- **rs8 — Carrera de refresh.** La renovación perdedora revoca toda la familia, incluido el par recién emitido por la ganadora (`server/src/auth/sesiones.ts:173`). Confirmar si es la política buscada; si no, la perdedora no debe revocar el par que no rotó.
- **ra6 — Sin renovación de sesión en la app.** Un 401 deja la cola legal reintentando con el token vencido (`app/lib/features/legal/data/puerto_aceptacion_api.dart:99`). Confirmar que la renovación llega con EP-03b (HU-03a-04) y que el límite es aceptable mientras tanto.
- **e4 — scrypt vs DEC-162.** El secreto de dispositivo se hashea con scrypt (`server/src/auth/credencial-dispositivo.ts`) y DEC-162 fija argon2id para contraseñas. Confirmar que DEC-162 no rige este secreto o registrar la decisión.
- **d1 — Migración v3 sobre datos no canónicos.** La recreación de tablas con CHECK fallaría si existieran filas v1/v2 con enums fuera del canon (`app/lib/data/drift/esquema_v3.dart:35`). Confirmar que no hay instalaciones reales pre-EP-01 (no aplica) o sanear antes del `INSERT`.

## Diferidos / decisiones registradas (con motivo)

- **rs9 (S3) — Rutas autenticadas fuera del contrato omiten los checks.** Defensa en profundidad; requiere introspección de rutas registradas. Sin exploit actual.
- **rs5 (S3) — Clave de firma sin mínimo de longitud.** El cambio de mínimo obliga a retocar fixtures de tests; se evalúa como higiene aparte.
- **m2 (S3) — "sesión N" en los mensajes de commit.** No se reescribe la historia de una rama compartida.

## Nota de alcance

Las historias de GitHub que esta preparación sirve (p. ej. #89, #91, #95–#98, #101, #102) **permanecen abiertas**: el contrato del ticket prohíbe cerrarlas por anticipado; se cierran en las fases de integración (TAO-185/186 y los checks `ep01-*-integration`).

Referencias: caso `kn-dredd-cases/taomangalam__tao-192.json`; métricas `kn-dredd-metrics/2026-10-06-TAO-192-opencode-r1.json` y `...-r2.json`.
