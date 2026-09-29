---
id: TAO-162-DEC-VIEWPORT-ADDON-DEBT
project: taomangalam
type: decision
module: EP-00
tags:
  - TAO-162
  - GH-15
  - widgetbook
  - deuda
  - viewport-addon
---

## Contexto
`app/widgetbook/` (catálogo Widgetbook, TAO-162 / GH-15) usa `DeviceFrameAddon` para los controles de dispositivo (teléfono/tablet) y orientación. En `widgetbook 3.25.0` esa clase está **deprecada** a favor de `ViewportAddon`. Se usa con `// ignore: deprecated_member_use` porque es la que expone el catálogo `Devices` y el selector de orientación que pide el alcance (REQ-02).

## Deuda explícita
Migrar `DeviceFrameAddon` → `ViewportAddon` cuando se actualice `widgetbook`. Riesgo: un bump que elimine el símbolo rompe el build del catálogo y, al estar el job `widgetbook` en los `needs` de `quality-gate`, deja el check obligatorio en rojo. La remediación debe: migrar el addon, verificar el selector de dispositivo/orientación (REQ-02) y correr `tests/` (los tests de `app/widgetbook/test/widgetbook_app_test.dart` assertean el addon).
