---
id: RULE-curriculum-design-href-allowlist-UPONE-1757
project: up1
type: rule
module: curriculum-design
---

El chequeo de esquema de `href` en el sanitizador HTML (server y client) debe ser un ALLOWLIST (`http`, `https`, `mailto` + relativas/anclas), nunca un denylist por regex. Antes de evaluar el esquema, el valor se normaliza quitando control chars (`[\x00-\x20]`) para que una ofuscacion via entidad numerica (`java&#9;script:`, `&#1;javascript:`) no eluda el bloqueo. Un denylist (`/^\s*(javascript|data):/i`) es eludible por ofuscacion y no cubre `vbscript:`/`file:`.

**sourceRef:** 68e7e95 + logic/helpers/htmlSanitizer.js (ALLOWED_HREF_SCHEMES, isSafeHref) y modsComponents/RichTextRenderer/sanitizeHtml.ts (paridad server/client).
