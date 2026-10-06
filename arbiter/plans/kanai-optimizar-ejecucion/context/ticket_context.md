# Intención del caso inline

Caso: kanai-optimizar-ejecucion. No es un ticket de implementación de TAO; TAO-191/192 son benchmarks.

Pedido original: «revisa el caso inline de kanai sobre kanai-optimizar-ejecucion». Autorización: «ejecuta todo, cada fase con su commit, y un juez solo al final con arbitrer».

Objetivo: Menos rebotes, tokens y tiempo al ejecutar tickets con alcance fijo, cambiando solo el cómo.

Contrato final del plan (mapa, no prueba de cumplimiento):

{
  "plan_id": "kanai-optimizar-ejecucion",
  "title": "Optimizar la ejecución de tickets en Kanai",
  "intent": "Menos rebotes, tokens y tiempo al ejecutar tickets con alcance fijo, cambiando solo el cómo.",
  "created": "2026-10-06T12:27:46.150Z",
  "updated": "2026-10-06T14:17:26.585Z",
  "tags": {
    "projects": [],
    "repos": [
      "kanai-app"
    ],
    "tickets": [
      "TAO-192",
      "TAO-191"
    ],
    "branches": [],
    "folders": [],
    "labels": [
      "kanai",
      "ejecucion",
      "gates",
      "optimizacion"
    ]
  },
  "settings": {
    "judge": "final"
  },
  "risks": [
    "Cambiar el cálculo del diff del gate puede alterar el veredicto de tickets en curso.",
    "El MCP debe reiniciarse para que los cambios apliquen.",
    "Hay cambios ajenos sin commitear en kanai-app."
  ],
  "out_of_scope": [
    "Modificar el alcance, spec o REQs de cualquier ticket existente.",
    "Hacer push (solo con pedido explícito)."
  ],
  "phases": [
    {
      "code": "F0",
      "title": "Línea base",
      "goal": "Congelar las cifras de TAO-192 y TAO-191 como referencia comparable.",
      "prerequisites": [
        {
          "id": "F0-P1",
          "text": "El KB del caso contiene linea-base-tao-192.md."
        }
      ],
      "tasks": [
        {
          "code": "F0.1",
          "text": "Validar las cifras de la línea base contra get_execution_summary y get_runs de TAO-192 y TAO-191.",
          "kb": [
            "linea-base-tao-192.md"
          ]
        },
        {
          "code": "F0.2",
          "text": "Completar los 26 runs antiguos que get_runs no devuelve, o declarar el límite en el KB."
        }
      ],
      "criteria": [
        {
          "id": "F0-C1",
          "text": "El KB trae la línea base validada con cifras y límites declarados.",
          "kind": "evidence"
        }
      ],
      "effort": "1 h",
      "delivers": false,
      "changes_code": false
    },
    {
      "code": "F1",
      "title": "Diagnóstico de causas",
      "goal": "Confirmar contra el código cada causa probable antes de cambiar nada.",
      "prerequisites": [
        {
          "id": "F1-P1",
          "text": "F0 cerrada."
        }
      ],
      "tasks": [
        {
          "code": "F1.1",
          "text": "Encontrar por qué el sandbox no detecta cambios en la rama de trabajo (rama acumuladora epic/EP-01) en kanai-app.",
          "kb": [
            "linea-base-tao-192.md#causas-probables-a-confirmar-en-f1"
          ]
        },
        {
          "code": "F1.2",
          "text": "Encontrar contra qué base se calcula el diff del gate N3 y por qué incluye lo ya integrado de TAO-191."
        },
        {
          "code": "F1.3",
          "text": "Entender por qué cada ronda del N3 entrega hallazgos nuevos y qué contexto infla el gate de 6,35M tokens."
        },
        {
          "code": "F1.4",
          "text": "Explicar el hueco de 6,4 h y el crecimiento de contexto por lote en S4."
        },
        {
          "code": "F1.5",
          "text": "Guardar en el KB un documento de causas confirmadas con archivo:línea."
        }
      ],
      "criteria": [
        {
          "id": "F1-C1",
          "text": "Cada causa tiene archivo:línea o queda descartada con motivo.",
          "kind": "evidence"
        }
      ],
      "effort": "4 h",
      "delivers": false,
      "changes_code": false
    },
    {
      "code": "F2",
      "title": "Cambios en la ejecución",
      "goal": "Implementar en kanai-app solo los cambios que F1 confirme.",
      "prerequisites": [
        {
          "id": "F2-P1",
          "text": "F1 cerrada y causas confirmadas en el KB."
        },
        {
          "id": "F2-P2",
          "text": "Rama feat/optimizar-ejecucion creada desde setup."
        }
      ],
      "tasks": [
        {
          "code": "F2.1",
          "text": "Calcular el diff del gate N3 contra la base real de las dependencias integradas."
        },
        {
          "code": "F2.2",
          "text": "Hacer que el sandbox detecte los cambios de ramas acumuladoras y deje evidencia de que corrió."
        },
        {
          "code": "F2.3",
          "text": "Hacer que la primera ronda del N3 agote hallazgos y que los reruns revisen solo lo corregido."
        },
        {
          "code": "F2.4",
          "text": "Recortar el contexto del gate y avisar cuando un ticket supere un umbral de tamaño, sin cambiar su alcance."
        },
        {
          "code": "F2.5",
          "text": "Correr typecheck, lint y suite de kanai-app; un commit para toda F2 por pedido de Eduardo."
        }
      ],
      "criteria": [
        {
          "id": "F2-C1",
          "text": "Typecheck, lint y suite pasan sin fallas nuevas; comandos ejecutados por agente por autorización expresa y salida registrada.",
          "kind": "evidence"
        }
      ],
      "effort": "1 a 2 días",
      "delivers": false,
      "changes_code": true,
      "rollback": "Revertir los commits de la rama; no hay migraciones ni datos."
    },
    {
      "code": "F3",
      "title": "Pruebas en KT",
      "goal": "Validar en proceso nuevo con KT aislado y repetir determinísticamente selección/diff/contexto de TAO-192; único juez Arbiter al final.",
      "prerequisites": [
        {
          "id": "F3-P1",
          "text": "F2 cerrada; proceso nuevo que cargue el código modificado sobre store aislado."
        }
      ],
      "tasks": [
        {
          "code": "F3.1",
          "text": "Crear ticket sintético KT en store aislado con dependencia integrada y rama acumuladora."
        },
        {
          "code": "F3.2",
          "text": "Ejecutar ensayo de KT: sandbox real, diff, delta y consumidores; medir salida/contexto sin jueces intermedios."
        },
        {
          "code": "F3.3",
          "text": "Repetir armado del N3 de TAO-192 en copia aislada; comprobar exclusión del diff heredado y comparar contexto; no mutar ticket original."
        }
      ],
      "criteria": [
        {
          "id": "F3-C1",
          "text": "El sandbox corre y deja evidencia en el ticket sintético.",
          "kind": "evidence"
        },
        {
          "id": "F3-C2",
          "text": "Diff de KT y repetición de TAO-192 excluyen dependencia integrada; cambios actuales y consumidores siguen visibles.",
          "kind": "evidence"
        },
        {
          "id": "F3-C3",
          "text": "Registrar medidas reales de contexto/ensayo y límites; metas de <=2 rondas y <1M tokens son objetivos a contrastar, no cifras inventadas sin corrida LLM. Único juez final Arbiter.",
          "kind": "evidence"
        }
      ],
      "effort": "4 h",
      "delivers": false,
      "changes_code": false
    },
    {
      "code": "F4",
      "title": "Medición y cierre",
      "goal": "Comparar contra la línea base y cerrar el caso.",
      "prerequisites": [
        {
          "id": "F4-P1",
          "text": "F3 cerrada."
        }
      ],
      "tasks": [
        {
          "code": "F4.1",
          "text": "Guardar en el KB la comparación final contra las metas y las señales de mejora pendientes."
        }
      ],
      "criteria": [
        {
          "id": "F4-C1",
          "text": "El KB trae la tabla final contra las metas, con los incumplidos explicados.",
          "kind": "evidence"
        }
      ],
      "effort": "1 h",
      "delivers": false,
      "changes_code": false
    },
    {
      "code": "F5",
      "title": "Correcciones de la revisión final",
      "goal": "Corregir límites confirmados por el único juez antes de emitir su dictamen final.",
      "prerequisites": [
        {
          "id": "F5-P1",
          "text": "F0–F4 cerradas y probes verifican omisión permanente de archivos grandes e imports Dart anidados."
        }
      ],
      "tasks": [
        {
          "code": "F5.1",
          "text": "Presupuestar archivos completos sin omisión permanente y configurar tamaño del pase integral; consumidores grandes completos."
        },
        {
          "code": "F5.2",
          "text": "Detectar import/export Dart relativo y package para reabrir consumidores."
        },
        {
          "code": "F5.3",
          "text": "Pruebas de regresión, typecheck/lint y repetir TAO con presupuesto nuevo; un commit de F5."
        }
      ],
      "criteria": [
        {
          "id": "F5-C1",
          "kind": "evidence",
          "text": "Grandes archivos/consumidores visibles completos, Dart consumidor reabierto, regresiones verdes y medidas actualizadas sin tokens inventados."
        }
      ],
      "changes_code": true,
      "delivers": false,
      "effort": "Corrección acotada",
      "rollback": "Revertir commit F5."
    },
    {
      "code": "F6",
      "title": "Contenido no leído en la cobertura",
      "goal": "Impedir que marcadores de archivos sin contenido se registren completos o permitan aprobar.",
      "prerequisites": [
        {
          "id": "F6-P1",
          "text": "F5 cerrada; mismo juez identifica UNREAD_FILE marcado full con precommit apagado."
        }
      ],
      "tasks": [
        {
          "code": "F6.1",
          "text": "Clasificar contenido ausente como parcial, exigir stats.complete en N3 y probar untracked>200k en repo real."
        }
      ],
      "criteria": [
        {
          "id": "F6-C1",
          "kind": "evidence",
          "text": "Marcador sin contenido no se marca full ni aprueba; regresión y checks finales verdes."
        }
      ],
      "changes_code": true,
      "delivers": false,
      "effort": "Corrección final acotada",
      "rollback": "Revertir commit F6."
    }
  ]
}