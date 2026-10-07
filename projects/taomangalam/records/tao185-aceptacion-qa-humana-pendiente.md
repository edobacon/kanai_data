---
id: tao185-aceptacion-qa-humana-pendiente
project: taomangalam
type: decision
tags:
  - TAO-185
  - GH-63
  - QA
  - fidelity
  - decision-dev
---

La QA que no es ejecutable en el entorno de desarrollo (instalación en teléfono Android/tablet, modo avión real, lector de pantalla y aprobación de Diseño QA-01-13-04 contra doc 43 §9 y `maqueta-direccion-consolidada.png`) queda **aceptada a sabiendas** por el dev para no bloquear el cierre del ticket. La parte automatizable de la verificación se ejecutó (suite `app`: 3358 tests, 3352 pasan; 6 fallos preexistentes/ambientales de `app_release_test.dart` por el runner externo ep01-release-provider). Las comprobaciones manuales en runtime quedan registradas en la sesión de verificación (S4) del ticket, cuyo resultado es advisory y no bloquea el cierre. Los casos [fidelity] (TAO-185-TC-REQ-07-3/-4) permanecen pendientes de aprobación visual de Diseño.
