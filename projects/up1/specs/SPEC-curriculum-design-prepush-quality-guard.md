---
id: SPEC-curriculum-design-prepush-quality-guard
project: up1
ticket: TICKET-108
status: draft
---

# Validacion pre-push local obligatoria en curriculum-design (etapa 1: git hooks)

# Validacion pre-push local obligatoria en curriculum-design (etapa 1: git hooks)

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en Requirements, Technical reference y Tasks.*

**Que se quiere**: que todo dev que haga `git push` en el mod curriculum-design pase por una revision obligatoria previa, implementada como un hook `pre-push` versionado y auto-instalado (husky). El hook (1) bloquea localmente el push directo a `develop`/`master`/`main` (debe ir por PR), (2) corre eslint sobre los archivos cambiados y (3) corre el typecheck (vue-tsc) del mod completo. Si algo falla, el push se aborta.

**Etapa**: esta es la **etapa 1, solo local**. No hay acceso a la configuracion cloud de Bitbucket. La etapa 2 (Branch permissions + Pipelines CI, el unico bloqueo no evadible) queda como follow-up documentado, fuera de alcance.

**Decisiones criticas que necesitan tu OK** (ya tomadas por el dev en intake):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El lint corre **solo sobre archivos cambiados** vs origin (el typecheck es del mod completo) | Push mas rapido; el lint acotado es suficiente para el codigo que estas subiendo. El typecheck no tiene modo por-archivo confiable en vue-tsc |
| 2 | La **guarda de rama** local (bloquear push a develop/master/main) se incluye en la etapa 1 | Cierra parcialmente el "solo por PR" pedido, sabiendo que es evadible con `--no-verify`. El cierre real es Bitbucket etapa 2 |
| 3 | Usar **husky** (dependencia) en vez de un hook manual en `.git/hooks` | husky versiona el hook en el repo y lo auto-instala via `prepare`; un hook manual no es versionable ni se propaga a otros devs |

**Riesgos principales y como los mitigamos**:

- **El auto-install del `prepare` podria no dispararse con un `npm install` solo en el root** (workspaces) → REQ-01 exige verificar empiricamente el auto-install en execute (TC-5); si no dispara con el flujo real, se documenta el paso manual en onboarding.
- **`--no-verify` saltea el hook** → limite honesto documentado (REQ-05); no cerrable localmente, es etapa 2.
- **Binarios ausentes si el dev no corrio install** → el hook da un mensaje accionable ("corre npm install en el mod") en vez de un error cripctico (REQ-05).

**Que NO se hace en este ticket** (limites explicitos):

- Nada de configuracion cloud de Bitbucket (Branch permissions, Pipelines) — es etapa 2.
- No se tocan otros mods (son de otros equipos), ni los workspaces core, ni el repo `up1` root.
- No se agrega pre-commit ni lint-staged: el alcance es pre-push.

**Tamaño estimado**: 1 session ejecutable (S1), aproximadamente 1.5-2h efectivas. Lo mas delicado es la validacion runtime (ejecutar pushes reales) y confirmar el auto-install.

**Como vas a saber que funciona**:

- Haces push a una rama feature con codigo limpio y el push procede tras correr lint+typecheck.
- Intentas push a `develop` y el hook lo rechaza pidiendo un PR.
- Metes un error de tipo o de lint y el push se aborta con un mensaje claro.

---

## Purpose

Instalar en el repo del mod curriculum-design una revision de calidad obligatoria en `pre-push`, versionada y auto-instalada via husky, que bloquee el push directo a ramas protegidas y corra lint (archivos cambiados) + typecheck (mod completo) antes de permitir el push. Es tooling/devex del propio repo del mod (layer: mod), sin impacto en core ni en otros mods. Etapa 1 (local); la etapa 2 (Bitbucket server-side) queda documentada como follow-up.

## Requirements

### REQ-01: husky instalado y el hook auto-provisionado

> **Que cambia**: el repo del mod declara `husky` como dependencia de dev y un script `prepare`; al instalar dependencias dentro del mod, los git hooks quedan provisionados automaticamente.
> **Por que**: sin auto-install, cada dev tendria que instalar el hook a mano y "obligatorio para todo dev" no se cumpliria.

El sistema MUST declarar `husky` (^9.1.7) en `devDependencies` del mod y un script `"prepare": "husky"` en su `package.json`. Al correr `npm install` dentro del directorio del mod (flujo del instalador `scripts/cli.js` con `cwd` en el mod, y flujo manual del dev), husky MUST provisionar los hooks en el `.git` del mod (setear `core.hooksPath` a `.husky/_`). El hook `pre-push` MUST vivir versionado en `.husky/pre-push`.

**Actor**: system
**Layers**: config

<details><summary>Scenarios de validacion</summary>

#### Scenario: install dentro del mod provisiona el hook
- **GIVEN** un clon del mod sin `.husky/_` (o recien clonado)
- **WHEN** se corre `npm install` con `cwd` en el mod (o `npm run prepare`)
- **THEN** `git config core.hooksPath` devuelve `.husky/_`
- **AND** el archivo `.husky/pre-push` existe y es ejecutable

#### Scenario (riesgo H2): install solo en el root
- **GIVEN** un `npm install` ejecutado unicamente en `up1/` (root de workspaces)
- **WHEN** termina el install
- **THEN** se verifica si el `prepare` del workspace se disparo; si NO, se documenta el paso manual (`npm install`/`npm run prepare` dentro del mod) en la doc de onboarding

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en un clon limpio del mod, tras `npm install`, `git config core.hooksPath` apunta a `.husky/_` y `.husky/pre-push` existe.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-5 auto-install | clon sin `.husky/_` | `npm install` en el mod | hooks provisionados | `core.hooksPath == .husky/_`; `.husky/pre-push` presente |

### REQ-02: guarda de rama — bloqueo local de push a ramas protegidas

> **Que cambia**: intentar `git push` cuyo destino es `develop`, `master` o `main` se rechaza localmente con un mensaje que pide abrir un PR.
> **Por que**: el objetivo es que el trabajo entre por PR, no por push directo a ramas protegidas.

El sistema MUST rechazar (exit != 0) el push cuando el ref remoto destino, tras quitar `refs/heads/`, sea `develop`, `master` o `main`, mostrando un mensaje accionable ("push directo a '<branch>' bloqueado localmente. Abre un PR."). El hook MUST leer las lineas de stdin del `pre-push` (`<local_ref> <local_sha> <remote_ref> <remote_sha>`) para determinar el ref destino. Este bloqueo es **evadible con `--no-verify`** (documentado como limite, ver REQ-05).

**Actor**: user
**Layers**: config

<details><summary>Scenarios de validacion</summary>

#### Scenario: push a develop rechazado
- **GIVEN** el hook instalado
- **WHEN** se intenta `git push origin HEAD:develop` (o estando en develop, `git push`)
- **THEN** el hook imprime el mensaje de bloqueo y termina con exit != 0

#### Scenario: push a rama feature permitido
- **GIVEN** el hook instalado
- **WHEN** se hace push a `chore/...` o `feat/...`
- **THEN** la guarda de rama no bloquea (continua a lint + typecheck)

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-2 bloqueo develop | hook instalado | push a develop/master/main | rechazo con mensaje | exit != 0, "usa un PR" |

### REQ-03: lint sobre los archivos cambiados

> **Que cambia**: el pre-push corre eslint solo sobre los archivos modificados en ese push (extensiones lintables), no sobre todo el mod.
> **Por que**: decision del dev — push rapido validando el codigo que efectivamente se sube.

El sistema MUST correr eslint (el binario del script `lint`, `../../node_modules/.bin/eslint`) sobre los archivos cambiados en el rango del push, filtrados a extensiones lintables (`.js`, `.ts`, `.vue`, `.cjs`, `.mjs`) y a estado `ACMR` (added/copied/modified/renamed). El rango MUST calcularse desde stdin del pre-push: si el `remote_sha` es todo ceros (rama nueva en el remoto), usar el `merge-base` con `origin/develop`; si no, usar `remote_sha..local_sha`. Si tras el filtro no hay archivos lintables, el lint se omite sin fallar. Si eslint reporta errores, el push MUST abortarse.

**Actor**: user
**Layers**: config

<details><summary>Scenarios de validacion</summary>

#### Scenario: error de lint en archivo cambiado bloquea
- **GIVEN** un archivo `.ts`/`.vue` en el rango con una violacion de eslint
- **WHEN** se hace push
- **THEN** eslint falla y el push se aborta

#### Scenario: cambios sin archivos lintables no fallan
- **GIVEN** un push que solo toca `.md`/`.json`
- **WHEN** se hace push
- **THEN** el lint se omite (no hay archivos lintables) y no bloquea por esa causa

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-4 lint bloquea | hook instalado, violacion eslint en archivo del rango | push | lint falla | push abortado, exit != 0 |

### REQ-04: typecheck del mod completo

> **Que cambia**: el pre-push corre `vue-tsc --noEmit` sobre el mod completo antes de permitir el push.
> **Por que**: el typecheck no tiene modo por-archivo confiable; correrlo completo garantiza que no se suben errores de tipo.

El sistema MUST correr `npm run typecheck` (`../../node_modules/.bin/vue-tsc --noEmit`) sobre el mod. Si el typecheck reporta errores, el push MUST abortarse. La guarda de rama (REQ-02) MUST evaluarse antes que lint/typecheck (si el destino es protegido, no vale la pena correr las validaciones pesadas).

**Actor**: user
**Layers**: config

<details><summary>Scenarios de validacion</summary>

#### Scenario: error de tipo bloquea
- **GIVEN** un error de tipo introducido en un `.ts`/`.vue` del mod
- **WHEN** se hace push a una rama feature
- **THEN** vue-tsc falla y el push se aborta

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-3 typecheck bloquea | hook instalado, error de tipo en el mod | push a feature | vue-tsc falla | push abortado, exit != 0 |

### REQ-05: robustez, mensajes y documentacion (limites)

> **Que cambia**: el hook falla con mensajes accionables, se ejecuta desde la raiz del mod, y los limites de la etapa local quedan documentados.
> **Por que**: un hook que rompe con un error cripctico o sin decir como saltarlo en emergencia se vuelve friccion; y los limites (evadible, per-install) deben ser explicitos para no dar falsa sensacion de seguridad.

El sistema MUST:
- Resolver la raiz del mod para invocar los scripts/binarios de forma estable independiente del `cwd` del push.
- Si el binario de eslint/vue-tsc no existe, MUST fallar con un mensaje accionable (ej. "corre `npm install` en el mod") en vez de un error cripctico.
- Documentar en `docs/` del mod: que valida el hook, como se instala (husky/prepare), el escape hatch consciente (`git push --no-verify`) y sus **limites** (evadible; solo existe tras el install), y el **follow-up de etapa 2** (Bitbucket Branch permissions + Pipelines CI, con el desacople de `../../node_modules` que ese CI exige).

**Actor**: system
**Layers**: config

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-1 push limpio pasa | hook instalado, codigo limpio | push a feature | lint+typecheck ok | push procede |
| 2 | TC-6 escape hatch | hook instalado | `git push --no-verify` | hook no corre | push procede (limite documentado) |

## Necesidad y reuso (DET-32)

| Elemento | Veredicto | Racional | Alternativa descartada |
|----------|-----------|----------|------------------------|
| husky (devDependency) | **build** (reuse de herramienta estandar) | Versiona el hook en el repo + auto-install via `prepare`. Es el estandar de facto | Hook manual en `.git/hooks`: no versionable, no auto-instalable, no se propaga a otros devs |
| lint-staged | **drop** | Pensado para `staged files` en pre-commit; el pre-push calcula el rango por refs (`git diff`), no por stage. No aporta | — |
| eslint / vue-tsc | **reuse** | Ya existen como scripts del mod; el hook los invoca | Recrear config de lint/tsc: innecesario |
| Calculo de rango por refs (`git diff`) | **build** (script propio, minimo) | Es la logica del hook; unas lineas de shell leyendo stdin del pre-push | — |

## Technical reference

### Diseño del hook `.husky/pre-push` (a implementar en S1.T2)

husky v9: el archivo `.husky/pre-push` es un script shell plano (sin el boilerplate de sourcing de v8). git le pasa `$1`=nombre del remote, `$2`=URL, y por **stdin** las lineas `<local_ref> <local_sha> <remote_ref> <remote_sha>`.

Logica prevista (orden: guarda de rama → lint changed-files → typecheck):

```sh
#!/usr/bin/env sh
# pre-push curriculum-design (TICKET-108, etapa 1 local)
# Escape hatch consciente: git push --no-verify (evadible; cierre real = Bitbucket etapa 2)
set -eu

PROTECTED="develop master main"
Z="0000000000000000000000000000000000000000"
BASE_REF="origin/develop"
LINT_EXTS='\.(js|ts|vue|cjs|mjs)$'

# raiz del mod (estable ante cwd)
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

block=0
changed=""
while read -r local_ref local_sha remote_ref remote_sha; do
  target=${remote_ref#refs/heads/}
  for p in $PROTECTED; do
    [ "$target" = "$p" ] && { echo "✗ push directo a '$p' bloqueado localmente. Abre un PR."; block=1; }
  done
  [ "$local_sha" = "$Z" ] && continue            # borrado de rama: nada que lintar
  if [ "$remote_sha" = "$Z" ]; then              # rama nueva en el remoto
    base=$(git merge-base "$BASE_REF" "$local_sha" 2>/dev/null || echo "")
  else
    base="$remote_sha"
  fi
  if [ -n "$base" ]; then
    changed="$changed$(git diff --name-only --diff-filter=ACMR "$base" "$local_sha")\n"
  else
    changed="$changed$(git diff --name-only --diff-filter=ACMR "$local_sha")\n"
  fi
done

[ "$block" = "1" ] && exit 1

ESLINT=../../node_modules/.bin/eslint
TSC_OK=1
# lint solo archivos cambiados lintables y existentes
lint_files=$(printf "%b" "$changed" | sort -u | grep -E "$LINT_EXTS" || true)
if [ -n "$lint_files" ]; then
  [ -x "$ESLINT" ] || { echo "✗ eslint no encontrado. Corre 'npm install' en el mod."; exit 1; }
  echo "› lint (archivos cambiados)…"
  # shellcheck disable=SC2086
  "$ESLINT" $lint_files || exit 1
fi

echo "› typecheck (mod completo)…"
npm run typecheck || exit 1

echo "✓ pre-push OK"
```

> Notas de implementacion (para el developer):
> - El script de arriba es la referencia; ajustar detalles (portabilidad `sh`, manejo de multiples ref-lines, deteccion de binario) durante S1.T2.
> - `../../node_modules/.bin/eslint` es la misma ruta que usa el script `lint` del `package.json`; `npm run typecheck` reusa el script existente.
> - `set -eu`: cuidado con comandos que devuelven no-cero de forma legitima (usar `|| true` donde aplique, como en el grep del filtro).

### package.json (S1.T1)

```jsonc
{
  "scripts": {
    "prepare": "husky"      // husky v9: instala hooks (core.hooksPath = .husky/_)
    // ...scripts existentes (lint, typecheck, test)…
  },
  "devDependencies": {
    "husky": "^9.1.7"       // + resto de devDeps existentes
  }
}
```

## Tasks

### Session 1 — Implementar y validar el pre-push [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar `husky` (^9.1.7) a devDependencies + script `"prepare": "husky"` en el `package.json` del mod; correr `npm install` dentro del mod; verificar auto-install (`core.hooksPath == .husky/_`); **verificar el riesgo H2** (¿dispara el `prepare` con install solo en el root de workspaces?) y documentar el hallazgo | REQ-01 | developer | — | mods/curriculum-design/package.json | TC-5: `git config core.hooksPath` == `.husky/_` tras install; hallazgo H2 registrado | git revert (package.json) + `git config --unset core.hooksPath` | DET-11, DET-33 | pending | 1 |
| S1.T2 | Escribir `.husky/pre-push`: guarda de rama (develop/master/main, REQ-02) + lint de archivos cambiados por rango de refs (REQ-03) + typecheck del mod (REQ-04) + robustez/mensajes/escape hatch (REQ-05). Orden: rama → lint → typecheck | REQ-02, REQ-03, REQ-04, REQ-05 | developer | S1.T1 | mods/curriculum-design/.husky/pre-push | trazado del script + primeras corridas locales | git rm `.husky/pre-push` | DET-1, DET-2 | pending | 1 |
| S1.T3 | Validacion runtime (DET-33): ejecutar los 6 casos de push reales — TC-1 (feature limpio pasa), TC-2 (develop rechazado), TC-3 (error de tipo bloquea), TC-4 (error de lint en archivo cambiado bloquea), TC-5 (auto-install), TC-6 (`--no-verify` saltea). Capturar evidencia real de cada corrida (salida del hook), no referencia al script | REQ-01, REQ-02, REQ-03, REQ-04, REQ-05 | reviewer | S1.T1, S1.T2 | mods/curriculum-design (runtime git) | 6 corridas con evidencia real de salida; cambios de prueba revertidos (git restore) | (no aplica) | DET-13, DET-33 | pending | 1 |
| S1.T4 | Documentar en `docs/` del mod: que valida el hook, como se instala (husky/prepare), escape hatch (`--no-verify`) y limites, y el follow-up de etapa 2 (Bitbucket Branch permissions + Pipelines con el desacople de `../../node_modules`) | REQ-05 | developer | S1.T2 | mods/curriculum-design/docs/ | doc presente y coherente con el hook implementado | git rm del doc | DET-16 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket con Template de Gate, correr quality review (DET-23), confirmar las 6 validaciones runtime con evidencia (DET-33), decidir continue/close | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + 6 TCs con evidencia runtime + doc presente + hallazgo H2 registrado | (no aplica — cierre de session) | DET-13, DET-20, DET-23, DET-33 | pending | 1 |

### Task contract (detalle de tasks criticas)

```
Task S1.T1: husky devDep + prepare + verificar auto-install
- source_ref: REQ-01
- agent: developer
- files: mods/curriculum-design/package.json
- precondition: rama chore/TICKET-108-prepush-quality-guard creada desde develop en el repo del mod; up1/node_modules poblado
- expected_output: package.json con husky ^9.1.7 + "prepare": "husky"; tras npm install en el mod, core.hooksPath == .husky/_; hallazgo del riesgo H2 (¿prepare dispara con install root-only?) documentado
- validation: TC-5 (git config core.hooksPath) + nota de H2
- rollback: git revert del package.json + git config --unset core.hooksPath
- rules: [DET-11, DET-33]

Task S1.T2: escribir .husky/pre-push
- source_ref: REQ-02, REQ-03, REQ-04, REQ-05
- agent: developer
- files: mods/curriculum-design/.husky/pre-push
- precondition: S1.T1 done (husky instalado)
- expected_output: hook con guarda de rama + lint changed-files (rango por refs) + typecheck mod + mensajes accionables + orden rama->lint->typecheck
- validation: trazado + corridas locales; validacion formal en S1.T3
- rollback: git rm .husky/pre-push
- rules: [DET-1, DET-2]

Task S1.T3: validacion runtime (los 6 TCs)
- source_ref: REQ-01..REQ-05
- agent: reviewer
- files: (runtime git del mod; ramas de prueba descartables)
- precondition: hook instalado; poder crear una rama de prueba y (para TC-2) simular push a develop sin efecto real (usar HEAD:develop en dry-run o remote de prueba)
- expected_output: TC-1 pasa, TC-2 rechaza, TC-3 bloquea (tipo), TC-4 bloquea (lint), TC-5 auto-install, TC-6 --no-verify saltea
- validation: evidencia real de la salida del hook por cada TC (no referencia al archivo del script), cambios de prueba revertidos
- rollback: (no aplica)
- rules: [DET-13, DET-33]
```

## Constraints

- **layer: mod** — todo el cambio vive en el repo del mod curriculum-design; NO se toca core (object-manager/layout/suite/flow) ni el repo up1 root. No aplica RULE-dev-004 (core work policy).
- **DET-33** — el hook se valida ejecutando pushes reales con evidencia, no leyendo el script (self-report no es hecho).
- **Etapa 1 local** — sin configuracion cloud de Bitbucket. El bloqueo de rama es evadible (`--no-verify`); esto se documenta, no se presenta como seguridad.
- **No romper el flujo de otros devs** — el hook debe fallar con mensajes accionables y no colgar el push por causas ajenas (binario ausente → mensaje claro).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `up1/node_modules` poblado (eslint, vue-tsc hoisted) | internal | El hook invoca `../../node_modules/.bin/eslint` y `npm run typecheck` | Sin el install del root, el hook no encuentra binarios → mensaje accionable, pero el dev debe instalar |
| Auto-install del `prepare` en el flujo real | internal | REQ-01 depende de que `npm install` dispare el `prepare` del mod | Riesgo H2: si install root-only no lo dispara, hace falta documentar el paso manual (mitigacion en S1.T1) |
| Acceso admin a Bitbucket | external | Necesario SOLO para la etapa 2 (fuera de alcance) | No bloquea la etapa 1 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El `prepare` no dispara con `npm install` root-only (workspaces) | medium | El hook no se auto-instala para algunos devs | S1.T1 lo verifica empiricamente; si aplica, documentar el paso manual en onboarding |
| `--no-verify` saltea el hook | high (comportamiento estandar) | Un dev puede evadir la revision | Limite documentado (REQ-05); cierre real = Bitbucket etapa 2 |
| typecheck completo agrega latencia en cada push | medium | Push mas lento | Aceptado (es la revision obligatoria pedida); el lint ya se acota a archivos cambiados |
| Binario eslint/vue-tsc ausente | low | Hook falla | Mensaje accionable ("corre npm install en el mod"), no error cripctico (REQ-05) |
| Portabilidad del script shell (sh vs bash, macOS vs Linux) | low | Hook falla en algun entorno | Escribir POSIX sh; validar en el entorno del equipo (S1.T3) |

## Open questions

- Ninguna abierta. Las dos decisiones de diseño (alcance del lint = archivos cambiados; guarda de rama incluida en etapa 1) fueron resueltas por el dev en intake y estan en `decisions_log` del ticket.

## Decisions

### DEC-LOCAL-01: lint sobre archivos cambiados (no todo el mod)
- **Contexto**: el pre-push puede lintar todo el mod (consistente, lento) o solo los archivos cambiados vs origin (rapido).
- **Opcion elegida**: solo archivos cambiados. El typecheck (vue-tsc) si es del mod completo (no tiene modo por-archivo confiable).
- **Alternativa descartada**: lint del mod completo — mas lento en cada push; el dev prioriza velocidad validando el codigo que sube.
- **Session**: intake (confirmada por el dev).

### DEC-LOCAL-02: guarda de rama incluida en la etapa 1 local
- **Contexto**: el bloqueo de push a develop/master/main puede ir en la etapa 1 local (evadible) o dejarse 100% para Bitbucket etapa 2 (no evadible).
- **Opcion elegida**: incluirla en la etapa 1, documentando que es guia evadible (`--no-verify`), no seguridad.
- **Alternativa descartada**: dejarla solo para etapa 2 — mas honesto respecto a la evasibilidad, pero el dev prefiere el recordatorio local ahora.
- **Session**: intake (confirmada por el dev).

### DEC-LOCAL-04: lint y typecheck en modo advisory (warn-only) en etapa 1
- **Contexto**: al validar en runtime (S1.T3, DET-33) se encontró que el baseline del mod está rojo: eslint roto repo-wide (conflicto `ajv@8` vs eslintrc/`ajv@6`, B2) y ~130 errores de tipo preexistentes (B1, muchos cascadean de copias vendored bajo `components/`/`composables/`). Un hook con lint/typecheck **bloqueantes** (REQ-03/04 originales) rechazaría TODO push.
- **Opción elegida** (aprobada por el dev, 2026-07-17): lint y typecheck corren en **modo advisory (warn-only)** — informan pero no abortan. La **guarda de rama (REQ-02) sigue bloqueante**. Se promueven a bloqueantes cuando B1/B2 se resuelvan (follow-ups).
- **Alternativa descartada**: arreglar el baseline (130 type errors + eslint) dentro de este ticket — excede el alcance de tooling y el `execute_scope`; es su propio esfuerzo.
- **Efecto sobre REQ-03/REQ-04**: el "MUST abortar el push" pasa a "MUST correr y advertir; NO aborta" en etapa 1. TC-3/TC-4 cambian su expected de "bloquea" a "advierte y procede".
- **Session**: S1 (execute).

### DEC-LOCAL-03: husky vs hook manual
- **Contexto**: el hook puede instalarse a mano en `.git/hooks` o gestionarse con husky.
- **Opcion elegida**: husky (versiona el hook + auto-install via `prepare`).
- **Alternativa descartada**: hook manual en `.git/hooks` — no versionable, no se propaga a otros devs, no cumple "obligatorio para todo dev".
- **Session**: intake.

## Acceptance checkpoints

- [ ] **Funcional**: push a feature limpio pasa (TC-1); push a develop/master/main rechazado (TC-2); error de tipo bloquea (TC-3); error de lint en archivo cambiado bloquea (TC-4).
- [ ] **Auto-install**: `npm install` en el mod deja `core.hooksPath == .husky/_` y `.husky/pre-push` presente (TC-5); hallazgo del riesgo H2 documentado.
- [ ] **Runtime (DET-33)**: los 6 TCs ejecutados con evidencia real de la salida del hook, no referencia al script.
- [ ] **Limites**: `--no-verify` documentado como escape hatch/limite (TC-6); follow-up de etapa 2 documentado.
- [ ] **Alcance**: sin cambios fuera del repo del mod curriculum-design.
- [ ] **Docs**: doc del hook presente en `docs/` del mod (que valida, como se instala, limites, follow-up etapa 2).

## Archiving

Cuando esta spec deje de ser fuente de verdad (etapa 2 implementada y el hook consolidado, o el enforcement migrado a Bitbucket), usar `/dkc-archive-spec SPEC-curriculum-design-prepush-quality-guard "{razon}"`.
