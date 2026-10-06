---
id: DOC-kb-sp12-UPONE-1771-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp12
  - curriculum-mapping
  - curriculum-design
  - UPONE-1771
  - pre-intake
  - versionado
  - indicadores
---

# UPONE-1771 · Pre-intake · Indicadores y versionado del plan

> Material que lee el dev antes de abrir el intake. No va a Jira. Contrato en `UPONE-1771-detalle`. Versión 2 (2026-10-06): hipótesis resueltas contra el código y en vivo, y análisis del uso por MCP. Todo contrastado en develop local y `origin/develop`; construir sobre `origin/develop`.

## Veredicto y superficie

Feature con dos piezas de superficie distinta:
- **A · Indicadores:** cm, front más resolver de lectura más ficha MCP. Sin core. Hoy el cálculo vive solo en el cliente y por MCP no existe.
- **B · Versionado:** cd (override de creación y ficha), cm (reglas de tributación) y una decisión de UI sin soporte declarativo hoy. Riesgo alto.

Con el alcance MCP el ticket supera los 10 SP del PO; dividirlo en A y B es la opción natural (D2 del detalle).

## Hipótesis: veredictos

| # | Hipótesis | Veredicto | Evidencia clave |
|---|---|---|---|
| H0 | cd puede leer en servidor el permiso de cm del usuario | **Confirmada** | El contexto trae las capabilities de todos los mods (`object-manager/src/services/auth/modRoleCapabilities.js:58-118`). `evaluateObjectPermission` (`authChecker.js:286`) es pura, no lanza ni audita, y es la que usa cm para escribir (`competencyAlignment-batch.resolver.js:564`). Precedente cd a cm de lectura solo en `origin/develop` (`activityCompetencies.js:123,181-196`, con test). No hay precedente de escritura. Pendiente runtime: mapeo del rol activo a cm; si falta, "sin permiso, se replica" se activaría siempre |
| H1 | El mapa viejo a nuevo incluye todas las entradas y el hook puede usarlo | **Confirmada** | `result.cloneMap` (`instance.resolver.js:5071-5198`) mezcla tipos: filtrar por `planEntry`. El hook de cd hoy no lo usa. No hay vínculo persistido (`sourceEntryId` nulo). En vivo: v2 con 12 de 12 entradas |
| H2 | No hay choques de unicidad al replicar | **Parcial** | Primera réplica no choca; reintento sí (P2002) y hay que hacerla idempotente. `planId` está denormalizado: seteado a mano si se escribe directo. `CompetencyAlignment` no tiene `internalId` |
| H3 | La elección viaja sin llegar a Prisma | **Parcial** | Servidor: el override debe capturarla y borrarla antes de delegar (core deja pasar claves desconocidas a Prisma, que las rechaza). Front: no existe forma declarativa con la acción de crear (`useCreateRowAction.ts:76-85`); sí con acciones de tipo mutation (argumentos literales) |
| H4 | Existe un nivel representativo único | **Refutada** | Nadie escribe `isRepresentative`; sin validación de "exactamente uno"; en el tenant las 36 filas están en nulo. Fallback necesario |
| H5 | El front muestra un informe tras crear | **No** | Solo lee la versión para el aviso (`useCreateRowAction.ts:126-138`) |

## Hallazgos nuevos (no estaban en el contrato del PO)

1. **MatrixAdoption no se copia al versionar** (en vivo: la v2 queda con 0 matrices adoptadas; también la del 30/09). R-1 (`mods/curriculum-mapping/logic/helpers/alignmentRules.js:216-253`) exige adopción vigente: replicar por la vía gobernada fallaría en todas las filas y replicar directo dejaría filas que violan R-1. Es prerrequisito de B.
2. **La escritura de tributaciones por MCP está cerrada** (en vivo: "no está disponible desde aquí todavía"). Replicar al versionar sería la única vía por la que una acción de un agente escribe tributación.
3. **El MCP ya puede versionar** por la creación genérica con el mismo usuario y rol que la pantalla (`mcp/src/auth/sessionTokenAuth.js`), pero sin guía, sin parámetro de elección y sin canal de informe.
4. **El informe no puede viajar con guion bajo**: la capa MCP elimina toda clave que empiece con `_` (`mcp/src/tools/register-declarative-tools.js:27-37`), por eso `_cloneMap` tampoco llega. Hay que usar una clave normal.
5. **La vista de lectura descarta en silencio** las filas con competencia fuera del árbol (`alignmentView.resolver.js:328`): "fuera de diseño" no es visible.
6. **El bloqueo de escritura genérica en el servidor de cm se retiró** (UPONE-1758); hoy solo existe en la puerta MCP. Un acceso directo desde el hook no lo frena nada.
7. **Dependencia de object-manager:** el `develop` local falla al versionar Curriculum por `internalId`; corregido en `origin/develop` (UPONE-2003). En vivo, el backend ya corría con el fix.

## Evidencia en vivo (tenant de desarrollo UPU, usuario Admin vía MCP)

| Prueba | Resultado |
|---|---|
| Permisos del agente | `competencyalignment:*`, `curriculum:version`, `mod/curriculum-mapping:edit`. Admin no permite probar "sin permiso" |
| Crear tributación por MCP | Bloqueada por el MCP |
| Versionar por MCP (creación genérica con origen y bandera de versión) | Funciona. v2 en borrador, 12 entradas copiadas, categoría remapeada, extensión del plan copiada (el hook corrió con el usuario del MCP), `sourceEntryId` nulo, sin adopción, sin informe en la respuesta |
| Vista de contribución de la v2 sin adopción | Se muestra completa y `planEditable: true`; la lectura no exige adopción |
| Plan activo | `planEditable: false` |
| Niveles representativos | 36 de 36 en nulo |

**Datos creados por la prueba** (no se borran; dev tenant): un plan "Plan de Estudios Doctorado en Ciencias 2026" código `SMOKE-2003-CLON`, versión 2, en borrador, hijo del plan de smoke del 30/09, con sus entradas de malla, categorías y secciones. Cero tributaciones. Existe además la v2 del 30/09 del plan original, que sirve de comparación.

**No probado en runtime:** replicación con tributaciones reales (requiere crearlas desde la UI), rol sin permiso de cm, grilla con v2 sin adopción en la UI.

## Separación hechos / propuesta / inferencia

| Estado | Punto |
|---|---|
| Verificado | El hook vive en cd y corre después de crear, fuera de la transacción (`sectionValidation.resolver.js:299,338`) |
| Verificado | MCP y pantalla versionan por la misma mutation, mismo override y mismo usuario |
| Verificado | Core pasa claves desconocidas a Prisma (error `Unknown argument`) |
| Verificado | La adopción de matriz no se copia; cm no reacciona al versionado |
| Verificado | Indicadores solo en cliente; la lectura MCP no trae base de logro ni nivel representativo |
| Propuesta | Remapear con el mapa del resultado de crear, filtrando por tipo de entrada (no poblar `sourceEntryId`) |
| Propuesta | `competencyalignment:create` como permiso de elección |
| Propuesta | Mover el cálculo de indicadores al resolver y exponerlo en una ficha |
| Inferencia sin respaldo | Que replicar deba pasar por el punto de entrada gobernado de cm: depende de D4 |
| Inferencia sin respaldo | Que el rol Admin represente al resto de roles para el permiso de cm (mapeo de rol sin probar) |

## Análisis de enfoques (B · dónde vive la elección en pantalla)

**Opción A · Acciones de tipo mutation sobre una mutation propia de cd (mod-only).** Dos acciones ("replicar" y "empezar limpio") con argumento literal que llaman a una mutation de cd que versiona y decide. El aviso tras la acción es una clave estática: el informe necesita otro canal.
- Pros: sin Core Extension; las dos acciones se pueden gatear por permiso; la misma mutation sirve a pantalla y MCP.
- Contras: reemplaza la acción estándar de versionar solo para Curriculum; duplica el gate de estado y capability que hoy hace core; el informe de filas sin destino queda sin lugar en pantalla.
- Esfuerzo: medio. Reversible: sí.

**Opción B · Extender layout (Core Extension).** La acción de crear admite elección declarativa y un informe devuelto.
- Pros: reutilizable por otros objetos versionables.
- Contras: es el punto donde entran Aduana y `core-extension-writer`; coordinación con core; cambia la capacidad de permiso condicional (hoy estática).
- Esfuerzo: alto. Reversibilidad baja. Dejar rastro por si otros objetos lo piden.

**Opción C · Elegir después de crear.** Versionar como hoy y ofrecer en el componente de tributación de la v2 las acciones "replicar desde la versión anterior" y "limpiar", con el informe ahí.
- Pros: sin cambios en el flujo de versionado; informe y permiso viven en cm; resuelve la idempotencia y el reintento de forma natural (operación aparte); sirve igual por MCP.
- Contras: se aparta de la letra del PO ("al versionar se elige"); requiere su confirmación; la v2 existe un rato sin mapa.
- Esfuerzo: bajo a medio. Reversible: sí.

**Recomendación:** C (o A si el PO exige elegir en el momento de versionar), porque separa "crear la versión" de "replicar el mapa", y esa separación es la que resuelve el reintento, el informe, el default por permiso y la paridad con el MCP. B solo si se decide invertir en capacidad transversal.

## Análisis de enfoques (B · dónde vive la réplica)

- **R1 · En el hook de cd con acceso directo.** Simple, pero se salta R-1 a R-6, el historial de cm y no es atómico. Replica las reglas de cm sin importar su código (como hace hoy cd para lectura): riesgo de divergencia. No recomendada salvo con las reglas replicadas y una operación idempotente.
- **R2 · cd invoca el punto de entrada gobernado de cm** (`upsertCompetencyAlignmentSetEntrypoint`, con permiso permisivo para el default sin permiso). Pantalla y MCP idénticos, historial correcto, tope de 500 filas por guardado. Acopla cd a cm, y exige antes arrastrar la adopción (R-1).
- **R3 · Gancho post-versión en core.** Cada mod reacciona en lo suyo; es Core Extension (hoy solo hay ganchos antes de crear y actualizar, y ningún mod los usa).
- **R4 · Operación propia de cm "replicar desde la versión anterior"** (combinada con la opción C): cm es dueño de la regla, idempotente por la unicidad `(origen, id de origen, competencia)`, auditada, invocable por pantalla y por MCP; cd solo versiona.
- **Recomendación:** R4 si se elige C; R2 si se elige A.

## Análisis de enfoques (B · uso por MCP)

- **Canal de la elección:** (a) clave nueva en los datos de la creación genérica (simple, invisible para el agente sin contrato); (b) ficha dedicada de versionado de planes en cd, con permiso `curriculum:version` y retorno tipado (descubrible; recomendada). Con la opción C no hace falta parámetro: la réplica sería una ficha aparte.
- **Informe:** clave sin guion bajo o retorno tipado de ficha.
- **Default sin permiso:** el servidor lo aplica; una ficha no puede ocultar parámetros por rol.
- **Contratos a tocar:** `mods/curriculum-design/ai/{index,tools,contracts}.js`, `mods/curriculum-mapping/ai/{index,tools}.js`, texto de la guía de `cm_alignment_view` y los tests que lo fijan; correr `npm run sync --workspace=mcp`.

## Hipótesis a validar (ordenadas por riesgo)

**H-R (riesgo, validar primero):** el rol activo de un usuario real (no Admin) tiene en el contexto de cd las capabilities de cm. Si no, "sin permiso se replica" se activa siempre y la elección nunca aparece.
- Validación: smoke con un usuario Diseñador y otro Revisor, con la función de evaluación de permisos desde el override.

**H-A:** replicar por el punto de entrada gobernado de cm funciona en la v2 solo si antes se arrastra la adopción. Validar con un plan versionado y una adopción copiada.
**H-B:** el límite de 500 filas por guardado alcanza para un plan real (12 entradas por competencia y nivel). Validar con el mayor plan del seed.
**H-C:** una operación de réplica es idempotente con la unicidad existente. Validar reintentando sobre la misma v2.
**H-D:** la grilla de la UI muestra la v2 sin adopción (en vivo la lectura MCP sí). Validar en la suite.
**H-E:** elegir el nivel representativo en el indicador: ¿último nivel o marcado? Validar con el PO (D8).

## Consideraciones y gotchas

- Construir sobre `origin/develop` de object-manager, cm y cd; releer `CompetencyAlignment.json`, la lectura y el batch de cm y los helpers nuevos de cd antes de tocar.
- Tests que fijan comportamiento actual: la cuarta tarjeta (`tests/component/competency-alignment-grid.coverage-summary.component.spec.ts:52-61`, `tests/unit/competencyAlignmentGridLang.test.js:256`), el texto de la guía MCP de cm (`tests/unit/aiPack.test.js:1385-1395`), el comentario del bloqueo (`:1363-1377`) y `WITHOUT_WRITE_TOOL` (`:1505`). No aflojar aserciones: cambiarlas solo con aprobación y donde afirman comportamiento viejo.
- Peso en texto decimal: copiar tal cual.
- La lectura de cm descarta filas con competencia fuera del árbol; cambiar eso afecta a quien hoy confía en que no aparecen.
- Citar reglas R-n con su objeto.
- Secuencia sugerida: A (indicadores y ficha de lectura) en paralelo; B después de resolver D1, D3, D4, D5 y D12.

## Decisiones técnicas abiertas (del dev)

- Opción de elección en pantalla (A, B o C) tras la respuesta del PO.
- Opción de réplica (R1 a R4).
- Canal MCP de la elección y del informe.
- Dónde calcular los indicadores: resolver (recomendado, una sola fuente) con el cliente consumiéndolo.
- Si el informe se persiste (auditoría) o solo se devuelve.

## Archivos candidatos (tentativo)

- cm: `modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridCoverageSummary.ts`, `CompetencyAlignmentGridElement.vue`, `CompetencyAlignmentGridTable.ts`, `logic/alignmentView.resolver.js` y su esquema, `logic/competencyAlignment-batch.resolver.js`, `ai/index.js`, `ai/tools.js`, `lang/`, seeds, tests de cobertura y de paridad.
- cd: `logic/sectionValidation.resolver.js`, `logic/helpers/authCheckerLoader.js`, `objects/Curriculum.json` (adopción), `config/layouts/default_Curriculum_list.json`, `ai/{index,tools,contracts}.js`, tests del hook y del override.
- mcp: solo sincronización (`npm run sync --workspace=mcp`), sin cambios propios.
- Solo si opción B de pantalla: `layout/src/composables/useCreateRowAction.ts` y tipos de recordlist.
