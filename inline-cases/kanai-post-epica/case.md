# Caso inline: Kanai post-piloto: acelerar el motor con el gate verificando de verdad

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Bajar a la mitad el costo en tokens y las vueltas por ticket sin perder calidad verificable: que el gate verifique lo que hizo la sesión, que un hallazgo no accionable no dispare un bucle de auto-corrección, que el trabajo se pague por sesión y que la ceremonia de confirmación no cueste vueltas. Sujeto a análisis de métricas contra el baseline del caso pre-épica; no se activa durante el piloto de la épica.
**Tags:** repos: kanai-app · branches: codex/epicas-autonomas · labels: post-piloto, gate, evidencia, metricas
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- Sin avisos.

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| kanai-app | configurada | setup (existe) | codex/epicas-autonomas | Motor de Kanai: gate, ejecución por sesión, jueces y telemetría |

## Ambientes

- Local Node 24: Tests unitarios y typecheck aislados; los cambios de gate entran detrás de bandera.

## Personas

- Persona responsable del piloto: Decide la activación, la expansión y la reversión según las métricas.

## Enlaces

- Sin enlaces.

## Notas

- Caso post-piloto. No se activa durante el piloto de la épica: invalidaría su comparación.
- No modifica tickets existentes: los cambios son de motor y los efectos llegan a las sesiones que faltan sin reescribir el plan del ticket.
- Sujeto a análisis de métricas: cada fase se acepta o se revierte contra el baseline congelado del caso kanai-pre-epica (F5).

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| analisis-aceleracion-kanai.md | analisis | Diagnóstico: por qué Kanai tarda y gasta de más en taomangalam | Diagnóstico medido: el gate no ve la sesión (73% del gasto en runs de developer), bucle de auto-corrección y re-litigio de hallazgos. Es la base de las fases F1 a F4. |
| plan-original.md | registro | Plan original importado: Acelerar el motor después del piloto: gate con evidencia real y menos vueltas por ticket | - |

## Plan

0 de 6 fases cerradas, fase actual F0. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-post-epica/plan.md
