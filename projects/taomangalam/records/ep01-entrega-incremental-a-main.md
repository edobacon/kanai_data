---
id: ep01-entrega-incremental-a-main
project: taomangalam
type: decision
module: EP-01
tags:
  - EP-01
  - entrega
  - merge
  - PR-127
  - desvio-de-plan
  - CI-local
---

**Decisión**: EP-01 se entrega a `main` de forma **incremental**, no con un único cierre agregado.

**Qué se entregó** (PR #127 → `main`, merge commit `32d8f08`, 2026-10-05): la base M0 completa (TAO-170 a TAO-180: tema, i18n, imágenes, motion, átomos, moléculas, overlays y feedback, menú, rutas, plantillas responsive y la auditoría de accesibilidad) y dos historias de M1a: TAO-181 (Ajustes con reducir movimiento, contraste aumentado y legibilidad) y TAO-182 (goldens responsive).

**Qué queda**: seis tickets de la épica —TAO-183 (splash), TAO-184 (versión mínima), TAO-185 (primer uso legal), TAO-186 (menú por capacidades, bloqueado por HU-03a-08), TAO-187 (versión recomendada) y TAO-188 (consentimientos V-51)— más los cinco subtickets de preparación TAO-189 a TAO-193.

**Motivo**: el trabajo acumulado estaba verificado y cerrado ticket a ticket, pero el plan de la épica exigía un único PR agregado con el `quality-gate` completo al final. Con el CI de GitHub apagado (minutos de Actions agotados hasta el 01/11/2026), esperar el cierre agregado dejaba en la rama de la épica trabajo ya aceptado y sin integrar. La persona responsable decidió entregarlo y continuar el resto sobre `main`.

**Consecuencias, explícitas**:
- El desvío queda registrado: el criterio «un único cierre agregado pasa quality-gate completo sobre SHA final» **no** se cumplió tal como estaba escrito.
- La verificación de esta entrega es el **CI local** (`pnpm run check` y `pnpm run test` en verde: 3211 pruebas de Flutter, 235 del servidor contra PostgreSQL, 380 transversales y los comandos raíz). No hubo verificación del lado de GitHub.
- El issue de la épica (#47) permanece abierto: M1a (seis tickets), M1b y M2 siguen pendientes. «M0 entregado» no significa «EP-01 completa».
- La base del repositorio pasa a `main` para que los tickets restantes ramifiquen de ahí; la rama `epic/EP-01` se conserva y ya es ancestro de `main`.
