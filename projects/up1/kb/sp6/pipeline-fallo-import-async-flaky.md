# Análisis: fallo de pipeline en merge UPONE-1382 (test flaky del import async)

**Fecha del análisis:** 2026-07-17
**Pipeline afectado:** build Docker de `object-manager`, paso `npm run test:ci:unit`
**Commit del pipeline:** `b2b9aa0` (Merged in feat/UPONE-1382-hard-delete-cascade, PR #413) en `develop`
**Log fuente:** `pipelineLog-{5b503d14-f8cf-4540-90b5-40230526d54a}.txt`

## Resumen ejecutivo

El pipeline falló, pero **no por los cambios de UPONE-1382**. Ningún test salió rojo por assertion: todos los que se imprimieron pasaron con ✓. Lo que rompió el paso fue un **crash del worker de vitest** provocado por una operación asíncrona que se fuga fuera del test (`setImmediate` fire-and-forget en el path async de `importInstances`). Ese código es **preexistente** (marzo 2026, autores Juan Diego Galdames / Vignesh) y no fue tocado por nuestra rama. Es un test **flaky** dependiente del timing de teardown de los workers; un re-run del pipeline probablemente pase.

## Ranking de causas (descarte de alternativas)

Con `--maxWorkers=2` el crash puede venir de cualquier archivo del segundo worker y el stack trace **no nombra el test**, así que se evaluaron todas las hipótesis, no solo la del import.

| # | Hipótesis | Veredicto | Evidencia |
|---|---|---|---|
| 1 | **Fuga async del import** (`setImmediate` + `_processImportTaskAsync`, instance.resolver.js:6058) | **Muy probable (causa directa)** | Único `setImmediate` en `src/` que lanza un job completo tras retornar. El mock del test es superficial (`up1_om_task.update: vi.fn()`), así que `_processImportTaskAsync` falla, cae al `catch` y ejecuta `console.error` (línea 6062) **durante el teardown** → produce exactamente `Closing rpc while "onUserConsoleLog" was pending`. Preexistente, ajeno a UPONE-1382. |
| 2 | **Nuestro fire-and-forget** `publishEventForInstance(...).catch(() => {})` (línea 5603, agregada por Eduardo Bacon el 2026-07-14 en UPONE-1382) | **Descartado como causa del exit 1** | El `.catch(() => {})` traga la rejection, así que **no puede** generar unhandled rejection ni el `process.exit(1)` (la firma del crash es una rejection promovida a uncaught por el default de Node 22). Además ningún unit test llega a esa línea: `deleteImpactPlan.test.js` prueba el motor `executeDeletePlan` directo, no el resolver `deleteInstances` que la contiene. |
| 3 | **Flakiness estructural de los workers de vitest** | **Contribuyente, no causa** | Ya documentada por el equipo en el Dockerfile. Matiz honesto: nuestro PR sumó ~2000 líneas de tests (`deleteImpactPlan.test.js` 1619 + integration 407), lo que aumenta la carga del suite y puede subir la probabilidad del race, aunque el código no sea la causa directa. |
| 4 | **Assertion de un test rojo** | **Descartado** | Todos los tests impresos salieron ✓. |
| 5 | **Otros `setTimeout`/`setInterval` de `src/`** (holiday.resolver, ai-agent tools, flowService, schemaChangeSubscriber) | **Descartados** | Todos están awaited (patrón `AbortController` + `clearTimeout`) o en paths que los unit tests no ejercen. |

**Conclusión del descarte:** la causa directa es la fuga del import (ajena a nosotros). La única línea nuestra sospechosa (5603) está defensivamente capturada y no puede producir esta firma. El único vínculo con UPONE-1382 es indirecto: más tests = más carga = más chance del race preexistente.

## Firma del crash y por qué encaja con el import

El default de Node 15+ es `--unhandled-rejections=throw`: una promise rejection sin manejar se **promueve a excepción no capturada** (`workerOnGlobalUncaughtException [as _fatalException]`), y vitest la intercepta como `process.exit(1)`. El path del import genera esto porque:

- `setImmediate(async () => { ... })` corre tras el fin del test, contra un mock incompleto.
- `_processImportTaskAsync` falla → `catch` ejecuta `console.error(...)` en teardown → `onUserConsoleLog pending`.
- El trabajo async residual (o la rejection propagada) → uncaught → `process.exit(1)`.

Ambos síntomas del log quedan explicados por la misma fuga.

## Por qué falla ahora y no antes

Es un flaky probabilístico, no algo que UPONE-1382 haya roto. Cuatro factores:

1. **Ya había fallado antes.** El workaround del Dockerfile (`--maxWorkers=2 --silent=passed-only`) lo agregó **Nelson Cornejo el 2026-07-03**, commit *"Mejoras en pipelines con vitest"*. Ese parche existe precisamente porque esta clase de crash (`EnvironmentTeardownError`) ya aparecía: fue **mitigado, no eliminado**. La corrida de nuestro merge es la reaparición de un problema conocido.

2. **El bug es determinista, pero su manifestación no.** El leak (`setImmediate` + `_processImportTaskAsync`) existe desde que se creó el test del import (2026-03-31). Lo que varía entre corridas es el **race** entre el job async fugado terminando su `console.error`/rejection y el worker arrancando el teardown de ese archivo:
   - log/rejection **durante** el teardown → crash.
   - log/rejection **antes** → pasa.
   Con `--maxWorkers=2` depende de qué archivos caen junto al import en el mismo worker y en qué orden. Cada corrida baraja distinto.

3. **Nuestro merge movió el timing, no causó el bug.** UPONE-1382 sumó `deleteImpactPlan.test.js` (~1600 líneas) al suite unit (93 → 94 archivos). Más carga = corridas más lentas = ventana de teardown más ancha = más probabilidad de que el log tardío del import caiga dentro del teardown. Empuja el dado, pero el dado ya estaba trucado.

4. **Runner self-hosted compartido.** El pipeline corrió en `aws-amd64-runner-1` (self-hosted). Su carga de CPU/memoria varía entre corridas; un runner más ocupado alarga el teardown y agranda la ventana del race. El mismo commit puede pasar en un re-run.

**En una línea:** el leak es preexistente y ajeno a UPONE-1382; ya había obligado a un workaround el 3 de julio. Como es un flaky por timing, "no fallar" nunca fue garantía sino suerte, y nuestro merge (más tests + runner cargado) inclinó la probabilidad lo suficiente para que reapareciera.

## Qué falló exactamente

Comando que rompió el build (Dockerfile:44):

```
RUN npm run test:ci:unit -- --maxWorkers=2 --silent=passed-only
```

Salida del crash (no es un test rojo, es el proceso muriendo):

```
#24 26.79 Error: process.exit unexpectedly called with "1"
#24 26.79     at process.exit (.../vitest/dist/chunks/base.B6Opl8PE.js:109:9)
#24 26.79     at process.workerOnGlobalUncaughtException [as _fatalException] (node:internal/main/worker_thread:253:11)
...
#24 26.82 Error [EnvironmentTeardownError]: [vitest-worker]: Closing rpc while "onUserConsoleLog" was pending
#24 ERROR: process "/bin/sh -c npm run test:ci:unit ..." did not complete successfully: exit code: 1
```

Dos síntomas encadenados:
1. `process.exit unexpectedly called with "1"` vía `workerOnGlobalUncaughtException`: una excepción no capturada se promovió a fatal y mató el worker.
2. `EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending`: un `console.*` se ejecutó mientras el rpc del worker ya se estaba cerrando.

Timeline: el último test impreso fue `import.resolver.test.js > importInstances — async path > should create task for rows > threshold` a **26.67s**; el crash ocurrió a **26.79s**, inmediatamente después.

## Causa raíz

El test del path async de `importInstances` genera 501 filas (supera el umbral de sincronía), llama al resolver, este crea un task y **dispara un trabajo en background con `setImmediate`**:

`src/graphql/resolvers/instance.resolver.js:6058`

```js
// Process async
setImmediate(async () => {
  try {
    await _processImportTaskAsync(context, task.id, objectType, validRows, errorRows, resultRows, filePath);
  } catch (err) {
    console.error(`[importInstances] Async task ${task.id} failed:`, err);
    await prisma.up1_om_task.update({
      where: { id: task.id },
      data: { status: 'FAILED', metadata: JSON.stringify({ error: err.message }) }
    });
  }
});
```

Secuencia del fallo:
1. El test `await importInstances(...)` retorna `{ async: true, taskId: 'task-123' }`. El test hace sus asserts (todos pasan) y **termina**.
2. El callback de `setImmediate` corre en el tick siguiente, **después** de que el test terminó, cuando el worker ya inició su teardown.
3. Ese callback ejecuta `_processImportTaskAsync` contra un `prisma` **mockeado e incompleto** (el mock solo cubre lo que el test verifica, no el procesamiento completo del task).
4. El procesamiento falla o loguea:
   - Si loguea (`console.error` de la línea 6062, o logs internos de `_processImportTaskAsync`) mientras el rpc se cierra, se dispara `Closing rpc while "onUserConsoleLog" was pending`.
   - Si lanza una excepción fuera del `try` (por ejemplo el `await prisma.up1_om_task.update` del `catch` rechaza contra el mock), queda como unhandled y Node la promueve a fatal, provocando `process.exit(1)`.

En ambos casos el origen es el mismo: **una operación async que sobrevive al ciclo de vida del test**. No hay forma de que el test la espere porque el contrato del resolver es justamente "responder rápido y procesar en background".

## Por qué NO es de nuestros cambios (UPONE-1382)

Diff de la rama vs `develop` (archivos tocados):

| Archivo | ¿Relación con el crash? |
|---|---|
| `src/graphql/resolvers/helpers/deleteImpactPlan.js` (nuevo, 1531 líneas) | No. 0 `console.*`, sin `process.exit`, sin fire-and-forget. |
| `src/graphql/resolvers/instance.resolver.js` (+102) | Hunks en líneas 19, 1208, 3801, 5505-5613 (zona delete cascade). **No** toca el path async del import (línea 6058, muy por debajo del último hunk). |
| `tests/unit/resolvers/deleteImpactPlan.test.js` (nuevo) | No relacionado. |
| `tests/integration/.../hard-delete-cascade.integration.test.js` (nuevo) | No corre en `test:ci:unit` (solo `tests/unit`). |
| `src/events/decorators/withDataLog.js`, typeDefs, docs | No relacionado. |

- `import.resolver.js` / `import.resolver.test.js` **no aparecen en el diff** de UPONE-1382. El test file tiene última edición Jul 2, sin cambios de nuestra rama.
- El bloque `setImmediate` es de **marzo 2026**, no de UPONE-1382:

```
18ba7f2c  2026-03-30 12:34:47  Juan Diego Galdames  "Primera versión de carga masiva"   (setImmediate + try/catch)
0ba390d2  2026-03-30 23:58:03  Juan Diego Galdames  "Feedback visual de carga y documentación actualizada"  (línea del await _processImportTaskAsync)
```

Nuestro merge simplemente fue el commit que estaba corriendo cuando la flakiness se manifestó.

## Evidencia de que ya era un problema conocido

El propio Dockerfile documenta esta clase de crash y agrega un workaround (que reduce pero no elimina el problema):

```dockerfile
# default per-CPU workers with verbose console streaming crash vitest workers
# (EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending).
RUN npm run test:ci:unit -- --maxWorkers=2 --silent=passed-only
```

El workaround (`--maxWorkers=2 --silent=passed-only`) baja la probabilidad silenciando logs de tests que pasan, pero **no elimina la fuga real** (el `setImmediate` colgante sigue corriendo), por eso el crash reaparece de forma intermitente según el timing.

## Cómo arreglarlo

El fix de fondo es que el test **no deje trabajo async colgando**. Es un follow-up sobre el import resolver, ajeno a UPONE-1382. Opciones (de menor a mayor alcance):

**A. Mockear el trabajo en background (recomendado, mínimo y quirúrgico).**
En `import.resolver.test.js`, mockear `_processImportTaskAsync` para que sea un no-op resuelto, de modo que el `setImmediate` no toque prisma ni loguee:

```js
vi.spyOn(resolverModule, '_processImportTaskAsync').mockResolvedValue(undefined);
```

(requiere que la función sea exportable/spyable; si no lo es, usar B o C).

- Pros: aísla el test al contrato real que valida (crea task + retorna async), no al procesamiento.
- Contras: si `_processImportTaskAsync` no está exportada, hay que exportarla o interceptar `setImmediate`.

**B. Interceptar y drenar `setImmediate` en el test.**
Fakear timers o esperar explícitamente el drain del `setImmediate` antes de terminar el test, con el prisma mock completo para que `_processImportTaskAsync` no falle:

```js
vi.useFakeTimers();
// ... llamar importInstances ...
await vi.runAllTimersAsync();
vi.useRealTimers();
```

- Pros: prueba también el background sin fuga.
- Contras: obliga a completar el mock de prisma para todo el flujo del task (más frágil).

**C. Endurecer el catch del resolver para no re-lanzar durante teardown.**
El `catch` de la línea 6061 hace `await prisma.up1_om_task.update(...)`; si eso rechaza, queda unhandled. Envolverlo en su propio try/catch defensivo evita que un fallo al marcar FAILED tumbe el proceso:

```js
} catch (err) {
  console.error(`[importInstances] Async task ${task.id} failed:`, err);
  try {
    await prisma.up1_om_task.update({ where: { id: task.id }, data: { status: 'FAILED', metadata: JSON.stringify({ error: err.message }) } });
  } catch (updateErr) {
    console.error(`[importInstances] No se pudo marcar el task ${task.id} como FAILED:`, updateErr);
  }
}
```

- Pros: hace el resolver más robusto en producción también (un fallo al persistir el estado FAILED no debería reventar el proceso).
- Contras: no resuelve del todo el `onUserConsoleLog pending` si el problema es solo el log durante teardown; conviene combinarlo con A.

### Recomendación

- **Inmediato:** re-run del pipeline. Es timing-dependiente; con alta probabilidad pasa y desbloquea el merge.
- **Follow-up (local, ajeno a UPONE-1382):** aplicar **A** (mockear el background en el test) y de paso **C** (catch defensivo en el resolver, mejora también producción). Es un ticket propio del import resolver, no de delete-cascade.

## Anexo: comandos de verificación

```bash
cd object-manager

# script del paso que falló
grep -E '"test:ci:unit"' package.json
#   "test:ci:unit": "vitest run tests/unit --reporter=verbose --pool=threads"

# archivos de UPONE-1382 (import.resolver NO aparece)
git diff --stat origin/develop...HEAD

# autoría y fecha del setImmediate colgante
git blame -L 6055,6065 src/graphql/resolvers/instance.resolver.js
git show -s --format="%h %ai %an %s" 18ba7f2c 0ba390d2
```
