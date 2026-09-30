---
id: TAO-166-SPEC
project: taomangalam
ticket: TAO-166
status: approved
---

# HU-00-10 · Workflows de main, nightly, CodeQL y Dependabot con Actions fijadas por SHA y permisos mínimos

## Resumen ejecutivo

Se crean main.yml (en push a main repite los gates y publica en el summary el SHA candidato, la versión y los enlaces a artifacts), nightly.yml (programado y despachable: suite completa sin filtros, builds Android e iOS Simulator y auditoría de dependencias), codeql.yml (JavaScript/TypeScript y Actions) y .github/dependabot.yml (semanal, agrupando parches sin auto-merge de mayores, toolchain, Prisma, seguridad, plugins nativos ni Actions), más un verificador en el job metadata que exige todo `uses:` fijado a SHA completo y todo job con `permissions`. Además se apaga el modo transitorio STAGING_ALLOW_MISSING_MAIN de HU-00-14 para que ci-green vuelva a exigir main.yml verde (fail-closed), con tests y docs actualizados. NO se hace release.yml/firma/producción (EP-17), ni despliegue a staging (HU-00-14), ni secret scanning/push protection. Se valida observando los runs verdes de main y nightly, los resultados de CodeQL en la pestaña de seguridad, el primer PR agrupado de Dependabot y metadata fallando nombrando archivo y línea ante un `uses:` sin SHA o un job sin `permissions`. Tamaño: 3 puntos; cabe en 3 sesiones.

## Requirements

### REQ-01 `inferred`
> Fuente: .github/workflows/deploy-staging.yml:103

Existe `.github/workflows/main.yml` que, en cada push a `main`, repite los gates necesarios (reutilizándolos, no copiándolos) y registra en el run summary el SHA candidato, la versión y los enlaces a los artifacts.

### REQ-02 `inferred`
> Fuente: docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:971

Existe `.github/workflows/nightly.yml` base, disparable por `schedule` y por `workflow_dispatch`, que corre la suite completa sin filtros de ruta, el build Android, el build iOS Simulator y la auditoría de dependencias, y queda estructurado para sumar escenarios futuros.

### REQ-03 `inferred`
> Fuente: docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md:350

Existe `.github/workflows/codeql.yml` que analiza JavaScript/TypeScript y workflows de Actions, con permisos mínimos, y publica sus resultados en la pestaña de seguridad.

### REQ-04 `inferred`
> Fuente: docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1066

Existe `.github/dependabot.yml` semanal que revisa npm/pnpm (raíz y `server/`), `pub` (`app/` y `app/widgetbook/`) y `github-actions`, agrupa parches compatibles y no auto-fusiona mayores, toolchain, Prisma, seguridad, plugins nativos ni Actions.

### REQ-05 `inferred`
> Fuente: .github/workflows/ci-pr.yml:144

El job `metadata` ejecuta una verificación automática que exige que todo `uses:` esté fijado a un SHA completo y que todo job declare `permissions`, y falla nombrando el archivo y la línea del incumplimiento.

### REQ-06 `confirmed`
> Fuente: scripts/ci/staging-deploy-guards.sh:296

Se apaga el modo transitorio de HU-00-14: `.github/workflows/deploy-staging.yml` deja de definir `STAGING_ALLOW_MISSING_MAIN` y `scripts/ci/staging-deploy-guards.sh` elimina `--allow-missing-main`, su default ON y el fallback de ausencia de `main.yml`, de modo que `ci-green` exige `main.yml` verde (fail-closed); se actualizan tests y documentación que describían el modo transitorio.

### REQ-07 `confirmed` `enforcement`
> Fuente: scripts/ci-pr-metadata.sh:1

La lógica de las guardas y del verificador vive en scripts de `scripts/` ejecutables en local (patrón `scripts/ci-pr-metadata.sh` y `scripts/ci/staging-deploy-guards.sh`), y los workflows solo los invocan.

### REQ-08 `confirmed` `enforcement`
> Fuente: .github/workflows/ci-pr.yml:172

`main.yml` reutiliza los gates existentes (reusable workflows / `workflow_call`, patrón del job `contract` en ci-pr.yml) en lugar de duplicar sus pasos.
## Tasks

#### S1.T1 — Crear `.github/workflows/main.yml`: en push a main reutiliza los gates existentes (workflow_call) sin duplicarlos y publica en el summary el SHA candidato, la versión y los enlaces a artifacts.
Contrato: rollback: Borrar `.github/workflows/main.yml`.. Status: done

#### S1.T1.1 — Definir `on: push: branches: [main]` y `permissions` mínimos; referenciar los gates existentes por reusable workflow (patrón del job `contract` en ci-pr.yml) sin copiar pasos.
Contrato: rollback: Borrar `.github/workflows/main.yml`.. Status: done

#### S1.T1.2 — publicar en `$GITHUB_STEP_SUMMARY` el SHA candidato leyendo el contexto `github.sha`, la version (git describe) y los enlaces a los artifacts del run
Contrato: rollback: Quitar el paso de summary de `main.yml`.. Status: done

#### S1.T2 — Apagar el modo transitorio de HU-00-14: quitar `STAGING_ALLOW_MISSING_MAIN` de `.github/workflows/deploy-staging.yml` y el `--allow-missing-main` / default ON y el fallback de ausencia de main.yml en `scripts/ci/staging-deploy-guards.sh`; `ci-green` fail-closed.
Contrato: rollback: Revertir `deploy-staging.yml` y `staging-deploy-guards.sh` a la última configuración aprobada (con el modo transitorio).. Status: done

#### S1.T2.1 — En `.github/workflows/deploy-staging.yml` quitar `STAGING_ALLOW_MISSING_MAIN` de los dos pasos que corren `ci-green`.
Contrato: rollback: Restaurar las dos variables en `deploy-staging.yml`.. Status: done

#### S1.T2.2 — En `scripts/ci/staging-deploy-guards.sh` quitar el flag `--allow-missing-main`, su default ON y el fallback `missing-main`; `ci-green` exige `main.yml` verde.
Contrato: rollback: Restaurar el flag, su default ON y el fallback en el script.. Status: done

#### S1.T3 — Actualizar `tests/test_staging_deploy_guards.py` y `docs/development/release-runbook.md` al comportamiento fail-closed y agregar un test que parsee `main.yml` (trigger push:main y paso de summary).
Contrato: rollback: Revertir los cambios en tests y docs.. Status: done

#### S2.T1 — Crear `.github/workflows/nightly.yml` (schedule + workflow_dispatch): suite completa sin filtros de ruta, build Android, build iOS Simulator y auditoría de dependencias, listo para sumar escenarios futuros.
Contrato: rollback: Borrar `.github/workflows/nightly.yml`.. Status: done

#### S2.T1.1 — Definir triggers `schedule` (cron) y `workflow_dispatch`, sin filtros de ruta.
Contrato: rollback: Borrar `.github/workflows/nightly.yml`.. Status: done

#### S2.T1.2 — Job de suite completa (sin filtros de ruta) y job de auditoría de dependencias.
Contrato: rollback: Quitar los jobs de suite y auditoría de `nightly.yml`.. Status: done

#### S2.T1.3 — Job de build Android y job de build iOS Simulator.
Contrato: rollback: Quitar los jobs de build de `nightly.yml`.. Status: done

#### S2.T2 — Crear `.github/workflows/codeql.yml` para JavaScript/TypeScript y acciones de Actions, con permisos mínimos y publicación en la pestaña de seguridad.
Contrato: rollback: Borrar `.github/workflows/codeql.yml`.. Status: done

#### S2.T2.1 — Configurar la matriz de lenguajes `javascript-typescript` y `actions` (sin Dart).
Contrato: rollback: Quitar `codeql.yml`.. Status: done

#### S2.T2.2 — Definir triggers (push a main + schedule) y permisos mínimos, incluyendo `security-events: write`.
Contrato: rollback: Quitar `codeql.yml`.. Status: done

#### S2.T3 — Test que parsea `nightly.yml` y `codeql.yml` validando triggers, jobs de build y lenguajes (patrón `tests/test_ci_pr_metadata_job.py`).
Contrato: rollback: Revertir el test agregado.. Status: done

#### S3.T1 — Crear `.github/dependabot.yml` semanal: npm/pnpm (raíz y `server/`), `pub` (`app/` y `app/widgetbook/`) y `github-actions`, con grupos de parches compatibles y sin auto-merge de mayores, toolchain, Prisma, seguridad, plugins nativos ni Actions.
Contrato: rollback: Borrar `.github/dependabot.yml`.. Status: done

#### S3.T2 — Crear el verificador de SHA y `permissions` en `scripts/ci/` y cablearlo al job `metadata` de ci-pr.yml (patrón `scripts/ci-pr-metadata.sh`, ejecutable en local).
Contrato: rollback: Quitar el script y el paso del job `metadata`.. Status: done

#### S3.T2.1 — Script `scripts/ci/check-workflow-pins.sh`: recorre `.github/workflows/*.yml` y falla nombrando archivo y línea si un `uses:` no es SHA completo o un job no declara `permissions` (acepta workflows locales `./`).
Contrato: rollback: Borrar `scripts/ci/check-workflow-pins.sh`.. Status: done

#### S3.T2.2 — Cablear el script al job `metadata` de `.github/workflows/ci-pr.yml`.
Contrato: rollback: Quitar el paso del job `metadata`.. Status: done

#### S3.T3 — Tests unitarios del verificador con workflows de ejemplo válidos e inválidos y test de coherencia de `.github/dependabot.yml`.
Contrato: rollback: Revertir los tests agregados.. Status: done
## Enmiendas (refine_spec)

### Enmienda 1

**Task ops:**

- edit S1.T1.2 { desc="publicar en `$GITHUB_STEP_SUMMARY` el SHA candidato leyendo el contexto `github.sha`, la version (git describe) y los enlaces a los artifacts del run" }

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T3

**Gate (auto)**: Al mergear a main, el run `main` queda verde con el SHA candidato, la versión y los enlaces a artifacts en su summary; y `ci-green` de staging ya no acepta la ausencia de main.yml (falla cerrado).

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T2
- [x] S2.T2.1
- [x] S2.T2.2
- [x] S2.T3

**Gate (auto)**: Un despacho manual de `nightly.yml` termina verde ejecutando la suite completa y los builds Android e iOS Simulator; CodeQL publica resultados de JS/TS y Actions en la pestaña de seguridad.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T2.1
- [x] S3.T2.2
- [x] S3.T3

**Gate (auto)**: Dependabot abre un PR semanal agrupado de parches sin auto-merge de mayores; el job `metadata` falla nombrando archivo y línea si un `uses:` no está fijado a SHA o un job no declara `permissions`.
