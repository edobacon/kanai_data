# Plan de migración por ticket — kanai_self
 
> Matriz generada desde el snapshot de `kanai_data` del 2026-08-24. Contiene 1 tickets y no autoriza todavía la eliminación de fuentes.
 
## Regla de ejecución
 
Ejecutar cada fila con la secuencia `M1` captura inmutable → `M2` normalización y mapeo → `M3` resolución de relaciones → `M4` validación tipada/FK → `M5` smoke y evidencia. Si una guardia falla, conservar el origen, mover el caso a cuarentena y continuar con el siguiente ticket.
 
## Matriz completa
 
| Ticket | External | Estado | Tipo | Módulo | Specs | Learns | Tests | Sessions | Tasks | Teach | Perfil | Guardias específicas |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| KANAI-KB7 | KANAI-KB7 | in_progress | implement | — | 1 | 0 | 13 | 2 | 6 | 0 | ticket+spec+test+session/task | estado in_progress: no cerrar durante migración |
 
## Criterio de aceptación por ticket
 
- Existe una fila de migración con `source_ref`, hash y timestamp.
- El ticket conserva ID interno, external y estado original; no se reescribe el request.
- Las relaciones a specs, sessions, tasks, learns, test cases y teachings apuntan a IDs válidos.
- El contenido no parseable o ambiguo está en cuarentena con motivo, no descartado.
- El smoke del ticket registra conteos antes/después y pasa el checklist global.
 
