# Prueba controlada de F2: escenario, instrumento y valores esperados

Fecha de diseño: 2026-10-05. Caso: kanai-pre-epica, tarea F2.1. Se escribe y se registra **antes** de correr la
prueba: los valores esperados no se ajustan después de ver los números.

## 1. Qué se quiere comprobar

Que la corrección del planificador (commit `c29530d`) y la del backend de telemetría (commit `abe6359`) se
tradujeron en mejora medible, comparando antes y después con el mismo instrumento.

## 2. Escenario: épica demo aislada

- **Épica de prueba** `demo-pre-epica`, proyecto `demo-pre-epica`, repo `demo-repo`, rama `epic/DEMO`. Se arma
  **en memoria**: no se escribe en el store de épicas ni en kanai.db, no se registra ningún proyecto.
- **Entrada**: los cuerpos canónicos de los 8 tickets del hallazgo (TAO-181 y TAO-182 de la épica EP-01,
  TAO-183 a TAO-188 de la épica EP-01a), leídos en modo lectura de los archivos de épica del data repo.
- **Identificadores de prueba**: todo identificador de ticket del proyecto real se renombra de forma consistente
  en ids, alias, dependencias declaradas, títulos y cuerpos: `TAO-n` pasa a `DEMO-n` y `GH-n` pasa a `DGH-n`.
  Los identificadores de contenido (HU-, DEC-, V-, QA-, EP-) se conservan porque son justo lo que el planificador
  tiene que clasificar; no son tickets de ningún proyecto de Kanai.
- **Punto de partida**: la épica demo empieza sin aristas guardadas (`dependencies: []`), con las dependencias
  declaradas de cada ticket y sin evidencia externa ni hitos. Así las dos versiones del planificador parten del
  mismo estado y la comparación mide solo lo que cada una infiere.

## 3. Instrumento (el mismo para antes y después)

Un script de solo lectura evalúa la épica demo con dos versiones del planificador:

- **Antes**: `server/epics/planner.ts` en `c29530d^` (`abe6359`), el patrón que produjo el hallazgo.
- **Después**: `server/epics/planner.ts` en HEAD de `setup`.

Sobre la salida de cada una cuenta:

| # | Indicador | Cómo se cuenta |
|---|---|---|
| I1 | Aristas inferidas del cuerpo | aristas con origen inferido y fuente `<ticket>:body`; se desglosan en: a ticket del conjunto, a metadato (DEC-/V-/QA-/EP-), a identificador truncado y a referencia externa |
| I2 | Identificadores truncados | aristas cuyo origen es un prefijo de un identificador jerárquico que aparece completo en el cuerpo (p.ej. `HU-01` cuando el cuerpo dice `HU-01-17`) |
| I3 | Auto-referencias | aristas cuyo origen y destino son el mismo ticket |
| I4 | Ejecuciones con telemetría completa | ver §4 |

Además se reporta, como contexto, la cantidad de avisos "Dependencia externa pendiente" y "Decidir dependencia
inferida" que el plan le pediría decidir a la persona.

## 4. I4: telemetría por ejecución (opción A elegida por el dev)

Mismo instrumento que el baseline de F0: consulta de solo lectura (`PRAGMA query_only`) sobre `agent_runs`,
porcentaje con duración y con tokens, agrupado por backend canónico.

- **Antes**: las 1684 ejecuciones del baseline congelado (las primeras 1684 por fecha de creación).
- **Después**: las ejecuciones creadas después del commit `abe6359` (2026-10-04 18:18:32 -0300).
- Se informa el tamaño de cada muestra. Si la muestra "después" tiene menos de 30 ejecuciones, el resultado se
  lee como indicio, no como tasa.

Desvío respecto del plan, aprobado por el dev el 2026-10-05: F2.2 pedía además "un gate con verificación real
sobre el proyecto demo". Se reemplaza por la lectura del store porque un gate demo da 1 o 2 ejecuciones, que no
sirven para un porcentaje, y obligaría a registrar un proyecto en el store. El gate con verificación real es el
tema del caso post-épica.

## 5. Valores esperados (declarados antes de correr)

| Indicador | Antes (esperado) | Después (esperado) | Criterio de mejora |
|---|---|---|---|
| I3 auto-referencias | 8 (una por ticket, por su `DGH-n` propio) | 0 | después = 0 |
| I2 identificadores truncados | más de 0 | 0 | después = 0 |
| I1 aristas a metadatos | más de 0 (en la épica real eran 101 de 127) | 0 | después = 0 |
| I1 aristas del cuerpo restantes | - | solo tickets del conjunto o referencias reales a tickets fuera del conjunto (DEMO-/DGH-/HU- completos) | ninguna arista restante es metadato, truncada ni auto-referencia |
| I1 referencias reales entre tickets del conjunto | las mismas que después | se conservan todas | ninguna referencia real desaparece |
| I4 backend canónico | etiquetas mixtas | 100% de las ejecuciones nuevas con backend canónico | después = 100% |
| I4 tokens | 67% global, 57% Claude Code, 76% OpenCode | **sin mejora esperada en Claude Code** (el hueco es del host, hallazgo de F0); OpenCode igual o mejor | no se exige el 90%: se informa |

Lectura previa honesta de I4: la corrección de `abe6359` arregla la **etiqueta** del backend, no la captura de
tokens. Si los tokens de Claude Code siguen por debajo del 90%, no es un fracaso de esta fase sino la
confirmación del hallazgo de F0 (lo cierra el host, no kanai-app).

## 6. Regla de decisión

- **Hubo mejora** si I2 = 0, I3 = 0, cero aristas a metadatos y ninguna referencia real perdida.
- **No hubo mejora** si cualquiera de esos cuatro falla: se registra el hallazgo con su causa y se decide entre
  ajustar y repetir, o no cerrar el caso.
- I4 informa y no decide el arranque del piloto, salvo que el backend canónico no llegue al 100% en lo nuevo
  (eso sería una regresión del fix y sí bloquea).

## 7. Qué NO toca la prueba

Ni el store de épicas, ni kanai.db (solo lectura), ni tickets, specs, sesiones o estados de taomangalam. La
versión vieja del planificador se extrae con `git show` a un archivo temporal fuera del repo.
