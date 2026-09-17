---
id: BUG-suite-recorddetail-css-stale-checkboxes-UPONE-1715
project: up1
type: bug
module: suite
---

suite/css/3-viewType/recorddetail.css es output generado por 'npm run sync-styles' desde layout/css; la copia commiteada estaba 18 lineas atras de su fuente y no tenia el guard .record-list-container, por lo que la regla VM-10 aplicaba pointer-events:none a todo .form-check-input dentro de cualquier RecordList embebido en modo vista. Produccion no se vio afectada (Dockerfile corre sync antes de build); solo los checkouts locales servian la copia stale. Regla: no editar a mano el output de sync-styles; regenerarlo tras cada PR de layout/css.

**sourceRef:** 35fa867 + css/3-viewType/recorddetail.css (bloque regenerado, output de sync-styles).
