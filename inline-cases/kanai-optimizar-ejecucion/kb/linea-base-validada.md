# Línea base validada

Validación 2026-10-06 por MCP: TAO-192 76 runs, 27.419.595 tokens; TAO-191 43 runs, 19.588.246 tokens. Consulta detallada limitada a 50, sin paginación: faltan 26 runs antiguos de TAO-192; TAO-191 completo (43). Los totales no dependen de esa truncación.

Corrección: no es cierto que el sandbox nunca corriera en todos los gates. Los cuatro N2 visibles de TAO-192 sí ejecutaron tests (374, 155, 163 y 421 aprobados), con typecheck skipped; los siete N3 visibles no ejecutaron sandbox. N3: seis iterate y un approve, con cinco iterate consecutivos en el tramo final y uno anterior.

El gate de 6.349.386 tokens de entrada y 76.691 de salida existe. Es consumo acumulado reportado por el proveedor (incluye llamadas/herramientas), no evidencia de un prompt de 6,35M. Los totales incluyen planificación, refinamiento, gates y ejecución. No atribuirlos solo a tamaño del contexto.

Comparación normalizada orientativa: tokens por REQ 1,96M vs 2,45M; tokens por caso 0,45M vs 0,61M. No equivalen a esfuerzo: los tickets difieren en alcance y cobertura. Tiempos del documento original pendientes de reconstrucción causal; el hueco entre runs no prueba bloqueo del motor.

La evidencia y datos del caso se guardan solo en KB. F0/F1/F4 pueden dejar commits de hito sin datos de tickets dentro del repositorio de código.
