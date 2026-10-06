# Línea base de ejecución: TAO-192 vs TAO-191

Fuente: métricas de Kanai del 2026-10-06 (horas en UTC). get_runs devuelve máximo 50 de 76 runs, faltan 26 antiguos.

## Cifras

| | TAO-192 | TAO-191 |
|---|---|---|
| Requisitos (REQs) | 14 | 8 |
| Casos de prueba | 61 (13 pendientes) | 32 |
| Runs | 76 | 43 |
| Tokens | 27,42M | 19,6M |
| Gates | 14 | 20 |
| Subagentes | 58 | 17 |
| Ejecución | 4 h | 2,7 h |

## Línea de tiempo TAO-192

- Intake: creado 10-03 23:27, spec aprobado 10-06 00:58 (49,5 h de calendario, 4 refines, 3 versiones del spec, 1 re-plan).
- Ejecución: 4 h, las 4 sesiones pasan su gate N2 a la primera.
- Hueco sin runs: 6,4 h (04:58 a 11:23).
- Gate N3: 5 iterate seguidos en 40 min, approve final 12:03.
- Calendario total unos 60 h.

## Causas probables (a confirmar en F1)

1. El sandbox nunca verificó: "NO corrió" en todos los gates porque los repos del ticket en su rama de trabajo no tienen cambios detectables (rama acumuladora epic/EP-01).
2. Scope creep repetido en 5 de 7 rondas N3: el diff incluye app-version y public-configuration que ya entregó TAO-191, y los jueces dudan cada vez.
3. Hallazgos nuevos en cada ronda: manifiesto con capacidadesPorTipoCuenta vacío, resolverOperacion ignora el método HTTP, refresh token en claro en la tabla de idempotencia, cuenta.registrar con obligatoria mal.
4. Costo: un gate usó 6,35M tokens de entrada (23% del total).
5. Contexto creciente en S4: 1,36M, 1,44M, 1,51M, 1,57M por lote.

## Metas propuestas

| Señal | Meta |
|---|---|
| Verificación real en el gate | corre en el 100% |
| Hallazgos repetidos entre rondas | 0 |
| Rondas del gate N3 | 2 o menos |
| Tokens por gate | menos de 1M |
| Tiempo muerto antes del gate final | menos de 1 h |

## Restricción

El alcance de los tickets existentes no se modifica. Solo cambia el cómo se ejecutan.
