# F7: corrección de métricas tras el smoke real (A+B)

Fecha: 2026-10-05. Origen: hallazgo e0106 en las 3 corridas reales del dev (layout #425, curriculum-mapping #48 y layout #426).

## Problema

El registro de métricas copiaba el resumen del parent tal cual. No lo validaba, no lo comparaba con los datos de la corrida y rellenaba lo que faltaba con ceros:
- #48 y #426 quedaron con 0 hallazgos y veredicto calculado "otro", aunque el expediente tenía 4 hallazgos cada uno.
- En #425 se perdieron datos porque el resumen usó claves inventadas.

## Decisión del dev

Opción A+B, aplicada dentro de F7 (opción 1).

## Qué cambió (commits 9757aff y 8ca028f)

- **Rondas ligadas:** `dredd-case.py record --run` liga la ronda a la corrida y guarda los conteos (severidades y consultas) y el veredicto que calcula la rúbrica.
- **Módulo nuevo `dredd_derive.py`:** obtiene hallazgos, cobertura y veredicto calculado del expediente, y los carriles de `lanes.json`. Lo derivado gana sobre el resumen. Sin fuente, el campo queda en null y se anota en `missing`.
- **Expedientes anteriores:** una ronda sin `--run` se toma por ventana de tiempo, solo si la corrida está cerrada y nunca si la ronda está ligada a otra corrida. En ese caso el veredicto calculado queda sin dato, porque esas rondas no guardan consultas ni pisos.
- **Formato cerrado de `resumen.json`:** un campo desconocido o un valor fuera de lista hace salir con código 2 sin escribir nada.
- **Reporte:** lista las corridas sin conteos o sin veredicto calculado, y las que emitieron un veredicto distinto del calculado sin motivo. Un registro con claves de hallazgos fuera del contrato aparece como problema.
- **Protocolo y docs:** `output.md` documenta el formato y las fuentes; `rounds.md` documenta `--run`; `orchestration.md` indica guardar `lanes.json` en la carpeta de la corrida; también se actualizaron la guía y la referencia.

## Verificación

- 191 tests OK en Python 3.9.25 y 3.14.4.
- Flujo e2e: 16 de 16 pasos.
- El ejemplo de reporte se regenera idéntico.
- Juez ciego sonnet: aprobado con 4 menores (ventana de tiempo, veredicto aproximado, guard de `run_id`, tests faltantes), todos corregidos en 8ca028f.

## Re-registro de las corridas del dev

Respaldo previo en `~/.dredd/metrics.bak-20261005`.
- #48 y #426: re-registradas con datos derivados del expediente. Quedan sin veredicto calculado ni verificaciones, y el reporte lo dice.
- #425: no tenía expediente. Se re-registró traduciendo su `summary.json` al formato del contrato: `consultas` pasó a `consulta`, las verificaciones a `tests` y `lanes` a `reviewers`.
- Reporte resultante: 3 corridas con 1 S1, 2 S2, 6 S3 y 4 consultas.
