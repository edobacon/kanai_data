---
id: BUG-curriculum-design-sanitizer-stray-lt-UPONE-1757
project: up1
type: bug
module: curriculum-design
---

`sanitizeHtmlWhitelist` tokenizaba con regex y dejaba pasar sin tocar los tags con comillas de atributo desbalanceadas (p.ej. `<img title='x" onerror=...>`), persistiendo `onerror`/`href` peligrosos porque el tokenizador no matcheaba ese markup como tag y lo trataba como texto plano sin escapar. Fix: reconstruir el output tag por tag, fail-closed: cualquier `<` de texto que el tokenizador no reconozca como tag bien formado se escapa a `&lt;` (funcion `escapeStrayLt`).

**sourceRef:** d9d8963 + logic/helpers/htmlSanitizer.js (sanitizeHtmlWhitelist, escapeStrayLt).
