---
id: DEC-catalogo-print-pdf-browser
project: jormat-evolution
type: decision
module: frontend
---

## Contexto

El spec del módulo catálogo (PDF legacy `Modulo catalogo.pdf`) pide un botón "Imprimir" que
descargue el listado de repuestos en PDF. El propio PDF muestra como destino el diálogo de
impresión del navegador con "Guardar como PDF".

## Decisión

Implementar la impresión a PDF del catálogo **reusando el patrón de impresión del navegador ya
resuelto y testeado para la ficha/etiqueta del ítem (JOR-107)**, en vez de introducir un
generador PDF server-side.

Patrón: `ItemPrintOverlay` se portalea a `document.body` y, vía `@media print`, oculta todo
(`body * { visibility: hidden }`) dejando visible solo el print-root, que ocupa la hoja.
`window.print()` se dispara en un efecto tras el commit de React (un `printNonce` fuerza el
re-render) y `afterprint` resetea el modo. Hoy soporta modos `'quick' | 'label'`; el catálogo
sería un tercer contenido ("listado del catálogo") sobre la misma mecánica.

Archivos de referencia:
- `front/jormat-front/src/components/items/detail/ItemPrintOverlay/ItemPrintOverlay.tsx`
- `front/jormat-front/src/components/items/detail/ItemDetailContent/ItemDetailContent.tsx`

## Coordinar con JOR-078 (estrategia única de impresión/export)

Existe el ticket de plataforma **JOR-078 · T-PLAT-03 · Impresión / export (estrategia única)**,
hoy **sin empezar**. Esta decisión NO debe ejecutarse aislada: la impresión del catálogo tiene que
encuadrarse en esa estrategia transversal. Opciones: que JOR-078 defina el patrón único (el de
browser-print aquí propuesto) y el catálogo lo consuma, o que este trabajo siembre el patrón que
JOR-078 luego generaliza. A decidir al planificar.

## Alternativas descartadas

- **Generador PDF server-side** (jsPDF / puppeteer / pdfkit): agrega dependencia e
  infraestructura; se justifica solo si se necesita pixel-perfect o plantillas complejas, que
  el listado del spec no requiere.

## Consecuencias

- Cero dependencia nueva; consistencia con el resto del producto; patrón ya cubierto por tests.
- El layout de impresión se controla con `@media print`/CSS, no con un motor de PDF.
- Decisión abierta al implementar: reusar el overlay del ítem tal cual o **extraer un
  `PrintOverlay` genérico** compartido entre ítem y catálogo (evita duplicar la técnica de
  `@media print`) — candidato natural a vivir en JOR-078.

## Relacionado

- Ticket de plataforma: JOR-078 (impresión/export, sin empezar).
- Patrón de impresión existente: JOR-107 (cerrado).
- Deuda de filtros del catálogo: JOR-085 (comentario en `CrearCatalogoView.tsx:210`).
- Documento comparativo: `jormat_docs/comparativa/catalogo-pdf-vs-implementado.md`.
- Ticket híbrido propuesto: `jormat_docs/comparativa/catalogo-hibrido-ticket.md`.
