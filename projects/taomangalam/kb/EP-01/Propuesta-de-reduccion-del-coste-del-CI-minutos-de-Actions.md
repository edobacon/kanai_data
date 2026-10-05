---
id: DOC-kb-EP-01-Propuesta-de-reduccion-del-coste-del-CI-minutos-de-Actions
project: taomangalam
type: doc
module: EP-01
tags:
  - ci
  - acciones
  - coste
  - minutos
  - propuesta
  - tooling
---

# Propuesta de reducción del coste del CI (minutos de Actions)

## Por qué este documento

La cuenta agotó los 2.000 minutos incluidos de Actions antes del 1 de noviembre (se renuevan el 01/11/2026) y los jobs dejaron de arrancar por el límite de gasto. El repo es **privado**, así que todo minuto se factura. Este documento mide el costo real por job con el historial de corridas del repo y propone cómo dejar el CI sostenible dentro del cupo cuando se reactive.

## Cómo se factura (lo que hay que tener en cuenta)

- Se factura el **tiempo de cada job**, no el reloj de la corrida: los jobs corren en paralelo y se suman.
- **Multiplicador por runner**: Linux 1×, Windows 2×, **macOS 10×**. Un job de 7 minutos en macOS factura 70.
- Redondeo: GitHub redondea al minuto por job.
- La página *Billing & plans → Actions* muestra el consumo por repositorio; el detalle por job se puede reproducir con la API de runs + jobs (sumando duraciones por runner), que es lo que se usó para medir acá.

## Costo medido por job

Medición sobre 46 corridas del historial (15 de `ci-pr`, 8 de `contract`, 8 de Dependabot, 4 de `nightly`, 5 de `main`, 6 de `codeql`). `fact` = minutos facturables por corrida (media × multiplicador del runner).

| Workflow | Job | Runner | Media (min) | **Fact. por corrida** |
|---|---|---|---|---|
| nightly | ios | macos-latest | 6,8 | **68,2** |
| ci-pr | ios-simulator | macos-latest | 2,0 (máx 10,8) | **19,7** (hasta ~108 con el job completo) |
| nightly | android | ubuntu | 11,2 | 11,2 |
| ci-pr | flutter-goldens | ubuntu | 5,8 | 5,8 |
| ci-pr | flutter-test | ubuntu | 5,6 | 5,6 |
| contract | contract | ubuntu | 3,8 | 3,8 |
| ci-pr | docs | ubuntu | 3,7 | 3,7 |
| ci-pr | widgetbook | ubuntu | 3,4 | 3,4 |
| ci-pr | build-smoke | ubuntu | 2,4 | 2,4 |
| ci-pr | flutter-static | ubuntu | 2,4 | 2,4 |
| nightly | flutter | ubuntu | 2,1 | 2,1 |
| nightly | backend | ubuntu | 1,1 | 1,1 |
| nightly | docs | ubuntu | 0,9 | 0,9 |
| ci-pr | integration | ubuntu | 0,8 | 0,8 |
| codeql | analyze (javascript-typescript) | ubuntu | 3,2 | 3,2 |
| codeql | analyze (actions) | ubuntu | 2,8 | 2,8 |
| nightly | deps-audit / docs-orphans / docs-links | ubuntu | 1,0 | 1,0 |
| ci-pr | backend-test / backend-static / dev-commands / metadata / changes / security / quality-gate / summary | ubuntu | ~1,2 en total | ~1,2 |

## Costo por corrida (lo que importa)

| Corrida | Minutos facturables |
|---|---|
| **`nightly` completo** (diario a las 03:00 UTC) | **≈ 89 min** → **≈ 2.670 min/mes** |
| `ci-pr` gate liviano (PR por ticket) | ≈ 40 min, y hasta ~120 si el job de macOS corre completo |
| `ci-pr` gate completo (PR de cierre de épica) | ≈ 60-120 min (agrega `contract`, `integration`, `flutter-goldens`, `build-smoke`) |
| `codeql` | ≈ 6 min (semanal + cada push a `main`) |
| `main` | ≈ 4 min por push a `main` |
| Dependabot (por PR abierto) | ≈ 3,6 min, más el `ci-pr` que dispara |

**Diagnóstico**: el `nightly` diario, y dentro de él el job **`ios` en macOS (×10)**, es el que agota el cupo por sí solo: ~68 de los ~89 minutos de cada noche, unos 2.040 min al mes. El resto del cupo se fue en los `ci-pr` (73 corridas) y en el PR agregado de la épica.

## Propuesta, por orden de impacto

### 1. Sacar el iOS del `nightly` de la corrida diaria (−2.040 min/mes)
Es el 76% del costo del `nightly`. Opciones, de mayor a menor ahorro: quitarlo del `nightly` y dejarlo solo `workflow_dispatch`; o correrlo semanal; o mantenerlo diario pero solo en Linux (perdiendo cobertura de iOS en el barrido diario).

### 2. `nightly` de diario a semanal (−~340 min/mes adicionales)
Con el iOS ya fuera, cada corrida baja a ~21 min: semanal son ~84 min/mes en lugar de ~630.

### 3. Hacer **opt-in** los jobs caros de `ci-pr`
Con una etiqueta (`ci:completo`) o por rutas tocadas, dejar por defecto en cada PR solo el gate barato: `changes`, `metadata`, `security`, `dev-commands`, `backend-static`, `backend-test`, `flutter-static`, `docs`, `quality-gate`, `summary` (~12-15 min). Pasar a opt-in: `ios-simulator`, `build-smoke`, `flutter-goldens`, `integration`, `contract`, `widgetbook`. Esto es coherente con DEC-239 (barato por ticket, completo al cierre de la épica).

### 4. `codeql`: solo el barrido semanal
Quitar el disparo por `push` a `main` y conservar `schedule` + `workflow_dispatch`: −~26 min/mes y sigue cubriendo el análisis periódico.

### 5. `main`: dejarlo manual
Hoy corre `contract` + `site` en cada push a `main` (~4 min). Si pasa a `workflow_dispatch`, no cuesta nada y se puede disparar cuando interese.

### 6. Dependabot: agrupar
Hoy abre un PR por ecosistema y cada uno dispara `ci-pr`. Con `groups` en `dependabot.yml` y frecuencia semanal, pasa de ~12 corridas a ~4 por mes.

### 7. Presupuesto con tope, no en $0
Un tope chico (por ejemplo USD 5 ≈ 625 min de Linux) permite correr el cierre de una épica sin quedar bloqueado por el límite, y avisa antes de gastar de más. Si se prefiere no gastar nada, mantener $0 y asumir que el gate completo se corre cuando haya minutos del ciclo.

## Escenario resultante

| | Antes | Con la propuesta |
|---|---|---|
| Base mensual (nightly + codeql + main) | ~2.700-3.000 min | ~100-150 min |
| Costo por PR común | ~40-120 min | ~12-15 min |
| Gate completo (a pedido o al cierre de épica) | igual | ~60-120 min, cuando se pida |

Con 2.000 min/mes entran con margen: la base, ~20 PRs livianos y varios gates completos pedidos a mano.

## Implementación y cuidados

- **Archivos**: `nightly.yml` (schedule + job `ios`), `ci-pr.yml` (condiciones de los jobs caros y el `quality-gate`), `codeql.yml` (triggers), `main.yml` (trigger), `.github/dependabot.yml` (groups + frecuencia).
- **El check requerido `quality-gate`**: si un job opt-in no corre, el gate debe tratarlo como "no aplica" y no como "pendiente", o el merge a `main` queda bloqueado. `main` exige `quality-gate` con política estricta.
- **Tests del workflow**: `tests/test_ci_pr_*.py` y `tests/test_docs_as_code.py` afirman los disparadores y el orden de pasos; hay que actualizarlos en el mismo cambio.
- **No** conviene meterlo como commit suelto en la rama de una épica: es un cambio de diseño del gate y merece su propio ticket.
- **Alternativa estructural**: si el repositorio fuera público, los runners Linux estándar no consumen minutos (macOS y Windows siguen consumiendo). El trade-off es exponer el código y la documentación de producto.

## Cómo volver a medir

Después de cualquier cambio, la referencia es *Billing & plans → Actions* (consumo por repo, por ciclo). Para el detalle por job: listar `/repos/{owner}/{repo}/actions/runs`, pedir `/actions/runs/{id}/jobs` y sumar `completed_at - started_at` por job, multiplicando por 10 los jobs de `macos-*`.
