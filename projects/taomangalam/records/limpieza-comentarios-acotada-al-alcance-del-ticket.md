---
id: limpieza-comentarios-acotada-al-alcance-del-ticket
project: taomangalam
type: rule
level: should
tags:
  - limpieza-comentarios
  - alcance
  - kn-cleaner
---

Cuando se limpian los comentarios de un ticket (kn-cleaner), el barrido debe limitarse a los archivos que ese ticket agregó o modificó. No debe alcanzar módulos o archivos ajenos al alcance del ticket aunque contengan ids internos, porque contamina el diff con cambios fuera de alcance y rompe la trazabilidad de otras historias. Si se detecta deuda de comentarios fuera del alcance, se registra como hallazgo y se resuelve en su propio cambio.
