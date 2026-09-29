---
id: TAO-160-DEC-ALCANCE-SUBDIRECTORIOS
project: taomangalam
type: decision
module: EP-00
tags:
  - TAO-160
  - GH-13
  - pnpm
  - DEC-205
  - comandos
---

Decision (HU-00-13 / TAO-160): REQ-01 pide que los siete comandos raiz sean "resolubles desde cualquier subdirectorio del monorepo". La implementacion resuelve la RAIZ del monorepo desde la ubicacion del script (`scripts/dev/lib.mjs`), de modo que el comando corre con cwd en la raiz. Pero `pnpm run <script>` resuelve contra el `package.json` mas cercano subiendo desde el cwd, y `server/` tiene el suyo propio FUERA del workspace raiz (DEC-205).

Consecuencia: desde `server/` o cualquiera de sus subdirectorios, `pnpm run check`/`pnpm run test` ejecutan los scripts DEL SERVIDOR, no los del root. No es un bug: es la semantica de pnpm + DEC-205. Esta acotacion se documenta en `docs/development/commands.md` ("Ojo con `server/`") y hay un workaround: invocar los comandos raiz desde la raiz o desde un subdirectorio sin `package.json` propio (p.ej. `app/`), o usar `node scripts/dev/cli.mjs <comando>`.

Alcance del REQ: se interpreta como "resolubles desde la raiz y desde subdirectorios sin `package.json` propio"; los criterios de aceptacion y los casos TC-REQ-01-2 / TC-REQ-05-3 solo ejercitan `app/lib/`, coherentes con esta lectura.

Nota: si en el futuro se quiere uniformidad total, la via es exponer en `server/package.json` scripts homonimos que deleguen en `node ../scripts/dev/cli.mjs <comando>`, o emitir un aviso cuando se invoca `check`/`test` desde `server/`. No se hace ahora para no cambiar el contrato del servidor (HU-00-04) fuera del alcance de HU-00-13.
