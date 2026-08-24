# Plan de migración por ticket — kanai_test
 
> Matriz generada desde el snapshot de `kanai_data` del 2026-08-24. Contiene 5 tickets y no autoriza todavía la eliminación de fuentes.
 
## Regla de ejecución
 
Ejecutar cada fila con la secuencia `M1` captura inmutable → `M2` normalización y mapeo → `M3` resolución de relaciones → `M4` validación tipada/FK → `M5` smoke y evidencia. Si una guardia falla, conservar el origen, mover el caso a cuarentena y continuar con el siguiente ticket.
 
## Matriz completa
 
| Ticket | External | Estado | Tipo | Módulo | Specs | Learns | Tests | Sessions | Tasks | Teach | Perfil | Guardias específicas |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| KT-001 | KT-001 | closed | implement | infra | 1 | 2 | 2 | 1 | 2 | 2 | ticket+spec+learn+test+session/task+teach | validar FK, schema y hash de origen |
| KT-002 | KT-002 | in_progress | implement | docs | 1 | 0 | 2 | 1 | 3 | 1 | ticket+spec+test+session/task+teach | estado in_progress: no cerrar durante migración |
| KT-003 | KT-003 | closed | improvement | engine | 0 | 1 | 2 | 1 | 2 | 2 | ticket+learn+test+session/task+teach | sin spec vinculada: no inventar spec; cuarentena si existe archivo |
| KT-004 | KT-004 | open | quick | ui | 0 | 0 | 0 | 0 | 0 | 0 | ticket | sin spec vinculada: no inventar spec; cuarentena si existe archivo; estado open: no cerrar durante migración; sin tests: registrar gap; sin sessions/tasks: validar si el legacy estaba inline |
| KT-005 | KT-005 | blocked | fix | ui | 0 | 0 | 0 | 0 | 0 | 0 | ticket | sin spec vinculada: no inventar spec; cuarentena si existe archivo; estado blocked: no cerrar durante migración; sin tests: registrar gap; sin sessions/tasks: validar si el legacy estaba inline |
 
## Criterio de aceptación por ticket
 
- Existe una fila de migración con `source_ref`, hash y timestamp.
- El ticket conserva ID interno, external y estado original; no se reescribe el request.
- Las relaciones a specs, sessions, tasks, learns, test cases y teachings apuntan a IDs válidos.
- El contenido no parseable o ambiguo está en cuarentena con motivo, no descartado.
- El smoke del ticket registra conteos antes/después y pasa el checklist global.
 
