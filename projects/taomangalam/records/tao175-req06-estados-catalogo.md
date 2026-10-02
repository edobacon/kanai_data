---
id: tao175-req06-estados-catalogo
project: taomangalam
type: decision
module: EP-01
tags:
  - TAO-175
  - GH-53
  - design-system
  - widgetbook
---

Contexto: REQ-06 pide que cada molécula quede registrada en Widgetbook con los estados default, pressed, focus, disabled, error, vacío y texto largo. Varios de esos estados no existen en todos los componentes.

Decisión: se interpreta la lista como el VOCABULARIO de estados del sistema, que cada molécula cataloga según los que le aplican, y no como una matriz de siete estados idénticos por molécula. No se fuerzan estados que el componente no tiene.

Reparto por molécula:
- Tarjeta (TaoCard): default, pressed, focus, disabled (selector de estado), texto largo. No tiene error ni vacío propios.
- Fila (TaoNavigationRow): default, pressed/focus en vivo, disabled (sin onTap = estática), vacío (sin metadato), texto largo. No tiene error.
- Formulario (TaoCompositeForm): default/vacío (arranca sin valores), error (al salir de un campo inválido), texto largo; pressed/focus en vivo. Disabled no aplica.
- Chip (TaoFilterChip): sin seleccionar, seleccionado, con retiro, disabled (sin callback); pressed/focus en vivo; texto largo. Error/vacío no aplican.
- Etiqueta de estado (TaoStatusLabel): tonos neutral/success/warning/error/info + texto largo. No es interactiva: no tiene pressed/focus/disabled/vacío.

Consecuencia: el catálogo cubre los siete nombres de estado a nivel de sistema. El desvío del enunciado literal de REQ-06 (que sugiere los siete por molécula) se reconoce al cierre del ticket.

Fuente: spec TAO-175-SPEC (REQ-06), doc de backlog EP-01 §117.
