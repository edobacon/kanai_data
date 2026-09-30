---
id: TAO-164-SPEC
project: taomangalam
ticket: TAO-164
status: approved
---

# HU-00-11 · Build instalable en el PR de cierre (APK `development` y iOS Simulator selectivo) y paquete `qa:bundle`

## Resumen ejecutivo

Publica, en el PR de cierre `epic/<EP-xx> -> main` (y en `nightly.yml`), un APK `development` instalable y un build de iOS Simulator selectivo como artifacts de Actions, y agrega `pnpm qa:bundle` que reune APK, reporte de pruebas, cobertura y catalogo Widgetbook con un manifiesto (SHA, sabor, fecha). NO incluye builds firmados/TestFlight/Play Internal (EP-17), capturas de vistas (llegan con EP-01) ni lanes de Fastlane (HU-00-15). Se verifica observando los artifacts descargables y el summary del PR (enlaces + instrucciones de instalacion), con `quality-gate` rojo si el build iOS falla. Tamano estimado: 3 sesiones T2 (~3 puntos); el techo de 4 no se excede. ADVERTENCIA 1: el request original decia "APK por cada PR"; la Adenda 1 lo alinea a DEC-239 (los jobs pesados solo corren en PRs a `main`), asi que el APK/iOS salen en el cierre de la epica y en `nightly`, no en cada ticket. ADVERTENCIA 2: la parte "siempre en `nightly.yml`" depende de HU-00-10/TAO-166 (`nightly.yml` aun no existe); confirmar el orden relativo TAO-166/TAO-164 antes de ejecutar, porque esta planificado como una task que lo requiere.

## Requirements

### REQ-01 `confirmed`
> Fuente: .github/workflows/ci-pr.yml:727

Cuando un PR hacia `main` cambia `app/`, `build-smoke` publica el APK debug del sabor `development` como artifact de Actions con el SHA corto y el sabor en el nombre, retenido 30 dias y descargable para instalar.

### REQ-02 `confirmed`
> Fuente: .github/workflows/ci-pr.yml:665

El build de iOS Simulator corre en runner macOS solo cuando el PR hacia `main` cambia `app/ios/**`, `app/pubspec.yaml` o `app/pubspec.lock`, y siempre en `nightly.yml`; se publica como artifact instalable con `xcrun simctl install`; si se omite, el summary explica el motivo; y si el build falla, `build-smoke` y `quality-gate` quedan rojos.

### REQ-03 `confirmed`
> Fuente: docs/product/tecnologia/18_experiencia_de_desarrollo_y_qa_humana.md:80

`pnpm qa:bundle` (local y en CI) produce un paquete con el APK, el reporte de pruebas, la cobertura, el catalogo Widgetbook cuando esta disponible y un manifiesto con SHA, sabor y fecha, donde el SHA coincide con `HEAD`; en CI se publica como artifact retenido 30 dias.

### REQ-04 `confirmed`
> Fuente: scripts/resumen_ci.py:1

El summary del PR expone los enlaces de descarga del APK, del build de iOS Simulator y del `qa:bundle` con instrucciones de instalacion, e indica el motivo cuando no hay APK o cuando el build iOS se omitio.

### REQ-05 `confirmed` `enforcement`
> Fuente: .github/workflows/ci-pr.yml:884

Los jobs y pasos nuevos respetan la convencion del repo: cada `uses:` fijado a SHA completo, `permissions` minimos por job y todo `upload-artifact` declarando `retention-days: 30`.

### REQ-06 `confirmed` `variant`
> Fuente: docs/development/flujo-por-epica.md:51

Alineado a DEC-239 y a la Adenda 1, los jobs pesados (incluido el APK y el iOS) corren solo en PRs hacia `main` y en `nightly`, y quedan `skipped` en los PRs `feat/* -> epic/*`.
## Tasks

#### S1.T1 — Crear `scripts/dev/qa-bundle.mjs` con dos modos: `build` (local: compila el APK development, corre `flutter test --coverage` y compila el catalogo Widgetbook) y `assemble` (reusa APK/artifacts ya presentes); ambos escriben `dist/qa-bundle/` con el APK, el reporte, la cobertura, el catalogo (si existe) y `qa-bundle.json` con SHA, sabor y fecha.
Contrato: rollback: Eliminar `scripts/dev/qa-bundle.mjs` y el directorio generado `dist/` (no versionado); sin cambios en el codigo de la app.. Status: done

#### S1.T2 — Registrar el comando en `scripts/dev/catalog.mjs` (resumen y pasos), enrutarlo en `scripts/dev/cli.mjs` y exponer `qa:bundle` en el `package.json` raiz; documentarlo en `docs/development/commands.md` con `pnpm run qa:bundle` para que el job `dev-commands` no quede rojo.
Contrato: rollback: Revertir `catalog.mjs`, `cli.mjs`, `package.json` y `commands.md` al estado previo y quitar el comando.. Status: done

#### S1.T3 — Agregar `scripts/dev/qa-bundle.test.mjs` (node --test) con fixtures que asertan: `qa-bundle.json` con `sha` igual al valor de `git rev-parse HEAD` inyectado, sabor `development` y fecha ISO; presencia de apk/lcov/reporte; y que sin APK disponible la corrida falla con mensaje accionable.
Contrato: rollback: Eliminar el test; no afecta la app ni el comando.. Status: done

#### S2.T1 — En el job `build-smoke` de `ci-pr.yml`, subir el APK de `flutter build apk --debug --flavor development` como artifact con nombre `<sha-corto>-development.apk` y `retention-days: 30`.
Contrato: rollback: Quitar el paso `upload-artifact` del APK; el build Android debug previo se mantiene intacto.. Status: pending

#### S2.T2 — Agregar un job `qa-bundle` en `ci-pr.yml` (solo PRs a `main`) que descarga `flutter-coverage-lcov`, `widgetbook-web` y el APK, corre `node scripts/dev/qa-bundle.mjs assemble` y sube `qa-bundle` con `retention-days: 30`.
Contrato: rollback: Eliminar el job, sus descargas y su artifact; el resto de `ci-pr` queda igual.. Status: pending

#### S2.T3 — Extender `scripts/resumen_ci.py` para listar los enlaces de descarga del APK, del build de Simulator y del `qa-bundle`, las instrucciones de instalacion (`adb install`, `xcrun simctl install`) y el motivo cuando falte el APK o el build iOS.
Contrato: rollback: Revertir `resumen_ci.py` al resumen previo (jobs, cobertura, duraciones).. Status: pending

#### S2.T4 — Agregar un test de contrato (Node en `scripts/dev/` o Python en `tests/`) que parsea `ci-pr.yml` y asertan: los artifacts del APK y del `qa-bundle` declaran `retention-days: 30`, cada job nuevo declara `permissions` y cada `uses:` esta fijado a SHA completo.
Contrato: rollback: Eliminar el test; no afecta el workflow.. Status: pending

#### S3.T1 — En el job `changes` de `ci-pr.yml`, agregar el output `ios` que se pone `true` cuando el diff toca `^app/ios/`, `^app/pubspec\.yaml$` o `^app/pubspec\.lock$`.
Contrato: rollback: Quitar el output `ios` y su calculo; los filtros `app`/`server`/`code` quedan intactos.. Status: pending

#### S3.T2 — Agregar el job `ios-simulator` (runner macOS, `if: github.base_ref == 'main' && needs.changes.outputs.ios == 'true'`, `flutter build ios --simulator --debug --flavor development`, `upload-artifact` con `retention-days: 30`); sumarlo a `quality-gate.needs` y pasar el motivo de omision al summary.
Contrato: rollback: Eliminar el job, su artifact y su entrada en `quality-gate.needs`; el gate vuelve a su conjunto previo.. Status: pending

#### S3.T3 — Agregar el build de iOS Simulator a `nightly.yml` (siempre, sin filtro de rutas). DEPENDE de HU-00-10/TAO-166 (`nightly.yml` aun no existe): confirmar el orden relativo TAO-166/TAO-164 antes de ejecutar; si aun no existe, no crear `nightly.yml` dentro de este ticket y reportar el bloqueo.
Contrato: rollback: Quitar el paso/job de iOS de `nightly.yml`; si el archivo no existe, no hay nada que revertir.. Status: pending

#### S3.T4 — Agregar un test de contrato que asertan: el `if` del job `ios-simulator` combina `base_ref == 'main'` con el output `ios`, `ios-simulator` figura en `quality-gate.needs`, y un PR `feat/* -> epic/*` deja `build-smoke` e `ios-simulator` como `skipped`.
Contrato: rollback: Eliminar el test; no afecta los workflows.. Status: pending
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: `pnpm qa:bundle` deja `dist/qa-bundle/` con APK, reporte, cobertura, catalogo y `qa-bundle.json` (sha == HEAD); `node --test scripts/dev/qa-bundle.test.mjs` verde.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: En un PR a `main` que cambia `app/`, Actions muestra el artifact del APK y el `qa-bundle` descargables y el summary con enlaces e instrucciones; el test de contrato verde.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4

**Gate (auto)**: En un PR a `main` que cambia `app/ios/**` Actions muestra el artifact del build de iOS Simulator instalable con `xcrun simctl install`; en un PR solo Dart el summary explica la omision; un error iOS deja `quality-gate` rojo; el test verde.
