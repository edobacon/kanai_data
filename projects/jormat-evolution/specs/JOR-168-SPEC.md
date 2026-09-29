---
id: JOR-168-SPEC
project: jormat-evolution
ticket: JOR-168
status: approved
---

# JOR-168: correcciones del builder de factura de Ventas (descuento monto, guardar borrador, filtros server-side)

## Resumen ejecutivo

Se corrigen tres desvios del builder de creacion de factura de Ventas: el descuento de linea pasa de porcentaje a importe monetario parametrizando el control compartido con Compras (CA-09), se reactiva Guardar borrador con el contrato de stub ya existente de JOR-166 y se suma como tercera opcion del guard de salida (CA-12), y el buscador de items expone 5 filtros server-side reales con Ver mas items sobre el resultado filtrado, solo para Ventas (CA-08). NO se toca el nucleo de CA-07, la separacion Origen/Bodega ni los datos reales del popup de cliente, y Compras conserva su comportamiento actual (descuento porcentual y buscador sin filtros) como linea de regresion. CA-05, CA-06, CA-10, CA-11, CA-13, CA-14 y CA-15 solo se verifican, no se reimplementan. Verificacion observable: en el builder de Ventas se carga una linea con descuento en pesos y el total refleja el monto, se guarda un borrador y reaparece como esBorrador:true hasta emitir, y el buscador filtra por los 5 criterios paginando sobre el filtrado; la suite de Compras (PurchaseInvoiceBuilder.descuento.test.tsx) queda verde sin cambios de comportamiento. ADVERTENCIA (fuera del alcance pedido, no implementado): parametrizar el control compartido tiene blast radius sobre Compras, por eso la sesion 1 fija baseline antes de tocarlo; si aparecieran otros consumidores de LineItemsTable/calc-totals fuera de los dos builders, debe reportarse antes de continuar.

## Requirements

#### REQ-01 `inferred`
> Fuente: frontend/src/components/ventas/builder (espejo de frontend/src/components/compras/builder/PurchaseInvoiceBuilder.tsx:84)
> Necesidad: build
En el builder de factura de Ventas, el descuento de linea se ingresa y calcula como IMPORTE MONETARIO (no porcentaje), y el total de linea y los totales del documento reflejan ese monto.

#### REQ-02 `confirmed`
> Fuente: frontend/src/components/compras/builder/PurchaseInvoiceBuilder.tsx:84
> Necesidad: build
El control compartido (LineItemsTable y calc-totals) se PARAMETRIZA por modo de descuento en vez de duplicarse, y Compras conserva el descuento porcentual con su comportamiento y su suite actuales sin cambios.

#### REQ-03 `inferred`
> Fuente: frontend/src/components/ventas/builder (flag SHOW_SAVE_DRAFT, espejo de CA-12/CA-15)
> Necesidad: build
Guardar borrador queda activo en el builder de Ventas (SHOW_SAVE_DRAFT=true): se puede guardar el documento en curso como borrador desde la accion del builder y tambien desde el guard de salida, que pasa a ofrecer tres opciones (descartar, cancelar, guardar borrador).

#### REQ-04 `inferred`
> Fuente: stub de documentos (STUB_DOCUMENTOS / issueFactura, contrato de JOR-166)
> Necesidad: build
La persistencia del borrador REUSA el contrato de stub existente de JOR-166: el documento se agrega a STUB_DOCUMENTOS con esBorrador:true y issueFactura lo pasa a esBorrador:false, sin introducir un mecanismo de persistencia nuevo.

#### REQ-05 `inferred`
> Fuente: frontend/src/components/ventas/builder (buscador de items, CA-08)
> Necesidad: build
El buscador de items del builder de Ventas expone 5 filtros server-side reales (marca, estado de stock, categoria, proveedor, ofertas) y Ver mas items pagina sobre el resultado YA filtrado.

#### REQ-06 `confirmed`
> Fuente: frontend/src/components/compras/builder/PurchaseInvoiceBuilder.tsx:84
> Necesidad: build
Los filtros del buscador estan parametrizados por modulo: solo se habilitan para Ventas y el buscador de items de Compras queda sin filtros y con su paginacion actual.

#### REQ-07 `inferred`
> Fuente: frontend/src/components/ventas/builder (criterios CA-05, CA-06, CA-10, CA-11, CA-13, CA-14, CA-15)
> Necesidad: build
Los criterios ya conformes al canon (CA-05, CA-06, CA-10, CA-11, CA-13, CA-14, CA-15) se VERIFICAN y quedan cubiertos por regresion, sin reimplementarse.

## Tasks

#### S1.T1 — Baseline defensivo: auditar los consumidores reales de LineItemsTable y calc-totals (partiendo de frontend/src/components/compras/builder/PurchaseInvoiceBuilder.tsx:84) y fijar con tests el comportamiento porcentual actual de Compras (calculo, formato del control y totales) antes de tocar el control compartido. Reportar si aparece algun consumidor adicional a los dos builders.
Contrato: rollback: Eliminar los tests de baseline agregados; no hay cambio de codigo productivo que revertir.. Status: pending

#### S1.T2 — Parametrizar el modo de descuento en calc-totals y LineItemsTable (porcentaje por default, monto opt-in), sin cambiar la firma para los consumidores existentes.
Contrato: rollback: Revertir el commit de parametrizacion; el control vuelve a modo porcentaje unico y la suite de Compras queda como baseline.. Status: pending

#### S1.T3 — Activar el modo monto en el builder de factura de Ventas: control de ingreso en pesos, validacion de tope contra el subtotal de linea y totales del documento recalculados.
Contrato: rollback: Revertir el flag/prop de modo en el builder de Ventas para volver a porcentaje; el control compartido sigue funcionando.. Status: pending

#### S1.T4 — Suite de CA-09: casos happy, tope, exceso y vacio del descuento en monto para Ventas, mas la corrida completa de la suite de Compras para confirmar cero regresion en el control compartido.
Contrato: rollback: Revertir los tests agregados; los de baseline y los de Compras permanecen.. Status: pending

#### S2.T1 — Fijar por test el comportamiento actual del guard de salida (dos opciones) y del flujo de emision sin borrador, antes de reactivar la funcionalidad.
Contrato: rollback: Eliminar los tests de baseline agregados.. Status: pending

#### S2.T2 — Flip de SHOW_SAVE_DRAFT a true y re-habilitacion de los tests de Guardar borrador que estaban deshabilitados, ajustando solo lo que el flag apagado dejaba obsoleto.
Contrato: rollback: Volver el flag a false y re-deshabilitar los tests reactivados.. Status: pending

#### S2.T3 — Conectar Guardar borrador al contrato de stub existente de JOR-166: alta en STUB_DOCUMENTOS con esBorrador:true, actualizacion en vez de duplicado al re-guardar, y transicion a esBorrador:false via issueFactura. No crear mecanismo de persistencia nuevo.
Contrato: rollback: Revertir el wiring al stub; el builder queda sin persistir borradores y el flag puede volver a false.. Status: pending

#### S2.T4 — Ampliar el guard de salida (CA-15) a tres opciones: descartar, cancelar y guardar borrador, con manejo de fallo del guardado que no cierra la vista.
Contrato: rollback: Revertir el guard a las dos opciones previas; Guardar borrador sigue disponible desde la accion del builder.. Status: pending

#### S2.T5 — Suite de CA-12: guardado happy, re-guardado sin duplicar, emision que apaga esBorrador, fallo de guardado, mas regresion de las dos opciones previas del guard y de la emision directa sin borrador.
Contrato: rollback: Revertir los tests agregados; el baseline permanece.. Status: pending

#### S3.T1 — Fijar por test el contrato actual de busqueda de items (request sin filtros y paginacion de Ver mas items) para Ventas y Compras, antes de introducir los filtros.
Contrato: rollback: Eliminar los tests de baseline agregados.. Status: pending

#### S3.T2 — Extender la busqueda de items con los 5 criterios server-side (marca, estado de stock, categoria, proveedor, ofertas) y hacer que la paginacion de Ver mas items propague los filtros vigentes.
Contrato: rollback: Revertir el envio de criterios y la propagacion en paginacion; la busqueda vuelve al contrato sin filtros.. Status: pending

#### S3.T3 — Renderizar los 5 controles de filtro solo cuando el buscador se abre desde Ventas (parametrizacion por modulo, default sin filtros), con limpieza de filtros y estado vacio.
Contrato: rollback: Desactivar la parametrizacion para que ningun modulo renderice filtros; Compras no se ve afectado en ningun caso.. Status: pending

#### S3.T4 — Verificacion (no reimplementacion) de CA-05, CA-06, CA-10, CA-11, CA-13, CA-14 y CA-15 sobre el builder ya modificado: recorrer cada criterio, dejar evidencia del resultado y reportar cualquier desvio detectado sin corregirlo en este ticket.
Contrato: rollback: No aplica: la task no modifica codigo productivo; se revierte solo la evidencia registrada.. Status: pending

#### S3.T5 — Suite de CA-08 y regresion final: filtros simples y combinados, Ver mas items sobre filtrado, filtro sin resultados, error de busqueda, buscador de Compras sin filtros con su request original, mas corrida completa de las suites de Ventas y Compras (descuento, borrador, criterios verificados).
Contrato: rollback: Revertir los tests agregados; los baselines de las tres sesiones permanecen.. Status: pending

## Verificacion runtime

1. **Qué:** Verificar en runtime: El buscador de items del builder de Ventas expone 5 filtros server-side reales (marca, estado de stock, categoria, proveedor, ofertas) y Ver mas items pagina sobre el resultado YA filtrado.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
2. **Qué:** Verificar en runtime: Los filtros del buscador estan parametrizados por modulo: solo se habilitan para Ventas y el buscador de items de Compras queda sin filtros y con su paginacion actual.
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
