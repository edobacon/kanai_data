# Plan inline: Optimizar la ejecución de tickets en Kanai

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Menos rebotes, tokens y tiempo al ejecutar tickets con alcance fijo, cambiando solo el cómo.
**Tags:** repos: kanai-app · tickets: TAO-192, TAO-191 · labels: kanai, ejecucion, gates, optimizacion
**Estado:** Terminado. Juez final: **aprobado** (2026-10-06). Único Arbiter final sobrea193628:aprobado,sin hallazgos,20/20files595LOCleídos completos. Runkanai-optimizar-ejecucion-final-20261006 guardado/reconciliado.2946tests/typecheck/lint verdes; ahorroLLM no demostrado.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Línea base | Congelar las cifras de TAO-192 y TAO-191 como referencia comparable. | Hecho | 2026-10-06 → 2026-10-06 | 9d4c1cf3fc08a6f0e12634ba93e4800486ffe909 | 1/1 | - |
| F1 Diagnóstico de causas | Confirmar contra el código cada causa probable antes de cambiar nada. | Hecho | 2026-10-06 → 2026-10-06 | c862be2d547fcf7f42827e12fe21053ee112fe11 | 1/1 | - |
| F2 Cambios en la ejecución | Implementar en kanai-app solo los cambios que F1 confirme. | Hecho | 2026-10-06 → 2026-10-06 | c2993572b4db52fb504d8db76f20f92ab6b648f6 | 1/1 | - |
| F3 Pruebas en KT | Validar en proceso nuevo con KT aislado y repetir determinísticamente selección/diff/contexto de TAO-192; único juez Arbiter al final. | Hecho | 2026-10-06 → 2026-10-06 | c3f1eb5cd28858d761a5c89f5416968f2b442b21 | 3/3 | - |
| F4 Medición y cierre | Comparar contra la línea base y cerrar el caso. | Hecho | 2026-10-06 → 2026-10-06 | bfa8206f1d4ff4248b12d4b6221a39e3710e2fe2 | 1/1 | - |
| F5 Correcciones de la revisión final | Corregir límites confirmados por el único juez antes de emitir su dictamen final. | Hecho | 2026-10-06 → 2026-10-06 | 08f8787da6486cdf89cc229b8c24ccd689a95fdb | 1/1 | - |
| F6 Contenido no leído en la cobertura | Impedir que marcadores de archivos sin contenido se registren completos o permitan aprobar. | Hecho | 2026-10-06 → 2026-10-06 | a19362842af07c347dd8d1ff0a5521ea01cc862f | 1/1 | - |

## Riesgos

- Cambiar el cálculo del diff del gate puede alterar el veredicto de tickets en curso.
- El MCP debe reiniciarse para que los cambios apliquen.
- Hay cambios ajenos sin commitear en kanai-app.

## Fuera de alcance

- Modificar el alcance, spec o REQs de cualquier ticket existente.
- Hacer push (solo con pedido explícito).

## Fases

### F0. Línea base

**Meta:** Congelar las cifras de TAO-192 y TAO-191 como referencia comparable.
**Esfuerzo:** 1 h

**Registro F0** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F0-P1: El KB del caso contiene linea-base-tao-192.md. (KB consultado: linea-base-tao-192.md)
- **Commits:**
  - `9d4c1cf3fc08a6f0e12634ba93e4800486ffe909` · chore: complete F0 execution baseline validation · kanai-app/feat/optimizar-ejecucion (verificado)
- **Qué se hizo:**
  - **F0.1** → Validados totales y gates visibles de ambos tickets. Dónde: KB linea-base-validada.md. Cómo se comprobó: MCP get_execution_summary + get_runs(limit=50); limit=100 rechazado
  - **F0.2** → Límite 50 sin paginación confirmado; 26 runs no accesibles por esta consulta. Dónde: KB linea-base-validada.md. Cómo se comprobó: MCP get_execution_summary + get_runs(limit=50); limit=100 rechazado
- **Criterios cumplidos:**
  - **F0-C1** El KB trae la línea base validada con cifras y límites declarados. → KB linea-base-validada.md contiene cifras comprobadas, correcciones y límites
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Línea base validada y corregida en KB, commit de hito sin datos en código.. Siguiente: 2026-10-06: confirmar causas en F1

### F1. Diagnóstico de causas

**Meta:** Confirmar contra el código cada causa probable antes de cambiar nada.
**Esfuerzo:** 4 h

**Registro F1** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F1-P1: F0 cerrada. (F0 cerrada con commit registrado)
- **Commits:**
  - `c862be2d547fcf7f42827e12fe21053ee112fe11` · chore: complete F1 execution gate diagnosis · kanai-app/feat/optimizar-ejecucion (verificado)
- **Qué se hizo:**
  - **F1.1** → Diagnóstico trazado y registrado; causas no demostrables descartadas con motivo. Dónde: KB causas-confirmadas.md. Cómo se comprobó: Lectura del código de la base y git real; configuración/commits consultados en copia de DB · ejecutó: llm
  - **F1.2** → Diagnóstico trazado y registrado; causas no demostrables descartadas con motivo. Dónde: KB causas-confirmadas.md. Cómo se comprobó: Lectura del código de la base y git real; configuración/commits consultados en copia de DB · ejecutó: llm
  - **F1.3** → Diagnóstico trazado y registrado; causas no demostrables descartadas con motivo. Dónde: KB causas-confirmadas.md. Cómo se comprobó: Lectura del código de la base y git real; configuración/commits consultados en copia de DB · ejecutó: llm
  - **F1.4** → Diagnóstico trazado y registrado; causas no demostrables descartadas con motivo. Dónde: KB causas-confirmadas.md. Cómo se comprobó: Lectura del código de la base y git real; configuración/commits consultados en copia de DB · ejecutó: llm
  - **F1.5** → Diagnóstico trazado y registrado; causas no demostrables descartadas con motivo. Dónde: KB causas-confirmadas.md. Cómo se comprobó: Lectura del código de la base y git real; configuración/commits consultados en copia de DB · ejecutó: llm
- **Criterios cumplidos:**
  - **F1-C1** Cada causa tiene archivo:línea o queda descartada con motivo. → KB causas-confirmadas.md: cada causa tiene citas de código o descarte explícito
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Causas verificadas contra código y git; hipótesis no demostradas descartadas. Siguiente: 2026-10-06: implementar correcciones y regresiones F2

### F2. Cambios en la ejecución

**Meta:** Implementar en kanai-app solo los cambios que F1 confirme.
**Esfuerzo:** 1 a 2 días
**Cómo deshacerla:** Revertir los commits de la rama; no hay migraciones ni datos.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F2** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F2-P1: F1 cerrada y causas confirmadas en el KB. (F1 cerrada; causas-confirmadas.md en KB)
  - [x] F2-P2: Rama feat/optimizar-ejecucion creada desde setup. (feat/optimizar-ejecucion creada desde setup e2250a5 en copia aislada)
- **Commits:**
  - `c2993572b4db52fb504d8db76f20f92ab6b648f6` · fix: optimize integral ticket execution and review · kanai-app/feat/optimizar-ejecucion (verificado)
- **Qué se hizo:**
  - **F2.1** → Frontera N3 es padre del primer commit propio verificado; dependencia permanece en árbol, fuera del diff.. Dónde: server/repo/ticketReviewBase.ts y preGate.ts. Cómo se comprobó: Git real: dependencia integrada, múltiples sesiones, subject exacto y base móvil; 6 tests de integral-execution verdes.
  - **F2.2** → Full sin sesión ya no omite una rama limpia; related sin cambios conserva omisión.. Dónde: server/dispatch/gateChecks.ts. Cómo se comprobó: Sandbox real Node 24: typecheck pass, 1 test pass, 0 fail, origin target; dos tests verdes.
  - **F2.3** → Primera ronda exhaustiva; rerun usa foto exacta + cobertura previa, reabre delta, consumidores y hallazgos. Cobertura incompleta impide approve.. Dónde: gateLevels.ts, integralReview.ts, gateContext.ts, gateDecision.ts, gate.ts. Cómo se comprobó: Tests con Git real reabren value y consumer, reutilizan only unchanged; fallback seguro ante snapshot ausente y código sin cobertura.
  - **F2.4** → Contexto revisor contiene pedido/adendas, aceptación, reglas épica, REQs, casos y decisiones; elimina instrucciones developer. Aviso configurable en caracteres sin recortar obligaciones.. Dónde: integralContext.ts, gateContext.ts, gate.ts y docs/configuration.md. Cómo se comprobó: Prueba de contrato canonical conserva aceptación/adendas y omite plan de ejecución; aviso no muta contexto; flags documentados.
  - **F2.5** → Comprobación final verde y un commit de F2.. Dónde: clone feat/optimizar-ejecucion; logs workspace/work/f2-*.log. Cómo se comprobó: Suite completa 369 files/2941 tests pass; último ajuste acceptance 7/7 dirigidas; typecheck y lint exit 0. · ejecutó: llm, `pnpm test --maxWorkers=4 --minWorkers=1; pnpm typecheck; pnpm lint`, salida 0, 2941/2941; 7/7 dirigidas tras último ajuste; typecheck y lint verdes.
- **Criterios cumplidos:**
  - **F2-C1** Typecheck, lint y suite pasan sin fallas nuevas; comandos ejecutados por agente por autorización expresa y salida registrada. → Suite 369/369 files y 2941/2941 tests exit0; pruebas dirigidas finales 7/7; Node24, pnpm typecheck y pnpm lint exit0. Logs fuera del repo. · ejecutó: llm, `pnpm test --maxWorkers=4 --minWorkers=1; pnpm typecheck; pnpm lint`, salida 0, Todo verde; agente autorizado expresamente por Eduardo.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: Un commit por fase, ejecución por agente y ensayos sin jueces intermedios; único Arbiter final. Motivo: Orden expresa de Eduardo: ejecuta todo, cada fase con su commit, y un juez solo al final con Arbiter. Mantiene objetivo y evidencia de calidad; no afirma mejora de tokens/rondas sin medición.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Implementación c299357 validada: frontera, sandbox full, review delta y contexto contractual, suite verde.. Siguiente: 2026-10-06: F3 proceso nuevo sobre KT y TAO-192 aislados; sin jueces intermedios.

### F3. Pruebas en KT

**Meta:** Validar en proceso nuevo con KT aislado y repetir determinísticamente selección/diff/contexto de TAO-192; único juez Arbiter al final.
**Esfuerzo:** 4 h

**Registro F3** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F3-P1: F2 cerrada; proceso nuevo que cargue el código modificado sobre store aislado. (F2 cerrada commit c299357; ensayo lanzará proceso tsx nuevo sobre copia SQLite + clones locales; store live intacto.)
- **Commits:**
  - `c3f1eb5cd28858d761a5c89f5416968f2b442b21` · chore: complete F3 isolated execution validation · kanai-app/feat/optimizar-ejecucion (verificado)
- **Qué se hizo:**
  - **F3.1** → KT-2 sintético en store SQLite aislado y repo Git nuevo; dependencia KT-1 integrada.. Dónde: work/isolated-data/replay.db y work/kt-replay. Cómo se comprobó: Proceso nuevo sin mocks DB: insertó proyecto/repo/ticket y verificó base primer commit propio.
  - **F3.2** → KT full corre sandbox real, diff conserva contrato; delta reabre consumer/test y reutiliza untouched.. Dónde: ensayo-aislado.md; work/f3-replay.json. Cómo se comprobó: ran=true, origin target, typecheck pass,1 test pass/0 fail; assertions reales exit0. · ejecutó: llm, `node --import tsx .scratch-f3.mts (env aislado)`, salida 0, KT primera cobertura4full; rerun3selected/1reused; sandbox evidence guardada.
  - **F3.3** → Repetición aislada TAO-192: base entrega TAO-191, diff excluye heredado; contexto y progresión medidos.. Dónde: ensayo-aislado.md y work/f3-replay.json. Cómo se comprobó: Diff188→154; 34rutas heredadas fuera; cobertura15→153 en10 armados deterministas; contexto22587→49669 con obligaciones conservadas.
- **Criterios cumplidos:**
  - **F3-C1** El sandbox corre y deja evidencia en el ticket sintético. → /Users/edobacon/Documents/Codex/2026-10-06/revisa-el-caso-inline-de-kanai/work/f3-replay.json y isolated-data/replay.db: KT-2 meta.sandboxEvidence ran=true, typecheck=pass, tests pass1/fail0. Proceso nuevo sin mocks.
  - **F3-C2** Diff de KT y repetición de TAO-192 excluyen dependencia integrada; cambios actuales y consumidores siguen visibles. → KT dependency.mjs fuera del diff pero importada/testeada; TAO base bd50805 y34 rutas heredadas excluidas; consumers reabiertos y cobertura actual progresiva.
  - **F3-C3** Registrar medidas reales de contexto/ensayo y límites; metas de <=2 rondas y <1M tokens son objetivos a contrastar, no cifras inventadas sin corrida LLM. Único juez final Arbiter. → ensayo-aislado.md registra todas medidas y límites: <=2 rondas y <1M tokens no demostrados; cobertura TAO necesitó10 pases simulados; prompt contractual crece para conservar fuentes; ningún gate LLM intermedio.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** KT sandbox real verde y TAO replay registrado; eficiencia no demostrada y10 pases de cobertura necesarios; commit c3f1eb5.. Siguiente: 2026-10-06: F4 comparación y único Arbiter final.

### F4. Medición y cierre

**Meta:** Comparar contra la línea base y cerrar el caso.
**Esfuerzo:** 1 h

**Registro F4** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F4-P1: F3 cerrada. (F3 cerrada c3f1eb5, KB ensayo-aislado.md y work/f3-replay.json verificables.)
- **Commits:**
  - `bfa8206f1d4ff4248b12d4b6221a39e3710e2fe2` · chore: complete F4 execution comparison · kanai-app/feat/optimizar-ejecucion (verificado)
- **Qué se hizo:**
  - **F4.1** → Tabla final compara todas señales/metas; declara incumplidos/límites y cómo medir pendientes.. Dónde: KB comparacion-final.md, ensayo-aislado.md. Cómo se comprobó: Cifras provienen del histórico validado y f3-replay.json; no transforma caracteres ni simulación en tokens/rondas reales.
- **Criterios cumplidos:**
  - **F4-C1** El KB trae la tabla final contra las metas, con los incumplidos explicados. → comparacion-final.md contiene tabla: sandbox/diff comprobados; <=2 rondas y<1M tokens no demostrados; contexto22587→49669 explicado por preservar fuentes. Logs y f3-replay.json verificables.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Comparación final registrada; fases ejecutadas con un commit cada una; eficiencia LLM no probada.. Siguiente: 2026-10-06: único Arbiter final sobre e2250a5..bfa8206.

### F5. Correcciones de la revisión final

**Meta:** Corregir límites confirmados por el único juez antes de emitir su dictamen final.
**Esfuerzo:** Corrección acotada
**Cómo deshacerla:** Revertir commit F5.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F5** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F5-P1: F0–F4 cerradas y probes verifican omisión permanente de archivos grandes e imports Dart anidados. (F0–F4 cerradas; work/arbiter-probes.log muestra large omitido y lib/consumer.dart reutilizado pese cambioAPI. Trazado integralReview.ts:36 confirma cap24k.)
- **Commits:**
  - `08f8787da6486cdf89cc229b8c24ccd689a95fdb` · fix: preserve integral review coverage across size limits · kanai-app/feat/optimizar-ejecucion (verificado)
- **Qué se hizo:**
  - **F5.1** → Budget ampliable de archivos completos y consumidores sin corte; impactRoots conserva deuda entre reruns y fallos.. Dónde: integralBudget.ts, integralReview.ts, gateCoverage.ts, gateLevels.ts, gate.ts, gateRuns.ts. Cómo se comprobó: Oversized +patch fusionado entero; consumidor>24k completo; roundtrip SQLite mantiene81consumer debt, sin delta y foto inválida siguen incompletos; max200 entrega81 y limpia.
  - **F5.2** → Detector Dart import/export/part/of relativo y package en monorepos reabre consumidores; sobreinclusión conservadora.. Dónde: server/review/consumers.ts, tests/unit/integral-review-limits.test.ts. Cómo se comprobó: Regresión real Git app/lib y app/test: todas cinco rutas reabiertas, reused vacío. Caso raíz falso descartado, anidado reprodujo defecto antes.
  - **F5.3** → Suite final completa, typecheck/lint y repeat TAO; un commit F5.. Dónde: work/f5-suite-final.log, f5-typecheck-final.log, f5-lint-final.log, f5-replay.json; KB correcciones-juicio-final.md. Cómo se comprobó: 370files/2945tests pass; typecheck/lint exit0; TAO50→153full en2pases estructurales. No tokens/rondasLLM inventados. · ejecutó: llm, `pnpm test --maxWorkers=4 --minWorkers=1; pnpm typecheck; pnpm lint; node --import tsx .scratch-f3.mts (store aislado)`, salida 0, 2945/2945; typecheck/lint verdes; TAO cobertura completa2pases.
- **Criterios cumplidos:**
  - **F5-C1** Grandes archivos/consumidores visibles completos, Dart consumidor reabierto, regresiones verdes y medidas actualizadas sin tokens inventados. → work/f5-suite-final.log:370files/2945tests; f5-typecheck-final.log/f5-lint-final.log exit0. f5-replay.json:2pases para153full. Regresión Dart, oversized y deuda persistida verdes en integral-review-limits.test.ts. · ejecutó: llm, `pnpm test --maxWorkers=4 --minWorkers=1; pnpm typecheck; pnpm lint`, salida 0, Suite completa2945verde; correcciones comprobadas sin segundo juez.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: Agregar F5 para corregir tres límites confirmados durante único juicio final antes de emitir dictamen.. Motivo: Probes de Arbiter: archivo>80k omitido siempre, consumidor>24k sin contenido, import Dart anidado no reabierto. Mantener un juez y un único run final.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Límites/Dart/deuda corregidos; 2945tests +typecheck/lint verdes; TAO cobertura en2pases; commit08f8787.. Siguiente: 2026-10-06: mismo único juez emite dictamen sobre08f8787 y se registra un run Arbiter final.

### F6. Contenido no leído en la cobertura

**Meta:** Impedir que marcadores de archivos sin contenido se registren completos o permitan aprobar.
**Esfuerzo:** Corrección final acotada
**Cómo deshacerla:** Revertir commit F6.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F6** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F6-P1: F5 cerrada; mismo juez identifica UNREAD_FILE marcado full con precommit apagado. (F5 cerrada08f8787; server/dispatch/sessionDiff.ts:97 UNREAD_FILE; gateLevels.ts reviewComplete requiere guard de contenido.)
- **Commits:**
  - `a19362842af07c347dd8d1ff0a5521ea01cc862f` · fix: reject integral approval for unread file content · kanai-app/feat/optimizar-ejecucion (verificado)
- **Qué se hizo:**
  - **F6.1** → Marcadores UNREAD_FILE son partial y no full/reusable; N3 exige completitud de contenido.. Dónde: server/dispatch/sessionDiff.ts, gateLevels.ts y tests/unit/integral-target-checks.test.ts. Cómo se comprobó: Repo real untracked>200k: partial incluye, full excluye, stats/reviewCompletefalse. Suite370files2946tests exit0; typecheck/lint exit0. Replay final TAO2pases. · ejecutó: llm, `pnpm test --maxWorkers=4 --minWorkers=1; pnpm typecheck; pnpm lint; node --import tsx .scratch-f3.mts (aislado)`, salida 0, 2946/2946tests; contenido ausente no aprueba; coberturaTAO2pases.
- **Criterios cumplidos:**
  - **F6-C1** Marcador sin contenido no se marca full ni aprueba; regresión y checks finales verdes. → work/f6-target.log19/19; f6-suite.log370files2946tests; f6-typecheck.log y f6-lint.log exit0. integral-target-checks.test.ts regresión>200k; f6-replay.json2pasesTAO. · ejecutó: llm, `pnpm test --maxWorkers=4 --minWorkers=1; pnpm typecheck; pnpm lint`, salida 0, Completo verde:2946tests y checks.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: Agregar F6 de completitud para último borde confirmado por el mismo único juez.. Motivo: Untracked>200k/binario es marcador UNREAD_FILE; debe impedir full/approve y reuse posterior del contenido no leído.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Contenido no leído es partial/no reusable y no aprueba;2946tests/typecheck/lint verdes; commita193628.. Siguiente: 2026-10-06: único dictamen final Arbiter sobrea193628 y registro de corrida.
