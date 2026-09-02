---
id: RULE-global-003
project: jormat-evolution
type: rule
module: global
level: must
tags:
  - scope-boundary
  - delivered-codebase
  - additive-only
  - inherited-risk
  - blast-radius
---

# El código base entregado NO se modifica: complementar de forma aditiva y reportar los defectos heredados

## What

La estructura/código base entregado de jormat-evolution **no se modifica**. Esto incluye el andamiaje preexistente: `auth` (guard, middleware, JWT/JWKS), `workspaces`, `users`, el esquema de DB y sus migraciones, `database.module`, `docker-compose*`, `seeds` y todo archivo que **no creamos nosotros**. Nuestro trabajo es **agregar**:

- **Permitido (aditivo)**: crear módulos/servicios/endpoints/repos/vistas **nuevos**; agregar **capas transversales que envuelven sin reescribir la lógica entregada** (registrar `helmet`, `@nestjs/throttler`, validación de env al boot, un guard de capabilities aplicado a endpoints nuevos); configuración por **env** (secretos fuertes, CORS, puertos) que no toca código.
- **Prohibido (reescritura)**: cambiar la lógica de un controller/service entregado, alterar el esquema/modelo o sus migraciones, cambiar la conexión de DB, modificar los seeds entregados, tocar el handler de un endpoint existente.
- **Defectos en lo entregado** (los riesgos heredados de `observations/`: O-1, O-2, O-3, O-5, O-6, O-7, O-16, O-18, el fallback débil de O-4, el seed `admin@jormat.dev` de O-15): **no se corrigen reescribiéndolos → se REPORTAN al dueño** de la estructura. Excepción: lo que el propio equipo agregó (p. ej. el seed admin personal en el working tree) sí es nuestro y se resuelve.

## Why

La base fue entregada por un tercero/dueño. Modificarla rompe el contrato de propiedad, introduce regresiones en código que no controlamos y expande el blast radius más allá de nuestro cambio. Alinea con el principio de que **las auditorías y fixes se acotan a nuestros cambios**: un defecto en código ajeno se triagea y reporta, no se parchea unilateralmente. La aislación de tenant y la seguridad de lo entregado son responsabilidad del dueño; la nuestra es **no introducir nuevos riesgos** y **hacer visible lo heredado**.

## Where

- **Files**: todo el código preexistente de `jormat-evolution-mono` (no creado por nosotros). Verificable por `git blame` / autoría / fecha de creación.
- **Layers**: backend (auth/workspaces/users/db), infra (compose/seeds), y cualquier archivo entregado.
- **Plan**: `requirements-and-stack §1.4.3` (S1–S4 sobre lo nuevo), `implementation-tasks WP-A7` (complementos + reporte), `DEC-001` (tenant). Reporte de heredados: WP-A7.6.

## When

Siempre, antes de modificar cualquier archivo. Si el archivo es preexistente (entregado) y el cambio reescribe su lógica/modelo → **detenerse**: o se logra de forma aditiva (capa nueva que envuelve) o se reporta como riesgo heredado. Aplica en todas las sesiones DKC y en el Gate de calidad.

## Verification

- `git blame`/autoría: si el archivo no lo creó el equipo y el diff cambia su lógica → **rechazar** en review.
- Complemento aditivo aceptable: registra middleware/guard/config nuevos sin alterar handlers/servicios/esquema entregados (documentar el punto de enganche).
- Existe un **reporte de riesgos heredados** para los defectos de la base (no parches nuestros sobre ellos).
- El working tree no contiene ediciones de lógica en `auth`/`workspaces`/`users`/`database.module`/migraciones/seeds entregados.

## Source

- **Discovered in**: directriz del dev (2026-06-13) — "no podemos modificar la estructura que ya nos entregaron; cubrir lo nuestro en la planificación o complementar lo existente".
- **Evidence**: las observations de riesgo (O-1..O-7, O-15..O-18) viven en código entregado; corregirlas reescribiéndolo viola la restricción. WP-A7 se reencuadró a complementos aditivos + reporte.
- **Related**: [[security-baseline]] (RULE-global-002, S1–S4 sobre lo nuevo), [[code-quality-standards]] (RULE-global-001); `DEC-001` (tenant); `observations/README.md`. Principio de blast-radius / fixes acotados a nuestros cambios.
