---
id: TICKET-108
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1445
module: curriculum-design
autopilot: autonomous
---

# Validacion pre-push local obligatoria en curriculum-design (etapa 1: git hooks)

## Request

Hoy se puede commitear/pushear directo a `develop` y `master`/`main`, y no hay ninguna revision automatica de calidad antes de subir codigo. Queremos que **todo dev que haga push en el mod curriculum-design pase por una revision obligatoria previa** (lint + typecheck) y que el push directo a las ramas protegidas quede bloqueado localmente (debe ir por PR).

Como **no tenemos acceso a la configuracion cloud de Bitbucket en esta etapa**, la etapa 1 se implementa **solo con git hooks locales** versionados dentro del repo del mod, auto-instalados via husky. La etapa 2 (Bitbucket Branch permissions + Pipelines CI), que es la unica que hace el bloqueo realmente no evadible, queda documentada como follow-up fuera de alcance.

**Alcance: SOLO el mod curriculum-design.** Los otros mods son de otros equipos y cada uno implementa lo suyo. NO se tocan los workspaces core (object-manager/layout/suite/flow) ni el repo `up1` root.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | single (mod curriculum-design; tooling/devex del propio repo) |
| Modulo principal | curriculum-design (layer: mod) |
| Modulos afectados | Ninguno fuera del mod. Consume binarios (`eslint`, `vue-tsc`) hoisted en `up1/node_modules` pero NO modifica el root ni otros workspaces |

## Creation scope

- `creates_visual: false` — no hay UI nueva.
- `creates_data: false` — no hay entidades/schemas nuevos.
- Es tooling de repositorio: dependencia de dev (husky), un hook de git versionado y documentacion.

## Triage

### Hipotesis de complejidad

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Complejidad **media-baja**: 1 dependencia de dev + 1 script de hook + doc, sin logica de negocio | ✓ confirmada | `execute_scope` de 3 archivos; sin cambios en objects/logic/components del mod |
| H2 | El auto-install del hook via `prepare` **funciona en el flujo normal** porque el instalador corre `npm install` con `cwd` dentro del mod y el mod tiene su propio `node_modules` | ~ parcial (verificar en execute) | `scripts/actions.js:248-250` hace `spawn('npm',['install'],{cwd: repoDir})` por repo/mod; el mod ya tiene `node_modules/` propio. Riesgo residual: un `npm install` **solo en el root** (workspaces) podria no disparar el `prepare` del workspace |
| H3 | El bloqueo local de push a ramas protegidas es **evadible** (`--no-verify`) y por lo tanto es guia, no seguridad | ✓ confirmada | Comportamiento estandar de git: los hooks de cliente se saltan con `--no-verify`. Cierre real = Bitbucket etapa 2 |

### Context found

- **Estado actual del mod** (verificado 2026-07-15): sin `.husky/`, sin hooks custom en `.git/hooks`, sin `core.hooksPath` configurado, sin `bitbucket-pipelines.yml`. Cero automatizacion de pre-push hoy.
- **Scripts existentes** en `mods/curriculum-design/package.json` (`@uplanner/curriculum-design`): `lint = "../../node_modules/.bin/eslint ."`, `lint:fix`, `typecheck = "../../node_modules/.bin/vue-tsc --noEmit"`, `test = "vitest run"`. Los binarios `eslint`/`vue-tsc` viven en `up1/node_modules/.bin` (hoisted por workspaces); el mod NO los tiene propios.
- **Config eslint**: `mods/curriculum-design/eslint.config.js` (flat config, heredada de `layout/eslint.config.js`, NO ignora `modsComponents/`). `tsconfig.json` presente en la raiz del mod.
- **Topologia git**: `curriculum-design` es **repo git propio** (`git rev-parse --show-toplevel` devuelve el mod; `.git` propio; remote `bitbucket.org:uplanner/curriculum-design.git`) Y a la vez **workspace** de `up1` (`up1/package.json` → `workspaces: [..., "mods/*"]`). Instalar husky en el mod afecta **solo** el `.git` del mod, no el repo `up1`.
- **Instalador**: `up1` usa un instalador custom (`npm run setup` → `node scripts/cli.js install` → `installDependencies` en `scripts/actions.js`), que hace `npm install` con `cwd` en el directorio de cada repo/mod. Eso es lo que dispararia el `prepare` del mod.
- **Proveedor**: Bitbucket Cloud (los merges aparecen como "Merged in ... (pull request #NN)"). La etapa 2 (server-side) se configura en Bitbucket, requiere rol admin, no es codigo.
- **KB previo**: no hay rules/bugs/specs de hooks/husky/lint-staged/CI en el proyecto (greenfield para tooling de pre-push). `RULE-dev-004` (core work policy) menciona lint/CI de pasada pero aplica a trabajo **core**, no a este ticket (layer: mod).
- **Memoria de proyecto aplicable**: "Verificar el render/comportamiento real, no solo config" y "verificar self-report" (DET-33) → el hook debe validarse **ejecutando pushes reales** (feature pasa, develop rechaza, error de tipo/lint bloquea), no solo leyendo el script.
- **Warnings**: (a) el auto-install depende de que el dev corra `npm install` en el mod; un clon sin install o un borrado de `.husky/_` deja sin hook; (b) `--no-verify` saltea el hook; (c) el `typecheck` completo en cada push agrega latencia (aceptado, es la "revision obligatoria" pedida; el lint ya se acota a archivos cambiados).

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `chore/TICKET-108-prepush-quality-guard` (en el repo del mod curriculum-design). **Ramificar desde `develop`**, NO sobre `feat/UPONE-1382-hard-delete-cascade` (rama de otro trabajo, aun sin mergear) |
| Base branch | `develop` (repo `bitbucket.org:uplanner/curriculum-design`) |
| Repo | `~/Workspace/uplanner/up1/mods/curriculum-design` (repo git propio dentro del monorepo up1) |
| DB state | No aplica (tooling; sin BD) |
| Services | No aplica en runtime; para la validacion se necesita el `node_modules` del root de up1 poblado (binarios `eslint`/`vue-tsc`) |
| Test data | Para validar: un cambio con error de tipo y un cambio con error de lint, ambos descartables (git restore tras la prueba) |

## Necesidad y reuso (DET-32, resumen — detalle en el spec)

| Elemento | Veredicto | Racional |
|----------|-----------|----------|
| husky (dependencia) | build (reuse de herramienta) | Estandar de facto para git hooks versionados + auto-install. Alternativa descartada: hook manual en `.git/hooks` (no versionable, no auto-instalable) |
| lint-staged | drop | No aporta: esta pensado para `staged files` en pre-commit; el pre-push calcula el rango por refs (`git diff`), no por stage |
| eslint / vue-tsc | reuse | Ya existen como scripts del mod; el hook los invoca, no se recrean |

## Casos de prueba preliminares (se refinan en design/execute)

| # | Case | Cubre | Type | Precondition | Expected |
|---|------|-------|------|--------------|----------|
| TC-1 | Push a una rama feature con codigo limpio | REQ-01/03/04 | manual (runtime) | hook instalado, sin errores de lint/tipo | el push procede; el hook corre lint (archivos cambiados) + typecheck y pasa |
| TC-2 | Intento de push a `develop` (y `master`/`main`) | REQ-02 | manual (runtime) | hook instalado | el push se rechaza con mensaje "usa un PR"; exit != 0 |
| TC-3 | Push con un error de tipo introducido | REQ-04 | manual (runtime) | hook instalado, error de tipo en un `.ts`/`.vue` | el typecheck falla y aborta el push |
| TC-4 | Push con un error de lint en un archivo cambiado | REQ-03 | manual (runtime) | hook instalado, violacion de eslint en un archivo del rango | el lint falla y aborta el push |
| TC-5 | Auto-install: `npm install` dentro del mod deja el hook provisionado | REQ-01 | manual (runtime) | clon limpio / `.husky/_` ausente | tras install, `core.hooksPath` apunta a `.husky/_` y el pre-push existe |
| TC-6 | `git push --no-verify` saltea el hook (limite documentado) | REQ-05 | manual (runtime) | hook instalado | el push procede sin correr el hook (confirma que es guia, no seguridad) |

## Limites honestos de la etapa 1 (documentar, NO son bugs)

1. **`git push --no-verify` saltea cualquier hook de cliente.** No es cerrable localmente. El cierre real es Bitbucket Branch permissions (etapa 2).
2. **El hook solo existe tras correr el install que dispara `prepare`.** Un clon sin install, o el borrado de `.husky/_`, deja sin hook. Se mitiga con el `prepare` automatico, pero sigue siendo confianza local.

## Follow-up documentado (fuera de alcance — NO crear en Jira)

**Etapa 2 (server-side, requiere acceso admin a Bitbucket):**
- **Bitbucket Branch permissions** sobre `develop`/`master` del repo del mod: "prevent all changes except via PR" + minimo de aprobaciones. Es el bloqueo PR-only real, no evadible.
- **Bitbucket Pipelines** corriendo `lint` + `typecheck` como merge check ("require passing builds"). Exige resolver antes el **acoplamiento a `../../node_modules`**: Pipelines clona solo el repo del mod, asi que los binarios hoisted no existen; hay que declarar `eslint`/`vue-tsc` en devDeps propios del mod o instalarlos en el pipeline.

Cuando el equipo tenga acceso cloud, esto se retoma como ticket/etapa aparte.

## Plan (borrador, a refinar en design-feature)

1. Agregar `husky` (devDep) + script `prepare` en el `package.json` del mod; verificar auto-install del hook (y el riesgo del root-only install).
2. Escribir `.husky/pre-push`: guarda de rama (develop/master/main) + lint de archivos cambiados + typecheck del mod + mensajes/robustez + escape hatch documentado.
3. Validar ejecutando pushes reales (TC-1..TC-6) con evidencia.
4. Documentar el hook, sus limites y el follow-up de etapa 2 en `docs/` del mod.

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|------------|--------------|-----------|
| B1 | Sanear typecheck del mod (~130 errores de tipo preexistentes) para promover el paso typecheck del hook a bloqueante | REQ-04 | descubierto en S1.T3 de SPEC-curriculum-design-prepush-quality-guard | `vue-tsc --noEmit` reporta ~130 errores (TS2349/2339/2307). ~52 en `modsComponents/` propios (CurriculumMesh 29, CompositeSectionTree 14, RichTextRenderer 3, ...); el resto cascadea de copias vendored NO versionadas bajo `components/` y `composables/` (0 archivos tracked). Patrón sistémico (setup de tipos), no 130 bugs sueltos | Diagnosticar la causa sistémica (shims de tipos, tipado de vendored `components/`/`composables/`, config vue-tsc). Con `npm run typecheck` en EXIT 0, quitar el warn-only del typecheck en `.husky/pre-push` (que aborte). Fuera del execute_scope de este ticket | should |
| B2 | Reparar eslint (roto repo-wide) para promover el paso lint del hook a bloqueante | REQ-03 | descubierto en S1.T3 | eslint 8.57 hoisted en `up1/node_modules` crashea al arrancar: `@eslint/eslintrc` resuelve `ajv@8` donde necesita `ajv@6` (afecta a todos los workspaces, verificado desde layout). El hook corre lint advisory y captura el crash como WARNING | Opción mod-only: eslint 9 flat-native local al mod + apuntar `lint`/hook al binario local. Opción root: resolver el conflicto de `ajv` en `up1` root. Con eslint operativo, quitar el warn-only del lint en `.husky/pre-push` | should |

> **Nota (DET-17)**: B1/B2 NO bloquean el cierre de este ticket. El dev decidió (2026-07-17, ver Session 1 + DEC-LOCAL-04) entregar el hook con lint/typecheck en modo advisory (warn-only) y sanear el baseline en follow-ups. La guarda de rama (lo bloqueante) sí quedó operativa y validada.

## Sessions

### Plan de sessions (preplanificacion)

1 session prevista. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria) lo completa `design-feature` al generar el spec.

> Proyectado desde el Plan (borrador). Estas filas son `projected/pending`; se materializan como `### Session N` solo cuando `dkc-execute-task open-session N` active trabajo real. Numeracion desde S1 (ticket sin sessions previas).

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Implementar y validar el pre-push (husky + guarda de rama + lint changed-files + typecheck) | execute | T2 | S1.T1 husky devDep + prepare + verificar auto-install (REQ-01); S1.T2 escribir `.husky/pre-push` con las 3 guardas (REQ-02/03/04/05); S1.T3 validacion runtime TC-1..TC-6 con evidencia; S1.T4 doc del hook + limites + follow-up etapa 2 | ⚑ fuerte | hook auto-instalado verificado (TC-5); push a feature pasa (TC-1); push a develop rechazado (TC-2); error de tipo bloquea (TC-3); error de lint en archivo cambiado bloquea (TC-4); `--no-verify` documentado como limite (TC-6); doc presente |

**Notas del esqueleto**:
- **Gate ⚑ fuerte** pese a ser tooling: el valor del hook es su comportamiento en runtime; por DET-33/memoria del proyecto, no se cierra con "el script se ve bien" sino ejecutando los 6 casos de push reales con evidencia.
- **S1.T1 lleva la verificacion del riesgo H2** (auto-install en workspace): si el `prepare` no dispara con el flujo real, documentar el paso manual en onboarding antes de cerrar.
- **Precondiciones al arrancar execute**: `up1/node_modules` poblado (binarios `eslint`/`vue-tsc`); rama `chore/UPONE-1445-prepush-quality-guard` creada desde `develop` en el repo del mod (guarda de rama de inicio: NO trabajar sobre develop/master).

### Session 1 — 2026-07-17 — Implementar y validar el pre-push (husky + guarda de rama + lint changed-files + typecheck) [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: instalar husky + escribir `.husky/pre-push` (guarda de rama + lint changed-files + typecheck) + validar runtime los 6 TCs + documentar. Etapa 1 local.

**Tasks completadas**:
- [x] S1.T1 — Agregar `husky` (^9.1.7) a devDependencies + script `"prepare": "husky"`; verificar auto-install (`core.hooksPath == .husky/_`) y el riesgo H2 (REQ-01)
- [x] S1.T2 — Escribir `.husky/pre-push`: guarda de rama + lint changed-files + typecheck del mod + robustez/mensajes (REQ-02/03/04/05)
- [x] S1.T3 — Validacion runtime (DET-33): TC-1..TC-6 con evidencia real de la salida del hook
- [x] S1.T4 — Documentar en `docs/` del mod: hook, instalacion, escape hatch/limites, follow-up etapa 2 (REQ-05)
- [x] S1.GATE — Gate de sync Session 1 (T2): persistir, quality review, confirmar 6 TCs runtime, decidir continue/close

**Validación del tier** (T2 — runtime, DET-33): hook invocado con el stdin real de pre-push. **TC-2** push a `develop` → bloqueo + exit 1. **TC-1** push a feature → exit 0 (procede). **TC-3** typecheck rojo (~130 errores) → `⚠ WARNING`, no bloquea (warn-only). **TC-4** archivo lintable en rango → eslint crash capturado como `⚠ WARNING`, no bloquea. **TC-5** auto-install: `core.hooksPath=.husky/_` tras `npm install` en el mod. **TC-6** `--no-verify`: bypass git-native (límite documentado). `sh -n` del hook OK.

#### Quality review (DET-23) — inline light (tooling: hook shell + doc; el peso real de la validación fue el runtime de los 6 TCs, arriba):

| Dimensión | Veredicto | Nota |
|-----------|-----------|------|
| 1. Calidad/corrección | pass | POSIX sh, `sh -n` OK, sin `set -e` frágil, guard clauses; orden rama→lint→typecheck |
| 2. Lint/formato | n/a | eslint roto repo-wide (ver B1); el hook mismo es shell |
| 3. Tipado | n/a | shell + JSON (sin TS propio) |
| 4. Testing | pass | 6 TCs runtime con evidencia real (DET-33), no lectura del script |
| 5. Escalabilidad | pass | changed-files por rango de refs; typecheck full aceptado |
| 6. Mantenibilidad | pass | doc completa (docs/pre-push-hook.md) con límites + follow-ups |
| 7. Claridad | pass | mensajes accionables; warn-only explícito |
| 8. a11y | n/a | sin UI |
| 9. Storybook | n/a | sin componente |
| 10. Error-handling | pass | binario ausente → mensaje accionable; lint/typecheck fallo → WARNING, no cuelga el push |

Resultado: **pass**. Desvío del spec registrado (DEC-LOCAL-04): REQ-03/04 pasan de bloqueantes a advisory (warn-only) por baseline rojo (B1/B2), aprobado por el dev.

**Commit DET-27**: `3b4b62b` chore(curriculum-design): add pre-push quality guard hook (husky) — repo del mod (no pusheado).

**Gate decision:** (approvedBy: dev)

- [x] continue → S1 completa: hook advisory entregado + validado runtime; avanza a request-close (cierre pendiente OK del dev). B1/B2 follow-ups
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Summary

**Cerrado 2026-07-17** (super autopilot). External: UPONE-1445. SP executed: 2 (sessions-heuristic).

**Entregado**: hook `.husky/pre-push` versionado + auto-instalado (husky) en el mod curriculum-design.
- **Guarda de rama BLOQUEANTE**: push directo a develop/master/main rechazado (exit 1).
- **Lint + typecheck ADVISORY (warn-only)** por DEC-LOCAL-04 (baseline rojo, ver B1/B2).
- `docs/pre-push-hook.md` con qué valida, instalación, escape hatch (`--no-verify`), límites y follow-ups.
- Commit del mod: `3b4b62b` (rama `chore/UPONE-1445-prepush-quality-guard`, **no pusheado**).

**Acceptance**: REQ-01 (auto-install, TC-5) ✓; REQ-02 (guarda de rama, TC-2) ✓ bloqueante; REQ-03/REQ-04 (lint/typecheck) ✓ como advisory (DEC-LOCAL-04); REQ-05 (mensajes/doc/límites) ✓. Los 6 TCs validados en runtime (DET-33).

**Desvío del spec**: DEC-LOCAL-04 — lint/typecheck advisory (no bloqueantes) por baseline rojo descubierto en runtime. Se promueven a bloqueantes cuando el baseline esté sano.

**Pendiente (no bloquea cierre)**:
- Backlog B1 (typecheck ~130 errores) y B2 (eslint roto repo-wide) → follow-up **UPONE-1446 / TICKET-110** (Relates UPONE-1445).
- Higiene: `up1/package-lock.json` (root) fue modificado por el `npm install` del mod (agrega husky); no commiteado (core/otro repo) — resolver por la vía correcta (install desde root).
- Push del commit del mod + PR: pendiente de decisión del dev (acción always-ask).

**Etapa 2 (fuera de alcance)**: Bitbucket Branch permissions + Pipelines (bloqueo no evadible).
