---
id: TAO-162-SPEC
project: taomangalam
ticket: TAO-162
status: approved
---

# HU-00-12 · Widgetbook como app Flutter separada con fixtures compartidas y catálogo web publicado por PR

## Resumen ejecutivo

Se crea `app/widgetbook/` como paquete Flutter propio (pubspec con dependencia por path al paquete de la app), con addons de teléfono/tablet, orientaciones, escala de texto normal y aumentada, tema claro único sin selector oscuro (DEC-196) y movimiento normal/reducido; una fixture compartida y un caso de uso de ejemplo sobre `design_system`; los comandos raíz `pnpm dev:catalog` y `pnpm docs:catalog` registrados en el CLI existente (`scripts/dev/catalog.mjs:21`, `cli.mjs:102`); y un job en `ci-pr.yml` que en PR con `app/` compila el build web y lo publica como artifact sumado a `quality-gate`. NO se hacen componentes, vistas ni goldens reales (EP-01), ni hosting de previews efímeras (tecnologia/18 §14), ni Widgetbook Cloud. Se verifica de forma observable: `pnpm dev:catalog` abre el caso de uso con hot reload, los knobs redibujan en tablet/texto aumentado/movimiento reducido, `fvm flutter pub deps` en `app/` no lista `widgetbook`, `pnpm check` sigue verde y el artifact del PR se abre servido localmente sin `.env` ni tokens. Tamaño: 3 sesiones (T2+T1+T1), ~3 puntos. ADVERTENCIAS (fuera del request, no son requirements nuevos): (1) `app/lib/design_system/*` hoy solo tiene `.gitkeep`, así que el "caso de uso de ejemplo sobre el design_system" obliga a crear un átomo mínimo de ejemplo; (2) las fixtures se ubican bajo `app/lib/design_system/fixtures/` para que las importen por `package:tao_mangalam/...` tanto `app/test/` como el paquete del catálogo — la alternativa (paquete `app/fixtures/` aparte) se descarta por costo frente a 3 puntos, pero deja las fixtures dentro del paquete de la app; (3) al ser un paquete anidado dentro de `app/`, hay que excluirlo de `analysis_options.yaml` y del `dart format` de `app/` o `pnpm check` y `flutter-static` se rompen.

## Requirements

### REQ-01 `confirmed`
> Fuente: docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1227

Existe `app/widgetbook/` como paquete Flutter independiente, con su propio `pubspec.yaml` que depende por path del paquete `tao_mangalam` (`app/`) y declara `widgetbook` + su generador de anotaciones SOLO ahí, y un entrypoint con la app del catálogo.

### REQ-02 `confirmed`
> Fuente: docs/product/tecnologia/18_experiencia_de_desarrollo_y_qa_humana.md:161

El catálogo expone controles de dispositivo teléfono y tablet con las orientaciones admitidas, escala de texto normal y aumentada, movimiento normal y reducido, y un único tema claro con el selector técnico de oscuro oculto (DEC-196); cambiar un control redibuja el caso de uso.

### REQ-03 `inferred`
> Fuente: docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1232

Las fixtures del catálogo viven en una única ubicación dentro del paquete de la app (`app/lib/design_system/fixtures/`), importable por `package:tao_mangalam/...` desde los widget tests de `app/test/`, desde los golden tests futuros y desde el caso de uso del catálogo; no hay copia duplicada de los datos de ejemplo.

### REQ-04 `confirmed`
> Fuente: app/lib/design_system/atoms/.gitkeep

Hay un átomo de ejemplo mínimo en `app/lib/design_system/atoms/` y su caso de uso `@UseCase` en el catálogo, alimentado por la fixture compartida, más un widget test en `app/test/` que ejercita ese mismo átomo con la misma fixture: la tubería componente → fixture → caso de uso → test queda validada de punta a punta.

### REQ-05 `confirmed`
> Fuente: scripts/dev/catalog.mjs:21

`pnpm dev:catalog` y `pnpm docs:catalog` abren el MISMO catálogo con hot reload, registrados en el catálogo de comandos raíz existente (`scripts/dev/catalog.mjs`) y despachados por `scripts/dev/cli.mjs` con el contrato común de fallo (comando exacto + enlace de troubleshooting), y quedan documentados en `docs/development/commands.md` con su ancla en `debugging.md`.

### REQ-06 `confirmed`
> Fuente: .github/workflows/ci-pr.yml:743

El workflow `ci-pr.yml` gana un job que, cuando el PR toca `app/` (`needs.changes.outputs.app == 'true'`), compila el build web estático del catálogo con el Flutter de `app/.fvmrc` y lo publica con `upload-artifact` y `retention-days: 30`; el job se suma al `needs` de `quality-gate` y del `summary`, de modo que su fallo deja el check obligatorio en rojo.

### REQ-07 `confirmed`
> Fuente: docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1260

El build web publicado no contiene secretos: el job verifica automáticamente, antes de subir el artifact, que el directorio de build no incluya archivos `.env`, tokens ni endpoints de ambientes, y falla si los encuentra.

### REQ-08 `confirmed` `enforcement`
> Fuente: app/analysis_options.yaml:32

`widgetbook` no entra en la app de producción ni rompe sus gates: `fvm flutter pub deps` en `app/` no lo lista, y el paquete anidado `app/widgetbook/` queda excluido del `dart format`, del `flutter analyze` y del `custom_lint` de `app/` sin dejar de analizarse por su propia cuenta.

### REQ-09 `confirmed` `enforcement`
> Fuente: app/lib/main.dart:32

El catálogo reusa lo real y no lo reinventa: monta el caso de uso con el MISMO `ThemeData` claro que la app (fuente única compartida con `app/lib/main.dart`) e invoca el toolchain vía `fvm` según `app/.fvmrc`, igual que el resto de los comandos y jobs.
## Tasks

#### S1.T1 — Crear el paquete `app/widgetbook/` (pubspec con `tao_mangalam` por path a `..`, `widgetbook` + `widgetbook_annotation` + `widgetbook_generator` + `build_runner` solo aquí, `environment.sdk` alineado con `app/pubspec.yaml:33`, `publish_to: none`), su `analysis_options.yaml` propio, `.gitignore` y el entrypoint `lib/main.dart` con la app anotada `@widgetbook.App`. Verificar con `fvm flutter pub get` que resuelve.
Contrato: rollback: Borrar el directorio `app/widgetbook/` completo; nada fuera de él cambió todavía.. Status: done

#### S1.T2 — Extraer el `ThemeData` claro hoy inline en `app/lib/main.dart:32` a una ubicación compartida del design system (fuente única), dejar `main.dart` consumiéndolo, y crear un átomo de ejemplo mínimo en `app/lib/design_system/atoms/` (widget sin reglas de negocio, sin dependencia de `tao_mangalam_api` ni providers) que reemplace el `.gitkeep`.
Contrato: rollback: Revertir el archivo del tema compartido y el átomo, devolviendo el `ThemeData` inline a `main.dart` y restaurando `app/lib/design_system/atoms/.gitkeep`.. Status: done

#### S1.T3 — Crear las fixtures compartidas en `app/lib/design_system/fixtures/` (datos deterministas, sin `DateTime.now()` ni `Random` sin semilla) y el caso de uso `@UseCase` del átomo en `app/widgetbook/lib/` que las consume por `package:tao_mangalam/...`; correr el generador (`fvm dart run build_runner build`) y dejar el `.directories.g.dart` versionado según el criterio ya usado para los `.g.dart` de la app.
Contrato: rollback: Borrar el directorio de fixtures, el caso de uso y el archivo generado; el catálogo vuelve a la app vacía de la task anterior.. Status: done

#### S1.T4 — Configurar los addons del catálogo: dispositivos teléfono y tablet con las orientaciones admitidas, escala de texto normal y aumentada, movimiento normal y reducido (propagando `MediaQuery.disableAnimations`), y un único tema claro tomado del tema compartido, SIN registrar un knob/selector de tema oscuro (DEC-196).
Contrato: rollback: Quitar la lista de addons del entrypoint del catálogo; el caso de uso sigue visible sin controles.. Status: done

#### S1.T5 — Batería de la sesión: widget test en `app/test/design_system/` que renderiza el átomo con la MISMA fixture y asserta su valor concreto; prueba de que cambiar la fixture cambia el assert; y regresión de `fvm flutter test` en `app/` (widget_test, config, contract) más `fvm flutter pub get` de ambos paquetes.
Contrato: rollback: Eliminar el archivo de test nuevo; las suites preexistentes de `app/test/` quedan como estaban.. Status: done

#### S2.T1 — Registrar `dev:catalog` y `docs:catalog` como comandos raíz: scripts en `package.json` delegando a `scripts/dev/cli.mjs`, entradas en `COMMANDS` de `scripts/dev/catalog.mjs:21` con sus pasos (`fvm flutter run -d chrome` con `cwd: app/widgetbook`) en un módulo nuevo, reusando `runSteps`/`failureMessage` de `scripts/dev/lib.mjs` sin duplicar el contrato de fallo. Ambos comandos comparten los MISMOS pasos.
Contrato: rollback: Quitar las dos entradas de `COMMANDS`, el módulo de pasos y los dos scripts del `package.json`; el CLI vuelve a los siete comandos previos.. Status: done

#### S2.T2 — Documentar los comandos: sección de `pnpm run dev:catalog` y `pnpm run docs:catalog` en `docs/development/commands.md` y encabezados con anclas `dev-catalog` y `docs-catalog` en `docs/development/debugging.md`, de modo que `node scripts/dev/development-docs.mjs` (guarda de `scripts/dev/development-docs.mjs:107`) salga 0.
Contrato: rollback: Revertir las secciones agregadas en `commands.md` y `debugging.md`.. Status: done

#### S2.T3 — Aislar el paquete anidado de los gates de `app/`: excluir `widgetbook/**` en `app/analysis_options.yaml:32` y del `dart format` de `app/`, y confirmar que `fvm flutter pub deps` en `app/` no lista `widgetbook` ni su generador.
Contrato: rollback: Quitar la exclusión de `app/analysis_options.yaml` y el ajuste de formato; los gates vuelven a su alcance anterior.. Status: done

#### S2.T4 — Batería de la sesión: pruebas Node en `scripts/dev/` para el despacho y la ayuda de los dos comandos nuevos (pasos esperados, enlace de troubleshooting, código != 0 ante fallo de un paso, usando el `spawn` inyectable), más regresión de `node --test scripts/dev/*.test.mjs`, `node scripts/dev/development-docs.mjs`, `pnpm check` y `fvm flutter pub deps` en `app/` sin `widgetbook`.
Contrato: rollback: Eliminar el archivo de pruebas nuevo; la batería preexistente de `scripts/dev/` queda intacta.. Status: done

#### S3.T1 — Agregar el job del catálogo a `.github/workflows/ci-pr.yml` con `needs: [changes]` e `if: needs.changes.outputs.app == 'true'`, reusando el patrón ya existente de `flutter-static` (leer `app/.fvmrc`, `subosito/flutter-action` pinneado por SHA, cache de pub), compilando el build web estático desde `app/widgetbook/` y publicándolo con `actions/upload-artifact` y `retention-days: 30`; sumarlo al `needs` de `quality-gate` (ci-pr.yml:748) y al del `summary` (ci-pr.yml:777), y actualizar el comentario de filtros de ruta de ci-pr.yml:732.
Contrato: rollback: Quitar el job y sacarlo de los `needs` de `quality-gate` y `summary`; el gate vuelve a su lista de doce jobs.. Status: done

#### S3.T2 — Agregar en ese job, ANTES del `upload-artifact`, un paso que falle si el directorio de build contiene archivos `.env` o cadenas de token/endpoint de ambientes, imprimiendo la ruta ofensora; acotar el barrido al directorio de build (no al repo entero) para que sea de tiempo constante respecto del tamaño del repo.
Contrato: rollback: Eliminar el paso de verificación; el artifact se publica sin ese control.. Status: done

#### S3.T3 — Batería y regresión de la sesión: validar el YAML del workflow (parseo + `actionlint` si está disponible), reproducir en local el build web del catálogo y servirlo para abrirlo en el navegador, ejercitar el chequeo de secretos sembrando un `.env` de prueba (debe salir != 0) y correr los gates locales existentes (`bash scripts/ci-pr-metadata.sh`, `node scripts/dev/development-docs.mjs`, `pnpm check`) para confirmar que no se rompió ninguno.
Contrato: rollback: Eliminar los artefactos temporales del build local y el `.env` sembrado; no hay cambios de código que revertir en esta task.. Status: done
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: Corriendo `fvm flutter run -d chrome` dentro de `app/widgetbook/` se abre el catálogo mostrando el caso de uso del átomo de ejemplo, con los controles de teléfono/tablet, orientación, escala de texto y movimiento reducido operativos y sin selector de tema oscuro; en `app/` el widget test que usa la misma fixture pasa.

### Session 2 · T1 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4

**Gate (auto)**: Desde la raíz del repo, `pnpm dev:catalog` y `pnpm docs:catalog` abren el mismo catálogo con hot reload, `pnpm run dev:catalog --help` imprime pasos y troubleshooting, `pnpm check` queda verde con el paquete anidado presente y `fvm flutter pub deps` en `app/` no lista `widgetbook`.

### Session 3 · T1 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3

**Gate (auto)**: En un PR que toca `app/`, el workflow publica un artifact con el build web del catálogo que se descarga, se sirve localmente y abre en el navegador; el paso de verificación de secretos sale 0 y el job figura dentro de `quality-gate`. En un PR que solo toca `docs/`, el job queda `skipped` y el gate sigue verde.
