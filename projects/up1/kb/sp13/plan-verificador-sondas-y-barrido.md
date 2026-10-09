---
id: DOC-kb-sp13-plan-verificador-sondas-y-barrido
project: up1
type: doc
module: mcp
tags:
  - sp13
  - plan
  - verificador
  - sondas
  - intake
  - kanai
  - detective-mode
  - barrido
  - fases
  - decisiones
---

# Plan: verificador de consistencia en el intake (sondas) y barrido a demanda (opciones A y C)

Plan de implementación de las opciones **A** (más tipos de sonda en el intake, con disparo por vocabulario) y **C** (skill de barrido a demanda) del documento "Verificador de consistencia: integración con Kanai (detective mode, intake y sondas)", misma carpeta. Incluye la **mejora a detective mode** (sección propia y fase propia) y la **revisión de todas las decisiones, con sus opciones y la recomendada para el flujo y el plan**. **Estado: plan propuesto, sin iniciar. Nada implementado.** Los cambios son en `kanai-app` y en el KB de up1 (`sondas/probes.yaml`). Versión 2: reordena las fases tras revisar las decisiones (se agrega la fase de `run_probes` extendido y detective mode pasa a ir temprano).

## Objetivo

Que las cuatro comprobaciones del verificador (guardas de consultas, claves de columnas, relaciones de listas y alcance organizacional) lleguen al trabajo de up1 en tres momentos, sin recargar el intake:
1. **Intake (A):** como sondas por objeto que solo se disparan cuando el pedido trata de la superficie que revisan.
2. **Detalle de tickets (detective mode):** como señales deterministas que el detalle de cada ticket de Jira incorpora como evidencia.
3. **A demanda (C):** como un barrido por objeto o por mod, sin ticket de Kanai, para descubrir candidatos a ticket y para el trabajo que hoy entra por Jira sin pasar por el intake.

Punto de partida medido (`probe_metrics` de up1, 2026-10-09): 1 ticket de Kanai ha pasado por las sondas, con 6 tarjetas, de las cuales 3 útiles y 3 ruido. 25 hallazgos de revisiones sin ticket quedaron fuera. Son indicios de un solo ticket, no una base estadística.

## Alcance

**Dentro:**
- Cuatro tipos de sonda nuevos por objeto: `query-guards`, `column-keys`, `list-relations`, `org-scope`.
- Un parámetro `trigger` genérico para los tipos por objeto (hoy solo existe en `code-pattern`).
- `run_probes` extendido: extracción de objetos desde el pedido y barrido de un repo completo del catálogo (ver D1).
- Mejora a detective mode: paso de señales de sondas en su pipeline, sección nueva en el detalle y pieza acotada (ver "Mejora a detective mode").
- Una skill nueva de barrido a demanda (nombre tentativo `kn-scout`).
- Configuración en `sondas/probes.yaml` de up1, activación gradual y medición con kn-tassadar.

**Fuera (documentado para no mezclarlo):**
- Tarjetas informativas que no frenan (opción B); se reevalúa después de medir el ruido por tipo.
- Un paso nuevo aparte en `plan_ticket` (opción E).
- Comprobación de mutations, análisis de guardas por función, impacto de renombrar, deriva entre disco y base de datos, máquinas de estado y mapa de reglas de servidor.
- Crear tickets en Jira desde el barrido o desde detective mode: se propone el texto y se espera confirmación.
- Cambios al atlas del MCP.

## Decisiones ya tomadas

- Adoptar A y C. Descartar E. Dejar B para después de medir.
- Los tipos nuevos son código en `kanai-app` (TypeScript); los parámetros de up1 viven en el `probes.yaml`, que es dato del proyecto.
- Cada tipo nuevo arranca desactivado (`enabled: false`) y solo se activa tras medirlo.
- Detective mode incorpora las señales de sondas (esta versión del plan lo desarrolla).

## Cómo funciona un tipo de sonda hoy (verificado leyendo el código)

- Registro: `OBJECT_KINDS` en `server/probes/engine.ts` (por objeto del catálogo) y `PROBE_KINDS` en `server/probes/spec.ts` (el `probes.yaml` se valida con zod al parsear).
- Un tipo por objeto es una función `(ctx, obj, input) => { signals, scanned }`. `scanned` alimenta la salud (`probe_health`). Los tipos de escritura devuelven vacío si el pedido no escribe el objeto (`writes(input)`); los tipos nuevos de este plan deben correr también cuando el pedido solo lee.
- El engine agrupa señales en una tarjeta por sonda; `runKind` captura excepciones para que una sonda rota no tumbe a las demás.
- `labels.ts` da el nombre de trabajo de la tarjeta; `kn-tassadar` tiene la tabla de categorías; `kn-probes` documenta los tipos y sus parámetros.
- El catálogo carga solo los objetos de los repos de `catalog.repos` (los mods), indexados por `title`. El tipo `reference-coherence` ignora las FK a objetos fuera del catálogo, por ejemplo del core (`server/probes/kinds/context.ts`). Hay objetos con el mismo nombre en el core y en un mod (por ejemplo `Section`).
- El disparo por vocabulario del pedido existe solo en `code-pattern` (`trigger`); los tipos por objeto corren siempre que el pedido nombra el objeto.
- `run_probes` (`server/mcp/probesTools.ts`) exige `objects` con al menos un elemento. No usa el flag `KANAI_INTAKE_PROBES` (solo valida que el proyecto exista y tenga `probes.yaml`). El intake sí extrae los objetos del pedido solo, con `extractProbeObjects` (por nombre técnico, etiqueta de negocio o i18n). No existe una tool que liste los objetos del catálogo.

## Mejora a detective mode

Detective mode (`skills/claude/kn-detective-mode`) hoy verifica el código con subagentes que leen archivos, en 5 fases: ingesta de Jira, contexto por capas, frontera core/mod (Aduana), frescura y documentos del sprint en el KB. No usa las sondas. La mejora agrega las señales de sondas como **evidencia determinista** al lado de esa lectura.

### Qué cambia, fase por fase

**Fase 2, contexto por capas: nuevo paso "2ter · Señales de sondas".**
1. Derivar los objetos del ticket y sus operaciones (crear, modificar, borrar o solo leer) desde la descripción del PO. Con la extensión de `run_probes` de la fase F2 de este plan, el extractor de Kanai los obtiene del texto (mismo criterio que el intake); mientras tanto el agente los deriva y la respuesta lista los que no están en el catálogo (`unknownObjects`) para corregirlos.
2. Llamar a `run_probes` (solo lectura, sin tokens) con el texto del ticket. Registrar la revisión leída (rama base por repo): las sondas no leen el working copy, leen `origin/<rama por defecto>` o la revisión indicada con `refs`.
3. Entregar las señales a los subagentes de la fase 2 y a Aduana como pistas verificadas por máquina: "confirma o refuta con file:line; concentra tu lectura en lo que las sondas no ven". Hoy cada subagente re-descubre esos hechos leyendo archivos.
4. Si el proyecto no tiene `probes.yaml` o `run_probes` no levanta nada, la sección queda "N/A + motivo", igual que Aduana en un proyecto sin core/mod.

**Fase 2bis, Aduana.** Las señales sirven de insumo al subagente de Aduana: `column-keys` y `list-relations` apuntan a archivos del mod (`lang`, layout); `org-scope` apunta al core (`businessContextFilter`). Es una pista para el veredicto `mod-only` o `core-worthy`, no un reemplazo: Aduana sigue decidiendo.

**Fase 3, frescura.** Cada señal se clasifica como verificada, pendiente de confirmar o contradicción, contra Jira y contra el código. Caso real: UPONE-2036 sigue en Backlog, pero la sonda de prueba muestra que 12 de 30 consultas de academic-scheduling ya están guardadas por el arreglo de UPONE-1611. Esa contradicción hoy exige que alguien lo note a mano.

**Fase 4, documentos.**
- El `UPONE-XXXX-detalle.md` suma una sección "Señales de sondas": una fila por señal con sonda, objeto, qué levanta, evidencia (archivo), revisión leída, estado de frescura y qué implica para el ticket. Se incluye en `references/ticket-template.md` y en el mapa de `references/output-scheme.md`.
- Los factores transversales y el DoD del ticket referencian las señales relevantes (permisos y convenciones).
- En el pre-intake (solo tickets propios y con confirmación), las señales entran como hipótesis a validar, en la parte del "cómo".
- Si hay muchas señales, el detalle muestra las más relevantes y el resto va a un anexo `UPONE-XXXX-senales-de-sondas.md`.

**Fase 5, gate y cierre.**
- Una señal sin resolver pasa a "Decisión abierta" checkeable en el detalle, y se lista al cerrar.
- Si una señal revela una convención durable del módulo (por ejemplo "toda consulta custom exige capability"), se presenta como candidato a regla del KB normativo, con evidencia, y solo se escribe con OK del dev (mismo mecanismo que hoy).
- El reporte final suma una línea por ticket: "N señales de sondas, K verificadas".
- No crea tickets en Jira ni core extensions: sigue valiendo la compuerta de delegación.

**Modo de corrida por pieza.** Agregar la pieza acotada "solo las señales de sondas" (por ejemplo "las señales de 2038"): corre `run_probes` sobre el ticket y entrega la sección, reusando lo ya persistido.

### Qué no cambia

- Detective mode **no abre tarjetas, no resuelve decisiones, no edita el `probes.yaml`**. Las decisiones se toman después, en el intake del ticket cuando se planifica en Kanai. Así no se decide dos veces y se mantiene la separación actual (detective mira hacia adelante, el intake decide, joe-pino cierra).
- No reemplaza al subagente ni a Aduana: lo que las sondas no ven (semántica, UI, lógica de negocio) sigue siendo de la lectura.
- Si el ticket después se planifica en Kanai, el intake vuelve a correr las sondas y abre las tarjetas. El detalle ya anticipa cuáles saldrán; no se arrastran decisiones.

### Archivos que cambian (todos en `kanai-app`)

`skills/claude/kn-detective-mode/SKILL.md` (pipeline, modo por pieza, reglas duras), `references/context-and-verification.md` (capa nueva "sondas"), `references/ticket-template.md` (sección), `references/output-scheme.md` (mapa de piezas y anexo), `references/up1-mod-dimensions.md` (dimensiones 1 y 3 y Aduana), `docs/skills.md` y `tests/unit/skills.test.ts` si cambia el contrato de la skill.

### Valor esperado y límites

- Menos lectura redundante de los subagentes y señales reproducibles con evidencia de archivo. Costo de la llamada: segundos y 0 tokens (la corrida de sondas del intake midió unos 9 segundos). **El ahorro de tokens de detective mode no está medido**; no se promete.
- Con solo las 9 sondas actuales ya hay valor (vías de escritura, perfil por operación, unicidad, consumidores cruzados). Los tipos nuevos suman a medida que se activan.
- Las señales leen una revisión del repositorio, no el trabajo local no commiteado.
- Sin extracción automática de objetos (hasta F2), el agente puede nombrar mal un objeto; `unknownObjects` lo avisa.

### Validación

Detallar con detective mode cuatro tickets conocidos y comparar con el detalle sin sondas: UPONE-2038 (la señal de `column-keys` debe nombrar los 8 campos, cuando el tipo esté activo), UPONE-2039 (4 relaciones), UPONE-2036 (la contradicción de frescura de arriba) y un ticket de control sin señales esperadas, para comprobar que no agrega ruido. Medir tiempo y cantidad de llamadas con y sin el paso.

## Fases

Cada fase deja el sistema funcional, con su validación y su criterio de salida. Los tamaños son relativos (intuición, no medidos): S pequeño, M mediano, L grande. Antes de implementar, leer `kanai-app/CLAUDE.md` y pasar la paridad de CI del repo: lint, typecheck, pruebas, `docs:check` y `pnpm docs:catalog` cuando cambian los catálogos.

### F0. Desbloquear lo incierto y fijar criterios (S)

Riesgos primero.
- [ ] **Spike del catálogo y el core.** Probar `run_probes` sobre un objeto con FK al core (por ejemplo `Section` hacia `OrgUnit`) y leer cómo se comporta `reference-coherence`. Salida: confirmar la decisión D4 con evidencia.
- [ ] **Conjunto de referencia.** Casos para validar cada tipo: UPONE-2036, 2038, 2039, 2061 (ya reproducidos por la sonda de prueba) más los tickets 143 a 152 de la línea base de `metrics.baseline` del `probes.yaml`.
- [ ] **Criterios de éxito.** Confirmar D2 (umbral de ruido y tope de tarjetas nuevas por ticket) con el dueño del KB.
- [ ] Confirmar que `KANAI_INTAKE_PROBES` está activo en el entorno de quien pruebe y que el `probes.yaml` actual pasa `probe_health`.

Validación: documento actualizado con las decisiones confirmadas. Salida: nada de código aún.

### F1. Disparo por vocabulario para tipos por objeto (S a M)

- [ ] Contrato: `trigger` como patrón o lista (todos deben aparecer), en minúsculas y sin tildes, igual que en `code-pattern`. Sin `trigger` el comportamiento actual no cambia.
- [ ] Aplicarlo en `runProbes` (`engine.ts`) antes de llamar al tipo por objeto; validar el patrón al parsear en `spec.ts` con el mismo chequeo de regex peligrosas.
- [ ] Una sonda omitida por `trigger` no cuenta como ciega en la salud.
- [ ] Pruebas en `tests/unit/probes-engine.test.ts`: con y sin `trigger`, con lista, con patrón inválido.

Validación: las 9 sondas actuales se comportan igual y un tipo de prueba con `trigger` se omite o corre según el pedido.

### F2. `run_probes` extendido: extracción y barrido (M)

Según la decisión D1 recomendada.
- [ ] `objects` pasa a ser opcional en `run_probes`: si falta, los objetos se extraen del `request` con `extractProbeObjects`, el mismo extractor del intake. La respuesta lista los objetos detectados y `unknownObjects`.
- [ ] Parámetro nuevo para barrer un repo completo del catálogo (por ejemplo `scope` con uno o más repos): recorre todos los objetos del catálogo de ese repo. Presentación compacta: agrupada por mod y por sonda, con tope de señales visibles y opción `json`.
- [ ] Mantener compatibilidad: una llamada con `objects` hace lo mismo que hoy. Pruebas de ambos caminos.
- [ ] Actualizar descripción de la tool, `docs/sondas-intake.md` y la nota de `kn-probes` (usa `run_probes` para validar).

Validación: `run_probes` con solo el texto de UPONE-2038 detecta `Section`; con `scope` sobre `academic-scheduling` recorre sus 31 objetos en un tiempo comparable con la corrida de 9 segundos del intake. Salida: base común para detective mode y la skill de barrido.

### F3. Detective mode llama a `run_probes` (S a M)

Detalle en "Mejora a detective mode". Va aquí, antes de los tipos nuevos, porque da valor desde el primer día con las 9 sondas actuales y se enriquece solo a medida que se activan los tipos nuevos.
- [ ] `SKILL.md`: paso 2ter, modo por pieza, regla dura de no inventar ni decidir, sección N/A cuando no hay `probes.yaml`.
- [ ] `references/context-and-verification.md`, `ticket-template.md`, `output-scheme.md` y `up1-mod-dimensions.md` según la lista de archivos.
- [ ] `docs/skills.md` y pruebas de skills si corresponde.

Validación: los cuatro tickets de la sección de validación de detective mode. Salida: detective mode con la sección activa. Depende de F2 solo para la extracción automática; con la extracción manual puede salir antes.

### F4. `query-guards` (M)

Origen: comprobación 1 (UPONE-2036).
- [ ] Nuevo `server/probes/kinds/queryGuards.ts`: leer `logic/*.graphql` del repo del objeto (bloques `type Query`), asociar cada operación al resolver cuyo archivo la define (clave al inicio de línea) y buscar una guarda directa o por helper. Clasificar: guardada, abierta declarada o sin guarda.
- [ ] Parámetros en `probes.yaml`: `resolvers` y `schemas` (globs), `guards` (vocabulario por mod: `checkCapability`, `_checkCapability`, `hasCapability`, `checkObjectPermissions`, `checkPermission`, `withObjectAuth` y helpers como `requireScenarioView`), `declaredOpen` (frases que marcan una decisión escrita) y `trigger` (consulta, permiso, lectura, capability).
- [ ] La señal nombra objeto, consulta, archivo y estado, con la limitación visible: la guarda se atribuye por archivo (D5).
- [ ] Registrar el tipo en `PROBE_KINDS`, `OBJECT_KINDS`, `VALIDATED_GLOB_PARAMS`, `labels.ts` y la tabla de `kn-tassadar`; documentar en `docs/sondas-intake.md` y `kn-probes`.
- [ ] Pruebas con fixtures: guardada, abierta declarada, sin guarda, guarda por helper y vocabulario distinto. Debe correr también cuando el pedido solo lee el objeto.

Validación: backtest sobre `develop` con el `probes.yaml` en borrador: 12 guardadas, 16 abiertas declaradas y 2 sin guarda en academic-scheduling; 1 sin guarda en curriculum-design (`validateActivityEvaluations`); curriculum-mapping 9 de 9 guardadas. Medir tarjetas y ruido sobre el conjunto de referencia. Salida: tipo disponible, `enabled: false` en el `probes.yaml` real hasta F8.

### F5. `column-keys` y `list-relations` (M)

Origen: comprobaciones 2 y 3 (UPONE-2038, 2039, 2041, 2043).
- [ ] `column-keys`: por objeto, las propiedades que el selector de columnas ofrece (excluye `id`, JSON y arreglos y los campos de sistema, como en `layout/src/composables/useColumnConfiguration.ts`) frente a las claves `column.<campo>` de `lang/<idioma>/<objeto>.i18n.json`. Reutiliza `catalog.fieldLabels`. Parámetros: idiomas, campos de sistema, ruta de idioma. `trigger`: lista, columna, campo, traducción.
- [ ] `list-relations`: por objeto, sus FK frente a `layoutConfig.relations` y `relationDisplayFields` de los layouts de lista del repo (convención: nombre del campo sin sufijo `Id`, en minúsculas). Marca aparte las FK ya visibles como columnas. `trigger`: lista, columna, relación, FK.
- [ ] Objetos sin archivo de idioma: una señal agregada por objeto, no una por campo, para no inflar tarjetas.
- [ ] Registro, documentación, categorías de tassadar y pruebas con fixtures.

Validación: backtest que reproduce los 8 campos de Sección (UPONE-2038) y las 4 relaciones de `section-list.json` (UPONE-2039), y detecta `executionUnitId` en `default_Activity_list.json` como columna visible sin relación. Medir tarjetas y ruido.

### F6. Skill de barrido a demanda `kn-scout` (M)

Opción C. Usa el barrido de F2.
- [ ] `skills/claude/kn-scout/SKILL.md` y entrada en `server/skills/registry.ts` (tipo `domain`), con descripción orientada a "revisa la consistencia de <mod>", "barrido de <objeto>" y "candidatos a ticket para el sprint".
- [ ] Entrada: un mod, una lista de objetos o ambos. Llama a `run_probes` con `scope` y presenta tarjetas agrupadas por mod y sonda. Advertencia cuando el mod no está entre los calibrados (D6).
- [ ] Salida: informe en el KB (`register_kb_doc`) en la carpeta del sprint, con hallazgos, evidencia y candidatos a ticket, y un borrador de texto para Jira (D7). **No crea ni publica tickets.**
- [ ] `kanai_guide` (`server/llm/guide.ts`) la recomienda ante frases de barrido o de planificación de sprint; prueba en `tests/unit/guide-skills.test.ts`.
- [ ] Documentar en `docs/skills.md`; confirmar que sus tools están en el perfil de tools (`run_probes`, `probe_health` y `register_kb_doc`).

Validación: un barrido de academic-scheduling con la skill lista los mismos hallazgos que la sonda de prueba y deja el informe en el KB.

### F7. `org-scope` (L)

Origen: comprobación 4 (UPONE-2061). Depende de F0 y de la decisión D4.
- [ ] `org-scope`: por objeto, grafo no dirigido de FK, búsqueda hasta `organization` (ancla configurable), profundidad, primer salto directo o inverso, y marca de relaciones polimórficas (`ownerType`, `targetType` y similares). Respetar la lista de objetos exentos del core.
- [ ] Leer los objetos del core dentro del tipo, combinando la base del core con la extensión del mod, sin cambiar el catálogo global (D4 recomendada). Requiere `core.repo` (`CORE_KINDS` en `spec.ts`).
- [ ] Documentar la aproximación: el core arma el grafo desde `core_FieldDefinition` en la base y puede usar un camino precalculado.
- [ ] Pruebas con fixtures: camino directo, solo inverso, sin camino y polimórfico. Prueba de regresión de que `reference-coherence` no cambia.

Validación: backtest que marca `requirement` e `instructionalcomponenttype` sin camino y los polimórficos con camino inverso, como la sonda de prueba.

### F8. Activación gradual y medición (M)

- [ ] Backtest de kn-tassadar (`scripts/probes-backtest.mts`) con el `probes.yaml` actual y con el borrador que activa cada tipo. Registrar recall y tarjetas antes y después.
- [ ] Activar tipo por tipo (`enabled: true`) si cumple los umbrales de D2, con OK del dev y a través de `kn-probes`.
- [ ] `probe_health` limpio: ninguna sonda nueva ciega.
- [ ] A las dos semanas de uso, `probe_metrics`: tarjetas por ticket, útil contra ruido, tiempo hasta decidir y reuso. Comparar con la base (6 tarjetas, 50% de ruido sobre 1 ticket).
- [ ] Si el ruido supera el umbral, ajustar `trigger` o desactivar el tipo; reevaluar la opción B con datos.
- [ ] Documentar el cierre en `docs/sondas-intake.md` y dejar una entrada en el worklog del repo.

Validación: umbrales cumplidos y registrados. Salida: tipos activos o decisión explícita de dejarlos desactivados.

## Decisiones: opciones y recomendación

Las recomendaciones consideran el flujo de Kanai (intake, detective mode, gate) y el orden del plan. Todas siguen **pendientes de confirmación** del dev.

**D1. Cómo se enumeran los objetos para el barrido (y cómo detective mode obtiene los suyos).**
- *Opción A:* la skill lista los objetos del mod leyendo `objects/` con las tools de lectura del repo y los pasa a `run_probes`. Pros: no cambia el motor. Contras: no existe una tool de listado (solo `list_project_repos`, `search_project_code` y `read_project_file`), así que la enumeración la hace el LLM, es frágil, cuesta tokens y contradice el sentido determinista del barrido.
- *Opción B:* extender `run_probes`: `objects` opcional (se extraen del pedido con el extractor del intake) y un parámetro para barrer un repo completo del catálogo. Pros: determinista, una sola llamada, sirve a detective mode y al barrido, compatible hacia atrás. Contras: toca el contrato de una tool que usa `kn-probes`; hay que cuidar el tamaño de la salida.
- *Opción C:* una tool nueva que liste los objetos del catálogo. Pros: no cambia `run_probes`. Contras: otra tool para registrar en perfiles, docs y pruebas, y no resuelve la extracción desde el texto.
- **Recomendada: B.** Es la única que resuelve las dos necesidades (extracción para detective mode, barrido para la skill) con un cambio y sin depender del LLM. Reemplaza la recomendación anterior de empezar por A, que quedó invalidada al confirmar que no hay tool de listado. Impacto en el plan: agrega la fase F2.

**D2. Umbral de ruido y tope de tarjetas nuevas por ticket.**
- *Opción A:* fijar números ahora. Contras: no hay base; la muestra es de 1 ticket.
- *Opción B:* medir en el backtest de cada tipo y fijar el umbral después.
- *Opción C:* sin umbral, decidir a ojo.
- **Recomendada: B con un resguardo provisional:** un tipo se activa solo si su ruido en el backtest no supera el 50% actual y agrega en promedio una tarjeta o menos por ticket del conjunto de referencia. Son valores propuestos, no medidos; los confirma el dueño del KB en F0.

**D3. Nombre de la skill de barrido.** Opciones: `kn-scout`, `kn-barrido`, `kn-consistencia`. **Recomendada: `kn-scout`**, por seguir la convención de nombres de las skills de Kanai (tassadar, senku, dredd, lazarus) y no atar el nombre a una sola comprobación. Es decisión menor y reversible.

**D4. Catálogo y objetos del core.**
- *Opción A:* ampliar el catálogo global con los objetos del core. Pros: todos los tipos los ven. Contras: afecta a los 9 tipos existentes (`reference-coherence` empezaría a seguir FK al core y podría levantar tarjetas nuevas); el catálogo indexa por `title`, y objetos como `Section` existen en el core y en un mod, así que hay colisión de nombres.
- *Opción B:* leer el core solo dentro de `org-scope`, combinando base y extensión. Pros: local, sin regresión. Contras: la lógica de lectura del core queda en un solo tipo.
- **Recomendada: B.** Se reevalúa A si otro tipo necesita ver el core. F0 lo confirma con un spike.

**D5. Granularidad de la guarda en `query-guards`.**
- *Opción A:* por archivo. Pros: simple, ya probada. Contras: un archivo con una consulta guardada y otra sin guardar aparece como guardado.
- *Opción B:* por función (análisis de sintaxis del JavaScript). Pros: preciso. Contras: más código, más superficie de falsos positivos y un parser que mantener.
- **Recomendada: A en la primera versión,** con la limitación visible en la tarjeta. Pasar a B si en F8 aparecen falsos negativos reales.

**D6. Alcance del barrido.**
- *Opción A:* solo los 3 mods donde se calibraron las comprobaciones (academic-scheduling, curriculum-design, curriculum-mapping).
- *Opción B:* los 7 repos del catálogo de up1.
- *Opción C:* parametrizable, con los 3 calibrados por defecto y una advertencia al barrer los demás.
- **Recomendada: C.** Los otros 4 mods (`ai-agent`, `retention-wellbeing`, `uengagement-up1`, `up1-manager`) no se calibraron; barrerlos sin aviso daría falsos positivos que gastan confianza en la herramienta.

**D7. Destino del informe de barrido.**
- *Opción A:* solo el KB, carpeta del sprint.
- *Opción B:* el KB más un borrador de texto para Jira, que el dev revisa antes de publicar.
- *Opción C:* además crear los tickets.
- **Recomendada: B.** Respeta la regla de mostrar el contenido antes de publicar hacia afuera. C queda fuera del plan.

**D8. Cuándo corre `run_probes` en detective mode.**
- *Opción A:* siempre, automáticamente, en tickets que tocan código de un mod. Pros: es barato, de solo lectura y sin tokens; no suma preguntas. Contras: un paso más en cada corrida.
- *Opción B:* bajo confirmación dentro de la "confirmación de alcance". Contras: suma una pregunta a un flujo que ya tiene varias.
- *Opción C:* solo cuando el dev lo pide como pieza acotada. Contras: casi nadie lo usaría.
- **Recomendada: A,** más la pieza acotada para repetirlo a pedido. Se registra en el reporte que corrió.

**D9. Dónde va detective mode en el orden del plan.**
- *Opción A:* después de los tipos nuevos. Contras: retrasa el valor.
- *Opción B:* temprano, justo después de `run_probes` extendido. Pros: da valor desde el primer día con las 9 sondas actuales, valida la integración con el menor costo y los tipos nuevos se enchufan solos.
- **Recomendada: B** (F3 en este plan).

**D10. Cómo se muestran las señales en el detalle.**
- *Opción A:* todas dentro del `detalle.md`. Contras: puede inflarlo.
- *Opción B:* las más relevantes en el detalle y el resto en un anexo `UPONE-XXXX-senales-de-sondas.md`.
- **Recomendada: B.** Mantiene el detalle legible para Jira y deja la evidencia completa disponible.

**Ya resueltas** (no se reabren): A y C, descartar E, B para después de medir, activación gradual, código en `kanai-app` y datos de up1 en el `probes.yaml`.

## Riesgos y mitigaciones

| Riesgo | Qué puede fallar y dónde | Mitigación |
|---|---|---|
| Ruido en el intake | Los tipos nuevos suman tarjetas que frenan `plan_ticket` (`needs_probe_decisions`); hoy el 50% de las tarjetas es ruido | `trigger` por vocabulario, activación gradual, umbral de D2 y reuso de decisiones |
| Alcance del intake | Solo llega a tickets con ticket de Kanai; el trabajo que entra por Jira sin ticket no pasa | Skill de barrido (F6), detective mode (F3) y el backtest de kn-dredd sobre PRs sin ticket |
| Cambio de contrato de `run_probes` | `kn-probes` y detective mode lo usan; un cambio mal hecho rompe ambos | Parámetros opcionales, compatibilidad hacia atrás y pruebas de ambos caminos (F2) |
| Extracción de objetos errónea | El extractor puede tomar un objeto equivocado o no encontrar el correcto | La respuesta lista objetos detectados y desconocidos; el agente corrige; en detective mode se registran en el detalle |
| Señales desactualizadas | Las sondas leen una revisión del repositorio, no el trabajo local | Registrar la revisión leída y clasificar la frescura en la fase 3 de detective mode |
| Catálogo sin core | `org-scope` no puede recorrer FK a objetos del core | Spike en F0; D4 recomienda leer el core dentro del tipo; `org-scope` va al final |
| Falsos positivos al calibrar | Convenciones de cada mod (vocabulario de guardas, relaciones por campo, campos de sistema) | Parámetros en el `probes.yaml`, fixtures con los casos que ya fallaron y backtest antes de activar |
| Guardas por archivo | Un archivo con una consulta guardada y otra sin guardar aparece como guardado | Limitación visible en la tarjeta; D5 prevé el análisis por función como mejora |
| Regresión en tipos existentes | Cambiar engine o catálogo altera las 9 sondas actuales | Pruebas existentes verdes en cada fase y prueba de regresión de `reference-coherence` |
| Sondas ciegas | Cambia una convención y la sonda levanta cero señales sin avisar | `VALIDATED_GLOB_PARAMS` y `probe_health` para cada glob nuevo |
| Muestra chica | Con 1 ticket medido no se puede concluir sobre ruido ni ahorro | No prometer ahorro; medir con el conjunto de referencia y esperar más tickets |
| Doble implementación | La sonda de prueba está en Python y el atlas del MCP es JavaScript | Una sola implementación del flujo de Kanai en TypeScript; la sonda de prueba es referencia, no producto |

## Medición del éxito

- Tarjetas nuevas por ticket, por tipo y en total, contra D2.
- Parte útil contra ruido (`probe_metrics`), contra la base de 50%.
- Recall de las comprobaciones en el backtest de kn-tassadar sobre el conjunto de referencia.
- Hallazgos que el barrido y detective mode detectan y que no tenían ticket.
- Tiempo de la corrida de sondas (hoy unos 9 segundos con 0 tokens) y costo de detective mode con y sin el paso.

El ahorro de tokens no se estima: el propio `probe_metrics` lo descarta con muestra menor a 5 tickets por lado.

## Reglas de ejecución

- Una fase a la vez, validada antes de seguir. Commit por fase, mostrando repo, mensaje y archivos antes de commitear; sin push sin pedido explícito.
- Los cambios en `sondas/probes.yaml` se hacen con `kn-probes` y OK del dev, con las tools del KB, nunca editando el store a mano.
- Después de cambiar tipos de sonda, tools o skills hay que reiniciar el MCP de Kanai para que tome el cambio.
- Si aparece un hallazgo que no estaba previsto, se informa antes de abordarlo.

## Checklist maestro

- [ ] F0 Spike del catálogo con el core, conjunto de referencia y umbrales
- [ ] F1 `trigger` genérico en tipos por objeto
- [ ] F2 `run_probes` extendido (extracción y barrido)
- [ ] F3 Detective mode con la sección de señales
- [ ] F4 `query-guards` con backtest
- [ ] F5 `column-keys` y `list-relations` con backtest
- [ ] F6 Skill `kn-scout` de barrido
- [ ] F7 `org-scope`
- [ ] F8 Activación gradual, backtest y medición a dos semanas

## Archivos que se tocarían

En `kanai-app`: `server/probes/engine.ts`, `server/probes/spec.ts`, `server/probes/labels.ts`, `server/probes/kinds/` (cuatro archivos nuevos y posiblemente uno de parámetros), `server/mcp/probesTools.ts` (extensión de `run_probes`), `server/skills/registry.ts`, `server/llm/guide.ts`, `skills/claude/kn-detective-mode/` (`SKILL.md` y cuatro referencias), `skills/claude/kn-scout/SKILL.md` (nuevo), `skills/claude/kn-probes/SKILL.md` y `skills/claude/kn-tassadar/SKILL.md` (tablas), `docs/sondas-intake.md`, `docs/skills.md`, y pruebas en `tests/unit/` (`probes-*.test.ts`, `guide-skills.test.ts`, `skills.test.ts`).
En el KB de up1: `sondas/probes.yaml` (parámetros y activación) y el informe de cierre de F8.

## Documentos relacionados

"Verificador de consistencia entre capas: detalle, contexto, método y ventajas", "Verificador de consistencia: integración con Kanai (detective mode, intake y sondas)", la muestra HTML y el script de la sonda de prueba, todos en esta carpeta.
