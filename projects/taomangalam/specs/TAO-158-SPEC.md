---
id: TAO-158-SPEC
project: taomangalam
ticket: TAO-158
status: approved
---

# HU-00-09 · Workflow de PR `ci-pr.yml`: jobs paralelos por tecnologia/17 §8, PostgreSQL 18 de servicio, cobertura publicada y `quality-gate` obligatorio en `main`

## Resumen ejecutivo

Se construye `.github/workflows/ci-pr.yml`: jobs paralelos (metadata, contract, flutter-static, flutter-test, backend-static, backend-test, integration, build-smoke, security, docs) con PostgreSQL 18 de servicio, cobertura publicada (LCOV + diff-cover para Flutter, Vitest para backend) y cierre en el job `quality-gate`, obligatorio en `main`. NO se incluye `main.yml`/`nightly.yml`/CodeQL/Dependabot (HU-00-10), APK/iOS (HU-00-11), Widgetbook (HU-00-12), MkDocs y gates documentales nuevos (HU-00-16) ni `release.yml` (EP-17). Se verifica observando corridas reales: un PR limpio deja todo verde, un PR que rompe formato Dart/tipado TS/contrato/migración pone el job correspondiente y `quality-gate` en rojo, un PR solo de `docs/` omite los jobs pesados y deja `quality-gate` verde, y un segundo push cancela la corrida anterior. Tamaño estimado: 4 sesiones (T2, T2, T3, T1). ADVERTENCIA: pendiente externo `confirmar el plan de GitHub disponible` (tecnologia/17 §14) que no bloquea redactar pero sí iniciar; la aplicación del ruleset puede requerir permisos de administrador del repo.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/.github/workflows/contract.yml:6

`.github/workflows/ci-pr.yml` se dispara en cada PR hacia `main`, cancela ejecuciones obsoletas del mismo PR (concurrency con cancel-in-progress), aplica filtros de ruta solo a los jobs pesados y cierra con el job `quality-gate` que corre siempre (`if: always()`) y falla si un job requerido falló, fue cancelado o no terminó correctamente.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:938

El job `metadata` valida rutas, títulos, archivos prohibidos (`.env`, certificados) y coherencia de lockfiles; un PR que agrega un `.env` o un certificado falla.

### REQ-03 `confirmed`
> Fuente: taomangalam/.github/workflows/contract.yml:1

El job `contract` integra en `ci-pr.yml` el gate de contrato existente (HU-00-08, `.github/workflows/contract.yml`) preservando su resultado y su redondez como check requerido.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:115

Los jobs Flutter corren en paralelo: `flutter-static` (analyze y check de formato con toolchain FVM y caché de pub) y `flutter-test` con `flutter test --coverage`, LCOV procesado con `lcov` y `diff-cover`, que falla si las líneas nuevas o modificadas cubren menos del 80% (DEC-230).

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:117

Los jobs backend corren en paralelo: `backend-static` (Prettier, ESLint, `tsc --noEmit`, `dependency-cruiser`, `prisma format` y `prisma validate`) y `backend-test` (Vitest con cobertura), con umbral de cobertura de líneas del backend no inferior al 80%.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:115

El job `integration` usa el service container `postgres:18` fijado por digest, crea los cuatro roles con `infra/postgres/init/001_roles.sql`, corre las migraciones desde cero con el rol migrador y ejercita Supertest de salud (`saludVivo`, `saludListo`) y `pg-boss` real (DEC-198, DEC-200).

### REQ-07 `confirmed`
> Fuente: taomangalam/CONTRIBUTING.md:28

Los jobs `build-smoke`, `security` (Trivy) y `docs` corren con los gates documentales existentes (`build_fichas.py --check`, `build_manual_y_personalidad.py --check`, `build_signos.py --check`, `build_result_catalog.py --check`, `check_citas.py`, `check_cobertura.py`, `unittest discover -s tests`, `check_backlog.py`) sobre Python 3.12 fijado.

### REQ-08 `confirmed`
> Fuente: taomangalam/.github/workflows/contract.yml:6

Cadena de suministro y permisos: actions fijadas por SHA completo, `permissions` mínimos por job, PR de forks sin secretos y artifacts de pruebas/cobertura retenidos 30 días.

### REQ-09 `confirmed`
> Fuente: taomangalam/CONTRIBUTING.md:28

El ruleset de `main` exige PR obligatorio, una aprobación distinta del último autor, `CODEOWNERS`, invalidación de aprobaciones, conversaciones resueltas, `quality-gate` como check requerido, historia lineal con squash y sin force-push ni borrado (tecnologia/17 §2).

### REQ-10 `inferred`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1068

El summary único del workflow reporta el porcentaje de cobertura de Flutter y backend, enlaces a los LCOV, la duración de los jobs y la medición de los presupuestos de tecnologia/18 §11.
## Tasks

#### S1.T1 — Crear `.github/workflows/ci-pr.yml` con trigger en `pull_request` hacia `main`, `concurrency` con `cancel-in-progress`, `permissions` base de solo lectura y el job agregador `quality-gate` (`if: always()`, `needs` de los jobs requeridos) que falla si un requerido falló, fue cancelado o no terminó; definir los filtros de ruta en los jobs pesados. Validación: `actionlint .github/workflows/ci-pr.yml` sin errores y corrida de un PR de prueba. Archivo: `.github/workflows/ci-pr.yml`.
Contrato: rollback: Eliminar `.github/workflows/ci-pr.yml` y, si estaba configurado, quitar `quality-gate` de los checks requeridos de `main`.. Status: done

#### S1.T2 — Agregar el job `metadata` que valida rutas, títulos, archivos prohibidos (`.env`, certificados) y coherencia de lockfiles. Validación: PR de prueba con y sin `.env`. Archivo: `.github/workflows/ci-pr.yml` (job `metadata`).
Contrato: rollback: Quitar el job `metadata` de `ci-pr.yml`.. Status: done

#### S1.T3 — Agregar el job `contract` que invoca el gate de contrato existente (HU-00-08, `.github/workflows/contract.yml`) dentro de `ci-pr` preservando su resultado. Validación: PR de prueba que rompe el contrato. Archivos: `.github/workflows/ci-pr.yml`, referencia a `.github/workflows/contract.yml`.
Contrato: rollback: Quitar el job `contract` de `ci-pr.yml` y dejar `contract.yml` como estaba.. Status: done

#### S1.T4 — Aplicar en todos los jobs de `ci-pr.yml` el fijado de actions por SHA completo, `permissions` mínimos por job, manejo de PRs de forks sin secretos y `retention-days: 30` en los `upload-artifact`. Validación: revisión estática (grep de `uses:` sin tag y de `permissions:`/`retention-days`). Archivo: `.github/workflows/ci-pr.yml`.
Contrato: rollback: Revertir a la versión previa del archivo de workflow.. Status: done

#### S1.T5 — Tests de regresión de la etapa: `actionlint` sobre el workflow y corridas de PR que cubren PR limpio (verde), PR con `.env` (metadata rojo), PR solo de `docs/` (pesados omitidos, `quality-gate` verde) y segundo push (cancelación). Validación: resultados de las corridas registrados. Archivo: `.github/workflows/ci-pr.yml`.
Contrato: rollback: No aplica (tarea de verificación sin cambios de producción); si falla, corregir el workflow.. Status: done

#### S2.T1 — Agregar `flutter-static`: analyze y check de formato con toolchain FVM, `flutter pub get` con lockfile y caché de pub. Validación: PR de prueba con formato Dart roto. Archivo: `.github/workflows/ci-pr.yml` (job `flutter-static`).
Contrato: rollback: Quitar el job `flutter-static` de `ci-pr.yml`.. Status: done

#### S2.T2 — Agregar `flutter-test` con `flutter test --coverage`, procesamiento del LCOV con `lcov` y `diff-cover` (falla bajo 80% de líneas nuevas/modificadas) y publicación del LCOV como artifact. Validación: PR de prueba con función Dart nueva sin pruebas. Archivo: `.github/workflows/ci-pr.yml` (job `flutter-test`).
Contrato: rollback: Quitar el job `flutter-test` de `ci-pr.yml`.. Status: done

#### S2.T3 — Agregar `backend-static` con Prettier, ESLint, `tsc --noEmit`, dependency-cruiser, `prisma format` y `prisma validate`, usando `pnpm install --frozen-lockfile` y Node desde `.nvmrc`. Validación: PR de prueba con error de tipos en `server/`. Archivo: `.github/workflows/ci-pr.yml` (job `backend-static`).
Contrato: rollback: Quitar el job `backend-static` de `ci-pr.yml`.. Status: done

#### S2.T4 — Agregar `backend-test` con Vitest y cobertura, con umbral no inferior al 80% de líneas y publicación del reporte de cobertura como artifact. Validación: PR de prueba con cobertura por debajo del umbral. Archivo: `.github/workflows/ci-pr.yml` (job `backend-test`).
Contrato: rollback: Quitar el job `backend-test` de `ci-pr.yml`.. Status: done

#### S2.T5 — Tests de regresión de la etapa: PRs de prueba que rompen formato Dart y tipado TS (jobs y `quality-gate` en rojo), función Dart sin pruebas (`diff-cover` falla) y verificación de artifacts de cobertura publicados. Validación: resultados de las corridas. Archivo: `.github/workflows/ci-pr.yml`.
Contrato: rollback: No aplica (tarea de verificación sin cambios de producción); si falla, corregir el workflow.. Status: done

#### S3.T1 — Job `integration` con PostgreSQL de servicio y migraciones desde cero: service container `postgres:18` fijado por digest con health checks, creación de los cuatro roles con `infra/postgres/init/001_roles.sql`, migraciones desde cero con el rol migrador, Supertest de salud (`saludVivo`, `saludListo`) y `pg-boss` real. Validación: PR de prueba con migración que no aplica desde cero. Archivos: `.github/workflows/ci-pr.yml` (job `integration`), `infra/postgres/init/001_roles.sql`.
Contrato: rollback: Quitar el job `integration` de `ci-pr.yml`; no toca la base local ni `infra/postgres/init/001_roles.sql`.. Status: done

#### S3.T1.1 — Definir el service container `postgres:18` fijado por digest con health checks y variables de conexión. Validación: el job arranca y conecta. Archivo: `.github/workflows/ci-pr.yml` (servicios del job `integration`).
Contrato: rollback: Quitar el bloque `services` del job `integration`.. Status: done

#### S3.T1.2 — Crear los cuatro roles de conexión ejecutando `infra/postgres/init/001_roles.sql` en el service container. Validación: los cuatro roles existen antes de migrar. Archivo: `.github/workflows/ci-pr.yml` (paso de roles) usando `infra/postgres/init/001_roles.sql`.
Contrato: rollback: Quitar el paso de creación de roles.. Status: done

#### S3.T1.3 — Correr las migraciones desde cero con el rol migrador y publicar el log de Prisma si falla. Validación: PR con migración rota muestra el log. Archivo: `.github/workflows/ci-pr.yml` (paso de migraciones).
Contrato: rollback: Quitar el paso de migraciones.. Status: done

#### S3.T1.4 — Ejercitar Supertest de salud (`saludVivo`, `saludListo`) y `pg-boss` real contra el PostgreSQL del service container. Validación: los endpoints responden y pg-boss ejecuta contra la base real. Archivo: `.github/workflows/ci-pr.yml` (paso de tests de integración).
Contrato: rollback: Quitar el paso de Supertest/pg-boss del job `integration`.. Status: done

#### S3.T2 — Agregar los jobs `build-smoke`, `security` (Trivy) y `docs` con los gates documentales existentes (`build_fichas.py --check`, `build_manual_y_personalidad.py --check`, `build_signos.py --check`, `build_result_catalog.py --check`, `check_citas.py`, `check_cobertura.py`, `unittest discover -s tests`, `check_backlog.py`) sobre Python 3.12 fijado. Validación: PR con cita documental rota. Archivos: `.github/workflows/ci-pr.yml` (jobs `build-smoke`, `security`, `docs`).
Contrato: rollback: Quitar los jobs `build-smoke`, `security` y `docs` de `ci-pr.yml`.. Status: done

#### S3.T2.1 — Agregar el job `build-smoke` que corre el build de smoke del monorepo sobre Python 3.12 fijado. Validación: un PR limpio deja `build-smoke` verde. Archivo: `.github/workflows/ci-pr.yml` (job `build-smoke`).
Contrato: rollback: Quitar el job `build-smoke` de `ci-pr.yml`.. Status: done

#### S3.T2.2 — Agregar el job `security` con Trivy conforme a la política del repositorio. Validación: un PR de prueba con vulnerabilidad detectada deja `security` rojo. Archivo: `.github/workflows/ci-pr.yml` (job `security`).
Contrato: rollback: Quitar el job `security` de `ci-pr.yml`.. Status: done

#### S3.T2.3 — Agregar el job `docs` sobre Python 3.12 fijado con los gates de build (`build_fichas.py --check`, `build_manual_y_personalidad.py --check`, `build_signos.py --check`, `build_result_catalog.py --check`). Validación: un PR que rompe un artefacto documental deja `docs` rojo. Archivo: `.github/workflows/ci-pr.yml` (job `docs`, pasos de build).
Contrato: rollback: Quitar los pasos de gates de build del job `docs`.. Status: done

#### S3.T2.4 — Agregar al job `docs` los gates `check_citas.py`, `check_cobertura.py`, `unittest discover -s tests` y `check_backlog.py`. Validación: un PR con cita documental rota deja `check_citas.py` rojo. Archivo: `.github/workflows/ci-pr.yml` (job `docs`, pasos de verificación).
Contrato: rollback: Quitar los pasos de verificación documental del job `docs`.. Status: done

#### S3.T2.5 — Enganchar `build-smoke`, `security` y `docs` al `needs` del job `quality-gate`. Validación: al fallar cualquiera de los tres, `quality-gate` queda rojo. Archivo: `.github/workflows/ci-pr.yml` (job `quality-gate`).
Contrato: rollback: Quitar `build-smoke`, `security` y `docs` del `needs` de `quality-gate`.. Status: done

#### S3.T3 — Tests de regresión de la etapa: PR con migración que no aplica desde cero (`integration` rojo con log de Prisma), PR con cita documental rota (`check_citas.py` rojo y `quality-gate` rojo) y verificación de que `docs` usa Python 3.12. Validación: resultados de las corridas. Archivos: `.github/workflows/ci-pr.yml`.
Contrato: rollback: No aplica (tarea de verificación sin cambios de producción); si falla, corregir el workflow.. Status: done

#### S3.T3.1 — Corrida de PR con migración que no aplica desde cero: verificar que `integration` queda rojo y publica el log de Prisma. Validación: resultado de la corrida registrado. Archivo: `.github/workflows/ci-pr.yml`.
Contrato: rollback: No aplica (tarea de verificación sin cambios de producción); si falla, corregir el workflow.. Status: done

#### S3.T3.2 — Corrida de PR con cita documental rota: verificar que `check_citas.py` falla y `quality-gate` queda rojo. Validación: resultado de la corrida registrado. Archivo: `.github/workflows/ci-pr.yml`.
Contrato: rollback: No aplica (tarea de verificación sin cambios de producción); si falla, corregir el workflow.. Status: done

#### S3.T3.3 — Verificar que el job `docs` usa Python 3.12 fijado y corre los gates documentales sin omitir ninguno. Validación: inspección de la configuración del job. Archivo: `.github/workflows/ci-pr.yml`.
Contrato: rollback: No aplica (tarea de verificación sin cambios de producción); si falla, corregir el workflow.. Status: done

#### S3.T3.4 — Corrida de PR limpio: verificar que `build-smoke`, `security` y `docs` pasan. Validación: resultado de la corrida registrado. Archivo: `.github/workflows/ci-pr.yml`.
Contrato: rollback: No aplica (tarea de verificación sin cambios de producción); si falla, corregir el workflow.. Status: done

#### S4.T1 — Definir el ruleset de `main` como artefacto versionado (JSON de ruleset o script de aplicación) con PR obligatorio, una aprobación distinta del último autor, CODEOWNERS, invalidación de aprobaciones, conversaciones resueltas, `quality-gate` requerido, historia lineal con squash y sin force-push ni borrado, más la instrucción de aplicación (tecnologia/17 §2). Validación: intento de push directo a `main` y merge con check rojo rechazados. Archivo: `.github/workflows/ci-pr.yml` (referencia al check) y el artefacto de ruleset versionado.
Contrato: rollback: Revertir el artefacto de ruleset y quitar `quality-gate` de los checks requeridos de `main`.. Status: done

#### S4.T2 — Agregar el summary único del workflow con el porcentaje de cobertura de Flutter y backend, enlaces a los LCOV, duración de los jobs y la medición de los presupuestos de tecnologia/18 §11. Validación: abrir el summary de una corrida completa. Archivo: `.github/workflows/ci-pr.yml` (job/step de summary).
Contrato: rollback: Quitar el paso de summary de `ci-pr.yml`.. Status: done

#### S4.T3 — Tests de regresión de la etapa: verificar el rechazo de push directo y de merge con `quality-gate` rojo por el ruleset, y que el summary presenta coberturas, links a LCOV, duraciones y presupuestos. Validación: resultados del intento de push/merge y del summary. Archivos: artefacto de ruleset, `.github/workflows/ci-pr.yml`.
Contrato: rollback: No aplica (tarea de verificación sin cambios de producción); si falla, corregir ruleset/summary.. Status: done

#### S6.T1 — Verificar en `.github/workflows/ci-pr.yml` que el job `changes` esté declarado en los `needs` de `quality-gate` y de `summary`, de modo que si `changes` falla, es cancelado o no termina correctamente, el agregador lo detecte y quede rojo en vez de evaluar outputs vacíos. Aplicado en el commit 31684a0; esta task deja la traza y confirma el estado final del archivo.
Contrato: rollback: Revertir `.github/workflows/ci-pr.yml` al estado previo al commit 31684a0 quitando `changes` de los `needs` de `quality-gate` y `summary`; conservar el log de la ejecución fallida.. Status: done

#### S6.T2 — Verificar que los filtros de ruta del job `changes` incluyan `.github/**` en los patrones que activan los jobs de código y los de docs, para que un PR que solo toca workflows o configuración de CI no omita por filtro los jobs que valida. Aplicado en el commit 31684a0; esta task deja la traza y confirma la cobertura de los patrones.
Contrato: rollback: Revertir los patrones de `changes` en `.github/workflows/ci-pr.yml` al estado previo al commit 31684a0; no desactivar `quality-gate` para compensar.. Status: done

#### S6.T3 — Verificar que los jobs Flutter (`flutter-static` y `flutter-test`) usen `actions/cache` sobre `~/.pub-cache` con clave derivada del hash de `app/pubspec.lock` y con `restore-keys` de respaldo, para cumplir el requisito de caché de pub por lockfile sin alterar el resultado de `flutter pub get`. Aplicado en el commit 31684a0; esta task deja la traza y confirma la configuración.
Contrato: rollback: Quitar los pasos `actions/cache` de los jobs Flutter en `.github/workflows/ci-pr.yml` volviendo al estado previo al commit 31684a0; los jobs siguen corriendo sin caché.. Status: done

#### S7.T1 — Alinear la documentacion del ruleset de `main` con lo implementado: actualizar `docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md` §2 para que describa merge por squash, una aprobacion distinta del ultimo autor, invalidacion de aprobaciones, conversaciones resueltas, `quality-gate` como check requerido, historia lineal y prohibicion de force-push/borrado; crear/ajustar `.github/CODEOWNERS` para que cubra las rutas gobernadas (`.github/workflows/**`, `server/**`, `app/**`, `infra/**`, `docs/**`) y quede como gate de revision; y reflejar en `CONTRIBUTING.md` el mismo flujo (PR obligatorio, squash, revision por CODEOWNERS). No modifica el workflow ni los REQs existentes.
Contrato: rollback: Revertir los tres archivos (`docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md`, `.github/CODEOWNERS`, `CONTRIBUTING.md`) al SHA previo; el ruleset de GitHub no se toca en esta task.. Status: done

#### S7.T2 — Endurecer el job `flutter-static` en `.github/workflows/ci-pr.yml`: el paso de analisis corre `flutter analyze --fatal-infos --fatal-warnings` (infos y warnings fallan el job, no solo errores) y se agrega el paso `dart run custom_lint` para las reglas de lint personalizadas del proyecto, ambos con el toolchain FVM ya fijado.
Contrato: rollback: Revertir los pasos del job `flutter-static` en `.github/workflows/ci-pr.yml` a `flutter analyze` sin flags y quitar el paso `dart run custom_lint`.. Status: done

#### S7.T3 — Corregir los filtros de ruta de `ci-pr.yml`: el filtro `code` deja de incluir `.github/**`, de modo que un PR que solo cambia archivos de `.github` no dispara `build-smoke` ni los demas jobs pesados que dependen de ese filtro; verificar que los jobs que si deben reaccionar a cambios de workflow usen su propio filtro y que `quality-gate` siga terminando verde (no pendiente) cuando los pesados se omiten.
Contrato: rollback: Restaurar `.github/**` dentro del filtro `code` en `.github/workflows/ci-pr.yml`.. Status: done

#### S7.T4 — Eliminar la cache de pub duplicada en `.github/workflows/ci-pr.yml`: dejar una unica declaracion de cache de paquetes pub (keyed por el lockfile de Flutter) en los jobs Flutter, quitando la entrada redundante que cachea el mismo path dos veces.
Contrato: rollback: Restaurar el bloque de cache de pub removido en `.github/workflows/ci-pr.yml`.. Status: done

#### S7.T5 — Excluir el codigo generado del umbral de cobertura del backend: en `server/vitest.config.ts` agregar `src/generated/**` a `coverage.exclude` para que el cliente Prisma generado no distorsione el porcentaje de lineas, manteniendo el umbral de 80% sobre codigo propio.
Contrato: rollback: Quitar la entrada `src/generated/**` de `coverage.exclude` en `server/vitest.config.ts`.. Status: done

#### S7.T6 — Quitar los codigos internos de sesion (`S<n>`, `S<n>.T<n>`) de comentarios de YAML, comentarios de codigo y docstrings de los archivos tocados por el ticket (`.github/workflows/ci-pr.yml`, scripts de gates, configs), reemplazandolos por una descripcion funcional del paso. Los codigos internos no deben filtrarse al repo publico.
Contrato: rollback: Revertir los archivos afectados al SHA previo para restaurar los comentarios originales.. Status: done

#### S7.T7 — Verificacion de las correcciones: correr en local `flutter analyze --fatal-infos --fatal-warnings` y `dart run custom_lint` (deben pasar sobre el arbol actual), `vitest run --coverage` en `server/` confirmando que el reporte ya no incluye `src/generated/**` y que las lineas cubiertas quedan >= 80%, validar la sintaxis de `ci-pr.yml` (`actionlint` o equivalente) y hacer un grep de `S[0-9]` sobre los archivos tocados confirmando cero coincidencias de codigos internos.
Contrato: rollback: No aplica: task de verificacion, no modifica archivos.. Status: done

#### S8.T1 — Ajustar el test Dart de salud para aserciones no nulas explicitas: reemplazar el uso de `salud!` (bang operator) por `expect(salud, isNotNull)` antes de acceder a los campos, de modo que el fallo reporte la asercion en vez de un TypeError de null-check.
Contrato: rollback: Revertir el archivo de test Dart al SHA previo (`git checkout <sha> -- <ruta del test>`); el test vuelve al operador `!` sin afectar el workflow.. Status: done

#### S8.T2 — Endurecer `resumen_ci.py`: ante fallo al recolectar metricas (LCOV ausente, JSON invalido, job sin datos) emitir `::warning::` visible en el log de Actions y escribir igualmente un resumen degradado en `$GITHUB_STEP_SUMMARY` indicando que dato falto, en vez de abortar o dejar el summary vacio.
Contrato: rollback: Revertir `resumen_ci.py` al SHA previo; el summary vuelve al comportamiento anterior sin warning ni degradado.. Status: done

#### S8.T3 — Confirmar y dejar explicito en `backend-static` el uso de `pnpm install --frozen-lockfile` para que el job falle si el lockfile no es coherente con `package.json` (coherencia de lock real, no instalacion permisiva).
Contrato: rollback: Revertir el paso de instalacion de `backend-static` en `ci-pr.yml` al SHA previo.. Status: done

#### S8.T4 — Agregar `bypass_actors` (admin) al ruleset de `main` versionado y hacer el script de aplicacion robusto ante el HTTP 403 de plan: detectar el 403, informar que los rulesets requieren GitHub Pro en repositorio privado y terminar sin romper, dejando el ruleset versionado como artefacto aplicable cuando el plan lo permita.
Contrato: rollback: Revertir el JSON del ruleset y el script de aplicacion al SHA previo; no hay estado remoto que deshacer porque el 403 impide aplicarlo en el plan actual.. Status: done

#### S8.T5 — Ajustar el trigger de `contract.yml` con `branches-ignore` para que dispare en PRs que no apuntan a `main` sin duplicar la ejecucion en PRs hacia `main` (donde ya corre integrado via el job `contract` de `ci-pr.yml`).
Contrato: rollback: Revertir el bloque `on:` de `contract.yml` al SHA previo; el gate de contrato vuelve a su trigger anterior.. Status: done
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: En un PR de prueba, `ci-pr.yml` dispara `metadata` y `contract` y el check `quality-gate` refleja su resultado (verde con PR limpio, rojo con `.env` o contrato roto); el segundo push cancela la corrida anterior; las actions quedan fijadas por SHA y los artifacts con retención de 30 días.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5

**Gate (auto)**: Un PR que rompe el formato Dart o el tipado TypeScript pone en rojo `flutter-static`/`backend-static`, y `flutter-test`/`backend-test` publican cobertura (LCOV + diff-cover y Vitest) visible en los artifacts, con el umbral del 80%.

### Session 3 · T3 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T1.1
- [x] S3.T1.2
- [x] S3.T1.3
- [x] S3.T1.4
- [x] S3.T2
- [x] S3.T2.1
- [x] S3.T2.2
- [x] S3.T2.3
- [x] S3.T2.4
- [x] S3.T2.5
- [x] S3.T3
- [x] S3.T3.1
- [x] S3.T3.2
- [x] S3.T3.3
- [x] S3.T3.4

**Gate (auto)**: `integration` levanta `postgres:18` por digest, crea los cuatro roles y corre las migraciones desde cero (una migración rota lo pone rojo con el log de Prisma); `security`, `build-smoke` y `docs` corren y una cita documental rota falla; `quality-gate` agrega todo.

### Session 4 · T1 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3

**Gate (auto)**: El ruleset de `main` rechaza un push directo y un merge con `quality-gate` rojo, y el summary de una corrida completa muestra cobertura Flutter/backend, enlaces a los LCOV, duración de los jobs y los presupuestos de tecnologia/18 §11.

### Session 5 · T1 · continue

**Gate (auto)**: Correcciones del gate integral de TAO-158: (1) diff-cover con --src-roots app para que el umbral 80% de Dart opere; (2) PyYAML declarado en el job docs; (3) metadata cubre .env.local/.env.production y certs .crt/.cer/.der/.pfx y filtra por estado A/M/R (no borrados), y valida título conforme; (4) flutter-static/test leen la version de app/.fvmrc; (5) contract.yml sin doble corrida por PR; (6) resumen_ci.py matchea el job contract reusable; (7) tests que acrediten metadata (.env/cert/lockfile), SHA, retention 30d y Python 3.12. Gates del repo en verde.

### Session 6 · T1 · continue

**Tasks:**
- [x] S6.T1
- [x] S6.T2
- [x] S6.T3

**Gate (auto)**: Correcciones del integral (2): changes en needs de quality-gate; filtros de ruta cubren .github/**; cache de pub en los jobs Flutter. Gates del repo en verde.

### Session 7 · T1 · continue

**Tasks:**
- [x] S7.T1
- [x] S7.T2
- [x] S7.T3
- [x] S7.T4
- [x] S7.T5
- [x] S7.T6
- [x] S7.T7

**Gate (auto)**: Correcciones de Dredd sobre TAO-158: (1) alinear doc 17 §2 y el encabezado de .github/CODEOWNERS con el ruleset de main (squash + 1 aprobacion distinta del ultimo autor + CODEOWNERS como gate), o ajustar el ruleset si se decide lo contrario; (2) flutter-static corre custom_lint y flutter analyze --fatal-infos --fatal-warnings; (3) .github no dispara build-smoke; (4) sin cache de pub duplicada; (5) umbral de cobertura backend excluye codigo generado; (6) quitar codigos internos S<n> de comentarios. Gates en verde.

### Session 8 · T1 · continue

**Tasks:**
- [x] S8.T1
- [x] S8.T2
- [x] S8.T3
- [x] S8.T4
- [x] S8.T5

**Gate (auto)**: Correcciones finales de TAO-158: (1) test Dart usa expect(isNotNull) en vez de salud!; (2) resumen_ci.py emite ::warning:: visible ante fallo/degradacion; (3) backend-static con pnpm install --frozen-lockfile (coherencia de lock real); (4) ruleset con bypass de admin (bypass_actors) para no bloquear merges en repo de un solo mantenedor, y aplicado; (5) contract.yml dispara en PRs que NO apuntan a main (branches-ignore) sin duplicar en main. Gates en verde.
## Enmiendas (refine_spec)

### Enmienda 1

**Tasks agregadas:**

- S6: Verificar en `.github/workflows/ci-pr.yml` que el job `changes` esté declarado en los `needs` de `quality-gate` y de `summary`, de modo que si `changes` falla, es cancelado o no termina correctamente, el agregador lo detecte y quede rojo en vez de evaluar outputs vacíos. Aplicado en el commit 31684a0; esta task deja la traza y confirma el estado final del archivo. (valida: REQ-01, REQ-10; rollback: Revertir `.github/workflows/ci-pr.yml` al estado previo al commit 31684a0 quitando `changes` de los `needs` de `quality-gate` y `summary`; conservar el log de la ejecución fallida.)
- S6: Verificar que los filtros de ruta del job `changes` incluyan `.github/**` en los patrones que activan los jobs de código y los de docs, para que un PR que solo toca workflows o configuración de CI no omita por filtro los jobs que valida. Aplicado en el commit 31684a0; esta task deja la traza y confirma la cobertura de los patrones. (valida: REQ-01; rollback: Revertir los patrones de `changes` en `.github/workflows/ci-pr.yml` al estado previo al commit 31684a0; no desactivar `quality-gate` para compensar.)
- S6: Verificar que los jobs Flutter (`flutter-static` y `flutter-test`) usen `actions/cache` sobre `~/.pub-cache` con clave derivada del hash de `app/pubspec.lock` y con `restore-keys` de respaldo, para cumplir el requisito de caché de pub por lockfile sin alterar el resultado de `flutter pub get`. Aplicado en el commit 31684a0; esta task deja la traza y confirma la configuración. (valida: REQ-04, REQ-08; rollback: Quitar los pasos `actions/cache` de los jobs Flutter en `.github/workflows/ci-pr.yml` volviendo al estado previo al commit 31684a0; los jobs siguen corriendo sin caché.)

### Enmienda 2

**Tasks agregadas:**

- S7: Alinear la documentacion del ruleset de `main` con lo implementado: actualizar `docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md` §2 para que describa merge por squash, una aprobacion distinta del ultimo autor, invalidacion de aprobaciones, conversaciones resueltas, `quality-gate` como check requerido, historia lineal y prohibicion de force-push/borrado; crear/ajustar `.github/CODEOWNERS` para que cubra las rutas gobernadas (`.github/workflows/**`, `server/**`, `app/**`, `infra/**`, `docs/**`) y quede como gate de revision; y reflejar en `CONTRIBUTING.md` el mismo flujo (PR obligatorio, squash, revision por CODEOWNERS). No modifica el workflow ni los REQs existentes. (valida: REQ-09; rollback: Revertir los tres archivos (`docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md`, `.github/CODEOWNERS`, `CONTRIBUTING.md`) al SHA previo; el ruleset de GitHub no se toca en esta task.)
- S7: Endurecer el job `flutter-static` en `.github/workflows/ci-pr.yml`: el paso de analisis corre `flutter analyze --fatal-infos --fatal-warnings` (infos y warnings fallan el job, no solo errores) y se agrega el paso `dart run custom_lint` para las reglas de lint personalizadas del proyecto, ambos con el toolchain FVM ya fijado. (valida: REQ-04; rollback: Revertir los pasos del job `flutter-static` en `.github/workflows/ci-pr.yml` a `flutter analyze` sin flags y quitar el paso `dart run custom_lint`.)
- S7: Corregir los filtros de ruta de `ci-pr.yml`: el filtro `code` deja de incluir `.github/**`, de modo que un PR que solo cambia archivos de `.github` no dispara `build-smoke` ni los demas jobs pesados que dependen de ese filtro; verificar que los jobs que si deben reaccionar a cambios de workflow usen su propio filtro y que `quality-gate` siga terminando verde (no pendiente) cuando los pesados se omiten. (valida: REQ-01; rollback: Restaurar `.github/**` dentro del filtro `code` en `.github/workflows/ci-pr.yml`.)
- S7: Eliminar la cache de pub duplicada en `.github/workflows/ci-pr.yml`: dejar una unica declaracion de cache de paquetes pub (keyed por el lockfile de Flutter) en los jobs Flutter, quitando la entrada redundante que cachea el mismo path dos veces. (valida: REQ-04; rollback: Restaurar el bloque de cache de pub removido en `.github/workflows/ci-pr.yml`.)
- S7: Excluir el codigo generado del umbral de cobertura del backend: en `server/vitest.config.ts` agregar `src/generated/**` a `coverage.exclude` para que el cliente Prisma generado no distorsione el porcentaje de lineas, manteniendo el umbral de 80% sobre codigo propio. (valida: REQ-05; rollback: Quitar la entrada `src/generated/**` de `coverage.exclude` en `server/vitest.config.ts`.)
- S7: Quitar los codigos internos de sesion (`S<n>`, `S<n>.T<n>`) de comentarios de YAML, comentarios de codigo y docstrings de los archivos tocados por el ticket (`.github/workflows/ci-pr.yml`, scripts de gates, configs), reemplazandolos por una descripcion funcional del paso. Los codigos internos no deben filtrarse al repo publico. (valida: REQ-08; rollback: Revertir los archivos afectados al SHA previo para restaurar los comentarios originales.)
- S7: Verificacion de las correcciones: correr en local `flutter analyze --fatal-infos --fatal-warnings` y `dart run custom_lint` (deben pasar sobre el arbol actual), `vitest run --coverage` en `server/` confirmando que el reporte ya no incluye `src/generated/**` y que las lineas cubiertas quedan >= 80%, validar la sintaxis de `ci-pr.yml` (`actionlint` o equivalente) y hacer un grep de `S[0-9]` sobre los archivos tocados confirmando cero coincidencias de codigos internos. (valida: REQ-01, REQ-04, REQ-05, REQ-08, test; rollback: No aplica: task de verificacion, no modifica archivos.)

### Enmienda 3

**Tasks agregadas:**

- S8: Ajustar el test Dart de salud para aserciones no nulas explicitas: reemplazar el uso de `salud!` (bang operator) por `expect(salud, isNotNull)` antes de acceder a los campos, de modo que el fallo reporte la asercion en vez de un TypeError de null-check. (valida: REQ-04, test; rollback: Revertir el archivo de test Dart al SHA previo (`git checkout <sha> -- <ruta del test>`); el test vuelve al operador `!` sin afectar el workflow.)
- S8: Endurecer `resumen_ci.py`: ante fallo al recolectar metricas (LCOV ausente, JSON invalido, job sin datos) emitir `::warning::` visible en el log de Actions y escribir igualmente un resumen degradado en `$GITHUB_STEP_SUMMARY` indicando que dato falto, en vez de abortar o dejar el summary vacio. (valida: REQ-10; rollback: Revertir `resumen_ci.py` al SHA previo; el summary vuelve al comportamiento anterior sin warning ni degradado.)
- S8: Confirmar y dejar explicito en `backend-static` el uso de `pnpm install --frozen-lockfile` para que el job falle si el lockfile no es coherente con `package.json` (coherencia de lock real, no instalacion permisiva). (valida: REQ-05, REQ-02; rollback: Revertir el paso de instalacion de `backend-static` en `ci-pr.yml` al SHA previo.)
- S8: Agregar `bypass_actors` (admin) al ruleset de `main` versionado y hacer el script de aplicacion robusto ante el HTTP 403 de plan: detectar el 403, informar que los rulesets requieren GitHub Pro en repositorio privado y terminar sin romper, dejando el ruleset versionado como artefacto aplicable cuando el plan lo permita. (valida: REQ-09; rollback: Revertir el JSON del ruleset y el script de aplicacion al SHA previo; no hay estado remoto que deshacer porque el 403 impide aplicarlo en el plan actual.)
- S8: Ajustar el trigger de `contract.yml` con `branches-ignore` para que dispare en PRs que no apuntan a `main` sin duplicar la ejecucion en PRs hacia `main` (donde ya corre integrado via el job `contract` de `ci-pr.yml`). (valida: REQ-03; rollback: Revertir el bloque `on:` de `contract.yml` al SHA previo; el gate de contrato vuelve a su trigger anterior.)
