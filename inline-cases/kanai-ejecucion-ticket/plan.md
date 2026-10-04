# Plan inline: Ejecución de ticket: por sesión contra por tarea, medido, con el testigo inline

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Decidir con un experimento comparable si conviene seguir ejecutando una tarea por subagente en frío o llevar la sesión a un solo agente con las tareas encadenadas, y dejar la revisión a la altura de ese cambio. Primero se mide lo que hoy no se mide (utilización del ticket y relación entrada/salida), después se aísla el arranque en frío y se caracteriza el testigo del camino inline, después se habilita la sesión en un solo agente detrás de bandera y se refuerza la revisión, y recién entonces se corre la comparación de tres patas y se decide.
**Tags:** repos: kanai-app · branches: codex/epicas-autonomas · labels: ejecucion, sesion, arranque-en-frio, revision, experimento, metricas, testigo-inline
**Estado:** 1 de 6 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Telemetría y las dos métricas que faltan | Que la comparación del experimento sea válida por la propia regla del proyecto: cerrar el hueco de completitud de telemetría y sumar al desglose de tiempo las dos métricas que hoy no mide ningún caso (utilización del ticket y relación entrada/salida). Entrega las dos métricas nuevas en el desglose, el informe de completitud y la foto base congelada. | Hecho | 2026-10-04 → 2026-10-04 | f1e9795, 0613528, 2a59c03, 3e4a933, 5b28d1d, 09e2a82 | 4/4 | - |
| F1 Aislar qué parte de cada corrida es re-descubrimiento y caracterizar el testigo inline | Separar, con evidencia y no con estimación, el arranque en frío del trabajo real de la tarea, y caracterizar el testigo del camino inline, para saber cuánto hay para ganar antes de tocar el motor. Entrega el informe del arranque en frío con su techo, el informe del testigo inline y la lista de lo que el cambio de granularidad no puede mejorar. | En curso | 2026-10-04 → - | e4cbf55, a209705 | 4/5 | - |
| F2 Ejecutar la sesión en un solo agente, con checkpoint por tarea | Que una sesión pueda ejecutarse en un solo subagente con las tareas encadenadas y reporte por tarea, sin cambiar el plan del ticket ni perder el modelo sugerido por tarea. Entrega la ejecución de la sesión en un solo agente con checkpoint por tarea, detrás de bandera y con el plan del ticket intacto. | Pendiente | - → - | - | 0/4 | El piloto de la epica cerrado o su comparacion ya congelada (2026-10-18); F2.1; F2.2; F2.3; F2.4 |
| F3 Revisión a la altura del diff más grande | Que ampliar la unidad de ejecución no baje la calidad verificable: encender y medir la revisión que ya está construida, y bajar el punto de control al checkpoint por tarea. Entrega la revisión encendida y medida, con el punto de control por tarea y el presupuesto de diff avisando. | Pendiente | - → - | - | 0/4 | F3.1; F3.2; F3.3; F3.4 |
| F4 El experimento comparado, de tres patas | Producir el dato que hoy no existe: una sesión por tarea contra una sesión encadenada, comparables, con la misma vara y con el tamaño de la muestra declarado, y con el testigo inline al lado. Entrega la comparación medida entre las formas de ejecutar, con su muestra y sus límites. | Pendiente | - → - | - | 0/6 | F4.1; F4.2; F4.3; F4.4; F4.5 |
| F5 Veredicto y decisión registrada | Aceptar, ajustar o revertir con números, y dejar la decisión escrita con su motivo. Entrega el veredicto comparado y la decisión registrada. | Pendiente | - → - | - | 0/3 | F5.1; F5.2 |

## Riesgos

- Encadenar sin disciplina de contexto puede subir el costo en vez de bajarlo: ya se midió que re-hacer una tarea cuesta 1,7x el tiempo y 1,5x los tokens.
- Un diff más grande baja la precisión del juez: el juez es el mismo modelo que ejecuta y hoy aprueba en el modo más laxo. Ampliar la unidad sin reforzar la revisión es cambiar velocidad por calidad.
- Una falla a mitad de sesión obliga a re-correr la sesión entera: se acota con checkpoint por tarea y con el registro de commits por tarea.
- Los tokens de entrada que reporta el host incluyen la lectura de caché: el ahorro monetario puede ser menor que el de tokens. El reloj no se ve afectado.
- Cambiar la granularidad afecta a todos los proyectos: entra detrás de bandera, se prueba primero en un ticket aislado y se declara la reversión.
- Si la telemetría no llega al 90%, ninguna comparación es válida por la regla del roadmap 10 (M9): es requisito previo, no un detalle.
- El camino inline parece más barato porque no registra tokens ni corre gates: compararlo sin declarar ese hueco hace ganar a la forma que no lleva la cuenta.
- El reloj del caso inline no está en el plan: las fases se registran retroactivamente (en kanai-epicas-autonomas los commits son tres horas anteriores a la apertura). Leerlo del plan infla la velocidad aparente.

## Fuera de alcance

- Modificar la épica nativa de taomangalam ni su piloto, ni sus tickets, specs, tareas, sesiones o estados.
- Re-planificar o re-ejecutar tickets ya cerrados.
- Reescribir la máquina de estados, los guards o los contratos DET.
- Cambiar la matriz de casos de test por requisito.
- Construir de nuevo lo que ya existe: la aprobación con evidencia, el canario, el refutador, el review por tarea, el presupuesto de diff y la ejecución en paralelo ya están en el código. Acá se encienden, se miden y, solo si hace falta, se ajustan.
- Cambiar el contrato del caso inline ni convertirlo en el camino de producción: el testigo se estudia, no se toca.
- Los cambios de motor del caso post-épica que no hagan falta para que esta comparación sea válida.

## Fases

### F0. Telemetría y las dos métricas que faltan

**Meta:** Que la comparación del experimento sea válida por la propia regla del proyecto: cerrar el hueco de completitud de telemetría y sumar al desglose de tiempo las dos métricas que hoy no mide ningún caso (utilización del ticket y relación entrada/salida). Entrega las dos métricas nuevas en el desglose, el informe de completitud y la foto base congelada.
**Esfuerzo:** 1 día
**Cómo deshacerla:** Revertir los commits del script y del informe. No toca el store ni ningún ticket.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F0** (estado: Hecho)
- **Fecha real:** inicio 2026-10-04 · fin 2026-10-04
- **Antes de empezar:**
  - [x] F0.pre1: Node 24 y pnpm disponibles, dependencias de kanai-app al día. (Node v24.21.0 disponible en nvm y usado explícitamente en cada comando; node_modules instalado (node_modules/.bin/tsx presente). El node por defecto de la máquina es v22.22.2, así que se antepone el bin de Node 24 en el PATH.)
  - [x] F0.pre2: Store vivo accesible en modo de solo lectura y el data repo sin cambios propios pendientes. (Store vivo en ~/.kanai/data/kanai_data/kanai.db, 97.910.784 bytes, legible. Todas las consultas de F0 son de solo lectura (medición), sin escritura al store ni a tickets.)
- **Commits:**
  - `f1e9795` · fix(epics): una cita de asset por basename o parte de ruta queda cubierta · kanai-app/codex/epicas-autonomas (verificado)
  - `0613528` · fix(ide): busca en copias legacy sin Git y fija el orden de las lineas · kanai-app/codex/epicas-autonomas (verificado)
  - `2a59c03` · docs(dredd): configuracion instalada, perfil recomendado y capacidades · kanai-app/codex/epicas-autonomas (verificado)
  - `3e4a933` · feat(metricas): completitud de telemetria por backend con etiqueta canonica · kanai-app/codex/epicas-autonomas (verificado)
  - `5b28d1d` · feat(metricas): utilizacion, tokens y traspasos en el desglose de tiempo del ticket · kanai-app/codex/epicas-autonomas (verificado)
  - `09e2a82` · docs(metricas): foto base del flujo de tickets congelada (2026-10-04) · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F0.1** → Completitud de telemetria por backend medida y declarada. Dónde: kanai-app. Cómo se comprobó: Script corrido sobre el store vivo en solo lectura (exit 0), contrastado contra la metrica M9 de roadmap_metrics, y el detalle por backend agregado al script con agrupacion por etiqueta canonica (canonicalBackendLabel) y piso del 90%. Commit 3e4a933. · ejecutó: llm, `KANAI_DATA_REPO=<url> pnpm tsx scripts/metrics-baseline.mts --all`, salida 0, Completitud por backend con etiqueta canonica. taomangalam (3 hosts, 3 bajo el piso): OpenCode 789 runs, duracion 65.7%, tokens 76.6%, modelo desc 0%; Claude Code 115 runs, duracion 68.7%, tokens 96.5%; Codex 3 runs, 33.3%/33.3%. up1 (3 hosts, 2 bajo el piso): Claude Code 421 runs, duracion 67%, tokens 61%; LLM local 5 runs, 60%/60%; Codex 3 runs, 100%/100% cumple; motor no aplica. jormat-evolution (1 host, 1 bajo el piso): Claude Code 216 runs, duracion 46.8%, tokens 32.9%, modelo desc 44.9%. kanai_test: Codex 32 runs 100%/100% cumple; Claude Code 33 runs 90.9%/81.8% debajo; LLM local 14 runs 71.4%. Hallazgo: el hueco dominante es la DURACION, no los tokens; ningun backend con volumen supera el 90% en las dos a la vez salvo Codex con 32 runs en kanai_test. Hallazgo colateral: las etiquetas crudas partian el mismo host en dos filas (OpenCode/opencode, claude/Claude Code), asi que M9 se medía subestimada.
  - **F0.2** → Utilizacion, tokens y traspasos agregados al desglose de tiempo del ticket. Dónde: kanai-app. Cómo se comprobó: Script corrido sobre el store vivo en solo lectura (exit 0). Se validaron los cambios en local antes de commitear: 20 tests en verde (roadmap-metrics y telemetry-reliability) y typecheck con 0 errores. Commit 5b28d1d. · ejecutó: llm, `KANAI_DATA_REPO=<url> pnpm tsx scripts/metrics-ticket-timeline.mts TAO-181 TAO-182 --idle 15`, salida 0, Se agregaron tres metricas al desglose de tiempo. TAO-181: agente 178.7 min en 31 corridas = 3.8% del reloj del ticket; tokens entrada 10.429.995, salida 161.547, salida/entrada 1.55%; traspasos 76.6 min en huecos de 1 a 15 min = 19.9% del tiempo activo. Por sesion: S4 11 corridas, agente 84.5 min, util 55.4%, ratio 0.6%; S3 util 17.4%, ratio 0.7%; S2 util 11.9%, ratio 1.5%; S1 util 88%, ratio 2.2%. TAO-182: agente 158.4 min en 18 corridas = 3.3%; entrada 13.334.150, salida 25.073, ratio 0.19%; traspasos 39.5 min = 14.8% del activo. Por sesion: S2 util 50.1% ratio 0.1%; S3 util 98% ratio 0.1%; S1 util 102.6% (los tramos se solapan) ratio 0.4%.
  - **F0.3** → Foto base del flujo de tickets congelada con las metricas nuevas. Dónde: kanai-app. Cómo se comprobó: Foto congelada por el propio script (exit 0) y verificada leyendo el archivo: 11 tickets, idleMin 15, tomada el 2026-10-04T21:58:24Z. Commit 09e2a82. · ejecutó: llm, `KANAI_DATA_REPO=<url> pnpm tsx scripts/metrics-ticket-timeline.mts <11 tickets de taomangalam> --idle 15 --save docs/metrics/ticket-timeline-2026-10-04.json`, salida 0, Foto base congelada en docs/metrics/ticket-timeline-2026-10-04.json. Cohorte declarada: los 11 tickets de taomangalam con actividad desde el 2026-10-02 (TAO-172 a TAO-182). Utilizacion del reloj del ticket: 2.6% (TAO-180) a 7.5% (TAO-172); media del orden del 5%. Traspasos (huecos de 1 a 15 min entre corridas) como % del tiempo activo: 14.8% (TAO-182) a 25% (TAO-178); los 11 tickets superan el 10% que opt-09 escribio como umbral de revisita. Salida/entrada: 0.19% (TAO-182) a 2.87% (TAO-177).
- **Criterios cumplidos:**
  - **F0.c1** `pnpm typecheck` termina con código 0. → Salida del dev en kanai-app con Node 24: "> nuxt typecheck" y "Type check passed in 19849ms". Codigo de salida 0, 0 errores. · ejecutó: dev, `pnpm typecheck`, salida 0, Type check passed in 19849ms. 0 errores.
  - **F0.c2** `pnpm vitest run tests/unit/roadmap-metrics.test.ts tests/unit/telemetry-reliability.test.ts` termina con código 0. → Salida del dev en kanai-app con Node 24: "Test Files 2 passed (2)", "Tests 20 passed (20)", roadmap-metrics 15 tests y telemetry-reliability 5 tests. Codigo de salida 0. · ejecutó: dev, `pnpm vitest run tests/unit/roadmap-metrics.test.ts tests/unit/telemetry-reliability.test.ts`, salida 0, Test Files 2 passed (2); Tests 20 passed (20); 0 fallos.
  - **F0.c3** Evidencia: el informe de completitud de telemetría por backend con su porcentaje, y la lista de hosts que quedan por debajo del 90%. → El informe por backend sale de scripts/metrics-baseline.mts (seccion TELEMETRIA POR BACKEND, piso 90% en tokens y duracion) sobre el store vivo: 3.6 GB de runs, 3.666 llamadas, 2.601 ejecuciones de agente. Hosts por debajo del 90% en tokens y duracion: en taomangalam OpenCode (789 runs, duracion 65.7%, tokens 76.6%), Claude Code (115 runs, 68.7%/96.5%) y Codex (3 runs, 33.3%/33.3%) -> 3 de 3 hosts bajo el piso; en up1 Claude Code (421 runs, 67%/61%) y LLM local (5 runs, 60%/60%) -> 2 de 3; en jormat-evolution Claude Code (216 runs, 46.8%/32.9%) -> 1 de 1. Solo kanai_test cumple con Codex (32 runs, 100%/100%). Reproducible: KANAI_DATA_REPO=<url> pnpm tsx scripts/metrics-baseline.mts --all. Commit 3e4a933. · ejecutó: llm
  - **F0.c4** Evidencia: la foto base congelada con su fecha, su cohorte, la utilización y la relación entrada/salida de cada ticket. → Foto congelada el 2026-10-04T21:58:24Z en docs/metrics/ticket-timeline-2026-10-04.json (11 tickets, idle 15 min, commit 09e2a82). Cohorte declarada: los 11 tickets de taomangalam con actividad desde el 2026-10-02. Utilizacion del reloj del ticket: TAO-172 7.5%, TAO-173 5.8%, TAO-174 4.9%, TAO-175 3%, TAO-176 6.2%, TAO-177 7%, TAO-178 4.2%, TAO-179 4.9%, TAO-180 2.6%, TAO-181 3.8%, TAO-182 3.3%. Salida/entrada: TAO-172 1.07%, TAO-173 0.89%, TAO-174 1.05%, TAO-175 1.07%, TAO-176 2.27%, TAO-177 2.87%, TAO-178 2.68%, TAO-179 1.71%, TAO-180 1.33%, TAO-181 1.55%, TAO-182 0.19%. Traspasos como % del activo: 14.8% a 25%, los 11 por encima del 10% del umbral de opt-09. · ejecutó: llm
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: F1 suma la tarea F1.4 (caracterizar el camino inline como testigo, con el reloj leído del historial Git y no del plan) y su criterio F1.c5. F4 pasa a ser el experimento de tres patas: se agregan F4.4 (comparar contra el testigo inline) y F4.5 (medir y declarar lo que el camino inline no mide), más los criterios F4.c5 y F4.c6. Se suman dos riesgos sobre la trampa de comparación del camino inline.. Motivo: La persona pidió comparar el camino de casos inline con la ejecución de tickets: el testigo cambia el experimento (tiene que ser de tres patas) y aporta la regla de lectura del reloj del inline.
  - Enmienda: Se restauran los tags del plan (repos, ramas y etiquetas) que la enmienda anterior dejó vacíos. No cambia ninguna fase, tarea ni criterio.. Motivo: La enmienda anterior vació los tags del plan y el lint lo advirtió: sin repos el plan no se encuentra por repo ni queda ligado a la rama de trabajo.
  - Enmienda: Contrato de ejecucion del plan: las tareas las ejecuta el agente (executed_by: llm) y por eso ya no declaran comando de dev; el comando queda escrito en el detalle de cada tarea como el como reproducible. Los criterios de tipo comando (typecheck y tests) siguen declarando su comando y los ejecuta el dev (executed_by: dev), que es la verificacion de aceptacion. Se quito el campo run de las tareas F0.1, F0.2, F0.3, F1.1, F1.4, F3.1 y F3.2, sin cambiar ninguna fase, tarea, criterio ni su texto.. Motivo: La persona eligio que el agente implemente y que las verificaciones de aceptacion (typecheck y tests) las corra el dev: el plan tiene que declarar esa division o el registro rechaza las tareas que el agente ejecuta (paso con F0.1).
- **Hallazgos:**
  - preexistente · scripts/metrics-baseline.mts (consultas sin filtro de fecha) y la seccion TELEMETRIA POR BACKEND del informe de F0.1: El hueco de completitud de telemetria que F0 declaro es HISTORICO, no actual: la metrica M9 se calcula sobre todo el historial y arrastra una ventana del 2026-09-27 al 2026-09-29. En la ventana actual (desde 2026-09-30) la completitud si supera el piso: OpenCode 437 runs con duracion 100% y tokens 98.2%; Claude Code 9 runs 100%/100%; claude 60 runs 96.7%/96.7%; opencode 17 runs 94.1%/94.1%; codex 3 runs 33.3%/33.3% (muestra de 3, ruido). En el historico, OpenCode tenia 12.5% de duracion. Consecuencia: la comparacion del experimento SI es valida si se acota a una ventana reciente; la evidencia de F0.c3 queda corregida en ese punto. Queda pendiente que el script informe la ventana para que nadie vuelva a leer el numero global.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** F0 cerrada. F0.1: la completitud de telemetría por backend ahora se informa con etiqueta canónica (canonicalBackendLabel) y piso del 90%, con la lista de hosts por debajo (commit 3e4a933). F0.2: el desglose de tiempo del ticket suma utilización (minutos de agente sobre minutos de reloj, del ticket y por sesión), entrada/salida de tokens y traspasos (huecos de 1 a 15 min como % del activo) (commit 5b28d1d). F0.3: foto base congelada en docs/metrics/ticket-timeline-2026-10-04.json sobre 11 tickets de taomangalam (commit 09e2a82). Los dos criterios de comando los corrió el dev: typecheck 0 errores (19849 ms) y 20 tests en 0 fallos. Foto base: utilización 2,6% a 7,5% del reloj, traspasos 14,8% a 25% del activo (los 11 sobre el 10% de opt-09), salida/entrada 0,19% a 2,87%. Hallazgo registrado: el hueco de completitud era histórico (ventana del 27 al 29 de septiembre); en la ventana actual la completitud supera el piso (OpenCode 437 corridas con duración 100% y tokens 98,2%), así que la comparación del experimento es válida acotada a una ventana reciente.. Siguiente: F1: registrar la medición del arranque en frío, la primera contra la segunda pasada y el techo del ahorro, y commitear el informe en el repo para que el instrumento quede reproducible. Fecha: 2026-10-05.

### F1. Aislar qué parte de cada corrida es re-descubrimiento y caracterizar el testigo inline

**Meta:** Separar, con evidencia y no con estimación, el arranque en frío del trabajo real de la tarea, y caracterizar el testigo del camino inline, para saber cuánto hay para ganar antes de tocar el motor. Entrega el informe del arranque en frío con su techo, el informe del testigo inline y la lista de lo que el cambio de granularidad no puede mejorar.
**Esfuerzo:** 1 día
**Cómo deshacerla:** Revertir el commit del informe y de las consultas de medición. No toca el store.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F1** (estado: En curso)
- **Fecha real:** inicio 2026-10-04 · fin -
- **Antes de empezar:**
  - [x] F1.pre1: F0 cerrada: la foto base existe y las métricas están en el desglose. (F0 quedo cerrada (evento e0018). La foto base existe en docs/metrics/ticket-timeline-2026-10-04.json y las dos metricas nuevas (utilizacion y entrada/salida) estan en el desglose de tiempo, en el commit 5b28d1d.)
- **Commits:**
  - `e4cbf55` · fix(metricas): la completitud de telemetria se mide por ventana (--since) · kanai-app/codex/epicas-autonomas (verificado)
  - `a209705` · docs(metricas): informe de F1 (arranque en frio, techo del ahorro y testigo inline) · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F1.1** → Piso de arranque por sesion medido y caracterizado. Dónde: kanai-app. Cómo se comprobó: Consulta de solo lectura al store vivo, agrupando por ticket y sesion con 3 o mas corridas de developer de taomangalam desde el 2026-10-02. Resultado en docs/metrics/arranque-en-frio-2026-10-04.md (seccion F1.1), commit a209705. · ejecutó: llm, `sqlite3 de solo lectura sobre agent_runs (variacion de tokens_in dentro de cada sesion)`, salida 0, 32 sesiones: variacion media de entrada dentro de la sesion 143.9%; piso medio (minimo sobre promedio) 52%; solo 3 sesiones con variacion menor al 25% (TAO-182/S1 4% sobre un piso de 640k, TAO-181/S4 20.9%, TAO-180/S4 23.6%); 12 sesiones con variacion mayor al 150%; 5 con piso del 80% o mas. Conclusion: el arranque en frio NO es un piso plano; en 12 de 32 sesiones el trabajo de la tarea domina el numero.
  - **F1.2** → Primera contra segunda pasada de la misma tarea comparadas. Dónde: kanai-app. Cómo se comprobó: Consulta de solo lectura al store vivo sobre las tareas ejecutadas mas de una vez, comparando la primera y las siguientes pasadas. Resultado en docs/metrics/arranque-en-frio-2026-10-04.md (seccion F1.2), commit a209705. · ejecutó: llm, `sqlite3 de solo lectura sobre agent_runs (ROW_NUMBER por ticket y task_ref)`, salida 0, 21 tareas ejecutadas mas de una vez. Primera pasada: 1.734 k tokens de entrada, 14.990 de salida, 429 s. Segunda: 424 k (-76% de entrada), 4.848 de salida, 287 s (-33% de reloj). Tercera (4 casos): 364 k, 6.226, 177 s. Lectura: el re-descubrimiento es una parte grande de la entrada y una parte menor del reloj; sesgo declarado: en la segunda pasada los artefactos ya existen en disco.
  - **F1.3** → Techo del ahorro por sesion calculado y acotado. Dónde: kanai-app. Cómo se comprobó: Consulta de solo lectura al store vivo: 110 sesiones de taomangalam con corridas de developer. Techo calculado como (n-1)/n con el n real por sesion, y declarado como techo en docs/metrics/arranque-en-frio-2026-10-04.md (seccion F1.3), commit a209705. · ejecutó: llm, `sqlite3 de solo lectura sobre agent_runs (corridas de developer por sesion)`, salida 0, 110 sesiones, 4,22 corridas de developer por sesion en promedio (maximo 12). Sesion promedio: 3,04 M de tokens de entrada y 23,7 min de agente. Techo de entrada (n-1)/n = 70,2% = 2,13 M de tokens por sesion; techo de reloj bajo el mismo supuesto ~76% del tiempo de agente. Declarado explicitamente como techo y no como prediccion: supone costo marginal cero para las otras tareas, y F1.1 muestra que el trabajo mueve el numero en 12 de 32 sesiones. El ahorro real queda entre el techo y el suelo que insinua F1.2, y no se puede decidir sin el experimento de F4.
  - **F1.4** → Testigo inline caracterizado y corregido. Dónde: kanai-app. Cómo se comprobó: El reloj de kanai-epicas-autonomas se leyo del historial Git de kanai-app y se contrasto contra las fechas de apertura y de registro del caso; el de usuite-15425 se leyo del plan del caso y se reviso si sus commits traian fecha y si hubo registro tardio. Resultado en docs/metrics/arranque-en-frio-2026-10-04.md (seccion F1.4) y revision revision-testigo-inline.md en el KB del caso, commit a209705. · ejecutó: llm, `git log --shortstat sobre kanai-app y lectura de los casos inline en el store`, salida 0, kanai-epicas-autonomas REFUTADO como fuente de reloj: sus fases figuran cerradas cada 2 o 3 min pero los commits de F1 a F9 se hicieron entre 11:53 y 13:20 del 10-03 y el caso se abrio a las 14:43, o sea registro retroactivo. Lo que si es evidencia es el trabajo de abajo: 11 commits, 72 archivos y 1.433 lineas en 87 minutos con un agente en contexto caliente y sin gate por sesion. usuite-15425: ventana 7,9 h de reloj y 5,7 h activas, tareas mayormente executed_by dev, pero sus commits no traen fecha, los de F1 se registraron tarde y los repos (user-api, sandbox-api) no estan locales, asi que no se puede contrastar contra Git: es un testigo util pero NO verificado. Regla que queda: en el camino inline el reloj se lee del historial Git, no del plan.
- **Criterios cumplidos:**
  - **F1.c1** pendiente (command): `pnpm typecheck` termina con código 0.
  - **F1.c2** Evidencia: el informe con el piso de arranque por sesión, su variación y las sesiones de piso plano y de variación alta, con su archivo y su consulta. → Informe en docs/metrics/arranque-en-frio-2026-10-04.md (seccion F1.1, commit a209705). Tabla completa de las 32 sesiones con corridas, minimo, maximo, promedio, variacion y piso. Sesiones de piso plano: TAO-182/TAO-182-S1 (4 corridas, 627 k a 652 k, variacion 4%, piso 98%); TAO-181/TAO-181-S4 (10 corridas, 415 k a 516 k, 20,9%); TAO-180/TAO-180-S4 (3 corridas, 394 k a 503 k, 23,6%). Sesiones de variacion alta: TAO-179/TAO-179-S2 (8 corridas, 0 a 4.452 k, 389,8%), TAO-174/TAO-174-S2 (5 corridas, 0 a 7.596 k, 386,9%), TAO-177/TAO-177-S2 (304,7%), TAO-175/TAO-175-S3 (303%). Consulta reproducible: agrupar agent_runs por ticket y session_id con role='developer' y 3 o mas corridas, tomando min, max y avg de tokens_in. · ejecutó: llm
  - **F1.c3** Evidencia: la comparación entre la primera y la segunda pasada de la misma tarea, con la cantidad de tareas y el rango de la diferencia. → Informe en docs/metrics/arranque-en-frio-2026-10-04.md (seccion F1.2, commit a209705). 21 tareas ejecutadas mas de una vez (ticket y task_ref repetidos): primera pasada 1.734 k de entrada, 14.990 de salida y 429 s; segunda 424 k (-76%), 4.848 y 287 s (-33%); tercera (4 casos) 364 k, 6.226 y 177 s. Consulta reproducible: ROW_NUMBER sobre agent_runs particionando por ticket_id y task_ref, con role='developer' y tokens_in no nulo, y filtrar los task_ref con mas de una fila. Sesgo declarado: en la segunda pasada los artefactos ya existen en disco, asi que parte del ahorro no es contexto. · ejecutó: llm
  - **F1.c4** Evidencia: el techo del ahorro calculado con la cantidad real de corridas por sesión, declarado explícitamente como techo y con lo que queda fuera de su alcance. → Informe en docs/metrics/arranque-en-frio-2026-10-04.md (seccion F1.3, commit a209705). 110 sesiones de taomangalam con corridas de developer: 4,22 corridas por sesion en promedio y 12 como maximo; sesion promedio 3,04 M de tokens de entrada y 23,7 min de agente. Techo de entrada (n-1)/n = 70,2% = 2,13 M de tokens por sesion; techo de reloj ~76% del tiempo de agente de la sesion. Queda declarado como TECHO y explicitamente fuera de su alcance: la ceremonia bloqueante (256 min en 3 dias), la espera entre corridas y la serializacion no se tocan con el cambio de granularidad, y el ahorro real esta entre este techo y el suelo de F1.2. · ejecutó: llm
  - **F1.c5** Evidencia: el informe del testigo inline (usuite-15425 y el burst de kanai-epicas-autonomas) con su reloj leído del historial Git, sus commits, sus gates y jueces, y su hueco de medición de tokens declarado. → Informe en docs/metrics/arranque-en-frio-2026-10-04.md (seccion F1.4, commit a209705) y revision revision-testigo-inline.md en el KB del caso. kanai-epicas-autonomas: reloj leido del historial Git de kanai-app; los commits de F1 a F9 van del 2026-10-03 11:53 al 13:20 y el caso se abrio a las 14:43, asi que las fases se registraron retroactivamente; el trabajo de abajo son 11 commits, 72 archivos y 1.433 inserciones en 87 minutos (git log --since='2026-10-03 11:00' --until='2026-10-03 14:00' --shortstat). usuite-15425: reloj del plan del caso (7,9 h de reloj, 340 min activos, 10 fases, 65 tareas, 58 commits, 13 enmiendas, 17 hallazgos), con los commits sin fecha y con registro tardio de los de F1, y sin contraste contra Git posible (user-api y sandbox-api no estan locales). Hueco de medicion declarado: el camino inline tiene cero filas en agent_runs, cero gates y cero tokens registrados. · ejecutó: llm
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - preexistente · server/skills/registry.ts contra skills/claude/kn-execute-task/SKILL.md, skills/claude/kn-refine/SKILL.md, skills/claude/arbiter/ y skills/claude/kanai-viz/: Al 2026-10-04 hay 19 carpetas de skill en skills/claude/ y 4 de ellas NO estan registradas en server/skills/registry.ts, asi que get_skill no las sirve: arbiter, kanai-viz, kn-execute-task y kn-refine. Consecuencia directa para F2: el protocolo de ejecucion de tareas vive en skills/claude/kn-execute-task/SKILL.md, y las instrucciones del MCP y las tools lo citan, pero un host MCP que las siga no puede leerlo (get_skill responde 'desconocida'). La regla que dice 'un subagente por TAREA' - justo la que F2 tiene que cambiar - no llega al host por tool, asi que F2 podria modificar el archivo sin efecto en los hosts MCP. Verificado el 2026-10-04 con get_skill('kn-execute-task') y contrastando el registry contra el disco. NO se corrige en esta sesion: el MCP que sirve el piloto de la epica corre sobre este mismo codigo y un reinicio a mitad del piloto puede interrumpirlo.
  - preexistente · el despacho del motor de epicas (pendingKey de plan_task_execution en la corrida cfaec5f3) contra la regla de granularidad de skills/claude/kn-execute-task/SKILL.md; medido sobre agent_runs y tasks de TAO-182: El motor de epicas despacha la ejecucion POR HOJA, no por tarea de primer nivel: su pendingKey registra plan_task_execution con taskCode 'S3.T2.3' (una subtarea) para TAO-182, y 'S2.T1.3' en la corrida anterior. La skill kn-execute-task dice lo contrario ('Granularidad = por TAREA, no por subtarea... UN subagente por tarea'), pero quien elige la unidad es el motor, asi que esa regla no gobierna al piloto. Costo medido en TAO-182: S1 no tiene subtareas y son 4 tareas de primer nivel = 4 hojas = 4 corridas; S2 tiene 2 tareas de primer nivel y 4 hojas y se hicieron 4 corridas (mas una repetida); S3 tiene 4 tareas de primer nivel y 7 hojas y lleva 4 corridas con 3 hojas pendientes (7 en total). O sea S2 paga 2 arranques en frio de mas y S3 paga 3. Al precio del piso de F1 (650 k de entrada y 6 a 10 min por corrida) y con el promedio observado de S3 (1,01 M y 9,4 min), son 1,95 a 3,0 M de tokens de entrada y 14 a 29 min de agente extra por sesion con subtareas. No se corrige en esta sesion: el motor de epicas sirve al piloto en curso.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F2. Ejecutar la sesión en un solo agente, con checkpoint por tarea

**Meta:** Que una sesión pueda ejecutarse en un solo subagente con las tareas encadenadas y reporte por tarea, sin cambiar el plan del ticket ni perder el modelo sugerido por tarea. Entrega la ejecución de la sesión en un solo agente con checkpoint por tarea, detrás de bandera y con el plan del ticket intacto.
**Esfuerzo:** 3 a 4 días
**Cómo deshacerla:** Apagar la bandera: el comportamiento por defecto vuelve a un subagente por tarea sin revertir nada más. Si además hay que sacar el código, revertir sus commits.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F2** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F2.pre1: F1 cerrada: el techo del ahorro y el testigo inline están medidos, así que se sabe qué se espera ganar y contra qué se compara.
  - [ ] F2.pre2: El piloto de la épica cerrado o su comparación ya congelada: el experimento no se corre durante el piloto.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** pendiente: Armar el alcance de la sesión en la preparación de ejecución: el brief de la sesión lista sus tareas y el subagente reporta por tarea con hitos y resultado.
  - **F2.2** pendiente: Dejar un checkpoint por tarea: al cerrar cada tarea el agente entrega su resumen, su rebanada de archivos y sus citas caso a test, para que la revisión conserve la granularidad aunque la ejecución no la tenga.
  - **F2.3** pendiente: Conservar el modelo sugerido por tarea y la elección de serializar o paralelizar, sin degradar en silencio cuando la sesión va en un solo agente.
  - **F2.4** pendiente: Verificación por costo: tests acotados al diff en cada paso y una sola suite completa al cierre de la sesión.
- **Criterios cumplidos:**
  - **F2.c1** pendiente (command): `pnpm typecheck` termina con código 0.
  - **F2.c2** pendiente (command): `pnpm vitest run tests/unit/session-sizing.test.ts tests/unit/plan-execution.test.ts` termina con código 0.
  - **F2.c3** pendiente (evidence): Evidencia: una sesión real ejecutada con la bandera encendida, con su reporte por tarea y su checkpoint por tarea.
  - **F2.c4** pendiente (evidence): Evidencia: el plan del ticket no cambió: el mismo spec, las mismas tareas y las mismas sesiones que antes de la corrida.
- **No cumplido:**
  - ABIERTO · F2.pre2: El piloto de la epica cerrado o su comparacion ya congelada. Por qué: El piloto esta en ejecucion: la corrida cfaec5f3-730c-438b-9408-7cbfe91fecd1 arranco el 2026-10-04T20:12:25Z con el plan version 41 aprobado, TAO-181 quedo verificado e integrado (20:12:35Z y 20:13:08Z) y TAO-182 esta en curso con corridas de developer hasta las 21:52Z. El plan acumulador tiene 8 tickets y el piloto declarado es de 3 a 5.. Impacto: F2, F3, F4 y F5 quedan detras de este requisito: el plan exige el piloto cerrado o su comparacion congelada, y el experimento no se corre durante el piloto. Ademas F2 cambia kanai-app, que es el codigo del MCP que sirve el piloto: aplicarlo y reiniciar haria correr al piloto con la ejecucion por sesion encendida, que es lo que la comparacion quiere evitar.. Fecha: 2026-10-18. Responsable: Persona responsable del piloto Tao Mangalam
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F3. Revisión a la altura del diff más grande

**Meta:** Que ampliar la unidad de ejecución no baje la calidad verificable: encender y medir la revisión que ya está construida, y bajar el punto de control al checkpoint por tarea. Entrega la revisión encendida y medida, con el punto de control por tarea y el presupuesto de diff avisando.
**Esfuerzo:** 2 a 3 días
**Cómo deshacerla:** Volver el modo de evidencia a medición, apagar el refutador y el review por tarea: los tres son banderas y vuelven sin tocar el código.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F3** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F3.pre1: F2 cerrada, o en paralelo si los archivos no se solapan: la revisión se diseña contra la forma real del checkpoint.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** pendiente: Encender la aprobación con evidencia en modo exigente, con su medición antes y después y su condición de reversión.
  - **F3.2** pendiente: Encender el refutador en los gates de código y medir la tasa de iterate y los hallazgos nuevos que aporta.
  - **F3.3** pendiente: Evaluar cada tarea de la sesión con su rebanada de archivos y sus citas, en vez del diff completo de la sesión.
  - **F3.4** pendiente: Hacer que el presupuesto de diff informe y sugiera dividir cuando la sesión encadenada se pase del umbral, en vez de acumular.
- **Criterios cumplidos:**
  - **F3.c1** pendiente (command): `pnpm typecheck` termina con código 0.
  - **F3.c2** pendiente (command): `pnpm vitest run tests/unit/judge-evidence.test.ts tests/unit/judge-refuter.test.ts tests/unit/judge-canary.test.ts` termina con código 0.
  - **F3.c3** pendiente (evidence): Evidencia: la tasa de iterate del juez y los hallazgos nuevos que aporta el refutador, medidos antes y después, con la cantidad de gates de la muestra.
  - **F3.c4** pendiente (evidence): Evidencia: cada tarea de la sesión encadenada con su revisión y sus citas, sin huecos de atribución.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F4. El experimento comparado, de tres patas

**Meta:** Producir el dato que hoy no existe: una sesión por tarea contra una sesión encadenada, comparables, con la misma vara y con el tamaño de la muestra declarado, y con el testigo inline al lado. Entrega la comparación medida entre las formas de ejecutar, con su muestra y sus límites.
**Esfuerzo:** 2 a 3 días (depende del par de sesiones disponible)
**Cómo deshacerla:** No aplica: no cambia código del motor. Las corridas del ticket de prueba quedan en su rama y se descartan o se revierten con el ticket.

**Registro F4** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F4.pre1: F2 y F3 cerradas: la ejecución por sesión y la revisión reforzada están disponibles.
  - [ ] F4.pre2: La foto base de F0 vigente, el testigo inline de F1 caracterizado y el piloto de la épica cerrado o su comparación ya congelada.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.1** pendiente: Elegir el par de sesiones comparables: mismo tamaño, mismo tipo de trabajo y mismos repos, y registrar por qué son comparables.
  - **F4.2** pendiente: Correr la primera sesión por tarea como hoy y la segunda encadenada, con la misma vara de medición.
  - **F4.3** pendiente: Comparar reloj (utilización y tiempo de agente), tokens de entrada y de salida, vueltas de gate, hallazgos reales y escapes, y declarar lo que no se puede atribuir.
  - **F4.4** pendiente: Tercera pata: poner el testigo inline al lado de las dos patas del motor.
  - **F4.5** pendiente: Medir y declarar lo que el camino inline no mide: tokens del agente que conduce y escapes.
- **Criterios cumplidos:**
  - **F4.c1** pendiente (evidence): Evidencia: las dos corridas lado a lado, con utilización, tiempo de agente, entrada, salida, vueltas de gate y hallazgos por corrida.
  - **F4.c2** pendiente (evidence): Evidencia: la comparación con el tamaño de la muestra y las diferencias que no se pueden atribuir al cambio, declaradas en vez de omitidas.
  - **F4.c3** pendiente (manual): La persona confirma que el par de sesiones elegido era efectivamente comparable.
  - **F4.c4** pendiente (evidence): Ninguna corrida del experimento tocó tickets, specs, tareas, sesiones o estados de la épica del piloto.
  - **F4.c5** pendiente (evidence): Evidencia: el testigo inline puesto lado a lado con las dos patas del motor, con su trabajo no equivalente declarado en vez de forzado.
  - **F4.c6** pendiente (evidence): Evidencia: el hueco de medición del camino inline (tokens del agente que conduce y escapes) cerrado si el host lo permite, o declarado como límite de la comparación.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F5. Veredicto y decisión registrada

**Meta:** Aceptar, ajustar o revertir con números, y dejar la decisión escrita con su motivo. Entrega el veredicto comparado y la decisión registrada.
**Esfuerzo:** 1 día
**Cómo deshacerla:** No aplica: es la decisión sobre lo ya hecho.

**Registro F5** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F5.pre1: F4 cerrada con la comparación de tres patas y su muestra.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F5.1** pendiente: Verificar que la calidad no cayó: hallazgos reales por gate, escapes, casos de prueba citados y promovidos, y tickets que habrían cerrado con menos evidencia.
  - **F5.2** pendiente: Registrar la decisión: activar por defecto, ajustar el alcance o revertir, con su motivo y las fases afectadas.
- **Criterios cumplidos:**
  - **F5.c1** pendiente (evidence): Evidencia: el informe de calidad contra la foto base, con la tasa de hallazgos reales, los escapes y los casos promovidos.
  - **F5.c2** pendiente (manual): La decisión queda registrada con su motivo, su muestra y las fases que se activan, se ajustan o se revierten.
  - **F5.c3** pendiente (evidence): Evidencia: si se revierte, la bandera vuelve a su estado anterior y queda constancia de quién lo decidió y por qué.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
