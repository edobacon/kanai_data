---
id: TAO-167-DEC-EXCLUSION-PANEL
project: taomangalam
type: decision
module: EP-00
tags:
  - TAO-167
  - GH-20
  - flutter
  - sabores
  - panel-desarrollo
---

## Contexto

El criterio de aceptación de HU-00-19 exige que el panel interno de desarrollo y sus adaptadores **no estén incluidos** en los builds de `staging` y `production` (DEC-192). Hoy todos los sabores se compilan/ejecutan desde un único `app/lib/main.dart` (`fvm flutter run --flavor development`, `flutter build apk --debug --flavor development`, `flutter build ios --simulator --debug --flavor development`); el sabor se resuelve en runtime desde `appFlavor` (`app/lib/core/config/app_flavor.dart`).

## Decisión

Adoptar **entrypoint por sabor + guarda de CI**:

1. Un arranque común factorizado (`bootstrap`) compartido por los entrypoints.
2. `app/lib/main_development.dart` importa y monta el panel; `app/lib/main_staging.dart` y `app/lib/main_production.dart` **no** lo importan.
3. El código del panel y sus adaptadores viven en una carpeta que solo referencia el entrypoint de `development`, de modo que queden ausentes de los otros binarios.
4. Los comandos pasan `--target lib/main_<sabor>.dart` además de `--flavor <sabor>` (`scripts/dev/dev.mjs`, `scripts/dev/device.mjs`, `scripts/dev/qa-bundle.mjs` y los workflows; actualizar los tests que comparan strings de comando, p. ej. `dev.test.mjs`, `qa-bundle.test.mjs`).
5. Guarda de CI que falle si el entrypoint de `staging`/`production` importa el panel (chequeo del árbol de imports o revisión del APK de producción).

## Alternativas descartadas

- **Solo entrypoint por sabor (A)**: deja la garantía puesta pero sin regresión automática; se descarta a favor de C.
- **`const bool.fromEnvironment` + `--dart-define` con tree-shaking (B)**: un solo entrypoint, menos cambios, pero no garantiza ausencia a nivel de fuente; depende de que cada build pase el define correcto (olvido en desarrollo = panel ausente; define colado en staging = panel presente). El análisis del binario del criterio de aceptación queda frágil.

## Impacto y reversibilidad

- Afecta `app/lib/main*.dart` (nuevos), la carpeta del panel, los scripts de dev/qabundle/device y los workflows de build.
- Reversible: volver a un único entrypoint y quitar los `--target` y la guarda.
- Encaja con DEC-192 y con tecnologia/18 §3 (sabores explícitos, ningún panel dentro del build de producción).
