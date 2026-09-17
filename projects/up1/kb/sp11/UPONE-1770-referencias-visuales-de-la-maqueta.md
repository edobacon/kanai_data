---
id: DOC-kb-sp11-UPONE-1770-referencias-visuales-de-la-maqueta
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - curriculum-mapping
  - UPONE-1770
  - referencia-visual
  - indice
---

# UPONE-1770 - referencias visuales de la maqueta

Índice de las capturas de la maqueta de tributación (UPONE-1770), guardadas en esta misma carpeta (`sp11/`). Son la autoridad visual del ticket. Cada archivo es un PNG; abrir por su nombre.

## Vista solo lectura (pestaña Tributación del plan)

Es la vista de consulta. Se maneja con el **selector de matriz** ("Todas las matrices" o una) y los tres indicadores (desarrollo tributado, competencias con evaluador, asignaturas sin tributar). Dos modos: por asignatura y por competencia.

- **`1770-maqueta-readonly-por-asignatura.png`** — modo Por asignatura: las asignaturas del plan en columnas por período, cada card con sus chips de tributación (matriz + nivel I/R/M + tipo D/E/A) o "Sin tributar".
- **`1770-maqueta-readonly-por-asignatura-cabecera.png`** — el mismo modo con la cabecera de la pestaña Tributación y el botón "Tributar" (entrada al editor).
- **`1770-maqueta-readonly-por-competencia.png`** — modo Por competencia: cada matriz con sus competencias por nivel (Introduce/Reinforce/Master) y las asignaturas que tributan; incluye un nodo que consolida ("CONSOLIDA A LAS DE ABAJO").
- **`1770-maqueta-readonly-por-competencia-cabecera.png`** — el mismo modo con la cabecera y el botón "Tributar".
- **`1770-maqueta-readonly-modal-detalle-tributacion.png`** — modal de detalle de una tributación en solo lectura (nivel, tipo, matriz), con acciones "Editar en tributación" y "Listo".

## Editor (pantalla que abre "Tributar")

Se trabaja como una sesión (Guardar / Descartar). Los dos modos cambian el panel lateral: por competencia muestra las asignaturas del plan; por malla muestra las competencias de la matriz.

- **`1770-maqueta-editor-por-competencia.png`** — modo Por competencia: panel lateral "ASIGNATURAS DEL PLAN" (con filtros Todas/Con tributación/Sin tributar) + grilla competencia por nivel con descriptores.
- **`1770-maqueta-editor-por-malla.png`** — modo Por malla, estado inactivo (sin elemento en mano): panel lateral "COMPETENCIAS DE LA MATRIZ" + asignaturas por período, cada card con "Varias". No se ve el "+" hasta poner una competencia en mano.
- **`1770-maqueta-editor-por-malla-en-mano.png`** — modo Por malla, **estado activo de edición**: una competencia ("SV1 · Compromiso ético") queda **EN MANO** en el panel lateral, con el selector "Nivel de desarrollo con que se va a asignar" y una "x" para soltarla. Con la competencia en mano, cada card de asignatura muestra un **"+ Asignar acá"**; al hacer click se crea/mueve la tributación (la card asignada muestra su chip "SV1 I D x" y una barra de confirmación verde). Es el espejo del modo Por competencia: allí la ASIGNATURA va en mano y el "+" aparece en las celdas competencia por nivel.
- **`1770-maqueta-editor-agregar-asignaturas.png`** — vía masiva: modal "Agregar asignaturas" a una competencia, lista por período con marca "Ya tributa"; nivel y tipo se aplican a todo lo seleccionado.
- **`1770-maqueta-editor-agregar-competencias.png`** — vía masiva inversa: modal "Agregar competencias" a una asignatura; mismo patrón de aplicar a todo lo seleccionado.
- **`1770-maqueta-editor-detalle-peso.png`** — detalle de una tributación con el **peso del eje 1**: "Peso dentro de <nivel>", input %, "REPARTO AUTOMÁTICO" y el indicador "N evalúa · suma 100%". Retirar tributación / Listo.

## Patrón de interacción de asignación (NO hay drag & drop)

La asignación **no** es arrastrar y soltar. El mecanismo es **selección lateral + click** (confirmado en el componente real `CompetencyAlignmentGridTable.ts`, "SIN DRAG", REQ-17: no hay `draggable` ni handlers de arrastre):

1. Se elige un elemento en el panel lateral, que queda **EN MANO** (por competencia = una asignatura; por malla = una competencia). Click sobre el ya elegido lo suelta.
2. Con el elemento en mano, en el destino aparece un **"+ Asignar acá"** (celda competencia por nivel en modo por competencia; card de asignatura en modo por malla). Al hacer click se crea o mueve la tributación.
3. Sin nada en mano, el "+" queda atenuado y, si se presiona, el shell avisa "selecciona una asignatura/competencia".

La **vía masiva** ("Varias") es un camino aparte: abre el modal de agregar (asignaturas o competencias) con selección múltiple por checkbox y nivel/tipo aplicados a todo lo seleccionado.

## Notas de lectura de estas capturas

- El **peso** y el "suma 100%" viven en el editor (captura de detalle). El "suma 100%" se muestra como **indicador**; la validación de bloqueo es al publicar el plan (D1, cross-mod, verificado contra la maqueta y el plan de división del PO).
- El **modal de detalle** (`CompetencyAlignmentDetailModal`) tiene dos estados: solo lectura (muestra nivel/tipo/matriz + "Editar en tributación") y edición (segmentados de Nivel y Tipo + el bloque de Peso + "Retirar tributación"). 1770 **agrega el bloque de peso dentro del modal existente**, no lo rediseña.
- **Deuda observada:** el selector de asignatura aparece hoy en la vista solo lectura y no debería; corresponde solo al editor.
- La vista "Por malla" del editor es interna de curriculum-mapping (dibujada por tributación con `planEntry` por período), no reusa el componente de malla de curriculum-design.

Ver el alcance depurado en el detalle de 1770 y el resumen de decisiones (D1 verificado; D2 corregido a cm-interno; R-9 fuera por legacy).
