# Caso inline: Kanai pre-piloto: desbloquear el análisis de la épica y medir el flujo actual

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Dejar la épica lista para iniciar su piloto: corregir el planificador de dependencias que produce auto-referencias y referencias truncadas, registrar los commits que el plan de la épica no tiene, cerrar la telemetría por ejecución y congelar el baseline del flujo actual. No modifica tickets ni enciende cambios de flujo: es requisito previo del piloto y medición.
**Tags:** repos: kanai-app · branches: codex/epicas-autonomas · labels: pre-piloto, planificador, telemetria, baseline
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- Sin avisos.

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| kanai-app | configurada | setup (existe) | codex/epicas-autonomas | Motor de Kanai: planificador de épicas, telemetría de ejecución y baseline |

## Ambientes

- Local Node 24: Tests unitarios y typecheck aislados; el store vivo se lee, no se escribe.

## Personas

- Persona responsable del piloto: Autoriza el cierre del análisis de la épica y el arranque del piloto.

## Enlaces

- Sin enlaces.

## Notas

- Caso pre-piloto. No modifica tickets, specs ni estados de taomangalam, incluida la épica EP-01 en ejecución.
- La verificación del planificador usa los cuerpos canónicos de TAO-181 a TAO-188 como fixtures: no se re-planifica la épica real.
- El baseline del flujo actual se congela al terminar F0, con su fecha, y es la referencia del caso kanai-post-epica.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| analisis-aceleracion-kanai.md | analisis | Diagnóstico: por qué Kanai tarda y gasta de más en taomangalam | Diagnóstico medido: 44 tickets, 770 ejecuciones, 130 gates, 26 overrides. De aquí salen la telemetría que falta y el baseline del flujo actual. |
| auditoria-planes-materializados.md | analisis | Auditoría en solo lectura de los planes ya materializados (F0.3) | Auditoría en solo lectura de los 34 specs de taomangalam: 22 citan archivos, 10 citan al menos uno inexistente (15 referencias de 186). Sin enmendar ningún plan. |
| baseline-flujo-actual.md | registro | Baseline del flujo actual (congelado) | Baseline congelado 2026-10-04 (versión corregida: agrupa por backend canónico). 44 tickets, 1684 ejecuciones, 361.055.325 tokens. Telemetría: 63% con duración y 67% con tokens; por backend: OpenCode 785 runs (65%/76%), Claude Code 822 (61%/57%), Codex 47 (85%/85%), LLM local 19, motor 11. |
| plan-original.md | registro | Plan original importado: Desbloquear el análisis de la épica y dejar el terreno medido (pre-piloto) | - |

## Plan

2 de 3 fases cerradas, fase actual F2. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-pre-epica/plan.md
