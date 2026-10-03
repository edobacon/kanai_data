# Caso inline: Épicas con planificación y ejecución autónoma encadenada

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Implementar en Kanai épicas con selección de tickets, rama propia, planificación y validación de dependencias, permisos y aprobaciones por harness, elección Teach / Skip teach, ejecución autónoma secuencial recuperable, vista de seguimiento y revisión/CI/cierre integral. Instrumentar métricas desde la primera corrida y evaluar un piloto de 3–5 tickets de Tao Mangalam contra el flujo actual. La apertura registra el plan; no inicia la implementación.
**Tags:** projects: kanai_self · repos: kanai-app · labels: epicas, autonomia, harness, metricas, piloto-taomangalam
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- Sin avisos.

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| kanai-app | configurada | setup (existe) | codex/epicas-autonomas | Implementación fase por fase, con commits y verificación registrados. |

## Ambientes

- Local Node 24: Tests unitarios/integración aislados, typecheck y build; piloto real separado de fixtures.

## Personas

- Persona responsable del caso: Revisa decisiones de alcance y autoriza ejecución, cierre e integración.

## Enlaces

- Sin enlaces.

## Notas

- Creación y registro del plan solicitados por la persona. No se autoriza iniciar la implementación con esta operación.
- Plan completo guardado en el KB del caso. Incluye métricas desde P1, tablero/exportación, baseline y piloto de 3–5 tickets de Tao Mangalam.
- KAN-010 fue creado anteriormente; permanece sin modificar. Para este trabajo la persona eligió continuar con el caso inline.
- Las estimaciones, primeros harnesses soportados y política de cierre agregado se resuelven en P0; no se consideran aprobados ni verificados.
- Repositorio de implementación verificado en lectura: kanai-app, rama setup existente. La rama de trabajo se define en la primera fase antes de modificar código. Tao Mangalam es el piloto, no el repositorio de implementación.
- La persona autorizó implementar y ejecutar fase por fase, incluyendo comandos y commits. Las verificaciones ejecutadas por el agente se registrarán como executed_by: llm, sin atribuirlas al dev.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| contrato-f1.md | decision | Contrato de implementación F1 | Host MCP visible, datos separados, cierre humano, instrumentación inicial y piloto real separado. |
| operacion-y-piloto.md | registro | Operación implementada y preparación del piloto | Guía de uso, evidencia de validación y requisitos pendientes del piloto real; no equivale a cierre F10. |
| plan-implementacion-epicas-autonomas.md | analisis | Plan de implementación de épicas autónomas, permisos por harness y métricas | Plan presentado y autorizado para registro: alcance, dependencias, ramas, autonomía, Teach, recuperación, vistas, paquetes P0–P9, aceptación y piloto medido en Tao Mangalam. |

## Plan

9 de 10 fases cerradas, fase actual F10. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-epicas-autonomas/plan.md
