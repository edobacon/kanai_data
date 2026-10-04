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
| comparacion-camino-inline.md | analisis | El camino inline como testigo: qué se gana y qué se deja de medir | El caso inline usuite-15425 es el testigo limpio de la ejecución en caliente: un ticket real de dos repos, 58 commits y 10 fases en 7,9 h de reloj y 5,7 h activas, con cero gates y cero tokens medidos. kanai-epicas-autonomas parece cerrar fases cada 2-3 min porque registró retroactivamente commits de 3 h antes. El camino inline gana por forma de ejecución y por no llevar la cuenta. |
| estado-f2-y-piloto.md | registro | Estado: el piloto de la épica está corriendo y F2 está detrás de él | El piloto de la épica está corriendo (corrida cfaec5f3, TAO-181 integrado, TAO-182 en curso), así que F2.pre2 no se cumple y F2-F5 quedan esperando. F2 además contaminaría el piloto si se escribiera ahora. Se registran dos avisos: el F10 del caso de épicas está desactualizado y dos planes inline sobre la misma rama se marcan commits entre sí. |
| pata-por-tarea-piloto.md | registro | La pata "por tarea" del experimento, medida sobre el piloto en curso (provisional) | El piloto produce la pata "por tarea" del experimento con datos frescos: TAO-182 S1 4 corridas/2,56 M, S2 5/5,92 M, S3 4 de 7/4,04 M. Hallazgo: el motor despacha por HOJA (su pendingKey pide taskCode S3.T2.3, una subtarea), así que paga 2 a 3 arranques en frío de más por sesión con subtareas: 1,95 a 3,0 M de tokens y 14 a 29 min extra. F2 tiene que fijar la unidad de dispatch, no solo el brief. |
| por-sesion-contra-por-tarea.md | analisis | Por sesión o por tarea: análisis medido del arranque en frío, el reloj y la revisión | Medición del store y del código: el arranque en frío se paga 4,6 veces por sesión (654 k tokens de entrada por tarea, 0,77 % de salida), la re-ejecución de una tarea cuesta 1,7x el tiempo, la verificación ya es por sesión y el juez es el mismo modelo. El arranque en frío no prueba el encadenado: prueba que hay que medirlo. |
| protocolo-experimento-f4.md | registro | Protocolo de medición del experimento (preparación de F4) | Fija de antemano las tres patas, el instrumento (el mismo de F0), el confusor de granularidad (el motor despacha por hoja: toda comparación va contra dispatches, no contra tareas), los controles de comparabilidad, la guarda de calidad y la regla de decisión escrita antes de medir. |
| revision-testigo-inline.md | revision | Revisión: el testigo inline no es tan limpio como decía el primer análisis | Corrige dos afirmaciones del análisis del camino inline: usuite-15425 no es un testigo limpio (commits sin fecha, registro tardío y sin contraste con Git) y el arranque en frío no es un piso plano (solo 3 de 32 sesiones lo tienen). |

## Plan

1 de 6 fases cerradas, fase actual F1. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-ejecucion-ticket/plan.md
