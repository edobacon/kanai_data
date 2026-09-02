---
id: SPEC-codex-binary-resolution-132
project: horadric
ticket: HOR-132
status: done
---

# Resolucion del binario de codex por version, y remapeo de tiers a la familia 5.6

# Resolucion del binario de codex por version, y remapeo de tiers a la familia 5.6

## Executive summary — lo que estas aprobando

**Que se quiere**: el guardarrail que valida el mapeo tier a modelo (`dkc-model-map-check`, de HOR-130) media la instalacion equivocada de Codex. En esta maquina `codex` no esta en el PATH, asi que su cascada fija caia siempre a `/Applications/Codex.app/...` (`0.131.0-alpha.9`, de mayo), mientras el CLI que el dev corre viaja adentro de `ChatGPT.app` (`0.146.0-alpha.9.2`). Resultado: exit 0 "sin drift" contra un CLI que ya nadie usa, es decir un falso negativo del guardarrail que HOR-130 puso para que el mapeo no envejeciera en silencio. Se arregla resolviendo el binario por evidencia (la version mas alta de las presentes), haciendo que el veredicto diga contra que binario se emitio, y remapeando los tiers a los modelos que el CLI vigente si lista.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | La resolucion vive en **un comando compartido** (`dkc-resolve-codex`), no parcheada en cada sitio | Estaba duplicada en 3 lugares, que es lo que garantizo que envejecieran por separado. Parchear los 3 por igual era la alternativa; el proximo cambio de bundle volveria a pedir 3 ediciones |
| 2 | Se elige por **version observada**, no por orden de rutas | Una cascada fija vuelve a fallar al proximo movimiento del bundle. `CODEX_BIN` sigue siendo override explicito y no compite |
| 3 | Los tres tiers pasan a la familia **5.6** (`luna`/`terra`/`sol`) | Son los de mayor `priority` del catalogo vigente. Cuesta el `max_context` de 1M que solo `gpt-5.4` tiene |

**Riesgos principales y como los mitigamos**:

- **El remapeo pierde el contexto de 1M de `gpt-5.4`** (los tres 5.6 son 272k) → documentado en `agent-tiers.md` como override de proyecto para el tier que lo necesite; ningun tier lo necesita hoy.
- **La resolucion por version puede elegir un prerelease roto** → el veredicto ahora nombra el binario y su version, y `CODEX_BIN` fuerza cualquier instalacion puntual.
- **Los slugs se dan vuelta en los dos sentidos** (HOR-130 los saco por no invocables, hoy son los mejores) → el catalogo escrito no se cree: el gate corre el checker, y los cambios que importan se verifican con un `codex exec` real.

**Que NO se hace en este ticket**:

- Generalizar el resolver a otros proveedores externos (hoy solo Codex tiene backend de delegacion).
- Cachear el resultado de la resolucion: son 2 invocaciones de `--version`, medidas en menos de 2s, y cachear reintroduce el problema de "dato leido una vez".
- Tocar las rutas viejas que quedan en `HOR-130.md`, sus specs y su evidencia: son registro historico de lo que era cierto entonces (DET-6).

**Tamano estimado**: 1 session (T2), aproximadamente 2h efectivas. Lo mas riesgoso es el remapeo, porque su verificacion honesta exige gastar cuota real con `codex exec`.

**Como vas a saber que funciona**:

- Corres `./commands/dkc-model-map-check` y la salida dice `CLI medido: .../ChatGPT.app/... (0.146.0-alpha.9.2)` con exit 0.
- Fuerzas el binario viejo con `CODEX_BIN=/Applications/Codex.app/...` y el mismo comando da exit 2 nombrando los 3 tiers en drift.
- `./commands/dkc-delegate --dry-run` muestra el comando armado con el binario de `ChatGPT.app` y el modelo del tier remapeado.

---

## Purpose

Cierra el nivel de abajo del guardarrail de HOR-130: no que el dato del mapeo envejezca (eso ya lo cubre `RULE-codex-model-map-verified-005`), sino que **el instrumento apunte al objeto equivocado**. Unifica la deteccion del binario de Codex en un comando, la hace por evidencia, la vuelve auditable en la salida del checker, y actualiza el catalogo de modelos a lo que el CLI vigente realmente puede invocar.

## Requirements

### REQ-FIX-01: Resolucion del binario por version observada

> **Que cambia**: un comando nuevo (`dkc-resolve-codex`) decide que instalacion de Codex se usa, probando `--version` en todos los candidatos conocidos y quedandose con la mas alta.
> **Por que**: la cascada fija anterior resolvia un bundle de mayo mientras el CLI vigente vivia en otro bundle, y nadie se enteraba.

El sistema MUST resolver el binario de codex evaluando los candidatos (`CODEX_BIN`, PATH, `ChatGPT.app`, `Codex.app`, `~/.codex/bin`, homebrew, `/usr/local/bin`), consultando su `--version`, y eligiendo la version mas alta, con release por encima del prerelease del mismo core.

`CODEX_BIN` MUST ganar sobre la comparacion de versiones, sin competir: es override explicito del dev.

El comando MUST dedupear por ruta real (la misma instalacion puede aparecer por PATH y por bundle) y MUST exponer `--json` con `binary`, `version`, `reason` y todos los candidatos evaluados con su flag `selected`.

Si existe un binario pero no responde `--version`, el comando MUST elegirlo igual y avisar por stderr: no inventa version, y no descarta el unico CLI disponible.

Si no hay ningun candidato ejecutable, MUST salir con exit 3 nombrando las rutas probadas. Sin CLI no se asume nada.

**Actor**: system
**Layers**: config, backend

#### Acceptance
**El dev puede verificar que funciona**: corre `./commands/dkc-resolve-codex --json` y ve las dos instalaciones de su maquina con su version, y cual gano.

### REQ-FIX-02: El veredicto del guardarrail nombra contra que se emitio

> **Que cambia**: `dkc-model-map-check` imprime `CLI medido: <ruta> (<version>, <como se resolvio>)` y agrega el campo `cli` a su JSON.
> **Por que**: un exit 0 sin esa referencia no distingue "el mapeo esta bien" de "el mapeo esta bien contra un CLI que ya nadie corre".

El checker MUST reportar el binario medido, su version y como se resolvio, en las dos salidas (humana y `--json`).

El checker MUST obtener el binario de `dkc-resolve-codex`, sin reimplementar la resolucion.

La resolucion MUST ejecutarse **despues** del bloque `--self-test`, para preservar la propiedad de que el self-test corre sin CLI instalado.

**Actor**: system
**Layers**: config

#### Acceptance
**El dev puede verificar que funciona**: la primera linea util del comando dice que binario se midio; forzando `CODEX_BIN` al bundle viejo, la misma linea cambia y el veredicto pasa a exit 2.

### REQ-FIX-03: Un solo resolver para quien valida y quien ejecuta

> **Que cambia**: `dkc-delegate` y el healthcheck del server dejan de tener su propia copia de la cascada y llaman al mismo resolver que el checker.
> **Por que**: si la delegacion corre en un binario distinto del que se valido, la validacion previa no vale nada.

`commands/dkc-delegate` MUST resolver el binario con `dkc-resolve-codex`.

`dkc_capabilities` (y por lo tanto `dkc_install_check("agent")`) MUST resolver por el mismo comando y MUST exponer la `version` del backend junto al `binary`. Si el comando no esta disponible, MUST degradar a `shutil.which("codex")` en vez de a una ruta fija.

Al terminar, MUST NO quedar ninguna cascada de resolucion duplicada en el codigo activo (los registros historicos de HOR-130 quedan como estan).

**Actor**: system
**Layers**: backend, config

#### Acceptance
**El dev puede verificar que funciona**: `./commands/dkc-delegate --dry-run` imprime el comando con la ruta de `ChatGPT.app`, la misma que reporta el checker.

### REQ-IMPROVE-01: Tiers remapeados a la familia 5.6 y catalogo remedido

> **Que cambia**: `fast: gpt-5.6-luna`, `balanced: gpt-5.6-terra`, `reasoning: gpt-5.6-sol`, y el catalogo del proveedor pasa a reflejar lo que lista el CLI vigente.
> **Por que**: los tres 5.6 son los de mayor `priority` del catalogo actual, y el catalogo escrito documentaba dos slugs que hoy responden 400.

El catalogo de `prompts/agent-tiers.md` MUST reflejar los modelos con `visibility: list` de la instalacion vigente, con la fecha de medicion y la version del CLI que los midio.

Los slugs que salieron del catalogo (`gpt-5.3-codex`, `gpt-5.2`) MUST quedar registrados con el error exacto que devuelven, en vez de solo borrarse.

El trade-off del remapeo (`gpt-5.4` es el unico con `max_context` de 1M) MUST quedar escrito como nota de uso, con la salida (override de proyecto) para el tier que necesite contexto largo.

**Actor**: system
**Layers**: config

#### Acceptance
**El dev puede verificar que funciona**: `./commands/dkc-model-map-check` da exit 0 con los tres tiers apuntando a `gpt-5.6-*`.

### REQ-PRESERVE-01: Nada de lo que ya funcionaba cambia de contrato

> **Que cambia**: nada visible. Los exit codes, el `--self-test` sin CLI y el override por `CODEX_BIN` siguen igual que en HOR-130.
> **Por que**: el fix toca el interior del guardarrail; si su contrato se moviera, romperia los gates y el healthcheck que ya lo consumen.

El `--self-test` del checker MUST seguir corriendo sin CLI instalado.

Los exit codes del checker MUST seguir siendo 0 sin drift, 2 con drift, 3 ante error de entorno.

`CODEX_BIN` MUST seguir siendo la via para forzar una instalacion puntual.

La suite del server MUST seguir verde.

**Actor**: system
**Layers**: backend, config

#### Acceptance
**El dev puede verificar que funciona**: los tres exit paths del checker se reproducen a demanda, y `pytest` del server sigue en verde.

## Artifacts

### Comandos

| Comando | Cambio | Contrato |
|---------|--------|----------|
| `commands/dkc-resolve-codex` | nuevo | stdout: ruta elegida. `--json`: `{binary, version, reason, candidates[]}`. Exit 0 resuelto, 3 sin binario |
| `commands/dkc-model-map-check` | modificado | agrega `CLI medido:` y campo `cli`. Exit codes sin cambio |
| `commands/dkc-delegate` | modificado | usa el resolver compartido; su mensaje de error apunta a `dkc-resolve-codex --json` |

### Server

| Archivo | Cambio |
|---------|--------|
| `server/src/deckard_cain/tools/project.py` | helper `_resolve_codex(root)`, y `dkc_capabilities` expone `version` del backend codex |

### Doc y KB

| Archivo | Cambio |
|---------|--------|
| `prompts/agent-tiers.md` | fila del proveedor, catalogo remedido, bloque yaml, 5 notas de uso |
| `docs/codex-pack.md` | el alias apuntaba al bundle viejo; nueva fila de limitacion conocida |
| `docs/delegation.md` | nota de resolucion compartida en Auth y dependencias |
| `projects/horadric/bugs/codex/BUG-codex-binary-resolution-stale-app-003.md` | nuevo, `severity: high`, `status: fixed` |
| `projects/horadric/rules/codex/RULE-codex-model-map-verified-005.md` | 2 condiciones sobre el instrumento + `When` tras update de app + `Where` con el resolver |

## Tasks

### Session 1 — Diagnostico, resolver compartido, remapeo y KB [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Medir el estado real: version de cada instalacion de codex presente, catalogo `debug models` del CLI vigente, y que proceso corre de verdad (`ps`). Probar invocabilidad con `codex exec` real de los 8 slugs en juego, no solo el listado | REQ-FIX-01 | researcher | — | — | TC-01, TC-02: version de los dos bundles + exit de cada slug | (no aplica: solo lectura) | DET-4, DET-5, DET-33 | done | 1 |
| S1.T2 | Crear `commands/dkc-resolve-codex`: candidatos, `--version`, comparacion semver-ish, dedupe por ruta real, `--json`, exit 3 sin binario, warn si no reporta version | REQ-FIX-01 | developer | S1.T1 | commands/dkc-resolve-codex | TC-03, TC-04: elige el de version mas alta; `CODEX_BIN` gana | rm del archivo | DET-8, RULE-codex-model-map-verified-005 | done | 1 |
| S1.T3 | Migrar los 3 consumidores al resolver y agregar el reporte del binario medido al checker (humano + `cli` en JSON), con la resolucion despues del self-test | REQ-FIX-02, REQ-FIX-03 | developer | S1.T2 | commands/dkc-model-map-check, commands/dkc-delegate, server/src/deckard_cain/tools/project.py | TC-05, TC-06, TC-07: 3 exit paths + dry-run de delegate + suite del server | git revert | DET-8, DET-16 | done | 1 |
| S1.T4 | Remapear los tiers a `gpt-5.6-luna/terra/sol`, remedir el catalogo del proveedor con el CLI vigente, registrar los 2 slugs muertos con su error exacto y el trade-off del 1M. Actualizar los fixtures del self-test para que no contradigan la realidad | REQ-IMPROVE-01 | developer | S1.T3 | prompts/agent-tiers.md, commands/dkc-model-map-check | TC-08: checker exit 0 con los 3 tiers en 5.6 | git revert | DET-4, RULE-codex-model-map-verified-005 | done | 1 |
| S1.T5 | Propagar a la doc oficial del proyecto: el alias del pack apuntaba al bundle viejo, nueva limitacion conocida, y la nota de resolucion compartida en delegation | REQ-FIX-03 | scribe | S1.T4 | docs/codex-pack.md, docs/delegation.md | lectura cruzada: ningun path fijo en doc activa | git revert | DET-16, DET-37 | done | 1 |
| S1.T6 | KB: crear `BUG-codex-binary-resolution-stale-app-003` y ampliar `RULE-codex-model-map-verified-005` con las 2 condiciones sobre el instrumento. Validar con `dkc-validate` y reindexar | REQ-FIX-01, REQ-FIX-02 | scribe | S1.T4 | projects/horadric/bugs/codex/BUG-codex-binary-resolution-stale-app-003.md, projects/horadric/rules/codex/RULE-codex-model-map-verified-005.md | `dkc-validate Bug` y `dkc-validate Rule` en verde + `dkc-reindex horadric` | rm del bug, git revert de la rule | DET-11, DET-16, DET-37 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)**: persistir la session en el ticket, correr los 3 exit paths del checker + suite del server, quality review de 10 dimensiones, decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5, S1.T6 | projects/horadric/tickets/HOR-132.md | gate persistido + decision documentada | (no aplica: cierre de session) | DET-20, DET-23, DET-27, DET-33 | done | 1 |

### Task contract

```
Task S1.T2: crear el resolver compartido
- source_ref: REQ-FIX-01
- agent: developer
- files: commands/dkc-resolve-codex
- precondition: S1.T1 midio que hay 2 instalaciones con versiones distintas
- expected_output: comando ejecutable que imprime la ruta elegida, y con --json el detalle de candidatos
- validation: TC-03 (elige 0.146 sobre 0.131), TC-04 (CODEX_BIN gana), exit 3 sin binario
- rollback: rm del archivo (nadie dependia de el antes de S1.T3)
- rules: [DET-8, RULE-codex-model-map-verified-005]
```

```
Task S1.T3: migrar consumidores
- source_ref: REQ-FIX-02, REQ-FIX-03
- agent: developer
- files: commands/dkc-model-map-check, commands/dkc-delegate, server/src/deckard_cain/tools/project.py
- precondition: el resolver existe y responde --json
- expected_output: cero cascadas duplicadas; el checker dice que binario midio; delegate usa el mismo
- validation: 3 exit paths del checker, dry-run de delegate, pytest del server verde
- rollback: git revert
- rules: [DET-8, DET-16]
```

## Acceptance

| # | Criterio | Como se verifica | Estado |
|---|----------|------------------|--------|
| 1 | El checker mide la instalacion vigente y lo dice | `./commands/dkc-model-map-check` imprime `CLI medido:` con la ruta de `ChatGPT.app` y exit 0 | cumplido |
| 2 | El falso negativo es reproducible y ahora visible | `CODEX_BIN=<bundle viejo>` da exit 2 y nombra el binario viejo | cumplido |
| 3 | Sin CLI no se asume nada | `CODEX_BIN=/nonexistent` da exit 3 con las rutas probadas | cumplido |
| 4 | Quien valida y quien ejecuta usan el mismo binario | `dkc-delegate --dry-run` muestra la ruta de `ChatGPT.app` y el modelo del tier | cumplido |
| 5 | Los tres tiers apuntan a modelos invocables | exit 0 con `gpt-5.6-luna/terra/sol`, verificados con `codex exec` real | cumplido |
| 6 | Nada de lo previo se rompio | `--self-test` OK sin CLI, 165 tests del server verdes | cumplido |
| 7 | El conocimiento quedo registrado | bug + rule validados y reindexados, doc oficial propagada | cumplido |

## Dependencies

| Dependencia | Tipo | Que aporta | Riesgo |
|-------------|------|------------|--------|
| CLI de Codex en `ChatGPT.app` (`0.146.0-alpha.9.2`) | external | `--version`, `debug models`, `exec -m` | Si vuelve a mudarse de bundle, el resolver lo encuentra igual mientras la ruta este en la lista de candidatos. Si aparece un bundle nuevo, hay que agregarlo (unico punto a mantener) |
| `SPEC-deckard-core-delegation-130` | internal | El checker y el canal de delegacion que este spec corrige | Ninguno: este spec no cambia sus contratos, solo la resolucion del binario |
