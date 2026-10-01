---
id: RULE-GENERATED-DART-FORMAT
project: taomangalam
type: rule
module: app
level: should
tags:
  - GH-48
  - codegen
  - formato
  - CI
---

Cuando un tool versiona su salida (código generado), la EMISIÓN debe producir Dart dart-format-clean: partir constructores/strings de más de 80 columnas en multi-línea con trailing comma, igual que `dart format`. Motivo: el gate de CI `scripts/ci/format-app-dart.sh` corre `dart format --set-exit-if-changed` sobre todo `app/` (salvo `app/widgetbook/`); si la salida no está formateada, el job de estáticos falla. Además, post-formatear el archivo versionado por afuera rompería la idempotencia byte-a-byte del check de vigencia (`app/tool/check_design_tokens_freshness.dart`), que compara lo regenerado con el archivo versionado. Aplica al generador de tokens de diseño (`app/tool/generate_design_tokens.dart`).
