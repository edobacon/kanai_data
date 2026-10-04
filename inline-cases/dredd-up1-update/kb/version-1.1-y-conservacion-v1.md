# Versión 1.1 y conservación de la documentación v1

## Decisión confirmada

La nueva versión de Dredd de up1 se identificará como **1.1**. La documentación anterior permanece disponible e intacta para comparación; no se reemplaza ni se presenta como documentación del nuevo comportamiento.

## Entregables

- `docs/reference/dredd-v1.1.md`: capacidades, configuración y límites de 1.1.
- `docs/guides/dredd-operacion-v1.1.md`: flujo operativo completo de 1.1, comandos, fallos, migración y diferencias por sistema.
- `docs/reference/dredd-v1-a-v1.1.md`: comparación entre versiones de Dredd de up1, con cambios, comportamiento preservado, incompatibilidades y evidencia de aceptación.
- Índice actualizado o nuevo que permita consultar ambas versiones sin alterar los documentos históricos.
- Un ejemplo anonimizado del reporte Markdown de métricas generado por el comando real de 1.1.

## Protección de la línea base

Se conservan `docs/reference/dredd-v1.md` y `docs/guides/dredd-operacion-v1.md` como estaban en el commit `348ea29`. Antes de implementar se registra su contenido/hash. La aceptación exige comparación con esa referencia sin cambios. Las copias del KB del caso tampoco se reemplazan por 1.1.

## Condiciones

Documentar solamente lo implementado y verificado; no marcar como activa una capacidad propuesta. La versión 1.1 debe declararse coherentemente en el contrato de la skill y en los registros/reportes de métricas. Toda la documentación final de up1 describe su propio producto y no menciona sistemas excluidos. La compatibilidad objetivo es Claude Code en macOS, Linux y Windows. Las fases son internas: hay una sola entrega final.

## Estado

Planificación autorizada por el usuario. Implementación y publicación aún no iniciadas. Las políticas pendientes del contexto se resuelven al comienzo del plan, no se asumen aprobadas.
