# F5 — Resultado: la prueba de punta a punta

Fecha: 2026-10-05. **Fase cerrada** (juez de fase: aprobable_con_nits, aprobatorio). Es la última: **el plan queda completo (5 de 5)**.

## Cómo se probó

Con las **herramientas reales** de Kanai (tras reiniciar la conexión del MCP, que estaba corriendo código viejo), sobre un ticket de verdad:

- **KT-013** en el proyecto `kanai_test`, elegido a propósito porque **no tiene `baseUrl` de verificación**: es el caso real de un ítem que no se puede correr.
- La verificación quedó **obligatoria** (persistida: verificada en el frontmatter y en la columna de la base).
- Su sesión de verificación con 2 ítems: uno **se verificó de verdad** (`node greet.mjs` imprime `¡Hola, mundo!` con exit 0; sus tests dan **11/11**) y el otro quedó **no ejecutado con causa `sin-ambiente` y su nota**.

## Los tres momentos, con sus salidas textuales

**1. La política se hace cumplir al registrar.** Intentar reportar el ítem sin motivo fue rechazado:

> *el item 2 quedó NO ejecutado (not_run) sin su motivo: indica la causa (sin-pw | sin-ambiente | sin-acceso | no-aplica | otro)*

**2. El cierre lo informa.** Sobre una copia del store con ese ítem sin resolver:

> *La verificación de este ticket es OBLIGATORIA y quedan 1 item(s) sin resolver o fallidos: "Correr el smoke de la vista con Playwright" (no ejecutado (sin causa))… o cierra reconociendo el motivo en payload.verificationAck (queda auditado)*

**3. El reconocimiento del dev destraba**, y pasa por el sistema de confirmación humana: queda auditado.

En el ticket real, con los ítems resueltos, la consulta del cierre da **DET-36 en `ok:true`**: no traba cuando cada ítem pasó o quedó justificado.

## Lo que la prueba encontró

El mensaje del cierre **repetía el mismo ítem no ejecutado en las dos listas** (lo listaba como pendiente y otra vez como "ya quedaron sin correr"). Corregido en `7ae3dda`, con un test que falla sin el arreglo.

## Lo que dejó el juez

Veredicto aprobatorio, tras verificar la evidencia contra el store real y **reproducir por su cuenta** que DET-36 devuelve `ok:true` con el estado real. Solo quedaron: dos imprecisiones de cita al transcribir el brief, una reserva de trazabilidad (las mediciones sobre la copia no dejan traza propia, aunque su estado es verificable y reproduce el mensaje exacto) y un nit preexistente (un ítem `skipped` con causa no se lista en el informe de "ya quedaron sin correr").

## Verificación

`pnpm typecheck` exit 0 y suite completa **357 archivos / 2819 tests en verde**. Commit de la fase: `7ae3dda`.
