# Caso inline: Kanai: ejecución de ticket por sesión contra por tarea, medida y con la revisión reforzada

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Decidir con medición, no con intuición, si conviene seguir ejecutando una tarea por subagente en frío o llevar la sesión a un solo agente con las tareas encadenadas, y dejar la revisión a la altura de ese cambio. Cierra con un veredicto comparado (reloj, tokens de entrada y salida, vueltas de gate, hallazgos reales y escapes) y con la revisión reforzada encendida o descartada con su motivo.
**Tags:** repos: kanai-app · branches: codex/epicas-autonomas · labels: ejecucion, sesion, arranque-en-frio, revision, experimento, metricas
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- Sin avisos.

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| kanai-app | configurada | setup (existe) | codex/epicas-autonomas | Motor de Kanai: ejecución por tarea, gate por sesión, jueces, telemetría y métricas del roadmap |

## Ambientes

- Local Node 24: Tests unitarios, typecheck y lint aislados; el store vivo se lee, no se escribe. El experimento corre sobre un ticket de prueba aislado, no sobre la épica del piloto.

## Personas

- Persona responsable del piloto: Decide el veredicto del experimento y la activación de la revisión reforzada.

## Enlaces

- Sin enlaces.

## Notas

- Caso abierto por pedido de la persona, después de revisar los casos kanai-pre-epica y kanai-post-epica. Los dos casos existentes no responden esta pregunta: el pre no toca el flujo del ticket y el post está congelado detrás del piloto y calibrado en tokens y vueltas, no en reloj.
- El contrafáctico no existe en la historia: ninguna sesión se ejecutó en un solo agente encadenado. El veredicto se apoya en el experimento comparado, no en inferencia sobre los datos históricos.
- No toca la épica nativa de taomangalam ni su piloto: los cambios de motor entran detrás de bandera y el experimento corre sobre un ticket de prueba aislado.
- Cautela de telemetría: los tokens de entrada que reporta el host incluyen la lectura de caché (scripts/install/opencode.ts suma cache.read y el adaptador de Claude suma cache_read_input_tokens). El número de tokens sobreestima el costo monetario; el reloj no se ve afectado.
- M9 (completitud de telemetría) sigue en rojo: 0 de 5 backends con tokens y duración en al menos el 90% de sus runs. Por la regla del roadmap 10, ninguna comparación es válida hasta cerrarla; el plan la incluye como requisito previo.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| arranque-en-frio-y-techo.md | analisis | Arranque en frío, techo del ahorro y testigo inline (medición de F1) | 32 sesiones medidas: la variación de entrada dentro de la sesión es 143,9% en promedio y solo 3 de 32 tienen piso dominante, así que el arranque en frío NO es un piso plano. Repetir una tarea cuesta −76% de entrada pero −33% de reloj. Techo del ahorro: 70,2% de la entrada (2,13 M tokens por sesión), que es techo y no predicción. Corrección: usuite-15425 no es un testigo limpio (commits sin fecha y registrados tarde, sin contraste con Git). |
| como-se-cierra-f3.md | analisis | Cómo se cierra F3: qué encender, qué medir y qué falta para F3.c4 | F3.1 y F3.2 encienden interruptores del entorno, así que necesitan reinicio del MCP y una muestra de gates que hoy solo da el piloto (encenderlos a mitad lo contamina). F3.c4 no se cierra con lo que hay: el gate de KT-012-S1 iteró y gate_runs no guarda el handoff, así que la atribución por tarea no es auditable desde el store. Se suma el contraste de telemetría: el juez reporta tokens, el subagente no. |
| comparacion-camino-inline.md | analisis | El camino inline como testigo: qué se gana y qué se deja de medir | El caso inline usuite-15425 es el testigo limpio de la ejecución en caliente: un ticket real de dos repos, 58 commits y 10 fases en 7,9 h de reloj y 5,7 h activas, con cero gates y cero tokens medidos. kanai-epicas-autonomas parece cerrar fases cada 2-3 min porque registró retroactivamente commits de 3 h antes. El camino inline gana por forma de ejecución y por no llevar la cuenta. |
| donde-entra-f3-3.md | analisis | Dónde entra F3.3: la revisión por tarea en vez del diff completo | Reconocimiento para F3.3: el punto de entrada es server/dispatch/gateContext.ts (251 líneas), que en su línea 98 ya recolecta los runs de la sesión con sus files por tarea; la atribución existe en los checkpoints que F2 persiste, así que F3.3 es usarla para componer el material del juez por tarea en vez de agregar. Debe quedar detrás de la misma condición que el alcance de sesión para no contaminar al piloto. |
| estado-f2-y-piloto.md | registro | Estado: el piloto de la épica está corriendo y F2 está detrás de él | El piloto de la épica está corriendo (corrida cfaec5f3, TAO-181 integrado, TAO-182 en curso), así que F2.pre2 no se cumple y F2-F5 quedan esperando. F2 además contaminaría el piloto si se escribiera ahora. Se registran dos avisos: el F10 del caso de épicas está desactualizado y dos planes inline sobre la misma rama se marcan commits entre sí. |
| fases-verificacion-obligatoria.md | analisis | Fases para la verificación obligatoria (F6 a F10) | Fases F6 a F10 para la verificación obligatoria: la política y su migración, el motivo estructurado (el cambio que más pesa), el guard del cierre, el default de épica y la verificación de punta a punta. Con las decisiones ya tomadas (causas, bloqueo con escape auditado, sin sesión no hay exigencia) y los criterios de cada fase. |
| medicion-mismo-ticket-dos-veces.md | registro | Mejora al diseño de la medición: el mismo ticket DOS veces | Mejora al protocolo de F4: comparar la pata encadenada contra una pata por tarea corrida en el MISMO ticket (KT-012), revirtiendo la rama entre ambas, en vez de contra TAO-182 (otro trabajo). Con la bandera encendida la ejecución por tarea sigue disponible sin pasar sessionScope, así que las dos corridas parten del mismo punto. |
| pata-por-tarea-piloto.md | registro | La pata "por tarea" del experimento, medida sobre el piloto en curso (provisional) | El piloto produce la pata "por tarea" del experimento con datos frescos: TAO-182 S1 4 corridas/2,56 M, S2 5/5,92 M, S3 4 de 7/4,04 M. Hallazgo: el motor despacha por HOJA (su pendingKey pide taskCode S3.T2.3, una subtarea), así que paga 2 a 3 arranques en frío de más por sesión con subtareas: 1,95 a 3,0 M de tokens y 14 a 29 min extra. F2 tiene que fijar la unidad de dispatch, no solo el brief. |
| por-sesion-contra-por-tarea.md | analisis | Por sesión o por tarea: análisis medido del arranque en frío, el reloj y la revisión | Medición del store y del código: el arranque en frío se paga 4,6 veces por sesión (654 k tokens de entrada por tarea, 0,77 % de salida), la re-ejecución de una tarea cuesta 1,7x el tiempo, la verificación ya es por sesión y el juez es el mismo modelo. El arranque en frío no prueba el encadenado: prueba que hay que medirlo. |
| protocolo-experimento-f4.md | registro | Protocolo de medición del experimento (preparación de F4) | Fija de antemano las tres patas, el instrumento (el mismo de F0), el confusor de granularidad (el motor despacha por hoja: toda comparación va contra dispatches, no contra tareas), los controles de comparabilidad, la guarda de calidad y la regla de decisión escrita antes de medir. |
| requisitos-por-sesion.md | decision | Cómo recibe la sesión sus requisitos: de una vez, progresivo o híbrido | Decisión: la sesión recibe sus requisitos de una vez y deduplicados, no progresivos. El brief pesa 0,2% de la corrida (1.207 tokens contra 650.013), así que lo progresivo optimiza lo que no duele y agrega latencia y riesgo de falla silenciosa. Lo progresivo queda solo para sesiones largas que no caben en un presupuesto, con el checkpoint declarando qué se leyó. |
| revision-brief-por-que-via.md | revision | El brief sí se puede entregar: `plan_task_execution` no lo manda, `get_task_brief` sí | Ajuste al hallazgo: plan_task_execution no entrega el prompt (filtro de 2000 caracteres), pero get_task_brief sí devuelve el brief completo, porque lo devuelve como texto del resultado y no dentro de un objeto presentado. El problema es de la vía documentada, no del brief. |
| revision-magnitud-brief.md | revision | Revisión: la duplicación del brief no justifica el cambio | Corrige la magnitud: el brief concatenado de 7 tareas pesa 1,3% de una corrida y 0,3% de una sesión, así que deduplicarlo es cosmético. La decisión de "de una vez, no progresivo" se mantiene, pero por latencia y por el riesgo de falla silenciosa, no por tamaño. Ir directo a la medición. |
| revision-testigo-inline.md | revision | Revisión: el testigo inline no es tan limpio como decía el primer análisis | Corrige dos afirmaciones del análisis del camino inline: usuite-15425 no es un testigo limpio (commits sin fecha, registro tardío y sin contraste con Git) y el arranque en frío no es un piso plano (solo 3 de 32 sesiones lo tienen). |
| verificacion-obligatoria-contrato.md | analisis | La verificación obligatoria: qué obliga a cambiar en el contrato | Impacto de la verificación obligatoria en el contrato: en el ticket, una política de primera clase con migración (default ask), pending deja de ser estado de reposo, el motivo de no-ejecución tiene que ser estructurado (no prosa en evidence), el gate pasa a bloquear según la política y el cierre tiene que poder reportar por qué. En la épica, el default en activeEpicPolicy junto a autopilot y el contrato de entrega que hoy no nombra la verificación. |

## Plan

3 de 6 fases cerradas, fase actual F3. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-ejecucion-ticket/plan.md
