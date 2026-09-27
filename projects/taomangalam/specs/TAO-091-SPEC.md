---
id: TAO-091-SPEC
project: taomangalam
ticket: TAO-091
status: approved
---

# HU-00-02 · Esqueleto Flutter con sabores aislados, configuración tipada, Atomic Design, Riverpod y analyzer estricto

## Resumen ejecutivo

Se crea el esqueleto Flutter de app/ (HU-00-02): FVM fija Flutter 3.47.2, sabores development/staging/production aislados en Android e iOS con id, nombre e ícono propios, configuración tipada por sabor validada al arrancar, estructura Atomic Design más capas, Riverpod y analyzer estricto. NO incluye tema/componentes/shell/navegación/i18n (EP-01), Drift ni dominio/persistencia (EP-06), cliente Dart generado (HU-00-08), plugins nativos (HU-00-03) ni el panel DevTools de development (HU-00-19). Se verifica con criterios observables: `fvm flutter --version` informa 3.47.2; los tres APK debug coexisten con id y nombre distintos; `flutter build ios --simulator --flavor development` compila; la validación falla nombrando la clave sin exponer valores y ante endpoints locales en production; y format/analyze/custom_lint/test --coverage terminan en verde con LCOV. Tamaño: 4 sesiones (T1/T1/T2/T2), dentro del techo de entrada. ADVERTENCIA (pendiente externo): el identificador base de aplicación y los sufijos por sabor (tecnologia/25) deben fijarse antes de iniciar la sesión de sabores; no se derivan del código.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:108

app/ fija Flutter 3.47.2 stable con FVM y su archivo de versión versionado; `fvm flutter --version` dentro de app/ informa Flutter 3.47.2 stable.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/product/decisiones/DEC-198-baseline-tecnico-y-selecciones-v1.md:22

Android e iOS declaran el baseline nativo (Android minSdk 24, compileSdk y targetSdk 36, Java 17; iOS/iPadOS mínimo 15) y exponen tres sabores development/staging/production aislados, cada uno con identificador de aplicación, nombre visible e ícono secundario propios.

### REQ-03 `inferred`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:125

La configuración tipada por sabor se genera desde archivos no secretos versionados, se valida al arrancar con fallo temprano y mensaje accionable que nombra la clave sin mostrar valores, y el sabor production no puede apuntar a servicios locales.

### REQ-04 `inferred`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:114

app/lib se organiza en las capas core, data, design_system/{atoms,molecules,organisms,templates} y features/<feature>/{application,presentation}, con una pantalla inicial provisional sin contenido de producto.

### REQ-05 `inferred`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:118

La app integra flutter_riverpod y riverpod_generator (DEC-158) con riverpod_lint y custom_lint, de modo que un provider generado compila y `dart run custom_lint` queda en verde.

### REQ-06 `inferred`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:108

app/analysis_options.yaml es estricto sobre flutter_lints (strict-casts, strict-inference, strict-raw-types más las reglas mínimas de tecnologia/17 §4), de modo que format, analyze --fatal-infos --fatal-warnings y custom_lint terminan en código 0 y un print o una llamada dinámica en lib/ los hace fallar.
## Tasks

#### S1.T1 — Fijar Flutter 3.47.2 stable con FVM en app/ y versionar el archivo de versión (.fvmrc) junto al SDK Dart del propio toolchain.
Contrato: rollback: Eliminar app/.fvmrc, el directorio .fvm/ y el wrapper generado; app/ queda sin pin de toolchain.. Status: done

#### S1.T2 — Generar el proyecto Flutter en app/ con baseline nativo: Android minSdk 24, compileSdk y targetSdk 36 y Java 17; iOS/iPadOS mínimo 15 declarado en los proyectos nativos.
Contrato: rollback: Eliminar app/ completo (android/, ios/, lib/, pubspec.yaml) sin tocar el resto del monorepo.. Status: done

#### S1.T3 — Crear app/analysis_options.yaml sobre flutter_lints con strict-casts, strict-inference, strict-raw-types y las reglas mínimas de tecnologia/17 §4.
Contrato: rollback: Restaurar el analysis_options.yaml por defecto generado por flutter create.. Status: done

#### S1.T4 — Regresión de scaffold: dejar `dart format --output=none --set-exit-if-changed .`, `flutter analyze --fatal-infos --fatal-warnings` y `dart run custom_lint` en código 0 sobre el proyecto base.
Contrato: rollback: n/a: no muta fuentes; si falla, corregir analysis_options.yaml del paso previo.. Status: done

#### S2.T1 — Configurar los flavors de Android (development/staging/production) con applicationId y sufijo por sabor, app label visible e ícono secundario por sabor.
Contrato: rollback: Revertir android/app/build.gradle(.kts) y eliminar los recursos de ícono por sabor.. Status: done

#### S2.T2 — Configurar los schemes y configuraciones de iOS por sabor con bundle id, nombre visible e ícono propios.
Contrato: rollback: Revertir el proyecto Xcode/Info.plist y retirar los assets de ícono por sabor.. Status: done

#### S2.T3 — Regresión de sabores: compilar los tres APK debug con --flavor, correr `flutter build ios --simulator --flavor development` y verificar que los tres coexisten con id/nombre distintos en el mismo emulador.
Contrato: rollback: n/a: no muta fuentes; si falla, corregir la configuración de flavors del paso previo.. Status: done

#### S3.T1 — Crear la estructura de capas app/lib/core, app/lib/data, app/lib/design_system/{atoms,molecules,organisms,templates} y app/lib/features/<feature>/{application,presentation} según tecnologia/05.
Contrato: rollback: Eliminar los directorios creados bajo app/lib/ y volver al layout generado por flutter create.. Status: done

#### S3.T2 — Implementar la pantalla inicial provisional sin contenido de producto y engancharla como home de la app.
Contrato: rollback: Retirar la pantalla provisional y volver al home generado por flutter create.. Status: done

#### S3.T3 — Agregar flutter_riverpod y riverpod_generator (build_runner) con riverpod_lint y custom_lint, y definir un provider generado de ejemplo.
Contrato: rollback: Quitar las dependencias de pubspec.yaml, borrar los archivos .g.dart generados y el custom_lint.yaml.. Status: done

#### S3.T4 — Widget test de la pantalla provisional y verificación de `dart run custom_lint` con riverpod_lint en verde.
Contrato: rollback: n/a: no muta fuentes.. Status: done

#### S4.T1 — Definir la configuración tipada por sabor generada desde archivos no secretos versionados (uno por sabor) y accesible por la app.
Contrato: rollback: Eliminar los archivos de configuración por sabor y el modelo tipado generado.. Status: done

#### S4.T2 — Implementar la validación al arrancar: fallo temprano con mensaje que nombra la clave sin exponer valores, y regla que impide que production apunte a localhost, 127.0.0.1, 10.0.2.2 o IP de red privada.
Contrato: rollback: Revertir el validador y su llamada de arranque.. Status: done

#### S4.T3 — Unit tests de validación (valores válidos, claves ausentes/inválidas y endpoints locales en production) y correr `flutter test --coverage` para producir LCOV.
Contrato: rollback: n/a: no muta fuentes.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: app/lib se organiza en las capas core, data, design_system/{atoms,molecules,organisms,templates} y features/<feature>/{application,presentation}, con una pantalla inicial provisional sin contenido de producto.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: En app/, `fvm flutter --version` informa Flutter 3.47.2 stable y `flutter analyze --fatal-infos --fatal-warnings`/`dart format`/`dart run custom_lint` terminan en código 0 sobre el proyecto base vacío con la configuración nativa del baseline ya declarada.

### Session 2 · T1 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: Los tres APK debug (development/staging/production) se instalan a la vez en un mismo emulador con identificadores y nombres visibles distintos, y `flutter build ios --simulator --flavor development` compila sin errores.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: La app arranca en un sabor dev mostrando la pantalla provisional sobre el árbol app/lib/core, data, design_system/{atoms,molecules,organisms,templates} y features/<feature>/{application,presentation}, y `dart run custom_lint` queda en verde con riverpod_lint.

### Session 4 · T2 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3

**Gate (auto)**: Cada sabor carga su configuración tipada; quitar una clave obligatoria o poner `http://10.0.2.2` en production hace fallar el arranque nombrando la clave, y `flutter test --coverage` produce LCOV con los unit tests de validación en verde.

### Session 5 · T0 · continue
