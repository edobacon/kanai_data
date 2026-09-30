# Modelo de datos — TAO-166 / HU-00-10

## 1. Naturaleza del cambio

Este ticket es de infraestructura CI/CD (GitHub Actions). **No introduce capa de persistencia, entidades de dominio ni API**; la referencia canónica declara `Datos: ninguno` y `Diseño: no aplica`.

Por lo tanto, el «modelo de datos afectado» se modela sobre las **entidades de configuración declarativa** que son fuente de verdad versionada del pipeline: workflows, configuración de Dependabot, scripts de guarda y activos/documentos que los describen. Se documentan con sus campos, obligatoriedad, valores permitidos (enums), invariantes (que cumplen el rol de índices/constraints) y relaciones.

## 2. Inventario de entidades

| # | Entidad | Archivo | Estado | Persistencia |
|---|---------|---------|--------|--------------|
| E1 | Workflow `main` | `.github/workflows/main.yml` | **Nuevo** | Git (YAML) |
| E2 | Workflow `nightly` | `.github/workflows/nightly.yml` | **Nuevo** | Git (YAML) |
| E3 | Workflow `codeql` | `.github/workflows/codeql.yml` | **Nuevo** | Git (YAML) |
| E4 | Config Dependabot | `.github/dependabot.yml` | **Nuevo** | Git (YAML) |
| E5 | Verificador de pin/permissions | `scripts/ci/*` (invocado por `metadata`) | **Nuevo** | Git (script) |
| E6 | Workflow `deploy-staging` | `.github/workflows/deploy-staging.yml` | Existente (modificado) | Git (YAML) |
| E7 | Guarda `staging-deploy-guards` | `scripts/ci/staging-deploy-guards.sh` | Existente (modificado) | Git (script) |
| E8 | Tests de guardas | `tests/test_staging_deploy_guards.py` | Existente (modificado) | Git (Python) |
| E9 | Runbook de release | `docs/development/release-runbook.md` | Existente (modificado) | Git (Markdown) |
| E10 | Gate reusable de CI | `.github/workflows/ci-pr.yml` (`workflow_call`) | Existente (referenciado) | Git (YAML) |

## 3. E1–E3, E6 — Entidad `Workflow`

| Campo | Tipo | Obligatorio | Enum / Formato | Default | FK |
|-------|------|-------------|----------------|---------|----|
| `path` | string | sí | ruta relativa única `.github/workflows/*.yml` | — | — |
| `name` | string | sí | — | — | — |
| `on.push.branches` | array\<string\> | E1: sí | p. ej. `["main"]` | — | — |
| `on.schedule` | array\<{cron}\> | E2: sí | cron válido | — | — |
| `on.workflow_dispatch` | object\|null | E2: sí | — | `{}` | — |
| `on.workflow_call` | object\|null | E10: sí | — | — | — |
| `on.pull_request` | object\|null | E6: sí | — | — | — |
| `permissions` | `PermissionsBlock` | sí (nivel raíz o por job) | — | `{}` (deny by default) | — |
| `concurrency` | object\|null | no | — | — | — |
| `jobs` | map\<string, `Job`\> | sí | claves únicas | — | → `Job` |

**Invariantes (rol de índice/constraint)**
- `path` es clave única lógica del repositorio (no puede existir dos workflows con la misma ruta).
- Todo workflow debe declarar `permissions` a nivel raíz **o** cada job debe declarar el suyo (REQ-05).
- E1 reutiliza gates vía `workflow_call` (E10); no duplica pasos (REQ-08).

## 4. Entidad `Job` (anidada en `Workflow.jobs`)

| Campo | Tipo | Obligatorio | Enum / Formato | Default | FK |
|-------|------|-------------|----------------|---------|----|
| `id` | string | sí | clave del map, único en el workflow | — | — |
| `runs-on` | string \| expression | sí | runner o matriz | — | — |
| `permissions` | `PermissionsBlock` | sí | — | heredado del root (si existe) | — |
| `uses` | string \| null | condicional | `owner/repo/path@<SHA40>` | — | → workflow reusable (E10) |
| `needs` | array\<string\> | no | ids de otros jobs | `[]` | → `Job.id` |
| `if` | string \| null | no | expresión | — | — |
| `steps` | array\<`Step`\> | sí si no hay `uses` | — | — | → `Step` |
| `strategy.matrix` | object\|null | no | — | — | — |

**Invariante**: `uses` de job (workflow reusable) también debe estar fijado a SHA completo.

## 5. Entidad `Step`

| Campo | Tipo | Obligatorio | Enum / Formato | Default |
|-------|------|-------------|----------------|---------|
| `name` | string | no | — | — |
| `uses` | string \| null | condicional | `owner/repo@<SHA40>` (40 hex) | — |
| `run` | string \| null | condicional | comando shell | — |
| `with` | map\<string,string\> | no | — | — |
| `env` | map\<string,string\> | no | — | — |

**Invariante crítica (REQ-05, QA-00-10-02)**: si `uses` está presente y referencia una Action de terceros/`actions/*`, el sufijo debe ser un SHA completo de 40 caracteres hexadecimales. Se rechazan tags (`@v4`), ramas y SHAs cortos. Excepción: `uses: ./local-action` (ruta local).

## 6. Entidad `PermissionsBlock`

| Campo | Tipo | Obligatorio | Enum / Formato | Default |
|-------|------|-------------|----------------|---------|
| `<scope>` | enum | no | `read` \| `write` \| `none` | `none` |
| scopes conocidos | — | — | `contents`, `actions`, `security-events`, `packages`, `pull-requests`, `id-token`, `checks` | — |

**Invariante**: principio de mínimo privilegio. E3 (`codeql`) requiere `security-events: write`; `main`/`nightly` deben operar en `read` salvo lo estrictamente necesario para subir artifacts.

## 7. E4 — Entidad `DependabotConfig` (`.github/dependabot.yml`)

| Campo | Tipo | Obligatorio | Enum / Formato | Default |
|-------|------|-------------|----------------|---------|
| `version` | integer | sí | `2` | — |
| `updates` | array\<`DependabotUpdate`\> | sí | — | — |

### Entidad `DependabotUpdate`

| Campo | Tipo | Obligatorio | Enum / Formato | Default | FK |
|-------|------|-------------|----------------|---------|----|
| `package-ecosystem` | enum | sí | `npm` \| `pub` \| `github-actions` | — | — |
| `directory` | string | sí | — | — | → ruta de manifiesto |
| `schedule.interval` | enum | sí | `daily` \| `weekly` \| `monthly` | — | — |
| `groups` | map\<string, `DependabotGroup`\> | sí (para parches) | — | — | → `DependabotGroup` |
| `ignore` | array\<{dependency-name, update-types}\> | sí | — | `[]` | — |
| `open-pull-requests-limit` | integer | no | ≥ 0 | `5` | — |
| `labels` | array\<string\> | no | — | — | — |
| `automerge` | boolean | no | **siempre `false`** | `false` | — |

**Filas obligatorias (valor canónico del ticket)**

| `package-ecosystem` | `directory` |
|---------------------|-------------|
| `npm` | `/` |
| `npm` | `/server` |
| `pub` | `/app` |
| `pub` | `/app/widgetbook` |
| `github-actions` | `/` |

### Entidad `DependabotGroup`

| Campo | Tipo | Obligatorio | Enum / Formato | Default |
|-------|------|-------------|----------------|---------|
| `patterns` | array\<string\> | sí | globs de dependencias | — |
| `update-types` | array\<enum\> | sí | `patch` \| `minor` \| `major` | `["patch"]` (parches compatibles) |

**Invariantes (REQ-04)**
- `schedule.interval = weekly` para todas las filas.
- Se agrupan parches compatibles (`update-types: ["patch"]`).
- Sin automerge de **mayores, toolchain, Prisma, seguridad, plugins nativos ni `github-actions`** (estos últimos se cubren con `ignore` o quedan fuera de grupo sin automerge). Ver DEC-198.

**Clave única lógica**: `(package-ecosystem, directory)`.

## 8. E5 / E7 — Entidades `VerifierRule` y `GuardFlag`

### `VerifierRule` (verificación en el job `metadata`, REQ-05/REQ-07)

| Campo | Tipo | Obligatorio | Enum | Default |
|-------|------|-------------|------|---------|
| `rule` | enum | sí | `uses-sha-pinned` \| `job-permissions` | — |
| `severity` | enum | sí | `error` (bloqueante) | `error` |
| `target` | string | sí | ruta del workflow | — |
| `line` | integer | sí | línea del incumplimiento | — |
| `message` | string | sí | nombra archivo y línea | — |

**Salida/contrato**: exit code ≠ 0 si hay ≥ 1 violación; mensaje con `archivo:línea`. Debe residir en `scripts/` y ser ejecutable en local (patrón `scripts/ci-pr-metadata.sh`), con los workflows solo invocándolo (REQ-07).

### `GuardFlag` (E7, HU-00-14 — **a eliminar**)

| Campo | Tipo | Estado | Notas |
|-------|------|--------|-------|
| `STAGING_ALLOW_MISSING_MAIN` | env bool | **Eliminado** | Quitar de `.github/workflows/deploy-staging.yml` |
| `--allow-missing-main` | flag CLI | **Eliminado** | Default ON y fallback asociado en `staging-deploy-guards.sh` |
| `ci-green` | guarda | Existente (endurecida) | Pasa a exigir `main.yml` verde, **fail-closed** |

**Invariante post-cambio (REQ-06)**: la guarda `ci-green` no acepta ausencia de `main.yml`; si falta o está rojo, falla. Sin excepción transitoria.

## 9. Relaciones

| Origen | Relación | Destino | Cardinalidad | Regla |
|--------|----------|---------|--------------|-------|
| E1 `main` | `workflow_call` → | E10 gate reusable | N:1 por gate | Reutiliza, no duplica (REQ-08) |
| E1 `main` | registra en summary | SHA candidato + versión + artifacts | 1:N | Consumido por HU-00-14 |
| E2 `nightly` | deja placeholders | escenarios futuros (E2E, tablero, perf, offline, respaldo) | 1:N | HU-00-16 enlaza resultados |
| E6 `deploy-staging` | depende de | E1 `main` (guard `ci-green`) | 1:1 fail-closed | Antes: fallback transitorio |
| E5 verificador | inspecciona | E1,E2,E3,E6 (`uses:` y `permissions`) | 1:N | Corre en job `metadata` |
| E4 cada `DependabotUpdate` | apunta a | directorio de manifiesto | 1:1 | npm/pub/actions |
| E8 tests | cubren | E7 guardas | N:1 | Actualizan el modo transitorio |
| E9 runbook | documenta | E6, E7 y el nuevo E1 | N:1 | Deja de describir modo transitorio |

## 10. Índices / constraints (equivalencias)

No hay índices de base de datos. Las restricciones se materializan como:

| Tipo | Definición | Enforcement |
|------|------------|-------------|
| Único | `Workflow.path` | Git (una ruta = un archivo) |
| Único | `DependabotUpdate.(package-ecosystem, directory)` | Schema de GitHub |
| Check | Todo `Step.uses`/`Job.uses` con Action remota → SHA40 | E5 (QA-00-10-02) |
| Check | Todo `Job` declara `permissions` | E5 |
| Check | `automerge = false` en todas las filas | Revisión + config |
| Fail-closed | `ci-green` exige `main.yml` verde | E7 |

## 11. Notas de migración

1. **Sin migración de datos**: no hay esquema, tablas ni colecciones que migrar; solo cambios de archivos versionados en Git.
2. **Orden de aplicación** (por dependencia funcional):
   1. E5 (verificador) + sus tests → habilita `metadata`.
   2. E1 `main` (reutilizando E10) → habilita el SHA candidato (desbloquea HU-00-14).
   3. E6 + E7 + E8 + E9: **apagar el modo transitorio** de HU-00-14 (`STAGING_ALLOW_MISSING_MAIN`, `--allow-missing-main`, fallback) en el mismo cambio en que `main.yml` ya existe, para no romper `ci-green`.
   4. E2 `nightly` y E3 `codeql` (independientes).
   5. E4 Dependabot (independiente).
3. **Compatibilidad / rollback**: deshabilitar los workflows nuevos y volver a la última configuración aprobada **sin ampliar permisos ni dejar actualizaciones parciales**. El apagado del modo transitorio es reversible, pero no debe reintroducirse la excepción como permanente.
4. **Riesgo de regresión**: reactivar `STAGING_ALLOW_MISSING_MAIN` dejaría `ci-green` abierto; el orden 3 evita la ventana sin `main.yml`.
5. **Fuera de alcance de este modelo**: `release.yml`, firma y producción (EP-17); despliegue a staging (HU-00-14); secret scanning y push protection (depende del plan de GitHub, tecnologia/17 §14).

## 12. Resumen nuevo vs existente

- **Nuevo**: E1 `main.yml`, E2 `nightly.yml`, E3 `codeql.yml`, E4 `dependabot.yml`, E5 verificador SHA/`permissions`.
- **Existente modificado**: E6 `deploy-staging.yml`, E7 `staging-deploy-guards.sh`, E8 `test_staging_deploy_guards.py`, E9 `release-runbook.md`.
- **Existente reutilizado (sin cambios de esquema)**: E10 `ci-pr.yml` vía `workflow_call`.