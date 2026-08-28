---
id: DOC-kb-sp6-habilitar-lint-typecheck-core
project: up1
type: doc
---

# Habilitar lint y typecheck en up1: qué se necesita en core, efecto en mods, y deuda incremental

> Documento de investigación (solo diagnóstico, sin cambios aplicados). Descubierto durante UPONE-1445 (pre-push hook en curriculum-design) y su follow-up UPONE-1446 / TICKET-110.
> Fecha: 2026-07-17. Ejemplo de mod usado: `curriculum-design` (cd).

## TL;DR

Hoy **ni `lint` ni `typecheck` corren en up1** (crashean o fallan en masa), en core y en los mods. Ambos son problemas de **core**, no de los mods:

- **lint**: eslint crashea repo-wide por un `overrides` de `ajv` mal puesto en el `package.json` del root.
- **typecheck**: `layout` (core) tiene 165 errores de tipo propios; los mods symlinkean el source de layout y heredan esa deuda.

Arreglarlos en core **sí los habilita en los mods** (con un pequeño extra en cada mod para el typecheck). Mientras no se arreglen, la deuda **crece con cada dev** que suma código sin gate de calidad.

---

## 1. Estado actual (ambos rotos)

### 1.1 lint (eslint) — crashea en TODO el repo

`npm run lint`, `eslint .`, incluso `eslint --version` crashean, en el mod **y** en layout (core):

```
NOT SUPPORTED: option missingRefs. Pass empty schema with $id ...
TypeError: Cannot set properties of undefined (setting 'defaultMeta')
    at ajvOrig (up1/node_modules/@eslint/eslintrc/dist/eslintrc-universal.cjs)
```

- **Causa raíz**: el `overrides` de `up1/package.json` fuerza `eslint > ajv: 8.18.0` y `@eslint/eslintrc > ajv: 8.18.0`. Pero `@eslint/eslintrc` necesita `ajv ^6.14.0` (existe 6.15.0). ajv 8 no tiene la API que eslintrc espera de ajv 6 → crash al `require`.
- **Introducido por**: commit `9275d15` (Clemente Jara, "updated deps", 2026-02-17). Fue un bump de dependencias genérico; el pin de ajv 8 se coló sin notar que rompe eslintrc. `ajv-formats@2.1.1` sí usa ajv 8 legítimamente (por eso alguien quiso ajv 8), pero eslint/eslintrc no.
- **Es global, no del mod**: `eslint --version` crashea → el core de eslint carga `@eslint/eslintrc` al arrancar (compat), antes de cualquier config/plugin. El override envenena TODA instancia de eslintrc en el árbol (probado: el eslint 9 de layout crashea igual). Los npm `overrides` son globales por nombre de paquete → **no se pueden acotar por workspace**.

### 1.2 typecheck (vue-tsc / tsc) — deuda de tipos en layout

- `layout`: `tsc --noEmit` = **165 errores** propios (core no está typecheck-limpio). Ejemplos sistémicos:
  - `src/components/atoms/*/index.ts`: `Module '"*.vue"' has no exported member 'XProps'` (TS2614) — los `index.ts` re-exportan Props del `.vue` pero el shim `*.vue` no los expone.
  - `.storybook/preview.ts`, `*.spec.ts` con imports sin usar, etc.
- `curriculum-design` (mod): `vue-tsc --noEmit` = **130 errores**, descompuestos:
  - ~74 provienen de **layout** (ver 2.3, symlink).
  - ~56 en `modsComponents/` propios del mod (mayoría cascada de atoms de layout mal tipados; ~10 reales: `@ts-expect-error` sin uso, mismatch de tipos en `tests/unit/weightedSum.parity.test.ts`).

> Nota: el código FUNCIONA. `curriculum-design` corre **1251 tests (vitest) en verde**. El typecheck rojo es deuda de tipos/config, no bugs de runtime.

### 1.3 ¿Se pueden usar HOY, tal como están? (verificado 2026-07-17)

Prueba directa sobre el estado actual (develop, sin fixes):

**lint: NO se puede usar.** Crashea al arrancar en mod **y** layout; ni `eslint --version` corre:
```
Oops! Something went wrong! ESLint: 8.57.1
TypeError: Cannot set properties of undefined (setting 'defaultMeta')
```
No reporta violaciones: no arranca, devuelve cero resultados. Inutilizable.

**typecheck: CORRE pero NO sirve como gate.** Ejecuta y produce salida, pero:
- mod: **130 errores** · layout: **165 errores**. Nunca pasa → como gate verde/rojo es inutilizable (siempre rojo).
- Son deuda preexistente (config/arquitectura, no bugs: 1251 tests verdes). Un error nuevo se pierde entre el ruido de 130/165.
- Único uso posible hoy: contar errores antes/después de un cambio para ver si sumó (workaround manual, impráctico; y el conteo del mod arrastra layout por el symlink).

| Gate | ¿Usable hoy? | Detalle |
|------|--------------|---------|
| lint | **No** | Crashea, cero resultados |
| typecheck | **No como gate** | Corre pero siempre rojo; a lo sumo comparación manual de conteos |

Por esto el hook de UPONE-1445 dejó ambos en **advisory** (warn-only): no pueden bloquear porque no pasan. Ningún dev puede confiar hoy en lint/typecheck como check pass/fail, ni en local ni en CI.

---

## 2. Arquitectura relevante (por qué el mod hereda la deuda de layout)

### 2.1 Un solo node_modules + lock (workspaces)
up1 es un monorepo npm workspaces: **un solo `node_modules` y un solo `package-lock.json` en el root**, hoisted y compartido por los 5 workspaces (object-manager, layout, suite, flow, report-builder) y todos los mods. Cambiar el root afecta a todos. Por eso el override de ajv rompe eslint para todos.

### 2.2 eslint: layout usa eslint 9, el mod pin eslint 8
- `layout` declara `eslint ^9.0.0`; `curriculum-design` declara `eslint ^8.48.0`. Ambos crashean por el mismo ajv (el problema no es la versión de eslint).

### 2.3 typecheck: los mods SYMLINKEAN el source de layout
En `curriculum-design`:
```
components  -> ../../layout/src/components
composables -> ../../layout/src/composables
```
Son **symlinks** al source real de layout (no copias). Sirven para que el mod importe atoms de layout (`../../components/atoms`) en dev/test standalone, imitando la estructura post-sync (donde el SFC del mod vive en `layout/src/modsComponents/` y `../../components` resuelve a `layout/src/components`).

Consecuencia: `vue-tsc` del mod, al seguir el symlink, **typechea el source de layout bajo el tsconfig del mod**. Como layout tiene 165 errores propios (y el tsconfig del mod no es el de layout), el mod hereda una tajada. Los tests no lo notan porque `vitest.config.ts` del mod aliasea esos imports a **stubs** (`tests/stubs/atoms.ts`, etc.); el typecheck no usa esos aliases.

---

## 3. Qué se necesita para habilitar en CORE

### 3.1 lint (fix en root `up1`)
1. Quitar del `overrides` de `up1/package.json` los dos bloques `eslint > ajv: 8.18.0` y `@eslint/eslintrc > ajv: 8.18.0`.
2. Regenerar el árbol: `rm -rf node_modules package-lock.json && npm install`. Verificado: `@eslint/eslintrc` pasa a resolver **ajv 6.15.0** → eslint corre en mod y layout (deja de crashear).
   - Un `npm install` sin `rm -rf` NO alcanza: npm honra el lock (mantiene ajv 8.18.0). Hay que regenerar.
3. Verificar que `ajv-formats` sigue con su ajv 8 (nested, separado) — no se toca.

### 3.2 typecheck (fix en `layout` core)
1. Resolver los 165 errores de `tsc --noEmit` de layout. Priorizar los sistémicos (el patrón `index.ts` no exporta `XProps` del `.vue` se repite en casi todos los atoms → probable causa única en el shim/exports de atoms).
2. Al quedar layout verde, los mods que symlinkean quedan limpios de la parte heredada.

---

## 4. ¿Fixear core habilita los mods, o los mods requieren algo? (ejemplo: curriculum-design)

### 4.1 lint: el fix de root ES suficiente para el mod
- El mod usa el eslint hoisted del root. Al resolver eslintrc→ajv 6, el mod lintea sin cambios propios. **Nada extra en el mod.**
- Opcional (no requerido): alinear el mod a `eslint ^9` (como layout) para "un solo eslint" en el repo. Mejora consistencia, no es necesario para que corra.

### 4.2 typecheck: el fix de layout habilita casi todo, pero el mod requiere un extra
- Al quedar layout verde, los **~74 errores heredados** del mod caen (el symlink typechea layout limpio).
- **El mod SÍ requiere trabajo propio adicional** para los ~56 restantes:
  - La mayoría son cascada de atoms mal tipados → caerán al arreglar layout.
  - ~10 son reales del mod y hay que arreglarlos aparte: `@ts-expect-error` sin uso (borrarlos), y mismatch de tipos en `tests/unit/weightedSum.parity.test.ts`.
- **Decisión de arquitectura pendiente** (afecta a TODOS los mods):
  - **Opción A (symlink al source)**: el mod typechea el source de layout via symlink. Requiere que layout esté typecheck-limpio Y que el tsconfig del mod le dé el contexto correcto (aliases/types de layout). Frágil: cualquier error nuevo en layout rompe el typecheck de todos los mods.
  - **Opción B (layout exporta tipos)**: layout empaqueta/emite sus `.d.ts` y los mods consumen **tipos** (no source). Más limpio y aislado: los mods no re-typechean el source de layout. Requiere que layout construya y exponga tipos, y que el symlink/resolución apunte a los tipos, no al `.vue` crudo. Recomendada para escalar.

### 4.3 Sobre el shim del mod (`types/layout-shims.d.ts`)
- El mod ya tiene un shim que declara `*/components/atoms` como módulos externos (`Component`), pensado para que vue-tsc no chequee el source de layout. **No funciona hoy** porque el symlink resuelve a archivos reales (la resolución de archivo gana sobre `declare module '*/...'`). Además no cubre imports sub-path (`../../components/atoms/Badge`).
- Con Opción A el shim sobra (se depende del source real). Con Opción B el shim se reemplaza por los tipos reales exportados por layout.

---

## 5. Efectos secundarios y riesgos (medidos en la investigación)

- **Re-lock de 305 paquetes (fix de lint)**: el `rm -rf + npm install` re-resuelve TODOS los rangos `^` a lo último disponible (el lock de develop es un snapshot viejo). Bumps semver-compatibles de `@aws-sdk/*` (3.1070→3.1090), `@clerk/*` (3.7→3.11), etc. **Medido behaviorally-neutral**: object-manager `test:unit` da 17 fallos idénticos con y sin re-lock (esos 17 son preexistentes, mock de `fs.promises`); curriculum-design 1251 verdes. Aun así, commitear ese lock exige **verificar CI de suite/flow/layout** (no probados). Un fix "targeted" de lock (cambiar solo la entrada eslintrc→ajv) evita el re-lock pero es frágil de hacer a mano.
- **`npm ci` roto en el entorno**: falla con error de invocación. Impide instalar de forma determinista desde el lock → complica revertir 1:1 y validar cambios de lock. Conviene resolverlo antes de tocar el lock en serio.
- **El symlink acopla el typecheck de cada mod a TODO layout**: un error de tipo nuevo en layout rompe el typecheck de todos los mods que symlinkean. Esto es exactamente lo que hace que la deuda escale (ver §6).
- **object-manager tiene 17 fallos unit preexistentes** (mock `fs.promises.unlink is not a function`) — ajenos a este tema, pero notados; NO regresión de nada de acá.
- **La guarda de rama del hook (UPONE-1445) es lo único que hoy aporta**: lint y typecheck quedaron advisory (warn-only) en `.husky/pre-push` precisamente porque core no pasa ninguno.

---

## 5.1 Impacto en dkc-dredd (review de PRs)

`dkc-dredd` YA usa typecheck y lint como forma de evaluación: su **Fase 1.5(c) "Errores estáticos"** corre `npx tsc --noEmit` + `npx eslint <archivos-del-diff>` y clasifica cada error como **introducido por el PR** (hallazgo 🟠/🔴) vs **preexistente** (reporta, no bloquea). Está diseñado para ello (referencia: `deckard/commands/dkc-dredd.md`, Fase 1.5).

En el estado actual de up1 esa capa queda **tullida**:
- **lint**: `npx eslint` crashea (ajv) → dredd cae en su rama "no se pudo ejecutar / no inventes verde" → cero señal de lint en el review.
- **typecheck**: `tsc --noEmit` corre pero devuelve 130/165 errores preexistentes → la clasificación introducido-vs-preexistente se degrada (un error nuevo del PR queda enterrado en el ruido; uno viejo puede atribuirse mal). Por el symlink, el tsc del mod además arrastra los errores de layout.

### Por qué dredd NO puede leer lo que hoy reportan lint y typecheck (mecanismo)

**lint — no hay NADA que leer.** eslint no emite un reporte de violaciones: **crashea al arrancar** (antes de cargar config/reglas) y muere con un stack trace de ajv, exit != 0. No produce lista de errores/warnings, ni JSON, ni salida parseable de hallazgos. No es que dredd "ignore los warnings": no existen warnings — eslint aborta antes de generarlos. Por su regla anti-falso-verde ("no se pudo ejecutar → no inventes verde"), dredd descarta la capa de lint por completo. Señal de lint = cero.

**typecheck — dredd SÍ puede leer la salida cruda (130/165), pero NO puede USARLA como señal fiable**, por cuatro razones:
1. **No hay diff contra la base.** El protocolo de dredd (Fase 1.5c) corre el typechecker sobre el estado del PR y clasifica "introducido vs preexistente" **por juicio**, no corriendo el typecheck también en la rama base para restar. Sin baseline mecánico, con 130/165 errores previos, no hay forma confiable de aislar los del PR.
2. **El ruido tapa la señal.** Un error de tipo nuevo del PR queda enterrado entre 130/165 preexistentes; y un error viejo que vive en un archivo que el PR tocó "parece" introducido. La clasificación se vuelve adivinanza.
3. **El symlink arrastra layout.** `vue-tsc` en el mod sigue el symlink y suma los 165 de layout — errores que el PR jamás tocó. Dredd tendría que reconocer y descartar esos 165 externos, que hoy no puede distinguir.
4. **Herramienta equivocada para los mods.** El protocolo corre `npx tsc --noEmit`, pero los mods Vue necesitan `vue-tsc` (para `.vue`). Un `tsc` plano ni siquiera typechea bien el mod → la salida que dredd leería sería incompleta/errónea para código Vue.

En síntesis: para lint no hay salida que leer (crash); para typecheck hay salida pero es inservible como señal de PR (sin baseline + ruido preexistente + acople de layout + checker equivocado). Dredd está diseñado para consumir ambos, pero **el baseline roto de core deja su capa de análisis estático sin nada utilizable**.

Consecuencia: el review automatizado de PRs pierde la señal de calidad estática hasta que se habiliten los gates en core. Dredd está listo para usarlos; el baseline roto es lo que se lo impide.

## 6. Por qué urge: deuda incremental

Mientras lint y typecheck no corran (ni en local ni en CI):

- **Cada dev nuevo suma código sin gate de lint ni de tipos.** No hay señal que frene violaciones de estilo ni errores de tipo al subir código.
- **Los 165 de layout y el eslint roto no son estáticos: crecen.** Más devs → más SFCs/atoms/composables → más violaciones y más errores de tipo sin nadie que los ataje. El costo de habilitar el gate después escala con la cantidad acumulada.
- **El symlink amplifica**: como cada mod re-typechea layout, la deuda de tipos de layout se "multiplica" por la cantidad de mods, y cualquier regresión en layout rompe a todos a la vez.
- **El pre-push hook (UPONE-1445) no cumple su propósito** hasta habilitar core: nació para bloquear push con lint/typecheck, pero quedó advisory porque el baseline está rojo. Es infra construida que no muerde.

Conclusión: habilitar lint y typecheck es un trabajo de core acotado hoy, pero **su costo aumenta monótonamente** cuanto más se posterga y más devs entren al proyecto.

---

## 7. Resumen de dónde vive cada fix

| Gate | Locus del fix (core) | Habilita el mod? | Extra requerido en el mod (ej. cd) | Efecto secundario principal |
|------|----------------------|------------------|-------------------------------------|-----------------------------|
| **lint** | root `up1/package.json` (quitar override ajv) | Sí, directo | Ninguno (opcional: eslint 9) | Re-lock de 305 libs → verificar CI |
| **typecheck** | `layout` (165 errores propios) + decisión symlink vs tipos exportados | Sí, la parte heredada (~74) | ~10 errores propios del mod + decidir A/B | Symlink acopla mods↔layout |

Ninguno tiene atajo mod-only limpio: lint es imposible mod-only (override global); typecheck mod-only sería un shim frágil que tapa la deuda de layout y que el symlink/sync vuelve a romper.

## 8. Registro de intentos (sesión 2026-07-17) — para el team core

Log detallado de lo que se probó, qué cambió cada intento, si dejó funcionando, y efectos secundarios. Objetivo: que core no repita callejones sin salida y sepa cuál es el único camino que funciona y a qué costo. **Todos los intentos fueron revertidos al final** (env quedó en develop 1:1).

### 8.1 eslint (lint) — intentos en `up1/package.json` (root)

| # | Qué se hizo | ¿Funcionó? | Qué cambió | Por qué / efecto |
|---|-------------|------------|------------|------------------|
| E1 | Quitar los 2 overrides `ajv 8.18.0` + `npm install` (sin `rm -rf`) | ❌ No | `package.json` (override fuera); lock (`removed 25, added 4`) | npm honra el lock existente → `@eslint/eslintrc` sigue con `ajv 8.18.0`. eslint sigue crasheando. |
| E2 | Poner override correcto `eslint/@eslint/eslintrc > ajv ^6.14.0` + `npm install` | ❌ No | `package.json` (override a ^6.14.0); lock reescrito | Mismo motivo: el lock fija `eslintrc/node_modules/ajv = 8.18.0` y npm lo respeta. `npm ls ajv` mostraba `8.18.0 overridden invalid`. |
| E3 | `rm package-lock.json && npm install` (regen lock, conservando `node_modules`) | ❌ No | lock regenerado; `node_modules` reusado | npm reusó el `ajv 8.18.0` ya hoisted en `node_modules`; no re-anidó ajv 6. |
| **E4** | **Quitar override + `rm -rf node_modules && rm package-lock.json && npm install`** (regen limpio total) | ✅ **Sí** | `@eslint/eslintrc` → `ajv 6.15.0` anidado; eslint root consolidado a **9.39.5**; **re-lock de 305 paquetes** | eslint corre en mod (exit 0) **y** layout (corre, encuentra violación real `storybook/no-renderer-packages`). Único camino que funciona. |

**Efecto secundario de E4 (el que funciona):** el `rm -rf + install` re-resuelve TODOS los rangos `^` a lo último disponible → **305 paquetes cambian** (bumps semver-compatibles: `@aws-sdk/*` 3.1070→3.1090, `@clerk/*` 3.7→3.11, etc.; +203 added, -150 removed en el lock). No es que quitar el override toque esos 305: es que el lock de develop es un snapshot viejo y cualquier install fresco drifta.

**Medición de neutralidad de E4** (para dimensionar el riesgo del re-lock):
- `object-manager test:unit`: **17 fallos idénticos** con re-lock y en el baseline de develop (los 17 son preexistentes: mock `fs.promises.unlink is not a function`). → el re-lock NO introduce regresiones ahí.
- `curriculum-design` vitest: **1251 verdes** con el re-lock.
- NO verificado (queda para core): CI de suite, flow, layout. Ese es el trabajo real de E4: no es riesgo comprobado de rotura, es verificación pendiente.

**Alternativa targeted (no ejecutada):** editar SOLO la entrada `eslintrc→ajv` del lock de develop (sin regen total) evitaría los 305 bumps, pero es cirugía manual del lock (frágil, hashes de integridad).

**mod-only para lint: descartado (imposible).** Probado: el eslint 9 de layout crashea igual (carga el `@eslint/eslintrc` del root con ajv 8.18.0); `eslint --version` crashea (el core carga eslintrc al arrancar). Los npm `overrides` son globales por nombre → no acotables por workspace. Ningún cambio dentro de un mod evita el override del root.

### 8.2 typecheck — intentos en `curriculum-design` (mod)

| # | Qué se hizo | ¿Funcionó? | Qué cambió | Por qué / efecto |
|---|-------------|------------|------------|------------------|
| T1 | Mover los symlinks `components/` y `composables/` fuera + re-correr `vue-tsc` | ⚠️ Parcial | nada permanente (revertido) | Bajó 130→**56**, pero: aparecieron `TS2307` en imports sub-path (`../../components/atoms/Badge`; el shim solo cubre `*/components/atoms`) + quedaron ~56 propios (`@ts-expect-error` sin uso, `not callable`). No es fix limpio. |
| T2 (diagnóstico) | Inspeccionar `components/`/`composables/` | — | — | **Son SYMLINKS** a `../../layout/src/{components,composables}`, no copias. vue-tsc del mod typechea el **source de layout** bajo el tsconfig del mod. |
| T3 (diagnóstico) | `tsc --noEmit` en layout | — | — | Layout (core) tiene **165 errores** de tipo propios → es la raíz. El mod hereda una tajada via symlink. |

**Conclusión typecheck:** no hay fix mod-only limpio (el shim se tapa con los archivos reales del symlink; sub-paths sin cubrir; y aunque se resolviera, el sync/symlink lo vuelve a acoplar a layout). El fix de raíz es **arreglar los 165 de layout** (core) + decidir symlink-al-source vs layout-exporta-tipos (§4.2).

### 8.3 Estado del entorno tras los intentos (reversión)

- Se respaldó el `package-lock.json` de develop (md5 `1c19eaa9985c57d5a951dff9316178e1`) antes de tocar nada.
- Reversión 1:1: `git restore package.json package-lock.json` + `cp` del backup + `npm install`. Verificado: root en develop, override ajv presente (=develop), lock md5 = `1c19eaa`, mod en su rama sin cambios.
- **`npm ci` está ROTO en el entorno** (error de invocación) → no se puede instalar determinista desde el lock. Esto complica revertir/validar cambios de lock y **conviene que core lo resuelva primero** (sin `npm ci` confiable, tocar el lock compartido es más arriesgado).

### 8.4 Recomendación de secuencia para core

1. **Arreglar `npm ci`** primero (habilita instalación determinista + revert 1:1).
2. **lint**: aplicar E4 (quitar override + regen) en un PR dedicado; correr CI de los 5 workspaces sobre el re-lock de 305 antes de mergear. O evaluar la cirugía targeted del lock si se quiere evitar el drift.
3. **typecheck**: atacar los 165 de layout (agrupar por causa; el patrón `index.ts` no-exporta-Props-del-*.vue se repite → probable causa única) + decidir la arquitectura symlink vs tipos exportados. Luego cada mod arregla su puñado propio (~10 en cd).
4. Recién ahí: promover lint/typecheck a bloqueantes en los hooks/CI (revertir el warn-only de UPONE-1445).

## 9. Notas para el reporte al team core

### 9.1 Gap de gobernanza — por qué esto se acumuló (raíz organizacional)
El `bitbucket-pipelines.yml` del root de up1 **no gatea lint/typecheck**: es un "central pipeline for full-system builds" (clona repos, sync+codegen, buildea imágenes Docker). Dice explícito: *"Individual repo pipelines handle their own CI (test + build)"* y *"PR → tests only"*. Es decir, **lint y typecheck no son un required merge check** a nivel plataforma. Esa es la causa de fondo de que 165 errores de tipo en layout + el eslint roto llegaran a develop sin freno.
- **Recomendación**: al habilitar los gates, agregarlos como **required checks por repo** (Bitbucket "require passing builds"), no solo advisory. Sin gate, la deuda vuelve a crecer.
- Pendiente verificar (no hecho): si el pipeline PROPIO de cada repo (layout, mod) corre lint/typecheck y en qué estado están (probablemente rojos o no configurados, dado el baseline).

### 9.2 Blast radius (alcance real, verificado)
De los mods actuales, **solo `curriculum-design` symlinkea layout** (`components -> ../../layout/src/components`, `composables -> ../../layout/src/composables`). Los demás (ai-agent, retention-wellbeing, uengagement-up1, up1-manager) NO tienen el symlink. Por lo tanto:
- El problema **typecheck-via-symlink está acotado hoy a curriculum-design**; no es "todos los mods" (corrige el marco de secciones anteriores).
- El problema **eslint es global** (el override del root afecta a todos los workspaces y mods por igual).

### 9.3 Sizing de los 165 errores de layout (por causa, para estimar esfuerzo)
| Causa | Cant. | Naturaleza | Esfuerzo |
|-------|-------|------------|----------|
| `TS2614` "no exported member `XProps`" | 74 | **Sistémico**: los `index.ts` de atoms/organisms re-exportan Props del `*.vue`, pero el shim `*.vue` no declara esos exports nombrados. ~50 exactos → probable **causa única** (patrón de export/shim de componentes) | Alto leverage: 1 fix del patrón podría tumbar ~74 |
| `TS6133` "declared but never read" | 28 | Trivial (imports/vars sin uso) | Barato (`eslint --fix` cuando eslint corra, o manual) |
| `TS2339/2536/7006/2307/...` | ~63 | Dispersos (property inexistente, index types, implicit any, módulos no hallados) | Individual, caso a caso |
Total 165. Traducción: **~74 sistémicos + 28 triviales + ~63 individuales**. El grueso (74) es probablemente un solo arreglo del patrón de exports de componentes.

### 9.4 Cómo reproducir (comandos, para verificación independiente por core)
```bash
# eslint roto (crashea, mod y layout) — desde up1/
mods/curriculum-design/../../node_modules/.bin/eslint --version    # → Oops! ... ajv defaultMeta

# ver el override causante
node -e "console.log(require('./package.json').overrides)"          # eslint>ajv 8.18.0, @eslint/eslintrc>ajv 8.18.0
git log -1 9275d15 --format='%h %an %ad %s'                         # origen del override

# typecheck de layout (165)
cd layout && npx tsc --noEmit 2>&1 | grep -cE "error TS"

# typecheck del mod (130 = 74 layout via symlink + 56 propios)
cd mods/curriculum-design && ../../node_modules/.bin/vue-tsc --noEmit 2>&1 | grep -cE "error TS"

# fix de eslint que FUNCIONA (E4) — CUIDADO: re-lock de 305 libs, ver §8.1
#   quitar overrides eslint>ajv y @eslint/eslintrc>ajv en package.json, luego:
rm -rf node_modules package-lock.json && npm install
node -e "console.log(require('./node_modules/@eslint/eslintrc/node_modules/ajv/package.json').version)"  # → 6.15.0
```

### 9.5 Definition of Done del fix (checklist para core)
- [ ] `npm ci` funciona (instalación determinista — prerrequisito, §9.6).
- [ ] eslint corre sin crash en los 5 workspaces + mods.
- [ ] `tsc --noEmit` de layout en verde (0 errores).
- [ ] `vue-tsc` de curriculum-design en verde (heredados + los ~10 propios).
- [ ] CI gatea lint + typecheck como **required check** por repo (§9.1).
- [ ] Hooks promovidos a bloqueante: revertir el warn-only de `.husky/pre-push` (UPONE-1445, DEC-LOCAL-04).
- [ ] Decisión de arquitectura tomada: symlink-al-source vs layout-exporta-tipos (§4.2).

### 9.6 Prerrequisito de infra: `npm ci` roto
`npm ci` falla en el entorno con error de invocación. Bloquea instalación determinista desde el lock y el revert 1:1. **Resolver primero**: sin `npm ci` confiable, tocar el lock compartido (para el fix de eslint) es más arriesgado (no se puede validar/revertir de forma limpia).

### 9.7 Ownership / routing
- **layout (core team)**: los 165 errores de tipo + la decisión symlink-vs-tipos-exportados.
- **root `up1/package.json` (owner de deps/overrides)**: quitar el override de ajv + el re-lock (coordinar CI).
- **infra/tooling**: arreglar `npm ci`; agregar lint/typecheck como required checks en Bitbucket.
- **mod curriculum-design**: sus ~10 errores propios post-fix de layout + revertir el warn-only del hook.

## Referencias

- Hook: `mods/curriculum-design/.husky/pre-push`, `docs/pre-push-hook.md` (UPONE-1445 / TICKET-108).
- Este fix: UPONE-1446 / TICKET-110.
- Override ajv: `up1/package.json` `overrides`, commit `9275d15`.
- Symlinks: `mods/curriculum-design/components -> ../../layout/src/components`, `composables -> ../../layout/src/composables`.
- Evidencia: eslint crash (mod+layout), `layout tsc --noEmit` = 165, `cd vue-tsc` = 130 (74 layout + 56 propios), re-lock 305 neutral (object-manager 17-fail idéntico, cd 1251 verde), `npm ci` roto.
