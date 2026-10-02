---
id: tao176-medidas-overlays-sin-token
project: taomangalam
type: decision
tags:
  - HU-01-05
  - overlays
  - design-system
  - tokens
---

Contexto: el sistema visual de overlays y feedback (HU-01-05) declara dos medidas fijas dentro de los widgets, en vez de leerlas de la escala `size` de tokens:

- `taoDialogMaxWidth = 560` en `app/lib/design_system/overlays/tao_dialog.dart`: ancho maximo del dialogo centrado. Lo exige el requisito del ticket (HU-01-05: "ancho maximo 560"). La escala `size` (tokens.g.dart) no define un ancho en ese rango: el mas cercano es `contentMax` (1200), reservado al contenido ancho de la app, muy por encima de un modal; usar `contentMax` no representaria la intencion.
- `taoEmptyStateIllustrationSize = 160` en `app/lib/design_system/overlays/tao_empty_state.dart`: lado del hueco cuadrado de la viñeta opcional del estado vacio. No lo exige un requisito textual; surge de la composicion (ilustracion que cabe entera con `contain` sin deformar) y tampoco hay token en ese rango (`iconLg`=28, `logoHeader`=40, `headerPhone`=64, `headerTablet`=72 son todos mucho menores).

Decision: mantener ambas como constantes nombradas y documentadas en el modulo de overlays, en vez de forzar un token de rango distinto o agregar un token nuevo a `tokens.v1.json` (que impactaria el design system compartido y su regeneracion). Se fija el valor en un unico lugar por archivo, con comentario que explica por que no sale del tema, de modo que sea trazable y no un literal disperso. Si a futuro el design system incorpora una escala de medidas de modal/ilustracion, estas constantes deben migrar a tokens.

Alternativas descartadas: (a) reusar `contentMax`/`iconLg` — no representa la intencion y deforma la composicion; (b) agregar tokens nuevos al design system — mayor alcance, requiere decision de diseño sobre la escala completa y regenerar tokens en todo el proyecto; (c) dejar los literales sueltos — opaco y fragil.

Reversibilidad: alta. Cambiar las constantes o migrarlas a tokens es local a dos archivos de overlays; los tests pinean 560 y 160.
