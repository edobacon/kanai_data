---
id: DOC-kb-sp11-deuda-evaluationcomponent-decimales-pr65
project: up1
type: doc
module: curriculum-design
tags:
  - deuda-tecnica
  - follow-up
  - evaluation-component
  - pesos-decimales
  - curriculum-design
  - pr-65
---

# Deuda técnica: componentes de evaluación con pesos decimales

> Follow-up del PR [curriculum-design #65](https://bitbucket.org/uplanner/curriculum-design/pull-requests/65) ("changes for uretention grades").
> Revisado el 2026-09-23 contra `origin/develop` de curriculum-design (`2ba9fe4`), object-manager, layout, uengagement-up1 y mcp.

## En una frase

El PR cambia el tipo de `weight` para admitir decimales y agrega campos de escala de puntaje. No rompe nada de lo que existe hoy. Pero el formulario, los validadores y parte de la plataforma se escribieron asumiendo pesos **enteros**, así que los decimales todavía no funcionan de punta a punta. Este documento parte de lo que propone el PR (el tipo `"float"`), lista la deuda por capa y propone una **solución que se resuelve completa dentro de curriculum-design**, dejando los cambios de core como mejora opcional.

> **Fuera de alcance:** el mismo PR retira `ProgramEnrollment.status`. Ese punto se trata aparte, como un cambio coordinado con uengagement (copia de datos, migración de consumidores y borrado de la columna). No es deuda de componentes de evaluación.

## Qué cambia el PR en `EvaluationComponent`

Archivo: `objects/RecordTypes/rt__EvaluationComponent__curricularsection.json`

| Cambio | Antes | Después |
|---|---|---|
| Tipo de `weight` | `"number"` (columna `Int`: no acepta decimales) | `"float"` (columna `Float`) |
| Campos nuevos | (no existían) | `maxScore` (float, obligatorio, default 100), `minScore` (float), `scaleType` (enum `Percentage` / `RubricPoints` / `Grade`, obligatorio, default `Percentage`), `passingThreshold` (float) |
| `required[]` | (no existía) | `["maxScore", "scaleType"]` |
| Descripciones | | Nuevas en la metadata, en `weight` y en `isDirectEvidence` |

## Conceptos para leer este documento

- **RT (RecordType):** subtipo de `CurricularSection` con su propia tabla 1:1. `EvaluationComponent` es uno de ellos. Sus campos viven solo en esa tabla y no afectan a los otros RT.
- **Registry (`core_FieldDefinition`):** la ficha de cada campo que core guarda en la base, con su tipo "semántico". No es el dato: es la descripción del campo. La leen el import CSV, los filtros, la UI genérica y el MCP para saber cómo tratar el valor.
- **Codegen:** paso de core (object-manager) que, a partir de los JSON de los mods, genera el schema de la base y escribe el registry. Lo dispara el sync en cada build.
- **Tolerancia (epsilon):** margen mínimo al comparar decimales. En JavaScript, `10.1 + 64.1 + 25.8` da `99.99999999999999`, no `100`. Comparar "exacto" rechaza sumas que para una persona son correctas.
- **`step` de un input numérico:** atributo HTML que define qué incrementos acepta el campo. Si no se declara, el navegador asume `1` y marca como inválido cualquier decimal.

## Qué ya está bien (no es deuda)

- **Datos existentes:** pasar la columna de entero a decimal preserva los valores. Nada se convierte a texto.
- **Campos nuevos:** tienen default, así que no rompen filas existentes. Ningún código los consume todavía. Los creates actuales del frontend, del seed y de los tests siguen funcionando sin mandarlos.
- **Tabla propia:** el cambio no afecta a los otros RT de `CurricularSection`.
- **Tests:** la suite de curriculum-design da el mismo resultado en el PR que en la base (2045 de 2050 pasan; la única falla es un artefacto del entorno aislado donde se corrió).
- **Update del árbol en CD:** `polymorphicUpdate.resolver.js:304-307` solo convierte tipos cuando el registry dice `Int`, y el frontend ya manda `Number`. El cambio de tipo no lo afecta.

## Por qué `float` y no `string`

Una duda razonable es si un número decimal "corta" los decimales y si convendría guardarlos como texto, como hace curriculum-mapping. Se probó con node:

| Valor escrito | Cómo se guarda internamente | Cómo se lee de vuelta |
|---|---|---|
| `10.1` | `10.099999999999999645` | `10.1` |
| `33.34` | `33.340000000000003411` | `33.34` |
| `99.99` | `99.989999999999994884` | `99.99` |

- **Guardar y leer no pierde nada.** El valor interno es la aproximación binaria más cercana, pero JavaScript y Postgres (`double precision`) lo devuelven exactamente como se escribió, hasta unos 15 dígitos significativos. Para pesos de 0 a 100 con 2 decimales hay margen de sobra.
- **El error está en la suma, no en el guardado.** `10.1 + 64.1 + 25.8` da `99.99999999999999`, y da lo mismo si los valores vienen de strings, porque para sumar hay que convertirlos a número (`Number("10.1") + ...` da el mismo resultado). Por eso curriculum-mapping, que guarda como `"string"`, igual usa tolerancia (`WEIGHT_EPS = 1e-6` en `validateCompetencyTree.js:111`).
- **El string agrega costos:** la base acepta cualquier texto (`"abc"`), ordena como texto (`"100"` queda antes que `"20"`), los reportes no pueden sumar ni promediar, y cada consumidor tiene que parsear.
- **Dónde sí se pierden decimales:** en una columna `Int` (el `"number"` anterior), con `parseInt`, o más allá de unos 15 dígitos significativos.

| Alternativa | Exactitud | Costo |
|---|---|---|
| **Número decimal + tolerancia + límite de 2 decimales** (recomendada) | Suficiente para pesos de 2 decimales hasta 100 | Bajo. Es lo que hace curriculum-mapping. |
| Centésimas como entero (`3334` para 33.34) | Exacta, sin tolerancia | Cambia el significado del campo: multiplicar y dividir por 100 en UI, MCP y reportes, más migración de datos |
| Tipo `Decimal` de Postgres (`numeric`) | Exacta | Core no lo soporta hoy (`fieldTypeToPrisma` no tiene `case 'decimal'`). Requiere trabajo en core |
| `string` | Igual que la recomendada: también necesita tolerancia al sumar | Suma los costos descriptos arriba |

## Solución mod only (recomendada)

Parte de lo que propone el PR: `weight`, `maxScore`, `minScore` y `passingThreshold` quedan como `"type": "float"`. Todo lo necesario para que los decimales funcionen se resuelve dentro de curriculum-design, sin cambios en object-manager, layout ni mcp.

### Paso 1: el tipo `float` y su limitación conocida

**El tipo que propone el PR es correcto.** La columna queda `Float` (`object-manager/src/services/typeMappers.js:338`), GraphQL la expone como `Float`, y el formulario del árbol y el update de CD funcionan: el frontend manda `Number` (`CompositeSectionForm.ts:116-117`) y `polymorphicUpdate.resolver.js:304-307` solo convierte cuando el registry dice `Int`.

**Limitación conocida (de core, no del PR):** core no reconoce `"float"` en dos traductores del registry (ver "Opcional: mejoras en core"). La columna es numérica, pero el registry describe el campo como texto. Qué capas lo leen y si CD las usa hoy:

| Capa que lee el registry | Efecto con `"float"` | ¿CD la usa hoy sobre estos campos? |
|---|---|---|
| Import CSV (`object-manager/src/services/fileParsing.js:387-418`) | Deja el valor como texto y la base lo rechaza | No: CD no tiene flujo de import configurado |
| Filtros (`instance.resolver.js:884-904`) | Convierte a texto y falla | No: ningún filtro usa `weight` |
| UI genérica (`getObjectFields`, `objectDefinition.resolver.js:550`) | Ve el campo como `text` | No: los layouts del árbol declaran `kind: number` y el view del RT ya mostraba `weight` como `text` |
| Guía de creación del MCP (`mcp/src/tools/create-guide.js:22-24`) | Describe el campo como `type: text` | Sí, si un agente crea componentes por la vía genérica (ver M1 y M2) |

**Conclusión:** la limitación no rompe nada que CD use hoy, salvo el riesgo acotado del MCP. Queda documentada hasta que core la corrija (C1 y C2, opcionales).

**Mitigación opcional en el mod, sin cambiar el tipo:** core respeta un `fieldType` declarado junto al `type` (`typeMappers.js:202-208`, `resolveDeclaredFieldType`, usado al escribir el registry en `generatePrismaSchema.js:3748` y en `getObjectFields`). Agregar `"fieldType": "percent"` a los campos `"float"` hace que todas las capas los traten como número, y la columna sigue siendo la misma:

| Capa | `"type": "float"` (PR) | `"type": "float"` + `"fieldType": "percent"` |
|---|---|---|
| Columna en la base | `Float` | `Float` (el `fieldType` no cambia la columna) |
| Registry | `String` | `percent` |
| Import CSV | Falla | `parseFloat` |
| Filtros | Fallan | Familia numérica (`typeMappers.js:554`) |
| UI genérica y ficha (RecordDetail) | Texto | Input numérico, envía número (`layout/src/layouts/RecordDetail/RecordDetail.vue:2772-2774`, `:4594-4598`) |
| Guía del MCP | `type: text` | `type: percent` |

- **Pro:** elimina la limitación sin tocar core ni cambiar lo que propone el PR.
- **Contra:** el tipo semántico dice "porcentaje". Es correcto para `weight`, pero no para `maxScore`, `minScore` y `passingThreshold`, que según `scaleType` pueden ser puntos. Solo afecta la etiqueta del vocabulario de tipos, no el valor.
- **Formato en listas:** layout solo formatea como porcentaje cuando una columna declara `format: 'percent'` (`layout/src/layouts/RecordList/RecordList.vue:6729-6740`, `layout/src/shared/columnFormatters.ts:147-160`). El `fieldType` por sí solo no escala ni agrega el símbolo.
- **Descartado:** `"fieldType": "number"`. El import lo traduce a `Int` y hace `parseInt`, que trunca en silencio (`7.5` pasa a `7`).

### Paso 2: soporte de decimales en la UI

| # | Deuda | Dónde | Efecto | Prioridad | Arreglo | Esfuerzo aprox. |
|---|---|---|---|---|---|---|
| U1 | El input de peso no declara `step` | `modsComponents/CompositeSectionTree/CompositeSectionForm.ts:111-122` (render del `Input`) y `:201` (`<form>` nativo sin `novalidate`) | El navegador asume `step=1` y **bloquea el guardado** de cualquier decimal (por ejemplo 30.5). Desde la pantalla no se pueden cargar decimales. | Alta | Pasar `step: "0.01"` al `Input` cuando el campo es numérico. Verificar que el atom `Input` de layout propague el atributo; si no lo hace, usar un input propio del mod, como `CompetencyTreeEditorElement.vue:264-265` en curriculum-mapping. | 0.5 día |
| U2 | Los pesos se muestran sin redondear | `CompositeSectionNode.ts:151-152`, `CompositeSectionView.ts:112-113` | Se pueden ver valores como `30.299999999999997%`, también en el tooltip de "suma inválida". | Baja | Formatear a 2 decimales al mostrar. | 0.25 día |
| U3 | Tolerancia del frontend distinta a la del backend | `validateWeightedSum.ts:43-55` (epsilon 1e-6 por defecto) y `CompositeSectionTreeElement.vue:315` (0.01) | La pantalla muestra "válido" donde el backend rechaza (ver S1). El usuario no entiende por qué falla la publicación. | Alta (va con S1) | Misma tolerancia y precisión que el backend, definidas en un solo lugar. El helper `weightedSum.js` ya es compartido (ESM puro), así que puede exportar las constantes. | Incluido en S1 |
| U4 | Campos nuevos sin i18n ni layout | `lang/es/rt__EvaluationComponent__curricularsection.i18n.json` (faltan `column.maxScore`, `minScore`, `scaleType`, `passingThreshold` y `enums.scaleType`); no existe en `en`/`pt` | Donde aparezcan, se verán con el title en inglés o con la clave cruda. Hoy no se muestran en ningún layout. | Baja (sube a Media cuando se agreguen a un layout) | Agregar las claves en `es`, `en` y `pt`. Decidir en qué layouts se editan. | 0.25 día |

### Paso 3: soporte de decimales en el backend del mod

| # | Deuda | Dónde | Efecto | Prioridad | Arreglo | Esfuerzo aprox. |
|---|---|---|---|---|---|---|
| S1 | Validación de suma de pesos exacta, sin tolerancia | `logic/helpers/weightedSum.js:61` (`expected !== actual`, al publicar) y `:85` (`sum > parent`, al editar). El comentario de `:14-16` declara la decisión "comparación entera exacta" porque `weight` era `Int`. | Con decimales aparecen rechazos falsos: `10.1 + 64.1 + 25.8` da `EVALUATION_WEIGHT_MISMATCH` al publicar, y `10.2 + 73.9 + 15.9` da `EVALUATION_WEIGHT_EXCEEDS_PARENT` al editar. Falla cerca del 8% de los repartos de tres pesos con un decimal. | Alta | Comparar con tolerancia y limitar a 2 decimales (ver "Patrón de referencia"). Actualizar el comentario de cabecera. | 1 día con tests |
| S2 | Consumidores del validador heredan el problema | `logic/helpers/evaluationWeight.js:89` (create/update, desde `sectionValidation.resolver.js:155-165` y `polymorphicUpdate.resolver.js:374-395`); `logic/polymorphicUpdate.resolver.js:439-455` (`assertActivityEvaluationsOnPublish`); query `validateActivityEvaluations` | Mismos rechazos falsos en edición, publicación y en la validación bajo demanda. | Alta (se resuelve con S1) | Ninguno extra si S1 corrige el helper compartido. Verificar que todos usen el helper. | Incluido en S1 |
| S3 | Sin tests con decimales | `tests/unit/weightedSum.test.js`, `evaluationWeight.test.js`, `activityEvaluations.test.js` (solo enteros); `tests/unit/weightedSum.parity.test.ts` declara que solo cubre enteros | Una regresión en el manejo de decimales pasaría sin que nadie lo note. | Alta (va con S1) | Casos con decimales, con sumas que dan `99.99999999999999` y `100.00000000000001`, y test de paridad frontend-backend con decimales. | Incluido en S1 |
| S4 | Documentación desactualizada | `docs/patterns/weighted-sum.md:29` ("NO usar tolerancia decimal: los pesos son ENTEROS"); cabecera de `weightedSum.js` | La doc indica lo contrario de lo que el sistema necesita ahora. | Media | Actualizar el patrón, documentar el tipo elegido en el paso 1 y los campos nuevos en `docs/reference/`. | 0.25 día |
| S5 | Invariantes nuevas descriptas pero no aplicadas | Descripción de `isDirectEvidence` ("debe ser hoja del árbol"); relación entre `minScore`, `passingThreshold` y `maxScore` | Las descripciones prometen reglas que ningún código hace cumplir. | Media | Decidir si se validan (por ejemplo `minScore ≤ passingThreshold ≤ maxScore`) o si quedan como convención, y dejarlo explícito. | 0.5 a 1 día si se validan |
| S6 | Semántica de los defaults en filas existentes | Filas actuales quedan con `maxScore = 100` y `scaleType = Percentage` | Puede no ser correcto para componentes ya cargados que usen otra escala. | Baja | Confirmar con negocio. Si no aplica, script de ajuste de datos. | A definir |

### Paso 4: MCP y tools de IA del mod

| # | Deuda | Dónde | Efecto | Prioridad | Arreglo mod only | Esfuerzo aprox. |
|---|---|---|---|---|---|---|
| M1 | La guía de creación del MCP describe los campos decimales como texto | `mcp/src/tools/create-guide.js:22-24` arma la guía con el `fieldType` de `getObjectFields` | Un agente que siga la guía puede mandar `"30"` como string. El create y el update de RT en core solo convierten cuando el tipo es `Int` (`object-manager/src/graphql/resolvers/instance.resolver.js:147-157`), así que la base rechaza el valor. | Media | Limitación del paso 1: se resuelve con la mitigación opcional (`fieldType: percent`) o con C2 en core. | Incluido en el paso 1 |
| M2 | Escritura genérica de componentes sin contrato | curriculum-design no declara `blockGenericMutation` para `CurricularSection`, así que los agentes pueden crear o editar componentes con `up1_create_object` / `up1_update_object` genéricos | Esas escrituras pasan por la misma validación de pesos que la UI (S1) y dependen de que el agente mande números. | Media | Decidir si los componentes de evaluación se escriben solo por tools del mod (contrato o bloqueo de escritura genérica) o por la vía genérica. | A definir |
| M3 | La tool de validación hereda el validador exacto | `ai/tools.js:17-29` (`cd_validate_activity_evaluations`, que llama a `validateActivityEvaluations`) | Con decimales, la tool informa sumas inválidas que no lo son. | Alta (se resuelve con S1) | Ninguno extra si S1 corrige el helper. | Incluido en S1 |
| M4 | Heurística de campos de texto del MCP | `mcp/src/tools/field-options.js:33-43` (`isTextField`) trata como texto todo lo que `getObjectFields` devuelve como `text` | Si un campo decimal se usara como etiqueta o filtro en `get_field_options`, el MCP intentaría un filtro de texto y core lo rechazaría. | Baja | Limitación del paso 1: se resuelve con la mitigación opcional o con C2. | Incluido en el paso 1 |

## Patrón de referencia: curriculum-mapping

curriculum-mapping ya resolvió el mismo problema (un árbol de pesos que suma 100 con decimales). Conviene copiar el criterio para que ambos mods se comporten igual:

| Pieza | curriculum-mapping | Dónde |
|---|---|---|
| Suma con tolerancia | `WEIGHT_EPS = 1e-6`; `Math.abs(sum - 100) < WEIGHT_EPS` | `logic/helpers/validateCompetencyTree.js:111`, `:241-243` |
| Precisión máxima | `WEIGHT_DECIMALS = 2`, comprobado escalado y con tolerancia (un `33.34` puede llegar como `33.340000000000003`) | `validateCompetencyTree.js:114`, `:127-131` |
| Mensajes | Redondeo a 2 decimales para no mostrar "suman 79.99999%" | `logic/helpers/assertPublishable.js:60` |
| Input | `<input type="number" step="0.01">` con sufijo % | `modsComponents/CompetencyTreeEditor/CompetencyTreeEditorElement.vue:264-265` |
| Reparto automático | El último peso absorbe el resto para cerrar exacto en 100 | `modsComponents/CompetencyRubricEditor/rubric.ts:183` |

Diferencia: mapping guarda sus pesos como `"type": "string"`. Para curriculum-design no se recomienda (ver "Por qué `float` y no `string`").

## Opcional: mejoras en core (object-manager)

No son necesarias para la solución mod only. Conviene proponerlas al equipo de core porque el mismo defecto afecta a otros mods (`EvaluationItem`, `StudentGrade` y `OfferingResult` de uengagement ya usan `"float"`), y porque eliminan la limitación del paso 1 sin necesidad de mitigación en el mod.

| # | Mejora | Dónde | Qué resuelve |
|---|---|---|---|
| C1 | Reconocer `"float"` en el mapper del registry | `src/services/typeMappers.js:239-260` (`mapJsonSchemaTypeToFieldType`): conoce `"number"` y `"Float"`, pero `"float"` cae en `"String"` | Import CSV y filtros sobre campos `"float"` |
| C2 | Reconocer `"float"` en el mapper de la UI genérica | `src/services/typeMappers.js:264-296` (`mapJsonSchemaToStandardFieldType`): el `switch` no tiene `case 'float'` y cae en `'text'` | UI genérica y guía del MCP |
| C3 | Soporte de tipo `Decimal` exacto | `fieldTypeToPrisma` no tiene `case 'decimal'` | Solo si en el futuro se necesita exactitud total, sin tolerancia |

**Origen de C1 y C2:** `'float'` se agregó en septiembre de 2025 al mapper de columnas (`fieldTypeToPrisma`, commit `5d50eb46`), pero nunca a estos dos. Antes del PR #110 de uengagement ningún objeto productivo usaba `"float"`, por eso no se había visto. Es un bug de código de core, no del sync: el sync solo copia los JSON, y la traducción de tipos la hace el codegen.

Si C1 y C2 se aplican y se usó la mitigación del paso 1, el `"fieldType": "percent"` se puede quitar sin efectos en los datos (la columna es `Float` en ambos casos).

## Orden sugerido

1. **Con el PR #65 (o inmediatamente después), todo en curriculum-design:** U1, S1, S2, S3 y U3. Con esto los decimales funcionan de punta a punta desde la pantalla. Opcional: la mitigación del paso 1 para el MCP.
2. **Siguiente iteración:** S4, U2, U4, S5 y M2.
3. **Con negocio:** S6.
4. **Opcional, al equipo de core:** C1 y C2.

## Checklist

- [ ] Paso 1 (opcional): decidir si se agrega `"fieldType": "percent"` a los campos `"float"`
- [ ] U1 `step` en el input de peso
- [ ] S1 tolerancia y precisión en `weightedSum.js`
- [ ] S2 verificar que create, update, publicación y query usan el helper corregido
- [ ] S3 tests con decimales y paridad frontend-backend
- [ ] U3 tolerancia única entre frontend y backend
- [ ] S4 documentación del patrón, del tipo elegido y de los campos nuevos
- [ ] U2 redondeo al mostrar
- [ ] U4 i18n de los campos nuevos (es, en, pt)
- [ ] S5 decidir si se validan las invariantes nuevas
- [ ] M2 decidir la vía de escritura de componentes desde agentes
- [ ] S6 confirmar la semántica de los defaults en filas existentes
- [ ] (Opcional) C1 y C2 propuestos al equipo de core

## Límites de este análisis

- No se probó en un navegador que el input sin `step` bloquee el guardado; es el comportamiento estándar de HTML y el formulario no desactiva la validación nativa.
- No se verificó si el atom `Input` de layout propaga el atributo `step` (relevante para U1).
- No se verificó si report-builder usa el tipo del registry para agregar valores (sumas, promedios); sería otro consumidor afectado por la limitación del paso 1.
- El efecto de `"fieldType": "percent"` en cada capa se verificó leyendo el código, no ejecutando un sync real.
