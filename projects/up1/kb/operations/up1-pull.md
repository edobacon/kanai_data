# up1-pull — Actualizacion completa de repos del monorepo UP1

> Prompt operativo. Lo lees, ejecutas el procedimiento de corrido y solo paras a preguntar en los casos marcados como **PARAR**. Todo lo demas tiene default fijo.

## Objetivo

Traer los cambios mas recientes de Bitbucket en los 6 repos del monorepo UP1, regenerar los artefactos sincronizados desde mods, y dejar el worktree en un estado predecible.

## Contexto y repos

El monorepo vive en `/Users/edobacon/Workspace/uplanner/up1/`. Las copias `/Users/edobacon/Workspace/uplanner/_up1/`, `__up1/`, `__up1_/` son backups antiguos — **ignorarlas**. El otro `/Users/edobacon/Workspace/up1/` es un monorepo distinto, no aplica este prompt.

Los 6 repos a actualizar (todos en rama `develop`, origin en `bitbucket.org:uplanner/{repo}.git`):

| # | Repo | Path |
|---|------|------|
| 1 | up1 (monorepo) | `/Users/edobacon/Workspace/uplanner/up1` |
| 2 | report-builder | `/Users/edobacon/Workspace/uplanner/up1/report-builder` |
| 3 | layout | `/Users/edobacon/Workspace/uplanner/up1/layout` |
| 4 | object-manager | `/Users/edobacon/Workspace/uplanner/up1/object-manager` |
| 5 | suite | `/Users/edobacon/Workspace/uplanner/up1/suite` |
| 6 | flow | `/Users/edobacon/Workspace/uplanner/up1/flow` |

## Defaults fijos (no preguntar)

| Decision | Default |
|----------|---------|
| Que repos | Los 6 de la tabla, en rama `develop` |
| Operacion | `git pull --ff-only` |
| Dirty tree con outputs de sync | `git stash push --include-untracked` con tag timestamp, despues pull |
| Dirty tree con cambios NO-output | **PARAR**, reportar al usuario, no tocar |
| `npm install` | Si, despues de los pulls (puede traer cambios de lockfiles) |
| `npm run sync` | Modo normal (con DB). Si DB no levanta, fallback a `SKIP_DB_OPERATIONS=true npm run sync` |
| Submodule pointers M en monorepo post-pull | No commitear, es normal |
| Outputs del sync post-sync | No commitear nunca, son regenerables |

## Pre-flight (bloqueante)

Estos chequeos se ejecutan **antes** de cualquier accion. Si alguno falla → **PARAR** y reportar al usuario. No intentar fix automatico.

### PF-1 — Rama `develop` en los 6 repos

Cada uno de los 6 repos debe estar en rama `develop`. Si alguno esta en otra rama:

- **PARAR**, mostrar al usuario la lista exacta de repos fuera de `develop` con su rama actual.
- **NO** hacer `git checkout develop` automatico. Razones:
  - Si la rama tiene trabajo sin commitear → cambiar de rama puede perderlo o arrastrarlo.
  - Si la rama es feature (USUITE-XXX) → el dev puede estar en medio de un ticket y no querer cambiar.
  - El cambio de rama es del dev, no del prompt.
- Esperar instruccion del dev: o vuelve a develop manualmente, o decide saltar ese repo del flujo.

### PF-2 — Upstream configurado

Cada repo debe tener `origin/develop` como upstream de su rama `develop`. Si falta upstream → **PARAR**.

### PF-3 — Acceso SSH a Bitbucket funcional

Los pulls a Bitbucket requieren autenticacion SSH. **No usar `ssh-add -l` como probe** — en macOS con `UseKeychain yes` las claves no aparecen en el agent aunque funcionen perfectamente (el SSH client las trae del Keychain al conectar). Falso positivo comun.

Probe real (verifica que la conexion al remoto sirve):

```bash
git -C /Users/edobacon/Workspace/uplanner/up1 ls-remote origin develop > /dev/null 2>&1 && echo "ssh OK" || echo "ssh FAIL"
```

Si falla → **PARAR** y pedir al usuario que cargue su llave (`ssh-add ~/.ssh/<key>`) o verifique `~/.ssh/config`.

## Procedimiento

### 1 — Inspeccion inicial de los 6 repos

```bash
for d in /Users/edobacon/Workspace/uplanner/up1 \
         /Users/edobacon/Workspace/uplanner/up1/report-builder \
         /Users/edobacon/Workspace/uplanner/up1/layout \
         /Users/edobacon/Workspace/uplanner/up1/object-manager \
         /Users/edobacon/Workspace/uplanner/up1/suite \
         /Users/edobacon/Workspace/uplanner/up1/flow; do
  echo "=== $d ==="
  branch=$(git -C "$d" branch --show-current 2>/dev/null)
  upstream=$(git -C "$d" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || echo "(sin upstream)")
  dirty=$(git -C "$d" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  echo "branch: $branch  upstream: $upstream  dirty_count: $dirty"
done
```

### 2 — Clasificar dirty trees (regla de oro)

**Premisa**: en estos repos el dev no edita archivos a mano. Todo lo que aparece como dirty debe ser **autogenerado por el sync**. Si algo dirty no calza con un path de la tabla de outputs, es sospechoso y bloquea el pull.

Por cada repo con `dirty_count > 0`:

```bash
git -C "$REPO" status --short
```

Clasificar **cada archivo** de la salida contra la **tabla de outputs del sync** (siguiente seccion). Reglas:

1. **Path matchea exactamente un patron de la tabla** → marcar como `output` (seguro de stashear)
2. **Path NO matchea ningun patron de la tabla** → marcar como `desconocido`
3. **Hay aunque sea 1 archivo `desconocido`** → **PARAR** todo el flujo (no solo ese repo). No stashear, no pullear, no continuar.

Al **PARAR** reportar al usuario en formato tabla:

| Repo | Archivo | Status (M/D/??) | Razon de duda |
|------|---------|-----------------|---------------|

Esperar instrucciones explicitas. Tipicamente el dev:
- Confirma que es output que falta en la tabla → actualizar la tabla y reintentar
- Reconoce edicion propia → decide commitear, stashear manual, o resetear
- No lo reconoce → investigar antes de continuar

**Nunca** asumir "parece autogenerado, lo stasheo". El path tiene que matchear la tabla literalmente.

### 3 — Fetch + pull --ff-only

Para cada repo:

```bash
# Si tiene dirty:
git -C "$REPO" stash push --include-untracked -m "up1-update-$(date +%Y%m%d-%H%M%S)"

# Siempre:
git -C "$REPO" fetch origin
git -C "$REPO" pull --ff-only
```

Si `pull --ff-only` aborta por motivo distinto a dirty (ej: divergencia con remoto, conflictos no resolubles fast-forward) → **PARAR** y reportar.

El monorepo `up1` siempre debe pullearse **al final**, despues que los sub-repos avancen, para evitar mezclar punteros de submodulo viejos.

### 4 — Reinstalar dependencias

Despues de pull en los 6, los lockfiles del monorepo pueden haber cambiado. Correr `npm install` en raiz:

```bash
cd /Users/edobacon/Workspace/uplanner/up1 && npm install
```

Tarda ~2 minutos. Es seguro correrlo siempre (idempotente si no hay cambios).

### 5 — Sync de mods a core workspaces

```bash
cd /Users/edobacon/Workspace/uplanner/up1 && npm run sync
```

Internamente corre `npm run sync` en `object-manager`, `layout`, `suite` en ese orden. Toma ~70 segundos (object-manager domina con ~65s). Requiere:

- PostgreSQL corriendo (fases 3, 6, 7, 8 tocan DB)
- Redis corriendo (BullMQ events)

Si falla por DB no disponible, reintentar con flag para saltar fases DB:

```bash
SKIP_DB_OPERATIONS=true npm run sync
```

Esto deja solo las fases 1, 2, 5 (mirror, merge, logic). Util en entorno sin levantar la stack.

### 5b — Seed (opcional, preguntar al usuario)

El sync NO corre seeds — solo propaga artefactos. Si los pulls trajeron cambios en `mods/*/seed/` o en `object-manager/seed/`, el seed local queda desactualizado hasta correrlo explicitamente.

**Default: no correr.** Preguntar al usuario solo si se observa al menos UNA de estas senales en los commits jalados:

- Diff toca `seed/` en `object-manager` o algun mod
- Diff agrega/cambia objetos que necesitan data inicial (status, lookups, etc.)
- El usuario lo pide explicito en argumentos (`--seed`)

Si aplica, ofrecer:

```bash
cd /Users/edobacon/Workspace/uplanner/up1
npm run seed --workspace=@uplanner/object-management-backend
```

Tarda 30s-2min segun tenant. Es idempotente (upsert) — seguro correr aunque ya este seedeado. **Asume Postgres + Redis arriba**; sino falla con error de conexion (no hay flag `SKIP_DB` para seed).

**No correr seed automatico** — el dev puede tener data manual en sandbox que no quiere mezclar con re-seed. Confirmar antes.

### 6 — Verificacion post-sync

```bash
for d in /Users/edobacon/Workspace/uplanner/up1/object-manager \
         /Users/edobacon/Workspace/uplanner/up1/suite \
         /Users/edobacon/Workspace/uplanner/up1/layout; do
  echo "=== $d ==="
  git -C "$d" status --short | head -30
done
echo "=== up1 monorepo ==="
git -C /Users/edobacon/Workspace/uplanner/up1 status --short
```

**Esperado** post-sync:
- `object-manager`, `suite`, `layout`: dirty con outputs del sync (ver tabla siguiente). **No commitear.**
- `up1` monorepo: 4 submodule pointers "M" + posibles untracked en `mods/` (curriculum-design, etc.). **No commitear sin confirmar.**

Si aparecen archivos fuera de la tabla de outputs → reportar al usuario.

### 7 — Reporte final

Entregar al usuario:

- Tabla de pulls aplicados (commits jalados por repo)
- Resumen del sync (segundos por workspace, errores si hubo)
- Lista de stashes guardados (path + nombre)
- Archivos inesperados si los hubo

## Tabla de outputs del sync (NO commitear)

Todo archivo dentro de estas rutas es **regenerable** y vive como output del sync. Es seguro stasheallo y dejar que el sync lo recree.

### En `object-manager/`

- `objects/business/Base/*.json` (excepto `common.json` y `Person.json` si no provienen de mods; **PARAR** si dudas)
- `objects/business/Extended/*.json` (siempre `ext__*`)
- `objects/business/RecordTypes/*.json`
- `prisma/BASEMODEL/schema.prisma`
- `prisma/{TENANT}/schema.prisma` (BASEMODEL, TEST, UCASMT, UCENG, UCPLN, UPU, placeholderTenantID, etc.)
- `src/graphql/typeDefs/dynamic.js`
- `src/graphql/typeDefs/mods.js`
- `src/graphql/typeDefs/up1.js`
- `src/graphql/resolvers/` cuando vienen de mods

### En `suite/`

- `lang/{locale}_{country}.json` (es_CL, en_CL, pt_BR principalmente — son outputs de merge i18n)
- `lang/{locale}_{country}@{Object}.json` (overrides por objeto generados desde mods)
- `modsComponents/**` (Vue components desde mods)
- `css/mods/**` (estilos desde mods)

### En `layout/`

- `src/modsComponents/**` (componentes Vue desde mods)
- `src/modsComponents/component-registry.json`
- `src/stories/{ModComponent}.stories.ts` (stories generadas)
- `.sync-registry.json`

### En `up1/` (monorepo)

- `mods/{mod-name}/` cuando el untracked corresponde a un repo clonado por `update-repos.js`. **No commitearlo en el monorepo.** `git stash --include-untracked` lo reporta como `Ignoring path mods/{mod-name}/` — es esperado, no es error.
- `package-lock.json` cuando aparece M post-`npm install`. Output regenerable: el `npm install` del paso 4 lo recrea contra el `package.json` actual. Si esta M ANTES del flujo (por un `npm install` previo del dev), tambien es regenerable.
- Los submodule pointers `M` (`layout`, `object-manager`, `suite`, `report-builder`, `flow`, `mods/flow-viewer`) no producen contenido tangible en stash — `git stash show stash@{0}` puede retornar vacio aunque el stash exista. No es error. Ver CE-1.

## Casos especiales

### CE-1 — Submodule pointers M en monorepo `up1` post-pull

Despues de pull en sub-repos (layout, object-manager, suite, flow), el monorepo registra los sub-repos como "M" porque su puntero apunta a un commit anterior. **Es normal.** No commitear sin confirmar con el usuario — actualizar los punteros del monorepo significa publicar a Bitbucket que el monorepo ahora referencia los nuevos commits, decision que es del usuario.

### CE-2 — Untracked `mods/curriculum-design/` (u otro mod) en monorepo

Si el dev corrio `npm run update-repos` en algun punto, ese script clona cada mod registrado dentro de `mods/`. Esos directorios quedan untracked en el monorepo (los mods viven en sus propios repos). No tocar — son los repos externos.

### CE-3 — Archivos `D` (deleted) en object-manager: instructor, availability, etc.

Indica que un sync anterior genero artefactos para mods que ya no estan registrados (o `cleanupOrphanedModObjects` los detecto como huerfanos). Tratamiento:

- Si el usuario confirma que esos mods fueron removidos intencionalmente → commitear los `D` en una rama feature USUITE-XXX (no en develop directo).
- Si no se sabe → **PARAR** antes del pull y reportar al usuario para investigar.

**Comportamiento post-pull + post-sync (esperado):** estos archivos pueden seguir apareciendo `D` despues del flujo completo. El pull los trae del remoto (existen en `origin/develop` con commits de su autor), pero el `npm run sync` los vuelve a borrar como huerfanos porque su mod source no esta presente localmente (`mods/<owner>/` no esta clonado o no expone esos object definitions). **No es un fallo del flujo** — es estado persistente que se resuelve aclarando con el owner si los mods deberian estar activos. Documentarlo en el reporte final como observacion, no como error.

### CE-4 — DB no disponible al correr sync

Sintoma: error de conexion Postgres/Redis durante fase 3 o 4. Fallback:

```bash
SKIP_DB_OPERATIONS=true npm run sync
```

Documentar en el reporte que solo se ejecutaron las fases 1, 2, 5 y que falta correr el sync completo cuando la DB este disponible.

### CE-5 — Pull aborta por dirty tree con archivos NO clasificables

Si `git status --short` muestra archivos que no entran en la tabla de outputs:

- Cambios en `src/` (codigo fuente real) → posiblemente trabajo del dev sin commitear
- Cambios en config raiz (`package.json`, `tsconfig.json`, `nuxt.config.ts`) → editar manual
- Cambios en archivos `.env*` → configuracion local

**PARAR**, mostrar al usuario los archivos en duda y esperar instrucciones (stash, commit, reset).

### CE-6 — Conflicto fast-forward no resoluble

Sintoma: `git pull --ff-only` aborta con `Not possible to fast-forward`. Significa que la rama local tiene commits que no estan en `origin/develop` (divergencia).

**PARAR**, no hacer rebase ni merge automatico. Reportar:
- Cuantos commits ahead esta la rama local (`git rev-list --left-right --count develop...origin/develop`)
- Los commits con `git log origin/develop..develop --oneline`

Esperar instrucciones.

### CE-7 — Conflicto al hacer `npm install`

Si npm install falla por conflictos en `package-lock.json`:

- No correr `npm install --force` automatico
- Reportar el error al usuario, sugerir investigar manualmente

### CE-8 — Stash vacio en up1 root cuando solo hay submodule pointers

Si los unicos `M` en up1 root son los submodule pointers (CE-1), el stash `--include-untracked` se crea pero `git stash show stash@{0}` retorna salida vacia, y `git stash show --name-only stash@{0}` retorna 0 archivos. **No es bug** — git no materializa el cambio de gitlink como contenido stasheable. El stash queda como entry vacio sin riesgo. Drop directo o ignorar.

## Recuperacion de stashes

Los stashes creados por este prompt tienen tag `up1-update-YYYYMMDD-HHMMSS`. Inspeccion:

```bash
git -C "$REPO" stash list
git -C "$REPO" stash show -p stash@{0}
```

Aplicar:

```bash
git -C "$REPO" stash pop stash@{0}    # aplica y elimina
git -C "$REPO" stash apply stash@{0}  # aplica sin eliminar
```

Descartar (solo si el sync regenero exactamente el mismo contenido):

```bash
git -C "$REPO" stash drop stash@{0}
```

**Antes de descartar**, validar con:

```bash
git -C "$REPO" diff stash@{0} HEAD -- $(git -C "$REPO" stash show --name-only stash@{0})
```

Si el diff es vacio o solo difiere en archivos que el sync no regenero, es seguro descartar.

## Pregunta final al usuario (opcional)

Al terminar, ofrecer (en una sola pregunta multi-select):

- (a) revisar archivos `D` no clasificados si aparecieron (CE-3)
- (b) descartar los stashes guardados si el sync los regenero identicos
- (c) actualizar los submodule pointers en el monorepo (commit) si corresponde

Si todo salio limpio y no hay nada de lo anterior pendiente, omitir la pregunta y cerrar con el reporte final.

## Tiempos de referencia

| Paso | Tiempo tipico | Pull grande (30+ commits) |
|------|--------------|---------------------------|
| Inspeccion + clasificacion | ~5s | ~15s (si hay PARAR + reset selectivo) |
| Stash + fetch + pull en 6 repos | ~20s | ~30s |
| `npm install` | ~120s | ~120s (a veces +30s si hay storybook bump u otro mayor) |
| `npm run sync` (modo normal) | ~45-70s (object-manager domina) | ~45-70s |
| Seed (opcional) | — | 30s-2min |
| Verificacion + drop de stashes | ~10s | ~15s |
| **Total** | **~4 min** | **~5-6 min** |

Si el flujo se desvia >50% del referencial, reportar en el resumen final.

## Argumentos del prompt

| Arg | Efecto |
|-----|--------|
| (sin args) | Flujo completo con defaults |
| `--skip-db` / `--no-db` | `SKIP_DB_OPERATIONS=true` directo en sync (saltar fases DB) |
| `--no-install` | Saltar `npm install` (no recomendado) |
| `--dry-run` | Solo pasos 1 + 2 (inspeccion + clasificacion), reportar plan sin tocar nada |
| `--seed` | Forzar seed post-sync (paso 5b) aunque no se detecten cambios en seeds |
