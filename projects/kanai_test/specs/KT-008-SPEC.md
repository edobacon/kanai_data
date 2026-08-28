---
id: KT-008-SPEC
project: kanai_test
ticket: KT-008
status: draft
---

# Smoke C2: consumidor — corrección del comportamiento defectuoso del consumidor con regresión obligatoria

## Requirements

#### REQ-01 `confirmed`
> Fuente: Request inmutable del ticket KT-008 ('Smoke C2: consumidor', tipo fix, cuerpo)
> Necesidad: build
El consumidor DEBE procesar cada mensaje/evento entrante recibido del productor y producir el efecto observable esperado (persistencia/ack) exactamente una vez por mensaje válido, sin descartes silenciosos.

#### REQ-02 `inferred`
> Fuente: Work type fix del ticket KT-008 (corrección de comportamiento defectuoso) + regla de proyecto 'catch nunca vacío / no exponer stack traces' (CLAUDE.md, Calidad de codigo)
> Necesidad: build
El consumidor DEBE manejar el fallo de procesamiento de un mensaje sin perder el resto del lote: el mensaje fallido NO se debe ack-ear/confirmar y el error DEBE quedar registrado con contexto (id de mensaje y causa), sin exponer stack trace al exterior.

#### REQ-03 `inferred`
> Fuente: DET-40 (auditoria de reemplazo) y DET-16 (propagacion) del catálogo condensado en CLAUDE.md; work_type fix del ticket KT-008
> Necesidad: build
El fix NO DEBE alterar el comportamiento observable de ningún otro camino de código que comparta las funciones/módulos tocados: todo camino retirado o reenrutado DEBE tener su equivalente 1:1 verificado (DET-40) y sus consumidores identificados (DET-16).

## Tasks

#### S1.T1 — Auditoría de reemplazo previa al cambio (DET-40): leer el código del consumidor, enumerar por escrito efectos, sinks de cada parámetro, side-effects, casos borde y orden del camino actual, y listar todos sus consumidores vía búsqueda por nombre (DET-16). Producir el inventario como entrada de las tasks de fix.
Contrato: rollback: El artefacto es documental (inventario en el ticket); revertir eliminando la sección agregada al markdown del ticket. Sin cambios en código, rollback trivial.. Status: pending

#### S1.T2 — Fijar el comportamiento ACTUAL con tests de regresión antes de tocar código: casos que capturan procesamiento exitoso, ack/commit, forma legacy del payload y comportamiento de error vigente. Deben pasar contra el código sin modificar.
Contrato: rollback: git revert del commit de tests; los archivos de test son nuevos y aislados, borrarlos no afecta código de producción.. Status: pending

#### S1.T3 — Implementar la corrección en el camino de procesamiento del consumidor: garantizar procesamiento exactamente-una-vez por mensaje válido, sin descartes silenciosos, preservando el contrato de entrada legacy identificado en la auditoría.
Contrato: rollback: git revert del commit del fix; el cambio queda acotado al módulo del consumidor y no incluye migraciones ni cambios de esquema, por lo que revertir restaura el comportamiento previo sin pasos adicionales.. Status: pending

#### S1.T4 — Implementar el manejo de fallo por mensaje: aislar el error del resto del lote, no confirmar el mensaje fallido, registrar id y causa sin exponer stack trace, y respetar el límite de reintentos hacia el camino de descarte.
Contrato: rollback: git revert del commit de manejo de errores; restaura el bloque catch previo tal como quedó fijado por los tests de regresión de la task 2.. Status: pending

#### S1.T5 — Suite de tests del fix y regresión completa: implementar la matriz de casos de REQ-01/REQ-02/REQ-03 (happy, edge, boundary, error, regression), correr la suite del módulo y la suite global, y reportar resultados reales con clasificación introducido vs preexistente.
Contrato: rollback: git revert del commit de tests; los tests nuevos viven en archivos propios del módulo y su eliminación no altera el código de producción.. Status: pending
