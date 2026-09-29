---
id: DOC-kb-optimizacion-intake-Optimizacion-de-intake-gate-de-Kanai-medicion-antes-despues-JOR-167-vs-espejo
project: jormat-evolution
type: doc
tags:
  - kanai
  - intake
  - gate
  - medicion
  - optimizacion
---

# Optimizacion de intake/gate de Kanai: medicion antes/despues (JOR-167 vs espejo)

## Contexto

JOR-166 y JOR-167 (cerrados el 2026-09-20), declarados de 5 puntos, tomaron mucho tiempo de ejecucion. El diagnostico mostro que la lentitud no venia del prompt (brief ~5.8K tokens, entrada real cacheada) sino de dos frentes: (1) el intake **sobre-generaba** tareas/REQs (hasta 11 tasks redundantes ejecutadas en 167) y (2) cada gate corria la **suite completa** del repo (~2200-2300 tests) x ~15 gates por ticket. La causa raiz no era falta de configuracion: los flags anti-inflado (opt-07) ya estaban encendidos pero eran **advisory** (solo registraban/sugerian, no imponian). Se implementaron 6 fases para que muerdan determinÍsticamente (rama setup, HEAD a6cb501, pusheada).

## Medicion (mismo alcance, plan antes vs despues)

Se replanifico el **slice ejecutable de JOR-167** (Adenda 1: CA-09 descuento a monto, CA-12 reactivar borrador, CA-08 filtros server-side + verificacion de lo ya conforme) en un ticket espejo (JOR-168, descartado tras medir), en autopilot autonomo, con la maquina nueva activa.

| Metrica | JOR-167 (baseline) | Espejo (maquina nueva) |
|---|---|---|
| REQs | 19 | 7 |
| Sesiones | 5 | 3 de codigo (+1 verificacion) |
| Tareas | muchas (45 corridas de developer, 11 redundantes) | 14 |
| Tier | no se persistia (null) | T2 persistido |
| Techo por tareas | no existia | cupo 3 sesiones / 15 tareas |
| Duplicados / exceso | el juez los listaba, nadie los podaba | dedup y poda de exceso corrieron LIMPIO (el plan ya nace sin la redundancia) |

Reduccion de ~60% en superficie de spec (19 -> 7 REQs; 5 -> 3 sesiones de codigo) para el mismo trabajo. Las decisiones del intake del espejo confirman: nivelacion T2 (subio de T1 por alcance), plan dentro del techo (sin rebote), tier persistido, y sin necesidad de podar (no aparecieron los pasos plan-dedup/excess-prune porque no hubo nada que quitar).

## Que quedo activo (rama setup, .env vivo)

- KANAI_GATE_SCOPED=on (gate acotado al alcance; full en la ultima sesion y en el cierre)
- KANAI_TIER_JUDGES=on (jueces por tier: T0/T1 single, T2/T3 dual)
- KANAI_TIER_VERIFICATION=on (no apila sesion de verificacion en T0/T1)
- KANAI_EXCESS_PRUNE=on (poda determinÍstica de exceso: REQs 'drop' + tasks huerfanas)
- Ademas: poda de duplicados (siempre on), presupuesto por tareas, prompt del planner de-duplicado, tier persistido, hint de infra ante fallo de jueces.

Todos los flags nuevos son default OFF en el codigo (comportamiento historico preservado) y recomendados ON en .env.example / docs/configuration.md. Auditoria de enforcement: todas las reglas muerden salvo dos advisory-por-diseno (INTAKE_TRIAGE sugiere pero no reroutea; el recorte de exceso en modo manual es nota, el humano decide).

## Salvedad

Esta medicion valida el **lado intake** (donde nace la sobre-generacion). El ahorro del **lado gate** (tests acotados, jueces por tier, ultima sesion full) solo se materializa al **ejecutar** gates sobre los repos reales; esta cubierto por los unit tests (1397 en verde) y se medira en la primera ejecucion real de un ticket de jormat.

## Pendiente

Flippear los defaults del codigo a ON (rollout global) tras esta validacion; medir el lado gate en una ejecucion real.
