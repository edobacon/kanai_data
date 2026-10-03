---
id: tao180-exploratorio-taoicon-recorte-200
project: taomangalam
type: bug
---

Defecto real de EP-01 detectado en la revisión con la app corriendo en el simulador (pasada exploratoria TAO-180, iOS 18.3, iPhone 16 Pro):

- Síntoma: con escala de texto de accesibilidad (≈200 % y más) el ícono del botón de menú del shell pierde trazos: a ≈200 % se veían 2 barras descentradas; al máximo, 1 barra.
- Causa: `TaoIcon` (app/lib/design_system/atoms/tao_icon.dart) pintaba el glifo con un `Text` de `fontSize: size` dentro de una caja fija, heredando el textScaler del entorno.
- Estado: CORREGIDO en la revisión visual del ticket (commit 36cda21): `textScaler: TextScaler.noScaling` en el `Text` del glifo, con test de regresión en `tao_icon_test.dart` (tamaño pintado a 2.0 igual al de 1.0) y 25 goldens `*_200.png` regenerados por el cambio visual deliberado. La app reconstruida en el simulador muestra el ícono completo a ≈200 %.
- Por qué no lo cazaba la suite: las guías miden objetivo táctil/etiqueta/contraste, no el recorte del glifo; los goldens previos estaban generados con el defecto.
