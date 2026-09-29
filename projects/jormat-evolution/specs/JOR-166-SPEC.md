---
id: JOR-166-SPEC
project: jormat-evolution
ticket: JOR-166
status: approved
---

# JOR-166 — Facturas clientes: listado canonico (9 columnas, rango de fechas validado, imprimir)

## Resumen ejecutivo

Se corrige el listado de Ventas / Facturas clientes para alinearlo al canon: RUT y Total pasan a ser columnas propias (9 columnas nombradas, Orden = O.C. segun legacy), el rango de fechas suma validacion inicio<=fin con mensaje sin aplicar y acciones Aplicar/Limpiar combinables con busqueda y filtros, y se agrega Imprimir listado reusando la logica de traer-todo-lo-filtrado del export CSV (fetchAllPagesCapped) con encabezado de rango, sin controles ni columna Acciones. NO se toca el backend (ventas sigue en stub, no se crean tablas), ni el builder de creacion (CA-05..CA-08, movido a JOR-167), ni el set final de acciones de fila ni la semantica definitiva de Orden (preguntas abiertas JOR-166-Q1/Q2). ADVERTENCIA (fuera de alcance, no implementado como requirement): el filtro/tab de borradores REALES depende de persistir draft/published en backend; aqui solo se respeta el badge de la maqueta. ADVERTENCIA: la paridad contra jormat legacy (CA-09) se documenta como discrepancia, no se resuelve por cuenta propia. Se verifica abriendo /ventas/documentos: nueve encabezados visibles, error de rango invertido sin filtrar, y vista de impresion con todos los registros filtrados.

## Requirements

### REQ-01 `inferred`
> Fuente: Request CA-01 + Adenda 1 (columna Orden: si Orden != O.C. hay que agregar/renombrar) + Adenda 3 (mapeo a O.C. apoyado en legacy, a confirmar JOR-166-Q1)

El listado de Facturas clientes muestra las nueve columnas canonicas (Factura, Cliente, RUT, Total, Origen, Orden, Fecha, Estado, Acciones), con RUT y Total como columnas propias (hoy RUT va embebido en Cliente y Total dentro de Neto/IVA/Total). La columna Orden se mapea a la orden de compra (O.C.) del documento: esta base NO es una determinacion cerrada de negocio, proviene de la lectura del sistema jormat legacy (donde la columna Orden del listado es la O.C. / purchaseOrder) y queda A CONFIRMAR con negocio (pregunta JOR-166-Q1). Se ejecuta el mapeo igual por ser reversible (es un rotulo/mapeo de columna); si negocio define otra referencia, se ajusta el mapeo sin rehacer la estructura de columnas.

### REQ-02 `confirmed`
> Fuente: frontend/src/components/ventas/list/DocumentosListView/DocumentosListView.tsx

La busqueda por nombre de cliente y los filtros del listado reducen los resultados conforme a los valores ingresados, y siguen operando en conjunto (comportamiento ya entregado, se verifica y se protege).

### REQ-03 `confirmed`
> Fuente: frontend/src/components/ventas/list/DocumentosListView/DocumentosListView.tsx

El rango de fechas (Fecha inicio / Fecha fin) se aplica con una accion explicita Aplicar y se quita con Limpiar; filtra por fecha de factura incluyendo ambos dias completos, se combina con la busqueda y los demas filtros, y si la fecha inicio es posterior a la fecha fin muestra un mensaje de error sin aplicar el filtro (el listado conserva los resultados previos).

### REQ-04 `confirmed`
> Fuente: frontend/src/components/items/list/ItemsListView/ItemsListView.tsx:164

La accion Imprimir listado genera una vista de impresion con TODOS los registros que cumplen los filtros activos (recorriendo todas las paginas mediante la logica ya existente de traer-todo-lo-filtrado, con su tope), incluyendo solo las columnas de datos (sin la columna Acciones) y un encabezado con el rango de fechas aplicado; sin filtros imprime el listado completo disponible.

### REQ-05 `confirmed`
> Fuente: frontend/src/components/ventas/list/DocumentosListView/DocumentosListView.tsx

Cuando la combinacion de busqueda, filtros y rango no devuelve resultados, el listado muestra el mensaje de estado vacio en lugar de una tabla sin filas.

### REQ-06 `confirmed` `enforcement`
> Fuente: [DOC:MAQ-frontend-ea05d59d-html]

FIDELIDAD MAQUETA: el estado de la factura se representa como badge con el par de tokens de color de la maqueta segun su semantica (exito/ verde para emitida-aceptada, advertencia/ambar para pendiente, destructivo/rojo para anulada-rechazada), no como texto plano.

### REQ-07 `confirmed`
> Fuente: Adenda 6 - 2026-09-18 (DECISION 2026-09-17: el listado diferencia y MUESTRA borradores a nivel STUB) + pedido de cambio

El listado diferencia y muestra los documentos en estado borrador contra el stub en memoria: filtra STUB_DOCUMENTOS via filterDocumentos por estado ('borrador' / 'emitida'), expone una pestana/filtro por estado combinable con la busqueda, los filtros por columna y el rango de fechas, y marca la fila del borrador con un badge 'Borrador' usando los tokens --draft-bg/--draft-fg (violeta) definidos en la maqueta. FUERA DE ALCANCE (diferido): que el listado traiga borradores REALES persistidos (que sobrevivan a reinicios y sean visibles entre usuarios) depende de la tabla real de documentos/facturas con estado definida y diferida en JOR-167 (tablas documentos/invoices + documento_lineas + repo Knex); el stub en memoria no persiste y se coordina con JOR-167 sobre el mismo modelo.

### REQ-08 `confirmed` `enforcement`
> Fuente: [DOC:MAQ-frontend-ea05d59d-html]

FIDELIDAD MAQUETA: los valores monetarios (Total) y numericos tabulares se renderizan con la clase de numeros tabulares (.mono / font-variant-numeric: tabular-nums) y alineados a la derecha, para que las cifras alineen entre filas.

### REQ-09 `confirmed` `enforcement`
> Fuente: [DOC:MAQ-frontend-ea05d59d-html]

FIDELIDAD MAQUETA: el encabezado de pagina reproduce la jerarquia de la maqueta (titulo h1 + bajada descriptiva en color muted) y el grupo de acciones a la derecha con Crear factura como boton primario y las acciones secundarias (Imprimir listado, Exportar) como botones outline.

### REQ-10 `confirmed` `enforcement`
> Fuente: [DOC:MAQ-frontend-ea05d59d-html]

FIDELIDAD MAQUETA: la barra de filtros reproduce el bloque .fbar de la maqueta con los campos etiquetados en fila (incluidos Fecha inicio y Fecha fin) y las acciones Aplicar / Limpiar filtros; los filtros activos se representan como chips removibles bajo la barra.

### REQ-11 `inferred` `enforcement`
> Fuente: [DOC:MAQ-frontend-ea05d59d-html]

FIDELIDAD MAQUETA: el mensaje de rango de fechas invalido se muestra como texto de error asociado al bloque de fechas, con el copy de error y sin desplazar la tabla.

### REQ-12 `confirmed` `enforcement`
> Fuente: frontend/src/components/items/list/ItemsListView/ItemsListView.tsx:36 + decision KB 'Catalogo: imprimir a PDF via impresion del navegador (patron JOR-107)'

REUSO: la traida del universo filtrado completo para Imprimir reutiliza la utilidad existente fetchAllPagesCapped (misma con su tope de filas) en lugar de reimplementar la paginacion, y la impresion se resuelve por impresion del navegador (window.print sobre una vista dedicada), no con un generador server-side.

### REQ-13 `confirmed` `enforcement`
> Fuente: [RULE-frontend-001] + [RULE-frontend-002]

ESTRUCTURA: los componentes nuevos (vista de impresion, bloque de rango de fechas si se extrae) siguen la convencion carpeta-por-componente bajo src/components/ventas/list/, con su archivo de test jsdom y su story co-locados.

### REQ-14 `confirmed`
> Fuente: Request CA-09 + Adenda 3 (debe existir una tarea que levante la comparacion parcial, no solo una advertencia en el spec)

PARIDAD LEGACY (CA-09): la iteracion produce un entregable escrito de paridad con jormat legacy acotado a lo que se ejecuta ahora (validacion del rango de fechas e impresion del listado). El documento registra, por comportamiento, que hace el legacy, que hace la implementacion nueva y la discrepancia detectada, marcando explicitamente el alcance parcial (los comportamientos fuera de esta iteracion quedan listados como pendientes de contrastar). Cada discrepancia queda con una resolucion explicita: manda el texto del canon (por la Adenda 1) o se eleva como pregunta a negocio. Si no hay acceso a la fuente legacy, el entregable existe igual y deja asentada la imposibilidad de contrastar con el motivo, en lugar de omitirse.

### REQ-15 `confirmed` `enforcement`
> Fuente: Adenda 6 (el listado lee del mismo stub via filterDocumentos) + REQ-12 (reuso de la traida del universo filtrado)

REUSO: el filtrado por estado del listado se resuelve dentro de la funcion existente filterDocumentos sobre STUB_DOCUMENTOS (misma fuente que ya alimenta la tabla y el universo de Imprimir/Exportar), sin duplicar una segunda ruta de datos ni un store paralelo para borradores; el estado del documento es el mismo campo que escribe createDraft en JOR-167, de modo que al reemplazar el stub por el repo Knex real solo cambie la fuente y no el contrato del filtro.
## Tasks

#### S1.T1 — Fijar el comportamiento ACTUAL del listado antes de tocarlo: tests de regresion sobre DocumentosTable y DocumentosListView que capturen las columnas hoy renderizadas, el filtrado por busqueda + filtro combinados, la limpieza de chips y el export CSV (universo filtrado con tope, sin Acciones). Deben fallar si el cambio rompe alguno.
Contrato: rollback: Eliminar los archivos de test agregados; no hay cambio de codigo productivo que revertir.. Status: done

#### S1.T2 — Reestructurar las columnas de DocumentosTable a las nueve canonicas: extraer RUT de la celda Cliente y Total del bloque Neto/IVA/Total a columnas propias, mapear la columna existente 'OC' al encabezado 'Orden', y retirar del listado canonico la columna extra 'Tipo de documento' y el doble eje de estado dejando la columna Estado unica. Actualizar el tipo de fila y su mapeo desde el stub.
Contrato: rollback: git revert del commit de DocumentosTable.tsx y su tipo de fila; la vista vuelve a las columnas previas (Cliente con RUT embebido, Neto/IVA/Total, OC, Tipo de documento).. Status: done

#### S1.T3 — Aplicar la fidelidad de maqueta en la fila: badge de Estado con los tokens success/warning/destructive segun semantica, badge literal 'Borrador' con tokens --draft-bg/--draft-fg para registros en borrador, y Total con numeros tabulares alineado a la derecha.
Contrato: rollback: git revert del commit de estilos/celdas de DocumentosTable; los estados vuelven a su render previo.. Status: done

#### S1.T4 — Convertir el rango de fechas en un filtro explicito: cambiar Desde/Hasta por los campos etiquetados 'Fecha inicio' y 'Fecha fin' que NO aplican al tipear, agregar la accion Aplicar y la accion Limpiar (que borra solo el rango), y validar inicio<=fin mostrando el mensaje de error bajo el bloque de fechas sin disparar consulta. Mantener la combinacion con busqueda, selects y chips.
Contrato: rollback: git revert del commit de DocumentosListView.tsx; vuelve el comportamiento de aplicar-al-tipear sin validacion.. Status: done

#### S1.T5 — Verificar y ajustar el estado vacio del listado para que se muestre el mensaje de sin resultados cuando la combinacion de filtros devuelve cero facturas, y verificar que busqueda + filtros por columna siguen reduciendo resultados (CA-02, ya entregado).
Contrato: rollback: git revert del commit del bloque de estado vacio.. Status: done

#### S1.T6 — Tests y regresion de la etapa: unit tests jsdom de las nueve columnas, del RUT/Total en celda propia, de los badges (estado y 'Borrador'), del rango (aplicar, rango invertido sin filtrar, limpiar conservando filtros, dias borde incluidos) y del estado vacio; story actualizada de la tabla y de la barra de filtros. Correr la suite completa (jsdom + storybook) y confirmar que los tests de regresion de la task 1 siguen en verde.
Contrato: rollback: Eliminar los tests/stories agregados en esta task; el codigo productivo queda intacto.. Status: done

#### S1.T7 — Dejar el mapeo de la columna Orden -> orden de compra (O.C.) aislado en un unico punto del armado de columnas del listado, con un comentario que registre que la base es la lectura del legacy y que queda a confirmacion de negocio (JOR-166-Q1), de modo que un cambio de referencia sea un cambio de una linea y no un refactor del render de la tabla.
Contrato: rollback: Revertir el commit que extrae el mapeo; la columna vuelve a resolverse inline como estaba.. Status: done

#### S2.T1 — Extraer a una utilidad compartida la traida del universo filtrado que hoy usa Exportar CSV (fetchAllPagesCapped con su tope), sin cambiar el comportamiento del export, para que Imprimir la reutilice en vez de reimplementar la paginacion.
Contrato: rollback: git revert del commit de extraccion; Exportar CSV vuelve a su llamada inline previa.. Status: done

#### S2.T2 — Crear el componente de vista de impresion del listado bajo src/components/ventas/list/ (carpeta-por-componente con test y story): recibe las filas completas y el rango aplicado, renderiza el encabezado con el periodo y las ocho columnas de datos, y omite la columna Acciones y todo control de interfaz (buscador, selects, chips, paginador, botones).
Contrato: rollback: Eliminar la carpeta del componente nuevo y su referencia; el listado queda sin vista de impresion.. Status: done

#### S2.T3 — Cablear la accion 'Imprimir listado' en la cabecera de DocumentosListView con la variante outline junto a Crear factura (primario): al presionarla trae todas las paginas filtradas con la utilidad compartida, monta la vista de impresion y dispara la impresion del navegador; informa el error sin abrir el dialogo si la traida falla, y avisa cuando el resultado quedo truncado por el tope.
Contrato: rollback: git revert del commit de la cabecera y el handler; el boton desaparece y el resto del listado queda igual.. Status: done

#### S2.T4 — Tests y regresion de la etapa: unit tests de la vista de impresion (columnas de datos sin Acciones, encabezado con y sin periodo, aviso de truncado), del handler (spy sobre la utilidad compartida verificando que se traen todas las paginas y que se dispara la impresion; error de traida sin abrir el dialogo) y regresion de Exportar CSV tras la extraccion. Story de la vista de impresion. Correr la suite completa (jsdom + storybook).
Contrato: rollback: Eliminar los tests/stories agregados en esta task; el codigo productivo queda intacto.. Status: done

#### S2.T5 — Extender filterDocumentos (stub) para aceptar un filtro por estado del documento ('borrador' / 'emitida') sobre STUB_DOCUMENTOS, combinable con los filtros ya existentes (busqueda por cliente, filtros por columna, rango de fechas) y sin crear una ruta de datos paralela. Alinear el campo de estado con el que escribe createDraft de JOR-167.
Contrato: rollback: Revertir el commit que toca el modulo de stub/filterDocumentos; el listado vuelve a filtrar sin el parametro de estado y sigue mostrando todos los documentos del stub.. Status: done

#### S2.T6 — Agregar en la vista de listado la pestana/filtro por estado (Todas / Borrador / Emitida) conectada al filtro de filterDocumentos, integrada al bloque .fbar y a los chips de filtros activos, respetando Aplicar / Limpiar y conservando los demas filtros al cambiar de estado.
Contrato: rollback: Quitar el control de estado de la barra de filtros y su chip; el resto de la barra (busqueda, filtros por columna, rango de fechas) queda intacta.. Status: done

#### S2.T7 — Renderizar en la fila del listado el badge 'Borrador' para los documentos en estado 'borrador', usando los tokens --draft-bg/--draft-fg de la maqueta, conviviendo con el badge de estado existente (emitida/pendiente/anulada) sin reemplazarlo.
Contrato: rollback: Revertir el cambio en el componente de fila/badge; las filas vuelven a mostrar solo el badge de estado actual.. Status: done

#### S2.T8 — Tests jsdom del filtrado por estado: unitarios de filterDocumentos (solo borradores / solo emitidas / combinacion con busqueda y rango), render del badge 'Borrador', estado vacio cuando el filtro por estado no arroja resultados, y regresion de que Imprimir respeta el filtro de estado activo.
Contrato: rollback: Eliminar el archivo de test agregado; no afecta codigo de produccion.. Status: done

#### S3.T1 — Levantar la comparacion de paridad con jormat legacy acotada a esta iteracion: contrastar el comportamiento del legacy contra la implementacion nueva para (a) la validacion del rango de fechas (inicio>fin: mensaje y no aplica, inclusion de ambos dias, accion Aplicar/Limpiar, combinacion con busqueda y filtros) y (b) la impresion del listado (universo filtrado completo, columnas incluidas, exclusion de Acciones y controles, encabezado con el rango). Producir el documento de paridad con una fila por comportamiento (legacy / nuevo / discrepancia / resolucion), declarar el alcance parcial listando lo no contrastado, y dejar asentada la falta de acceso a la fuente legacy si aplica. Las discrepancias se resuelven segun la Adenda 1 (manda el texto del canon) o se elevan como pregunta a negocio; no se cambia codigo desde esta task.
Contrato: rollback: Eliminar el documento de paridad agregado; no hay cambios de codigo ni de datos que revertir.. Status: done

#### S3.T2 — Registrar explicitamente en el spec/entregable el limite de alcance: el listado diferencia borradores a nivel STUB (demo, en memoria, no persiste) y los borradores REALES persistidos quedan DIFERIDOS a la tabla de documentos/facturas con estado de JOR-167 (documentos/invoices + documento_lineas + repo Knex), dejando anotado el punto de coordinacion con JOR-167 sobre el mismo modelo.
Contrato: rollback: Revertir el cambio en el documento; no afecta codigo.. Status: done
## Verificacion runtime

1. **Qué:** Verificar en runtime: La accion Imprimir listado genera una vista de impresion con TODOS los registros que cumplen los filtros activos (recorriendo todas las paginas mediante la logica ya existente de traer-todo-lo-filtrado, con su tope), incluyendo solo las columnas de datos (sin la columna Accione
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: FIDELIDAD MAQUETA: el estado de la factura se representa como badge con el par de tokens de color de la maqueta segun su semantica (exito/ verde para emitida-aceptada, advertencia/ambar para pendiente, destructivo/rojo para anulada-rechazada), no como texto plano.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
3. **Qué:** Verificar en runtime: FIDELIDAD MAQUETA: una factura en borrador se distingue en la fila con un badge 'Borrador' usando los tokens --draft-bg/--draft-fg (violeta) definidos en la maqueta.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
4. **Qué:** Verificar en runtime: FIDELIDAD MAQUETA: los valores monetarios (Total) y numericos tabulares se renderizan con la clase de numeros tabulares (.mono / font-variant-numeric: tabular-nums) y alineados a la derecha, para que las cifras alineen entre filas.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
5. **Qué:** Verificar en runtime: FIDELIDAD MAQUETA: el encabezado de pagina reproduce la jerarquia de la maqueta (titulo h1 + bajada descriptiva en color muted) y el grupo de acciones a la derecha con Crear factura como boton primario y las acciones secundarias (Imprimir listado, Exportar) como botones outline
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
6. **Qué:** Verificar en runtime: FIDELIDAD MAQUETA: la barra de filtros reproduce el bloque .fbar de la maqueta con los campos etiquetados en fila (incluidos Fecha inicio y Fecha fin) y las acciones Aplicar / Limpiar filtros; los filtros activos se representan como chips removibles bajo la barra.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
7. **Qué:** Verificar en runtime: FIDELIDAD MAQUETA: el mensaje de rango de fechas invalido se muestra como texto de error asociado al bloque de fechas, con el copy de error y sin desplazar la tabla.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
8. **Qué:** Verificar en runtime: REUSO: la traida del universo filtrado completo para Imprimir reutiliza la utilidad existente fetchAllPagesCapped (misma con su tope de filas) en lugar de reimplementar la paginacion, y la impresion se resuelve por impresion del navegador (window.print sobre una vista dedicada)
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `inferred`: El listado de Facturas clientes muestra las nueve columnas canonicas (Factura, Cliente, RUT, Total, Origen, Orden, Fecha, Estado, Acciones),
- REQ-14 (add) `confirmed`: PARIDAD LEGACY (CA-09): la iteracion produce un entregable escrito de paridad con jormat legacy acotado a lo que se ejecuta ahora (validacio

**Tasks agregadas:**

- S3: Levantar la comparacion de paridad con jormat legacy acotada a esta iteracion: contrastar el comportamiento del legacy contra la implementacion nueva para (a) la validacion del rango de fechas (inicio>fin: mensaje y no aplica, inclusion de ambos dias, accion Aplicar/Limpiar, combinacion con busqueda y filtros) y (b) la impresion del listado (universo filtrado completo, columnas incluidas, exclusion de Acciones y controles, encabezado con el rango). Producir el documento de paridad con una fila por comportamiento (legacy / nuevo / discrepancia / resolucion), declarar el alcance parcial listando lo no contrastado, y dejar asentada la falta de acceso a la fuente legacy si aplica. Las discrepancias se resuelven segun la Adenda 1 (manda el texto del canon) o se elevan como pregunta a negocio; no se cambia codigo desde esta task. (valida: REQ-14; rollback: Eliminar el documento de paridad agregado; no hay cambios de codigo ni de datos que revertir.)
- S1: Dejar el mapeo de la columna Orden -> orden de compra (O.C.) aislado en un unico punto del armado de columnas del listado, con un comentario que registre que la base es la lectura del legacy y que queda a confirmacion de negocio (JOR-166-Q1), de modo que un cambio de referencia sea un cambio de una linea y no un refactor del render de la tabla. (valida: REQ-01; rollback: Revertir el commit que extrae el mapeo; la columna vuelve a resolverse inline como estaba.)

### Enmienda 2
**REQs:**

- REQ-07 (edit) `confirmed`: El listado diferencia y muestra los documentos en estado borrador contra el stub en memoria: filtra STUB_DOCUMENTOS via filterDocumentos por
- REQ-15 (add) `confirmed`: REUSO: el filtrado por estado del listado se resuelve dentro de la funcion existente filterDocumentos sobre STUB_DOCUMENTOS (misma fuente qu

**Tasks agregadas:**

- S2: Extender filterDocumentos (stub) para aceptar un filtro por estado del documento ('borrador' / 'emitida') sobre STUB_DOCUMENTOS, combinable con los filtros ya existentes (busqueda por cliente, filtros por columna, rango de fechas) y sin crear una ruta de datos paralela. Alinear el campo de estado con el que escribe createDraft de JOR-167. (valida: REQ-07, REQ-15; rollback: Revertir el commit que toca el modulo de stub/filterDocumentos; el listado vuelve a filtrar sin el parametro de estado y sigue mostrando todos los documentos del stub.)
- S2: Agregar en la vista de listado la pestana/filtro por estado (Todas / Borrador / Emitida) conectada al filtro de filterDocumentos, integrada al bloque .fbar y a los chips de filtros activos, respetando Aplicar / Limpiar y conservando los demas filtros al cambiar de estado. (valida: REQ-07, REQ-10; rollback: Quitar el control de estado de la barra de filtros y su chip; el resto de la barra (busqueda, filtros por columna, rango de fechas) queda intacta.)
- S2: Renderizar en la fila del listado el badge 'Borrador' para los documentos en estado 'borrador', usando los tokens --draft-bg/--draft-fg de la maqueta, conviviendo con el badge de estado existente (emitida/pendiente/anulada) sin reemplazarlo. (valida: REQ-07, REQ-06; rollback: Revertir el cambio en el componente de fila/badge; las filas vuelven a mostrar solo el badge de estado actual.)
- S2: Tests jsdom del filtrado por estado: unitarios de filterDocumentos (solo borradores / solo emitidas / combinacion con busqueda y rango), render del badge 'Borrador', estado vacio cuando el filtro por estado no arroja resultados, y regresion de que Imprimir respeta el filtro de estado activo. (valida: REQ-07, REQ-15, REQ-05, test; rollback: Eliminar el archivo de test agregado; no afecta codigo de produccion.)
- S3: Registrar explicitamente en el spec/entregable el limite de alcance: el listado diferencia borradores a nivel STUB (demo, en memoria, no persiste) y los borradores REALES persistidos quedan DIFERIDOS a la tabla de documentos/facturas con estado de JOR-167 (documentos/invoices + documento_lineas + repo Knex), dejando anotado el punto de coordinacion con JOR-167 sobre el mismo modelo. (valida: REQ-07; rollback: Revertir el cambio en el documento; no afecta codigo.)
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5
- [x] S1.T6
- [x] S1.T7

**Gate (auto)**: En /ventas/documentos la tabla muestra las nueve columnas canonicas con RUT y Total propias y los badges de estado/Borrador de la maqueta; el bloque Fecha inicio / Fecha fin tiene Aplicar y Limpiar, rechaza con mensaje el rango invertido sin filtrar, y el estado vacio aparece cuando no hay resultados. Suite de vitest (jsdom + storybook) en verde.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5
- [x] S2.T6
- [x] S2.T7
- [x] S2.T8

**Gate (auto)**: En /ventas/documentos, con filtros y rango aplicados, el boton Imprimir listado abre la previsualizacion del navegador con TODAS las filas del universo filtrado (varias paginas), encabezado con el periodo, ocho columnas de datos y sin controles ni columna Acciones; el aviso de truncado aparece al superar el tope. Suite de vitest en verde.

### Session 3 · T0 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
