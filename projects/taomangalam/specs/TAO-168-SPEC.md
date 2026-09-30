---
id: TAO-168-SPEC
project: taomangalam
ticket: TAO-168
status: approved
---

# HU-00-15 · Fastlane base con lanes de build sin firma y estructura de lanes internas sin credenciales

## Resumen ejecutivo

Se incorpora Fastlane a `app/` con Ruby fijado (`.ruby-version` + `Gemfile`/`Gemfile.lock` versionado, DEC-230) y lanes sin firma (APK `development` debug y build iOS Simulator) que reemplazan los `flutter build` sueltos de `ci-pr.yml`, conservando los artifacts y `quality-gate` verdes. Se declara la estructura de lanes internas (`mobile-internal`) que se detienen sin credenciales en el primer paso, nombrando la variable faltante y sin llamar a las tiendas. NO incluye `match`, firma real, TestFlight, Play Internal Testing ni `mobile-release` (EP-17). Se sabe que funciona cuando: `bundle install --frozen` no altera el lockfile, `build-smoke`/`ios-simulator` publican los mismos artifacts vía lanes, la lane interna sin credenciales sale != 0 nombrando la variable, y un PR con `.mobileprovision`/`.p12`/`.keystore`/`.jks` falla en `metadata`. Tamaño: ~3 sesiones, riesgo bajo.

## Requirements

### REQ-01 `confirmed`
> Fuente: docs/product/decisiones/DEC-230-criterios-tecnicos-de-la-base-m0.md:48

El toolchain Ruby/Fastlane queda fijado y reproducible: `app/.ruby-version`, `app/Gemfile` con la gema `fastlane` y `app/Gemfile.lock` versionado; `bundle install --frozen` instala la versión fijada sin modificar el lockfile y CI usa la misma Ruby que declara `.ruby-version`.

### REQ-02 `confirmed`
> Fuente: .github/workflows/ci-pr.yml:749

Existen lanes de build sin firma en `app/fastlane/` que producen el APK `development` debug (equivalente al de HU-00-11) y el build de iOS Simulator, y registran versión, build y SHA en el summary de la lane.

### REQ-03 `confirmed`
> Fuente: .github/workflows/ci-pr.yml:680

`build-smoke` e `ios-simulator` de `ci-pr.yml` invocan las lanes con `bundle exec` (tras fijar Ruby) en lugar de los `flutter build` sueltos, y publican los mismos artifacts (`*-development-apk` y `ios-simulator`) de modo que `quality-gate` queda verde con los mismos `needs`.

### REQ-04 `confirmed`
> Fuente: docs/product/tecnologia/25_distribucion_movil_y_tiendas.md:35

La estructura de lanes internas (`mobile-internal`) declara los pasos (versión y build únicos, firma y subida a canales internos) y, sin credenciales, se detiene en el primer paso con código distinto de 0 y un mensaje que nombra la variable de entorno faltante, sin mostrar valores ni llamar a APIs de tiendas.

### REQ-05 `confirmed` `enforcement`
> Fuente: docs/product/tecnologia/25_distribucion_movil_y_tiendas.md:29

Ninguna lane, job ni artifact incorpora certificados, perfiles, keys o credenciales: los jobs de build producen binarios sin firma y los jobs de lanes internas no reciben secretos en PRs de forks (fail-closed).

### REQ-06 `confirmed`
> Fuente: scripts/ci-pr-metadata.sh:79

La regla de `metadata` rechaza extensiones de firma: un PR que agrega un archivo `.mobileprovision`, `.provisionprofile`, `.p12`, `.jks` o `.keystore` hace fallar el job `metadata`.

### REQ-07 `confirmed`
> Fuente: docs/development/release-runbook.md:1

`docs/development/release-runbook.md` documenta la ejecución local de las lanes (prerequisitos de Ruby/bundler y el comando `bundle exec fastlane …`) sin alterar la sección de staging ni el rollback existentes.
## Tasks

#### S1.T1 — Fijar el toolchain Ruby/Fastlane de `app/`: crear `app/.ruby-version` y `app/Gemfile` con la gema `fastlane`, generar y versionar `app/Gemfile.lock`, y excluir de Git los reportes locales de fastlane.
Contrato: rollback: Eliminar `app/.ruby-version`, `app/Gemfile`, `app/Gemfile.lock` y las entradas nuevas de `app/.gitignore`.. Status: done

#### S1.T1.1 — Crear `app/.ruby-version` (versión fijada) y `app/Gemfile` declarando `fastlane` con versión pinneada.
Contrato: rollback: Borrar ambos archivos.. Status: done

#### S1.T1.2 — Generar `app/Gemfile.lock` con `bundle install`/`bundle lock` y confirmar que `bundle install --frozen` no lo modifica.
Contrato: rollback: Borrar `app/Gemfile.lock`.. Status: done

#### S1.T2 — Crear `app/fastlane/Fastfile` (y `Appfile` si aplica) con las lanes de build sin firma: APK `development` debug y build iOS Simulator, registrando versión, build y SHA en el summary.
Contrato: rollback: Eliminar `app/fastlane/`.. Status: done

#### S1.T2.1 — Lane Android sin firma que reproduce `flutter build apk --debug --flavor development --target lib/main_development.dart` y deja `app-development-debug.apk`.
Contrato: rollback: Eliminar la lane Android del Fastfile.. Status: done

#### S1.T2.2 — Lane iOS sin firma que reproduce `flutter build ios --simulator --debug --flavor development --target lib/main_development.dart` y deja `Runner.app`.
Contrato: rollback: Eliminar la lane iOS del Fastfile.. Status: done

#### S1.T3 — Cablear `ci-pr.yml` para que `build-smoke` e `ios-simulator` fijen Ruby desde `app/.ruby-version`, instalen con `bundle install --frozen` y ejecuten las lanes con `bundle exec`, preservando nombres de artifacts y `needs` de `quality-gate`.
Contrato: rollback: Revertir los pasos de `build-smoke`/`ios-simulator` a los `flutter build` sueltos.. Status: done

#### S1.T3.1 — En `build-smoke`: setup de Ruby (action pinneada por SHA, leyendo `app/.ruby-version`), `bundle install --frozen` en `app/` e invocación de la lane Android, conservando el artifact `*-development-apk`.
Contrato: rollback: Quitar el setup de Ruby y volver al paso `flutter build apk` directo.. Status: done

#### S1.T3.2 — En `ios-simulator`: setup de Ruby, `bundle install --frozen` e invocación de la lane iOS, conservando el artifact `ios-simulator`.
Contrato: rollback: Quitar el setup de Ruby y volver al paso `flutter build ios` directo.. Status: done

#### S1.T4 — Regresión de CI: test que fija que `build-smoke`/`ios-simulator` usan `bundle exec fastlane`, que el toolchain está pinneado (`.ruby-version` + `Gemfile.lock` versionado) y que los artifacts y `needs` de `quality-gate` no cambiaron.
Contrato: rollback: Eliminar el test nuevo.. Status: done

#### S2.T1 — Declarar las lanes internas (`mobile-internal`) en `app/fastlane/`: pasos de versión/build únicos, firma y subida a canales internos, cada uno como step/lane, con una guarda al inicio que corta si falta la credencial.
Contrato: rollback: Eliminar las lanes internas y su guarda del Fastfile.. Status: pending

#### S2.T1.1 — Declarar los pasos de la lane interna (versión/build únicos, firma y subida) sin implementar firma real (fuera de alcance, EP-17).
Contrato: rollback: Eliminar los pasos internos del Fastfile.. Status: pending

#### S2.T1.2 — Implementar la guarda que valida las variables de entorno al inicio: si falta, corta con código != 0 nombrando la variable y sin exponer su valor ni invocar APIs.
Contrato: rollback: Eliminar la guarda de credenciales.. Status: pending

#### S2.T2 — Test de regresión de la guarda: sin credenciales la lane interna sale != 0 nombrando la variable faltante; el mensaje no contiene ningún valor y no se ejecuta ninguna llamada a tiendas.
Contrato: rollback: Eliminar el test nuevo.. Status: pending

#### S3.T1 — Endurecer `scripts/ci-pr-metadata.sh`: ampliar la regex de archivos prohibidos para incluir `.mobileprovision` y `.provisionprofile` (las demás extensiones de firma ya están cubiertas).
Contrato: rollback: Revertir la regex a su versión previa.. Status: pending

#### S3.T2 — Documentar en `docs/development/release-runbook.md` la ejecución local de las lanes (prerequisitos Ruby/bundler y `bundle exec fastlane …`), sin tocar la sección de staging ni el rollback.
Contrato: rollback: Revertir la sección nueva del runbook.. Status: pending

#### S3.T3 — Ampliar `tests/test_ci_pr_ruleset.py` con los casos de `.mobileprovision`/`.provisionprofile` y conservar la regresión de `.p12`/`.keystore`/`.jks`.
Contrato: rollback: Eliminar los casos de test nuevos.. Status: pending
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
- [x] S1.T3.1
- [x] S1.T3.2
- [x] S1.T4

**Gate (auto)**: En un PR que cambia `app/`, `build-smoke` corre `bundle exec fastlane` y publica el artifact `*-development-apk` con el APK development; `ios-simulator` publica `Runner.app`; `quality-gate` queda verde con los mismos artifacts.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T2

**Gate (auto)**: Ejecutar la lane interna sin credenciales (`cd app && bundle exec fastlane <lane interna>`) termina con código != 0 nombrando la variable de entorno faltante, sin imprimir valores ni llamar a las APIs de tiendas.

### Session 3 · T1 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: Un PR que agrega `.mobileprovision` (o `.p12`/`.keystore`/`.jks`) queda rojo en `metadata`; `docs/development/release-runbook.md` documenta la ejecución local de las lanes y `tests/test_release_runbook.py` sigue verde.
