---
id: BUG-suite-modal-backdrop-invisible-light-MGR-fix
project: up1
type: bug
module: suite
---

--up1-bg-overlay usaba rgba(0,0,0,0.1) en modo claro, que se leia como "modal sin fondo". Se sube a 0.35 en claro / 0.55 en oscuro (antes 0.5).

**sourceRef:** 21216b2 + css/1-theme/theme-tokens.css:128-131.
