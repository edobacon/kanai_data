---
id: tao180-revision-volver-sin-margen
project: taomangalam
type: bug
---

Detalle reportado por el dev en la revisión visual con la app corriendo (iOS, ruta "Detalle de consulta"): el botón de volver del encabezado del shell quedaba pegado al borde izquierdo, sin el margen que sí tiene el botón de menú respecto del borde derecho (space4 = 16).

Causa: en `app/lib/navigation/app_shell.dart` el `leading` del AppBar no tenía Padding (leadingWidth = 48, botón 48 desde x=0), mientras que las `actions` van envueltas en `Padding(end: space4)`.

Estado: CORREGIDO en la revisión visual del ticket (commit 36cda21): el leading se envuelve en `Padding(start: space4)` y `leadingWidth` pasa a touchPreferred + space4 (16 + 48, simétrico con el trailing). Regresión en `app_shell_header_test.dart`: margen izquierdo del volver == margen derecho del menú (16) y ambos controles 48x48. La app reconstruida quedó lista para verificar en el simulador.
