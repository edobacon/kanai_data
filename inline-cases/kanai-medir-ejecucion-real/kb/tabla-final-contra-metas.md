# Tabla final contra las metas de la medicion real

Fecha: 2026-10-06 (UTC). Caso sucesor de kanai-optimizar-ejecucion. Codigo medido: feat/medir-ejecucion-real en kanai-app, basado sobre setup (e2250a5), sin merge a setup; el MCP se reinicio con los 8 primeros commits (19f1623 a 12c18ca). Las correcciones de F5 y F7 (commits posteriores, hasta 8ff3acd) NO estaban en el MCP durante las corridas de KT: las medidas de abajo son del codigo de 12c18ca. Corridas reales con LLM en el proyecto KT (kanai_test): KT-017, KT-018 y KT-019 en la rama acumuladora epic/KT-ACUM. Detalle por ticket en medidas-kt-017.md, medidas-kt-018.md y medidas-kt-019.md.

## Veredicto del arbiter: aprobable con reservas (ronda 3)

| Ronda | Alcance | Veredicto | Hallazgos | Que paso |
|---|---|---|---|---|
| 1 | 22 archivos, 668 lineas | iterar | 1 S1, 2 S2, 6 S3, 4 consultas | f1 (binario commiteado dejaba el N3 sin poder aprobar), f3 (rerun sin lista de reutilizados) y f6 (comentario) corregidos en F5 |
| 2 | Diff de 26 archivos; el juez leyo el lote nuevo (12 archivos, 449 lineas) y el resto ya estaba leido completo con el mismo contenido | iterar | 3 S2, 11 S3, 4 consultas | g1 (codigo marcado binario pasaba como asset), g2 (un escalate perdia la deuda de impacto) y g3 (alcance del rerun no siempre verdadero) corregidos en F7 |
| 3 | interdiff de F7: 8 archivos, 180 lineas, y re-chequeo de los 18 hallazgos | aprobable con reservas | 0 S1, 1 S2, 10 S3, 5 consultas | Corregidos g1, g2, g3, g6, g9 y f12. El unico S2 (h1) eran dos comentarios que el cambio dejo falsos |

El S2 de la ronda 3 (h1: integralBudget.ts:4 y sessionDiff.ts:121 decian que un binario no impide aprobar) lo corrigio el commit 8ff3acd por decision del dev, sin cuarta ronda, porque el tope acordado era no abrir otra ronda tras un S2. **Esa correccion no la juzgo el arbiter**: el veredicto guardado sigue siendo aprobable con reservas. El criterio F4-C2 del plan pedia originalmente "arbiter aprobado o con nits", que no se cumple. El dev lo enmendo en F8 (opcion A) a "sin S0 ni S1, S2 corregidos o resueltos con decision del dev y S3 y consultas listados", y con ese texto enmendado quedo registrado como cumplido; la desviacion consta en el plan.

## Metas del caso

| Meta | Resultado | Estado | Evidencia |
|---|---|---|---|
| Sandbox que corre en cada gate | De 10 gates de sesion (los N2 y las rondas del N3 de los 3 tickets), el sandbox real corrio en 7 y se omitio en 3. Los 3 omitidos son el N2 de la sesion 2 de cada ticket, sesiones de solo README, con la causa "sin cambios de codigo". Corrio en todo gate de una sesion con codigo, incluidas las 4 rondas del N3 | Parcial: cumplida para toda sesion con codigo; el literal "en cada gate" no se cumple en las 3 sesiones de solo documentacion | medidas-kt-017.md, medidas-kt-018.md, medidas-kt-019.md |
| Cero hallazgos por diff heredado | 0 en las 4 rondas del N3 (KT-017: 1, KT-018: 2, KT-019: 1). El diff de KT-018 bajo de 5 a 3 archivos y el de KT-019 de 7 a 3 (de 178 a 61 lineas) al excluir lo de los tickets anteriores. El arbiter confirmo que el calculo de la base es correcto y solo marco brechas menores como consultas (f4, f5). Reserva: las citas del juez fuera del diff en KT-018 ronda 1 siguen sin explicar (pendiente 2) | Cumplida en la serie sintetica, sin evidencia en contra; no probada con el diff de TAO-192 | medidas-kt-018.md, medidas-kt-019.md, arbiter-ronda-1.md |
| N3 en 2 rondas o menos | KT-017: 1, KT-018: 2 (1 escalada y 1 aprobada), KT-019: 1 | Cumplida en la serie sintetica de solo texto. Los riesgos del arbiter para tickets con binarios (f1) y para reruns (f3) se corrigieron en F5 y F7, pero esas correcciones se probaron con tests y no con una corrida real | medidas-kt-017.md a 019.md, arbiter-ronda-1.md |
| Menos de 1M de tokens por gate | Maximo 82.118 (N3 de KT-018 ronda 1); N3 de KT-019: 51.580; el peor gate de TAO-192 fue 6,35M | Cumplida en la serie sintetica (3 archivos contra 188 de TAO-192); sin tope que la garantice: el objetivo del diff del N3 subio a 400k caracteres por juez y el contexto de consumidores no tiene tope, solo un aviso | medidas-kt-018.md, medidas-kt-019.md, arbiter-ronda-1.md |
| Auto-fix cortado por tope y clasificado como bloqueado | Ningun auto-fix se disparo en las 3 corridas | No medida | f3-no-aplica-y-pendientes.md, pendiente 4 |

Cuenta de los gates de sesion: KT-017 tuvo 3 (N2 sesion 1, N2 sesion 2 y N3; sandbox en 2), KT-018 tuvo 4 (N2 sesion 1, N2 sesion 2 y 2 rondas del N3; sandbox en 3) y KT-019 tuvo 3 (N2 sesion 1, N2 sesion 2 y N3; sandbox en 2). Total: 10 gates, 7 con sandbox real y 3 omitidos por diseno.

## Cifras de la serie

| | KT-017 | KT-018 | KT-019 | Serie |
|---|---|---|---|---|
| Tokens (con subagentes) | ~414k (256.540 en Kanai + 157.204 de notificaciones) | 495.118 | 391.604 | ~1,30M |
| Rondas del N3 | 1 | 2 | 1 | 4 |
| Peor gate | 63.313 (N2 sesion 2) | 82.118 (N3 ronda 1) | 51.580 (N3) | 82.118 |
| Diff del N3 (archivos, contra main y contra la base nueva) | n/a (primero de la rama) | 5 a 3 | 7 a 3 | |

## Contra la linea base de TAO-192 y TAO-186

- TAO-192 (27,4M tokens, 5 iterate seguidos en el N3, peor gate 6,35M, scope heredado en 5 de 7 rondas, sandbox siempre "NO corrio") y TAO-186 (3,19M tokens, auto-fix cortado por tope a 1,51M, sandbox "NO corrio"). Cifras de punto-de-partida.md.
- Lo comparable de forma directa: el scope heredado repetido desaparecio y el sandbox verifica con evidencia real. Lo indicativo y no atribuible a los cambios: rondas y tokens, porque la escala es mucho menor (3 archivos contra 188, 4 REQs contra 14).

## Correcciones hechas en este caso (en kanai-app, rama feat/medir-ejecucion-real)

- F5 (hallazgos de la ronda 1): los assets binarios dejan de impedir aprobar el N3 y se nombran en las notas; el rerun lista los archivos reutilizados; se corrigio el comentario fail-open. Commits en F5.
- F7 (hallazgos de la ronda 2): el codigo, la configuracion o la documentacion que git muestra como binario sigue bloqueando el N3 (6c7e810); el alcance del rerun solo promete reutilizados si las notas los listan (37de128); un escalate con deuda de impacto la conserva para el rerun (b34fc3b); docs y worklog al dia (a555940). Suite al cierre de F7: 373 archivos y 2961 tests, corrida del dev (consta en el evento F7-C1 del plan; el run del arbiter no la guarda).
- Ronda 3: comentarios de binarios corregidos (8ff3acd), sin typecheck ni suite posteriores a ese commit (solo comentarios).

## Hallazgos que quedan abiertos (no se corrigen en este caso)

S3 de la ronda 3, todos con su evidencia en el historial del arbiter (run r3):
- h2: la lista de extensiones de texto es cerrada; un Dockerfile, .env, .svg, .ini o .tf marcado binario pasaria como asset. Mas seguro: invertir el criterio con una lista de assets conocidos.
- h3: un archivo de codigo binario llega al juez como "cortado" sin explicar la causa ni como destrabarlo.
- g4 (foto ilegible bloquea y foto ausente no), g5 (atribucion por subcadena), g7 (consumidor incompleto sesga la metrica diffComplete), g8 (worklog de SQLITE_BUSY fuera de las fases), f7 (marcador del ref sin anclar), f8 (git log first-parent sin rango), f9 (la foto exige package.json), f11 (deuda de impacto de un repo que ya no se recorre).
- Consultas: c1 (la reutilizacion compara el arbol y no la base del diff), c2 (como se destraba un N3 bloqueado por un archivo -diff permanente o borrado), f2 (contexto de consumidores sin hunks), f4, f5.
- Nit del juez de F7: el prior de un escalate se devuelve con decision iterate fija (gateLevels.ts:86-88); solo cosmetico.

## Pendientes y no medido

1. Contrato del planificador contra la lista de casos (preexistente; provoco el hueco de test de KT-018).
2. Citas del juez fuera del diff en el N3 de KT-018 ronda 1: sin confirmar y sin explicar. El arbiter analizo el candidato mas claro (f2, contexto de consumidores sin hunks) y concluyo que NO lo explica, porque solo ocurre con una foto previa del N3 y esa era la primera ronda.
3. Limpieza de comentarios que reescribe con texto identico (preexistente probable).
4. Auto-fix con tope de tokens (no medido).
5. Los hallazgos S3 y consultas de arriba, si se decide abordarlos.
Detalle en f3-no-aplica-y-pendientes.md y arbiter-ronda-1.md.

## Limites de toda la medicion

- Sin corrida de control con el codigo viejo en el mismo escenario: no hay A/B.
- Un solo escenario sintetico chico con una rama acumuladora y dependencias integradas por commits propios en secuencia; no se probaron integraciones por merge o squash, binarios en el ticket ni 14 REQs.
- Jueces de la familia sonnet.
- Los tokens de los subagentes de KT-017 salen de las notificaciones del host, no de Kanai.
- Las correcciones de F5 y F7 no se midieron con una corrida real de LLM: solo con tests y con el arbiter.

## Estado de la entrega

- Los cambios viven en la rama local feat/medir-ejecucion-real de kanai-app, sin push y sin merge a setup; el checkout principal esta parado en esa rama.
- Dos cambios locales ajenos del dev (docs/README.md y docs/analisis-persistencia.md) estan guardados en un stash de kanai-app.
- KT-017, KT-018 y KT-019 quedaron en listo para cerrar en kanai_test; su cierre es del dev.
- Otros dos procesos del MCP de Kanai (de otras sesiones) siguen con codigo anterior hasta que se reinicien; el MCP de esta sesion tampoco carga las correcciones de F5 y F7 hasta que se reinicie.
- Veredicto del arbiter: aprobable con reservas, sin S1; el unico S2 se corrigio por commit sin volver a juzgarlo. Integrar a setup es decision del dev.
