# Modelo de datos — TAO-158 (`HU-00-09` Workflow de PR)

## 1. Naturaleza del modelo

Este ticket no introduce entidades de dominio ni esquema de base de datos. Su "modelo de datos" es la **configuración declarativa** de la integración continua y de la protección del repositorio: el archivo de workflow, sus jobs, el service container de PostgreSQL, los artifacts, el grupo de concurrencia y el ruleset de `main`. Se modela aquí para fijar contrato, claves, estados y filtros, y para detectar qué se crea y qué se reutiliza.

Leyenda de origen: **[N]** nuevo en este ticket · **[E]** existente reutilizado sin cambios de contrato.

---

## 2. Entidades y objetos

### 2.1 `Workflow` — `.github/workflows/ci-pr.yml` **[N]**

| Campo (YAML) | Tipo | Obligatorio | FK / valor | Default | Notas |
|---|---|---|---|---|---|
| `name` | string | sí | — | `"CI PR"` | Nombre visible del workflow |
| `on` | map | sí | — | — | `pull_request` hacia `main`, tipos `opened`, `synchronize`, `reopened`, `ready_for_review` (REQ-01) |
| `concurrency.group` | string | sí | `PR#` | `ci-pr-${{ github.event.pull_request.number }}` | Clave de agrupación por PR (REQ-01) |
| `concurrency.cancel-in-progress` | boolean | sí | — | `true` | Cancela ejecuciones obsoletas del mismo PR (REQ-01) |
| `permissions` | map | sí | — | `contents: read` | Permisos mínimos por defecto; cada job los restringe o amplía (REQ-08) |
| `env` | map | no | — | `PYTHON_VERSION=3.12` | Toolchain fijado (REQ-07) |
| `jobs` | map<string, Job> | sí | FK → 2.2 | — | Clave = `job_id` |

**Estado:** todo el archivo es nuevo. El único precedente reutilizado es `.github/workflows/contract.yml` **[E]**, que se integra vía `workflow_call` (ver 2.2 y §4).

---

### 2.2 `Job` **[N]** — 11 instancias

Cada entrada de `jobs` cumple el shape:

| Campo | Tipo | Obligatorio | FK / enum | Notas |
|---|---|---|---|---|
| `id` | string | sí | clave del map | `metadata`, `contract`, `flutter-static`, `flutter-test`, `backend-static`, `backend-test`, `integration`, `build-smoke`, `security`, `docs`, `quality-gate` |
| `name` | string | no | — | Etiqueta legible del check |
| `runs-on` | string | sí | — | `ubuntu-latest` (o runner definido) |
| `needs` | list<string> | no | FK → `Job.id` | Dependencias entre jobs (paralelismo) |
| `if` | string | no | expresión | `always()` en `quality-gate`; filtros de ruta en jobs pesados (REQ-01) |
| `timeout-minutes` | number | no | — | Cota por job |
| `permissions` | map | no | — | Restringe el global (REQ-08) |
| `services` | map | no | FK → 2.3 | Solo `integration` |
| `env` | map | no | — | Variables del job |
| `steps` | list<Step> | sí | — | Comandos/gates concretos |
| `outputs` | map | no | — | Cobertura, artifact names |
| `uses` | string | no | FK → workflow reutilizable | `contract` invoca `contract.yml` (REQ-03) |

**Job → contrato funcional (REQ que materializa):**

| `job_id` | Rol | `needs` | `if` / filtro de ruta | REQ |
|---|---|---|---|---|
| `metadata` | Rutas, títulos, archivos prohibidos (`.env`, certificados), coherencia de lockfiles | — | siempre | REQ-02 |
| `contract` | Gate de contrato (reusa `contract.yml`) | — | siempre | REQ-03 |
| `flutter-static` | `analyze` + formato, toolchain FVM, caché pub | — | pesado (paths) | REQ-04 |
| `flutter-test` | `flutter test --coverage` + LCOV + `diff-cover` | — | pesado (paths) | REQ-04 |
| `backend-static` | Prettier, ESLint, `tsc --noEmit`, `dependency-cruiser`, `prisma format`, `prisma validate` | — | pesado (paths) | REQ-05 |
| `backend-test` | Vitest con cobertura | — | pesado (paths) | REQ-05 |
| `integration` | Service container + roles + migraciones + Supertest + `pg-boss` | — | pesado (paths) | REQ-06 |
| `build-smoke` | Smoke de build | — | pesado (paths) | REQ-07 |
| `security` | Trivy | — | siempre | REQ-07, REQ-08 |
| `docs` | Gates documentales (Python 3.12) | — | siempre | REQ-07 |
| `quality-gate` | Cierre obligatorio | todos los requeridos | `always()` | REQ-01 |

---

### 2.3 `ServiceContainer` — `postgres:18` **[N]**

| Campo | Tipo | Obligatorio | Valor | Notas |
|---|---|---|---|---|
| `image` | string | sí | `postgres:18@sha256:<digest>` | Fijado **por digest** (REQ-06) |
| `ports` | list<string> | sí | `["5432:5432"]` | — |
| `env.POSTGRES_USER` | string | sí | — | Rol/contenedor |
| `env.POSTGRES_PASSWORD` | string | sí | — | Desde `secrets`/`vars`; nunca en claro |
| `env.POSTGRES_DB` | string | sí | — | Base de pruebas |
| `options` | string | sí | `--health-cmd "pg_isready"` | Healthcheck con intervalos |

**Datos derivados (semilla de esquema):** los **cuatro roles** se crean con `infra/postgres/init/001_roles.sql` **[E]**; las migraciones se corren **desde cero** con el rol migrador (DEC-198, DEC-200).

---

### 2.4 `Artifact` **[N]** (salida efímera con retención)

| Campo | Tipo | Obligatorio | Enum | Default | Notas |
|---|---|---|---|---|---|
| `name` | string | sí | — | — | p.ej. `flutter-lcov`, `backend-coverage`, `test-results` |
| `path` | glob | sí | — | — | `coverage/lcov.info`, etc. |
| `retention-days` | integer | sí | — | `30` | Retención declarada (REQ-08, CA-9) |
| `if-no-files-found` | enum | no | `warn`\|`error`\|`ignore` | `warn` | — |

---

### 2.5 `Ruleset` — protección de `main` **[N]**

| Campo | Tipo | Obligatorio | Enum / valor | Notas |
|---|---|---|---|---|
| `name` | string | sí | — | p.ej. `protect-main` |
| `target` | enum | sí | `branch` | — |
| `enforcement` | enum | sí | `active` | — |
| `conditions.ref_name.include` | list | sí | `["refs/heads/main"]` | — |
| `rules` | list<Rule> | sí | ver desglose | REQ-09 |

Desglose de `rules` (todas **[N]**, config de repo — no filas de BD):

| Rule | Parámetros | Efecto |
|---|---|---|
| `pull_request` | `required_approving_review_count=1`, `require_code_owner_review=true`, `dismiss_stale_reviews=true`, `require_conversation_resolution=true` | PR obligatorio, aprobación distinta del último autor, `CODEOWNERS`, invalidación de aprobaciones, conversaciones resueltas |
| `required_status_checks` | `["quality-gate", "contract"]` | Checks obligatorios (REQ-01, REQ-03) |
| `non_fast_forward` | — | Sin force-push |
| `deletion` | — | Sin borrado |
| `required_linear_history` | — | Squash / historia lineal |

`bypass_actors` (list, no obligatorio): vacío salvo excepción explícita.

---

### 2.6 `Summary` **[N]**

Agregado de solo lectura compuesto en un único job/summary, sin persistencia propia:

| Campo | Tipo | Origen | REQ |
|---|---|---|---|
| `flutter_coverage_pct` | number | LCOV de `flutter-test` | REQ-10 |
| `backend_coverage_pct` | number | cobertura Vitest | REQ-10 |
| `lcov_links` | list<url> | artifacts | REQ-10, CA-8 |
| `job_durations` | map<job_id, duration> | métricas de la ejecución | REQ-10 |
| `budgets` | map | medición tecnologia/18 §11 | REQ-10 |

---

## 3. Índices, claves y filtros

No hay índices de base de datos. Equivalen a claves de acceso y filtros del workflow:

| Clave / índice | Tipo | Definición | Propósito |
|---|---|---|---|
| `concurrency.group` | clave de exclusión | `ci-pr-<PR#>` | Serializa por PR; habilita `cancel-in-progress` (REQ-01) |
| `check name` | clave de gate | `quality-gate`, `contract` | Únicos checks requeridos por el ruleset |
| `paths` / `paths-ignore` | filtro | solo en jobs pesados (`integration`, `build-smoke`, Flutter, backend) | PR de solo `docs/` omite pesados sin dejar `quality-gate` pendiente (CA-3, QA-00-09-03) |
| `artifact.name` | clave de recuperación | único por job | Enlaces del summary y descarga de evidencia |
| `workflow_call` | clave de reuso | `contract.yml` | Evita duplicar el gate de contrato (REQ-03) |

Regla de índices: el filtro por ruta **nunca** se aplica a `quality-gate` ni a `metadata`; `quality-gate` usa `if: always()` y no depende de filtros (REQ-01).

---

## 4. Relaciones

```
Workflow ci-pr.yml 1 ──< Job                (jobs map; 11 instancias)
Job 0..1 ──< ServiceContainer               (solo integration → postgres:18)
Job 1 ──< Step>                             (pasos internos)
Job 1 ──< Artifact (0..n)                   (flutter-test, backend-test, ...)
Job(contract) ──▶ Workflow contract.yml     (uses: workflow_call; HU-00-08 [E])
Job(quality-gate) ──needs──▶ {jobs requeridos}   (FK de cierre; falla si alguno no terminó OK)
Job(docs) ──usa──▶ scripts de gate documental [E] (build_*.py, check_citas.py, ...)
Ruleset main ──required_status_checks──▶ {quality-gate, contract}
Summary ──agrega──▶ {flutter_coverage, backend_coverage, durations, budgets}
```

Dependencias externas (no modeladas aquí, citadas como consumidoras): HU-00-10/11/12/14/16 consumen los jobs y artifacts de este workflow.

---

## 5. Estados y enums

| Enum | Valores | Uso |
|---|---|---|
| `conclusion` (job/check) | `success`, `failure`, `cancelled`, `skipped`, `timed_out`, `neutral`, `action_required` | `quality-gate` falla si un requerido ∈ {`failure`, `cancelled`, `timed_out`, `action_required`} o no concluido (REQ-01) |
| `status` (run) | `queued`, `in_progress`, `completed` | — |
| `if-no-files-found` | `warn`, `error`, `ignore` | Artifacts |
| `enforcement` (ruleset) | `active`, `evaluate`, `disabled` | Protección de `main` |
| `permissions` (scope) | `read`, `write`, `none` | Mínimos por job (REQ-08) |

---

## 6. Activos existentes reutilizados (sin cambios de contrato)

| Activo | Tipo | Uso en el ticket |
|---|---|---|
| `.github/workflows/contract.yml` | workflow **[E]** | Gate de contrato (HU-00-08), REQ-03 |
| `infra/postgres/init/001_roles.sql` | script de esquema **[E]** | Creación de los cuatro roles en `integration` (REQ-06) |
| Gates documentales (`build_fichas.py`, `build_manual_y_personalidad.py`, `build_signos.py`, `build_result_catalog.py`, `check_citas.py`, `check_cobertura.py`, `check_backlog.py`, `unittest discover`) | scripts **[E]** | Job `docs` (REQ-07); HU-00-16 los amplía |
| API `saludVivo`, `saludListo` | endpoints **[E]** | Supertest de salud en `integration` (REQ-06) |

---

## 7. Notas de migración

1. **Sin migración de base de datos.** No hay tablas, columnas ni seeds nuevos. El único contacto con PostgreSQL es efímero (`postgres:18` de servicio) y usa el `init` existente.
2. **Alta de configuración de repositorio (reversible).** El ruleset de `main` (§2.5) se aplica por API de GitHub, no por archivo versionado; su reversión es desactivar la rule. Orden seguro: crear el workflow → obtener un run verde → recién entonces agregar `quality-gate`/`contract` como checks requeridos, para no bloquear `main` antes del primer verde.
3. **Fijado por digest/SHA.** `postgres:18@sha256:…` y cada action por SHA completo: actualizarlos es una migración explícita de versión (cambio de digest en el YAML), auditable en el diff.
4. **Toolchain fijado.** Python 3.12 (DEC-230), FVM, `.nvmrc`, Java 17 y `--frozen-lockfile` se leen de archivos versionados **[E]**; desviarlos rompe `metadata` (coherencia de lockfiles, REQ-02).
5. **Umbrales como contrato.** Cobertura backend ≥ 80 % (Vitest) y `diff-cover` Flutter ≥ 80 % de líneas nuevas/modificadas (DEC-230) son parámetros del modelo; bajarlos es cambio de contrato, no de configuración.
6. **Rollback** (según handoff): retirar temporalmente el check obligatorio y revertir `ci-pr.yml` al último SHA verde, conservando logs del fallo; no omitir gates silenciosamente.

---

## 8. Trazabilidad REQ → objeto

| REQ | Objeto(s) del modelo |
|---|---|
| REQ-01 | `Workflow.on`, `concurrency`, `quality-gate` (`needs` + `if: always()`), filtros de ruta |
| REQ-02 | `Job(metadata)` |
| REQ-03 | `Job(contract)` → `contract.yml` **[E]** |
| REQ-04 | `Job(flutter-static)`, `Job(flutter-test)` + `Artifact(flutter-lcov)` |
| REQ-05 | `Job(backend-static)`, `Job(backend-test)` + umbral 80 % |
| REQ-06 | `Job(integration)` + `ServiceContainer` + `001_roles.sql` **[E]** |
| REQ-07 | `Job(build-smoke)`, `Job(security)`, `Job(docs)` + scripts **[E]** + Python 3.12 |
| REQ-08 | `Workflow.permissions` + `Job.permissions` + `Artifact.retention-days=30` + actions por SHA |
| REQ-09 | `Ruleset` de `main` |
| REQ-10 | `Summary` |