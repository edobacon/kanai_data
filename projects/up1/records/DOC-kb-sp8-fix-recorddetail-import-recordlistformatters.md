---
id: DOC-kb-sp8-fix-recorddetail-import-recordlistformatters
project: up1
type: doc
---

# Fix necesario: import de `recordListFormatters` en `RecordDetail.vue` (layout)

Cambio local requerido para levantar up1 mientras el equipo no lo suba a
`layout/develop`. Registrado el 2026-08-04.

## Que es

Archivo: `layout/src/layouts/RecordDetail/RecordDetail.vue`, linea 271.

```diff
- import { renderJsonValue, formatIsoDateTime } from '../utils/recordListFormatters'
+ import { renderJsonValue, formatIsoDateTime } from '@utils/recordListFormatters'
```

## Por que es necesario

El refactor "Fase 2" de layout (reestructuracion de layouts en subcarpetas) movio
`RecordDetail.vue` un nivel mas adentro: de `src/layouts/RecordDetail.vue` a
`src/layouts/RecordDetail/RecordDetail.vue`. El import relativo a
`recordListFormatters` no se ajusto al nuevo nivel de anidacion:

- El modulo vive en `layout/src/utils/recordListFormatters.ts`.
- Desde `src/layouts/RecordDetail/`, `../utils/...` apunta a
  `src/layouts/utils/...`, que no existe.
- La ruta relativa correcta seria `../../utils/...`, pero la convencion del propio
  archivo (y del resto de layout tras la Fase 1) es usar el alias `@utils`.

Era la unica linea del archivo con import relativo: todo el resto ya usa aliases
(`@shared`, `@composables`, etc.). Es un straggler que escapo a la migracion de
aliases y luego se rompio con la Fase 2.

Sin el fix, Vite falla al resolver el import y `RecordDetail.vue` no carga:

```
[plugin:vite:import-analysis] Failed to resolve import "../utils/recordListFormatters"
from ".../layout/src/layouts/RecordDetail/RecordDetail.vue". Does the file exist?
```

Esto rompe cualquier vista de detalle (RecordDetail), que es el modo principal de
ver/editar un registro en la plataforma.

## Solucion elegida

Se uso el alias `@utils/recordListFormatters` (no la ruta relativa `../../utils/`)
porque:

- Es la convencion vigente del repo tras la Fase 1 (imports cross-directorio por
  boundary aliases). El mismo modulo ya se importa asi en
  `src/components/molecules/ViewToggle/ViewToggle.vue`.
- `@utils` esta definido tanto en layout (`vite.config.ts` -> `src/utils`) como en
  suite (`nuxt.config.ts` -> `../layout/src/utils`), asi que resuelve en ambos
  contextos (layout standalone y suite compilando el fuente de layout).
- Es robusto ante futuros cambios de anidacion de carpetas (un alias no depende de
  la profundidad del archivo que lo importa).

## Estado y verificacion

- Es un bug de `layout/develop`: al momento de este registro no hay fix mergeado ni
  en una rama conocida (en `develop` el import sigue roto). Queda como cambio local
  en layout (CORE) hasta que el equipo lo suba.
- Alcance: es el unico import relativo roto en las carpetas de layouts movidas por
  la Fase 2 (verificado por barrido de `src/layouts/*/*`).
- Verificado en runtime: con login de test, abrir Curriculum Design -> Programas
  academicos -> detalle de un registro renderiza `RecordDetail.vue` completo, sin
  errores de consola ni de resolucion.

## Follow-up

Llevar el cambio a un PR sobre `layout/develop` (o avisar al equipo que la Fase 2
dejo este straggler). Cuando se mergee y se haga pull, deja de ser un cambio local.
