---
id: TAO-163-SPEC
project: taomangalam
ticket: TAO-163
status: approved
---

# HU-00-14 · Despliegue aislado de la API en Railway desde server/ con staging manual, migración previa y smoke

## Resumen ejecutivo

Se prepara el despliegue aislado de la API en Railway desde server/: Dockerfile multietapa reproducible (contexto solo server/), server/railway.toml con pre-deploy `prisma migrate deploy` falla-cerrado, healthcheck /health/ready, restart On Failure y 1 replica; perfil de paridad de Compose; workflow manual de staging por SHA de main (valida main.yml, corre `railway up` y smoke, escribe summary); scripts remotos que rechazan produccion sin flag; y seccion de staging en el release-runbook. NO incluye: produccion/release.yml, backups/PITR, Sentry/alertas ni servicio worker (EP-17/EP-15/futuro). Se sabe que funciona cuando la imagen construye solo con server/, el perfil de paridad responde /health/ready 200, un SHA no-main falla antes de desplegar y los scripts rechazan produccion con exit != 0. Tamano ~4 sesiones (T1/T2). AVISO: el proyecto Railway, el ambiente staging, el token de proyecto y la CLI son un pendiente externo (tecnologia/21 §12) que bloquea iniciar; sin ellos no se validan los criterios de historial/watch paths ni el despliegue real. El pedido cabe en el techo de 4 sesiones.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/product/decisiones/DEC-205-despliegue-railway-aislado-desde-server.md:48

server/Dockerfile multietapa reproducible que construye y ejecuta la API (build + runtime sin devDependencies) usando dependencias bloqueadas (lockfile congelado) y sin leer archivos fuera de server/ (contexto aislado).

### REQ-02 `confirmed`
> Fuente: Adenda 1 y Adenda 2 - 2026-09-29 - dev; pedido de cambio; DEC-205, tecnologia/21 §4

La config del deploy vive en `.railway/railway.ts` (Infrastructure as Code) y se aplica con `railway config plan/apply`: para el servicio `server`, fuente GitHub con `rootDirectory = server` y builder Dockerfile con `dockerfilePath = Dockerfile`, pre-deploy `node_modules/.bin/prisma migrate deploy` con `MIGRATION_DATABASE_URL` (falla cerrado: si la migracion falla, aborta el despliegue), startCommand escuchando en `0.0.0.0:$PORT`, healthcheck `/health/ready` con timeout acotado, restart On Failure y `numReplicas=1`; sin `watchPatterns`. `server/railway.toml` se elimina del repo junto con los tests que lo parsean, reemplazados por validacion del archivo IaC (Config as Code quedo deprecado y la plataforma ya no lo lee).

### REQ-03 `confirmed`
> Fuente: taomangalam/compose.yaml:8

Perfil de paridad de Compose que ejecuta el backend en contenedor con el mismo Dockerfile y responde GET /health/ready 200 contra el PostgreSQL local.

### REQ-04 `confirmed`
> Fuente: Adenda 2 - 2026-09-29 - dev; pedido de cambio (Modelo B); DEC-199, DEC-205, DEC-230

Ambiente staging en Railway con servicios `server` y `postgres` con volumen; el servicio `server` usa la fuente GitHub `edobacon/taomangalam` (branch `main`) con `rootDirectory = server` y `dockerfilePath = Dockerfile`; auto-deploy de GitHub apagado (staging despliega solo por el workflow manual, DEC-230); variables por referencia privada y sin `DATABASE_PUBLIC_URL`. El deploy NO usa `railway up ./server --path-as-root`: la plataforma no permite coexistir ese upload con la fuente GitHub y `rootDirectory = server` en el mismo servicio (verificado). `Config File Path` ya no aplica (Config as Code deprecado).

### REQ-05 `confirmed`
> Fuente: Adenda 2 - 2026-09-29 - dev; pedido de cambio (Modelo B); DEC-199

Workflow manual de staging que recibe un SHA, verifica que pertenece a `main` y que `main.yml` paso en ese SHA, hace checkout y despliega ESE SHA desde la fuente GitHub del servicio invocando la mutacion `serviceInstanceDeploy(serviceId, environmentId, commitSha)` contra la API GraphQL de Railway (`https://backboard.railway.com/graphql/v2`) con el token de proyecto guardado en el GitHub Environment `staging`; luego corre el smoke de `GET /health/live` y `GET /health/ready` contra la URL de staging y registra SHA, version y digest en el summary. Falla antes de llamar a Railway si el SHA no pertenece a `main` o si `main.yml` no esta verde. Reemplaza por completo el paso `railway up ./server --path-as-root --ci`.

### REQ-06 `inferred`
> Fuente: taomangalam/.env.example:7

Scripts remotos `railway:db:tunnel --env staging` y `db:studio:remote --env staging` que rechazan produccion salvo flag explicito (exit distinto de 0) y nunca imprimen la contrasena.

### REQ-07 `inferred`
> Fuente: Pedido de cambio (actualizar docs railway-staging.md y release-runbook.md a IaC)

Documentacion actualizada a IaC: `docs/development/railway-staging.md` describe la config en `.railway/railway.ts`, el flujo `railway config plan/apply`, la migracion desde `server/railway.toml` (por que se abandono Config as Code) y la brecha verificada de `rootDirectory`/`watchPatterns` con `railway up --path-as-root`; `docs/development/release-runbook.md` tiene la seccion de staging con despliegue manual por SHA y rollback no destructivo, sin referencias a `railway.toml`.

### REQ-08 `inferred` `enforcement`
> Fuente: taomangalam/compose.yaml:8

Reutilizar el script de roles/usuarios de HU-00-05 (usuario administrador solo para bootstrap) para poblar los roles de server y postgres de staging, sin crear roles ad-hoc.

### REQ-09 `inferred` `enforcement`
> Fuente: taomangalam/.env.example:7

Reutilizar el redactor central de secretos (decision HU-00-17) para que tunnel/studio/railway no impriman la contrasena, y apoyar healthcheck y smoke en los endpoints saludVivo/saludListo existentes de HU-00-04 sin crear endpoints nuevos.

### REQ-10 `inferred` `enforcement`
> Fuente: Adenda 1 (aprovisionamiento real hecho y verificado) + pedido de cambio (generar el IaC a partir del proyecto ya provisionado y validarlo con `railway config plan`)

El archivo `.railway/railway.ts` se genera a partir del proyecto/ambiente staging YA aprovisionado y verificado (via `railway config pull`/`migrate`), no se redacta a mano desde cero ni se re-aprovisiona la plataforma; antes de aplicar se valida con `railway config plan` y solo se aplica si el plan no introduce cambios no intencionados en servicios, variables, volumen ni dominio existentes.
## Tasks

#### S1.T1 — Crear server/Dockerfile multietapa: etapa de build con pnpm y lockfile congelado copiando solo server/; etapa runtime con Node sin root, EXPOSE del puerto y CMD de arranque de la API, sin leer archivos fuera de server/.
Contrato: rollback: Eliminar server/Dockerfile; el runtime local por Compose sigue usando la imagen previa.. Status: done

#### S1.T2 — Agregar el perfil de paridad en compose.yaml que construye y ejecuta el backend con el mismo server/Dockerfile contra el servicio Postgres local.
Contrato: rollback: Revertir el perfil de paridad de compose.yaml con git checkout del archivo.. Status: done

#### S1.T3 — Tests de la etapa: build con contexto server/ (falla si el Dockerfile referencia fuera), imagen multietapa sin devDependencies, y smoke GET /health/ready 200 por el perfil de paridad.
Contrato: rollback: Quitar los tests de la etapa; no afecta el artefacto.. Status: done

#### S2.T1 — Crear server/railway.toml con build por Dockerfile, pre-deploy `prisma migrate deploy` ligado a MIGRATION_DATABASE_URL, startCommand en 0.0.0.0:$PORT, healthcheckPath /health/ready con timeout acotado, restartPolicyType ON_FAILURE y numReplicas=1.
Contrato: rollback: Eliminar server/railway.toml; Railway vuelve al build por defecto.. Status: done

#### S2.T2 — Registrar y dejar reproducible la configuracion del servicio de staging (Root Directory /server, Watch Paths /server/**, Config File Path /server/railway.toml, auto-deploy de GitHub apagado) y del ambiente (servicios server y postgres con volumen, variables por referencia privada sin DATABASE_PUBLIC_URL), reutilizando el script de roles de HU-00-05.
Contrato: rollback: Revertir los ajustes en el panel de Railway y retirar la documentacion de configuracion.. Status: done

#### S2.T3 — Tests de la etapa: parseo y claves esperadas de railway.toml, y verificacion de auto-deploy apagado (commit en docs/ o app/ en main no genera build; commit en server/ no despliega hasta el workflow).
Contrato: rollback: Quitar los tests de la etapa; no afecta el artefacto.. Status: done

#### S2.T4 — Generar `.railway/railway.ts` a partir del proyecto staging ya aprovisionado (`railway config pull`/`migrate`) y ajustarlo para declarar builder Dockerfile con dockerfilePath `Dockerfile`, preDeploy `node_modules/.bin/prisma migrate deploy` con MIGRATION_DATABASE_URL, startCommand en 0.0.0.0:$PORT, healthcheck /health/ready con timeout acotado, restart ON_FAILURE y numReplicas=1; sin rootDirectory ni watchPatterns en el servicio `server`.
Contrato: rollback: Borrar `.railway/railway.ts` (git checkout del path); la plataforma sigue con la config vigente en el servicio, que no cambia hasta el apply.. Status: done

#### S2.T5 — Validar el IaC con `railway config plan --environment staging` y revisar el diff propuesto (servicios, variables por referencia privada, volumen, dominio); aplicar con `railway config apply` solo si el plan no destruye ni recrea volumen, dominio ni variables, y dejar la salida del plan como evidencia.
Contrato: rollback: No aplicar; si ya se aplico, re-aplicar el IaC del commit anterior con `railway config apply` y verificar el servicio con `railway logs` + smoke de /health/ready.. Status: done

#### S2.T6 — Eliminar `server/railway.toml` del repo y toda referencia a Config as Code en scripts y workflows (incluido cualquier `--config` o Config File Path), confirmando que el workflow manual sigue usando solo `railway up ./server --path-as-root --ci --environment staging --service server`.
Contrato: rollback: `git revert` del commit: restaura `server/railway.toml` y las referencias; la plataforma no lo lee, asi que no hay impacto en el deploy vivo.. Status: done

#### S2.T7 — Ajustar `.railway/railway.ts` al Modelo B: declarar para el servicio `server` la fuente GitHub `edobacon/taomangalam` branch `main` con `rootDirectory = 'server'` y `dockerfilePath = 'Dockerfile'`, sin `watchPatterns`, manteniendo preDeploy (`prisma migrate deploy` con `MIGRATION_DATABASE_URL`), startCommand en `0.0.0.0:$PORT`, healthcheck `/health/ready` con timeout acotado, restart ON_FAILURE y numReplicas=1; correr `railway config plan` y confirmar que el plan no introduce cambios no intencionados en servicios, variables, volumen ni dominio antes de `railway config apply`.
Contrato: rollback: Revertir `.railway/railway.ts` al commit previo y re-aplicar con `railway config apply` la config anterior; el servicio sigue sirviendo el ultimo despliegue exitoso.. Status: done

#### S2.T8 — Actualizar la validacion deterministica del IaC (`.railway/railway.ts`) para afirmar `rootDirectory = 'server'`, `dockerfilePath = 'Dockerfile'`, ausencia de `watchPatterns`, preDeploy con `prisma migrate deploy`, healthcheck `/health/ready`, restart ON_FAILURE y numReplicas=1; y verificar por grep que `server/railway.toml` no existe.
Contrato: rollback: Revertir el archivo de test al commit previo.. Status: done

#### S3.T1 — Crear el workflow manual de staging en .github/workflows que recibe un SHA, verifica pertenencia a main y main.yml verde, hace checkout, ejecuta `railway up ./server --path-as-root --ci --environment staging --service server` con el token del Environment staging, corre smoke de /health/live y /health/ready y escribe SHA, version y digest en el summary.
Contrato: rollback: Eliminar el workflow; no altera el CI existente.. Status: done

#### S3.T2 — Agregar los scripts `railway:db:tunnel` y `db:studio:remote` con `--env`, que rechazan production salvo flag explicito (exit != 0) y redactan la contrasena con el redactor central (HU-00-17).
Contrato: rollback: Quitar los scripts del package.json y sus auxiliares.. Status: done

#### S3.T3 — Tests de guardas: SHA no-main falla antes de llamar a Railway; SHA de rama sin fusionar no dispara railway up; --env production sin flag sale != 0; la salida no contiene la contrasena.
Contrato: rollback: Quitar los tests de la etapa; no afecta el artefacto.. Status: done

#### S3.T4 — Reescribir el paso de deploy del workflow manual de staging: eliminar `railway up ./server --path-as-root --ci` y reemplazarlo por una llamada a la mutacion GraphQL `serviceInstanceDeploy(serviceId, environmentId, commitSha)` contra `https://backboard.railway.com/graphql/v2`, autenticada con el token de proyecto del GitHub Environment `staging`, pasando el SHA validado; conservar intactas las guardas previas (SHA pertenece a `main`, `main.yml` verde) y el checkout, y propagar el fallo de la mutacion como fallo del job.
Contrato: rollback: Revertir el archivo del workflow al commit previo (version con `railway up`); no queda estado en la plataforma porque la mutacion no llega a invocarse.. Status: done

#### S3.T5 — Ajustar el post-deploy del workflow a la ruta por SHA: esperar el despliegue resultante de `serviceInstanceDeploy`, correr el smoke de `GET /health/live` y `GET /health/ready` contra la URL de staging (fallo del smoke ⇒ exit distinto de 0) y escribir en el summary el SHA desplegado, la version y el digest devueltos por Railway.
Contrato: rollback: Revertir los pasos de smoke y summary al commit previo; el despliegue ya aplicado no se toca (rollback de plataforma es redesplegar el SHA anterior).. Status: done

#### S3.T6 — Actualizar los tests deterministas de las guardas del workflow y de los scripts auxiliares a la ruta de deploy por SHA: la guarda rechaza un SHA que no pertenece a `main` y un SHA con `main.yml` no verde antes de emitir cualquier request a `backboard.railway.com`; el workflow no contiene `railway up` ni `--path-as-root`; el payload de `serviceInstanceDeploy` incluye `serviceId`, `environmentId` y el `commitSha` validado; el token nunca se imprime en logs.
Contrato: rollback: Revertir los archivos de test al commit previo.. Status: done

#### S4.T1 — Agregar a docs/development/release-runbook.md la seccion de staging: pasos del despliegue manual por SHA, verificacion de smoke y procedimiento de rollback no destructivo (redesplegar el SHA anterior y aplicar solo migraciones compatibles expand/contract).
Contrato: rollback: Revertir la seccion del runbook con git checkout del archivo.. Status: done

#### S4.T2 — Regresion de la etapa: el runbook cubre despliegue y rollback y los pasos no promueven ni revierten datos destructivamente.
Contrato: rollback: Quitar los tests de la etapa; no afecta el artefacto.. Status: done

#### S4.T3 — Reemplazar los tests que parsean `server/railway.toml` por tests que validan `.railway/railway.ts`: presencia y valores de builder/dockerfilePath, preDeploy con `prisma migrate deploy` y MIGRATION_DATABASE_URL, startCommand con 0.0.0.0:$PORT, healthcheckPath /health/ready con timeout, restart ON_FAILURE, numReplicas=1, y ausencia de rootDirectory/watchPatterns; mas un test de regresion que falla si reaparece `server/railway.toml`.
Contrato: rollback: `git revert` del commit de tests; la suite vuelve a los tests de toml (que fallarian por archivo ausente, por lo que el revert debe acompañar el revert de la eliminacion del toml).. Status: done

#### S4.T4 — Actualizar `docs/development/railway-staging.md` y `docs/development/release-runbook.md` a IaC: config en `.railway/railway.ts`, flujo `railway config plan/apply`, nota de migracion desde `railway.toml` (Config as Code deprecado) y la brecha verificada de rootDirectory/watchPatterns con `railway up --path-as-root`; mantener la seccion de staging con despliegue manual por SHA y rollback no destructivo.
Contrato: rollback: `git revert` del commit de docs; solo afecta documentacion, sin impacto en runtime.. Status: done

#### S4.T5 — Actualizar la documentacion al Modelo B: en `docs/development/railway-staging.md` describir la fuente GitHub con `rootDirectory = server`, por que `railway up --path-as-root` es incompatible con ella (brecha verificada) y el flujo `railway config plan/apply`; en `docs/development/release-runbook.md` reescribir la seccion de staging con el despliegue manual por SHA via `serviceInstanceDeploy` y el rollback no destructivo (redesplegar el SHA anterior), sin referencias a `railway.toml` ni a `railway up`.
Contrato: rollback: Revertir ambos documentos al commit previo.. Status: done
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: La imagen de server/Dockerfile construye leyendo solo server/ y el perfil de paridad de Compose levanta el backend respondiendo GET /health/ready 200 contra el PostgreSQL local.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5
- [x] S2.T6
- [x] S2.T7
- [x] S2.T8

**Gate (auto)**: El IaC `.railway/railway.ts` declara para `server` la fuente GitHub `edobacon/taomangalam` (branch main) con `rootDirectory = server` y `dockerfilePath = Dockerfile`, preDeploy `node_modules/.bin/prisma migrate deploy` con MIGRATION_DATABASE_URL, startCommand 0.0.0.0:$PORT, healthcheck /health/ready con timeout acotado, restart ON_FAILURE, numReplicas=1 y sin watchPatterns; validado con `railway config plan` sin cambios destructivos y aplicado si es seguro; `server/railway.toml` eliminado del repo.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4
- [x] S3.T5
- [x] S3.T6

**Gate (auto)**: El workflow manual de staging valida SHA de main + main.yml verde y despliega ESE SHA con `serviceInstanceDeploy(serviceId, environmentId, commitSha)` contra la API GraphQL de Railway (backboard.railway.com/graphql/v2) usando el token del GitHub Environment staging; NO usa `railway up`; corre el smoke de /health/live y /health/ready y registra SHA/version/digest; los scripts tunnel/studio rechazan produccion salvo flag y no imprimen la contrasena.

### Session 4 · T1 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3
- [x] S4.T4
- [x] S4.T5

**Gate (auto)**: La suite valida `.railway/railway.ts` (y falla si reaparece `server/railway.toml`); `docs/development/railway-staging.md` y `docs/development/release-runbook.md` reflejan IaC, el flujo `railway config plan/apply`, la migracion desde Config as Code y la brecha rootDirectory/watchPatterns; y la regresion de la etapa pasa.
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-02 (edit) `confirmed`: La config del deploy vive en `.railway/railway.ts` (Infrastructure as Code) y se aplica con `railway config plan/apply`: builder Dockerfile 
- REQ-04 (edit) `confirmed`: Ambiente staging en Railway con servicios `server` y `postgres` con volumen; el servicio `server` NO define `rootDirectory=/server` (el uplo
- REQ-05 (edit) `confirmed`: Workflow manual de staging que recibe un SHA, verifica que pertenece a main y que main.yml paso, hace checkout y ejecuta `railway up ./serve
- REQ-07 (edit) `inferred`: Documentacion actualizada a IaC: `docs/development/railway-staging.md` describe la config en `.railway/railway.ts`, el flujo `railway config
- REQ-10 (add) `inferred`: El archivo `.railway/railway.ts` se genera a partir del proyecto/ambiente staging YA aprovisionado y verificado (via `railway config pull`/`

**Tasks agregadas:**

- S2: Generar `.railway/railway.ts` a partir del proyecto staging ya aprovisionado (`railway config pull`/`migrate`) y ajustarlo para declarar builder Dockerfile con dockerfilePath `Dockerfile`, preDeploy `node_modules/.bin/prisma migrate deploy` con MIGRATION_DATABASE_URL, startCommand en 0.0.0.0:$PORT, healthcheck /health/ready con timeout acotado, restart ON_FAILURE y numReplicas=1; sin rootDirectory ni watchPatterns en el servicio `server`. (valida: REQ-02, REQ-04, REQ-10; rollback: Borrar `.railway/railway.ts` (git checkout del path); la plataforma sigue con la config vigente en el servicio, que no cambia hasta el apply.)
- S2: Validar el IaC con `railway config plan --environment staging` y revisar el diff propuesto (servicios, variables por referencia privada, volumen, dominio); aplicar con `railway config apply` solo si el plan no destruye ni recrea volumen, dominio ni variables, y dejar la salida del plan como evidencia. (valida: REQ-02, REQ-10; rollback: No aplicar; si ya se aplico, re-aplicar el IaC del commit anterior con `railway config apply` y verificar el servicio con `railway logs` + smoke de /health/ready.)
- S2: Eliminar `server/railway.toml` del repo y toda referencia a Config as Code en scripts y workflows (incluido cualquier `--config` o Config File Path), confirmando que el workflow manual sigue usando solo `railway up ./server --path-as-root --ci --environment staging --service server`. (valida: REQ-02, REQ-05; rollback: `git revert` del commit: restaura `server/railway.toml` y las referencias; la plataforma no lo lee, asi que no hay impacto en el deploy vivo.)
- S4: Reemplazar los tests que parsean `server/railway.toml` por tests que validan `.railway/railway.ts`: presencia y valores de builder/dockerfilePath, preDeploy con `prisma migrate deploy` y MIGRATION_DATABASE_URL, startCommand con 0.0.0.0:$PORT, healthcheckPath /health/ready con timeout, restart ON_FAILURE, numReplicas=1, y ausencia de rootDirectory/watchPatterns; mas un test de regresion que falla si reaparece `server/railway.toml`. (valida: REQ-02, REQ-04, test; rollback: `git revert` del commit de tests; la suite vuelve a los tests de toml (que fallarian por archivo ausente, por lo que el revert debe acompañar el revert de la eliminacion del toml).)
- S4: Actualizar `docs/development/railway-staging.md` y `docs/development/release-runbook.md` a IaC: config en `.railway/railway.ts`, flujo `railway config plan/apply`, nota de migracion desde `railway.toml` (Config as Code deprecado) y la brecha verificada de rootDirectory/watchPatterns con `railway up --path-as-root`; mantener la seccion de staging con despliegue manual por SHA y rollback no destructivo. (valida: REQ-07; rollback: `git revert` del commit de docs; solo afecta documentacion, sin impacto en runtime.)

### Enmienda 2
**REQs:**

- REQ-04 (edit) `confirmed`: Ambiente staging en Railway con servicios `server` y `postgres` con volumen; el servicio `server` usa la fuente GitHub `edobacon/taomangalam
- REQ-05 (edit) `confirmed`: Workflow manual de staging que recibe un SHA, verifica que pertenece a `main` y que `main.yml` paso en ese SHA, hace checkout y despliega ES
- REQ-02 (edit) `confirmed`: La config del deploy vive en `.railway/railway.ts` (Infrastructure as Code) y se aplica con `railway config plan/apply`: para el servicio `s

**Tasks agregadas:**

- S2: Ajustar `.railway/railway.ts` al Modelo B: declarar para el servicio `server` la fuente GitHub `edobacon/taomangalam` branch `main` con `rootDirectory = 'server'` y `dockerfilePath = 'Dockerfile'`, sin `watchPatterns`, manteniendo preDeploy (`prisma migrate deploy` con `MIGRATION_DATABASE_URL`), startCommand en `0.0.0.0:$PORT`, healthcheck `/health/ready` con timeout acotado, restart ON_FAILURE y numReplicas=1; correr `railway config plan` y confirmar que el plan no introduce cambios no intencionados en servicios, variables, volumen ni dominio antes de `railway config apply`. (valida: REQ-02, REQ-04, REQ-10; rollback: Revertir `.railway/railway.ts` al commit previo y re-aplicar con `railway config apply` la config anterior; el servicio sigue sirviendo el ultimo despliegue exitoso.)
- S2: Actualizar la validacion deterministica del IaC (`.railway/railway.ts`) para afirmar `rootDirectory = 'server'`, `dockerfilePath = 'Dockerfile'`, ausencia de `watchPatterns`, preDeploy con `prisma migrate deploy`, healthcheck `/health/ready`, restart ON_FAILURE y numReplicas=1; y verificar por grep que `server/railway.toml` no existe. (valida: REQ-02, test; rollback: Revertir el archivo de test al commit previo.)
- S3: Reescribir el paso de deploy del workflow manual de staging: eliminar `railway up ./server --path-as-root --ci` y reemplazarlo por una llamada a la mutacion GraphQL `serviceInstanceDeploy(serviceId, environmentId, commitSha)` contra `https://backboard.railway.com/graphql/v2`, autenticada con el token de proyecto del GitHub Environment `staging`, pasando el SHA validado; conservar intactas las guardas previas (SHA pertenece a `main`, `main.yml` verde) y el checkout, y propagar el fallo de la mutacion como fallo del job. (valida: REQ-05, REQ-04; rollback: Revertir el archivo del workflow al commit previo (version con `railway up`); no queda estado en la plataforma porque la mutacion no llega a invocarse.)
- S3: Ajustar el post-deploy del workflow a la ruta por SHA: esperar el despliegue resultante de `serviceInstanceDeploy`, correr el smoke de `GET /health/live` y `GET /health/ready` contra la URL de staging (fallo del smoke ⇒ exit distinto de 0) y escribir en el summary el SHA desplegado, la version y el digest devueltos por Railway. (valida: REQ-05; rollback: Revertir los pasos de smoke y summary al commit previo; el despliegue ya aplicado no se toca (rollback de plataforma es redesplegar el SHA anterior).)
- S3: Actualizar los tests deterministas de las guardas del workflow y de los scripts auxiliares a la ruta de deploy por SHA: la guarda rechaza un SHA que no pertenece a `main` y un SHA con `main.yml` no verde antes de emitir cualquier request a `backboard.railway.com`; el workflow no contiene `railway up` ni `--path-as-root`; el payload de `serviceInstanceDeploy` incluye `serviceId`, `environmentId` y el `commitSha` validado; el token nunca se imprime en logs. (valida: REQ-05, test; rollback: Revertir los archivos de test al commit previo.)
- S4: Actualizar la documentacion al Modelo B: en `docs/development/railway-staging.md` describir la fuente GitHub con `rootDirectory = server`, por que `railway up --path-as-root` es incompatible con ella (brecha verificada) y el flujo `railway config plan/apply`; en `docs/development/release-runbook.md` reescribir la seccion de staging con el despliegue manual por SHA via `serviceInstanceDeploy` y el rollback no destructivo (redesplegar el SHA anterior), sin referencias a `railway.toml` ni a `railway up`. (valida: REQ-07, REQ-05, REQ-04; rollback: Revertir ambos documentos al commit previo.)
