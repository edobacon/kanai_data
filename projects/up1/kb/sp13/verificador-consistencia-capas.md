---
id: DOC-kb-sp13-verificador-consistencia-capas
project: up1
type: doc
module: mcp
tags:
  - sp13
  - verificador
  - consistencia
  - herramienta-dev
  - bayley
  - i18n
  - capabilities
  - layouts
  - rbac
  - core-extension
  - idea
---

# Verificador de consistencia entre capas: detalle, contexto, método y ventajas

Herramienta de desarrollo que lee el código de up1 sin ejecutarlo y sin LLM, y detecta inconsistencias entre capas (resolvers, objetos, layouts, idiomas, alcance de datos) antes de que lleguen a QA o a una demo. Este documento guarda el contexto, el método de cada comprobación, los resultados de la corrida de prueba con datos reales, las limitaciones y las ventajas.

**Estado: idea con muestra y sondas de prueba. No hay herramienta entregada ni plan aprobado.** Hermano de "Atlas de reglas del MCP" (misma carpeta): el atlas compara la plataforma contra el MCP; este verificador compara las capas de la plataforma entre sí.

## Origen

Se pidió explorar apps de ayuda para el dev de up1, parecidas a Bayley, que muestren lo difícil de ver a ojo. Bayley (herramienta web local) cubre 6 vistas: modelo de datos, navegación de apps, capabilities declaradas contra usadas, i18n, flows y sandbox. Una búsqueda en su `src` y `docs` da 0 archivos para `profiles`, `transitions`, `hooks` y `migration`: muestra estructura, no reglas ni comportamiento.

Se revisaron los tickets de UPONE de las últimas 4 semanas (los 100 más recientes por actualización, no el sprint exacto), se leyeron las descripciones de 23 y se compararon con el código. De los 21 tickets con etiqueta `core-extension` vistos, unos 7 nacieron de encontrar algo tarde por falta de visibilidad. Los patrones repetidos son mecánicos y se pueden comprobar leyendo archivos.

## Las cuatro comprobaciones

### 1. Guardas de permiso en consultas custom

- **Pregunta:** ¿cada `Query` custom de un mod valida una capability, o solo exige sesión?
- **Por qué importa:** el core no envuelve las consultas custom con permisos. Sin una llamada explícita, cualquier sesión autenticada lee el dato por red aunque la UI oculte la pestaña.
- **Método:** leer `logic/*.graphql` (bloques `type Query` y `type Mutation`), asociar cada operación al archivo `*.resolver.js` donde se define (la clave aparece al inicio de línea) y buscar en ese archivo una llamada a una guarda. Una guarda se reconoce directa (`checkCapability`, `_checkCapability`, `hasCapability`, `checkObjectPermissions`, `checkPermission`, `withObjectAuth`) o por un helper exportado que la llama (por ejemplo `requireScenarioView`). Si no hay guarda pero el archivo declara en un comentario "sin capability custom", "sin RBAC propio" o "lectura autenticada", se clasifica como abierta declarada. Si no hay ninguna, sin guarda.
- **Vocabulario:** cada mod nombra su guarda distinto. Debe mantenerse como configuración.
- **Resultado (academic-scheduling):** 30 consultas, 12 guardadas, 16 abiertas declaradas, 2 sin guarda ni declaración (`scenarioCreatedBy`, `scenarioSectionIdsByAssignment`). **curriculum-design:** 3 consultas, 2 guardadas, 1 sin guarda (`validateActivityEvaluations`). **curriculum-mapping:** 9 de 9 guardadas.
- **Ticket que reproduce:** UPONE-2036 (consultas de lectura sin validación de permisos). Hoy ya hay 12 guardadas por el arreglo de UPONE-1611 (PR 171), aunque el ticket sigue en Backlog.
- **Relacionado:** UPONE-2034 (`hasCapability` registra cada "no" como intento no autorizado) se puede detectar con una regla de uso de `hasCapability` donde corresponde `checkCapability`.

### 2. Claves de traducción de columnas frente a campos del objeto

- **Pregunta:** ¿cada campo que el selector "Personalizar columnas" ofrece tiene su clave `column.<campo>` en los idiomas?
- **Por qué importa:** el selector busca esa clave en el archivo de idioma del objeto. Si no existe, muestra el `title` del JSON, que está en inglés.
- **Método:** para cada layout `RecordList` con objeto propio, tomar las propiedades del objeto (core más mod, más `common.json`), excluir `id`, tipos objeto o arreglo y los campos de sistema (`createdAt`, `updatedAt`, `updatedById`, `internalId`), y buscar `column.<campo>` en `lang/es`, `lang/en` y `lang/pt` del mod (archivo del objeto más `common`). La lista de campos del selector se confirmó en `layout/src/composables/useColumnConfiguration.ts` (`availableFieldsForSelector`).
- **Resultado:** 50 de 135 campos de negocio sin clave en español, en 18 objetos. En Sección faltan 8: `accessibilityRequired`, `activityId`, `modalityId`, `orgUnitId`, `requiredInstructors`, `sectionClusterId`, `shiftId`, `termId`. En Docentes faltan `gender`, `instructorType`, `preferredName`, `userId`. 7 objetos de academic-scheduling con lista no tienen archivo de idioma. `bibliographyreference` tiene español pero no inglés ni portugués.
- **Tickets que reproduce:** UPONE-2038 (los 8 campos de Sección coinciden exactamente con los del ticket), UPONE-2041 y UPONE-2043 (campos de Docentes), y relacionado UPONE-2007.

### 3. Relaciones FK sin declarar en las listas

- **Pregunta:** ¿cada clave foránea que el usuario puede agregar como columna tiene su relación declarada en el layout?
- **Por qué importa:** una lista resuelve el nombre de un registro relacionado solo si el layout declara la relación en `relations` y su campo de nombre en `relationDisplayFields`. Si no, la celda muestra el identificador interno.
- **Método:** para cada layout de lista, tomar las propiedades con `isForeignKey` y `references` del objeto, y comprobar que el nombre del campo sin el sufijo `Id`, en minúsculas, esté en `layoutConfig.relations` o en las claves de `relationDisplayFields`. Marcar aparte las que ya son columnas visibles. Convención descubierta al calibrar: la relación se nombra por el campo (`sourceScenarioId` es `sourcescenario`), no por el objeto referenciado.
- **Resultado:** 27 de 43 FK sin relación declarada, en 15 layouts. En `section-list.json` faltan `orgunit`, `shift`, `modality` y `sectioncluster`. Un caso con columna ya visible: `executionUnitId` en `default_Activity_list.json` (por verificar en pantalla, porque el layout trae `relationDisplayFields` para OrgUnit y puede resolverse por otro camino).
- **Ticket que reproduce:** UPONE-2039 (las 4 relaciones coinciden con las del ticket).

### 4. Alcance organizacional de cada objeto

- **Pregunta:** ¿qué objetos tienen camino de claves foráneas hasta la organización, que es lo que el core usa para filtrar filas de usuarios con rol acotado?
- **Por qué importa:** `getBusinessContextFilter` busca un camino con `findPathToAnchor` (búsqueda en anchura sobre FK directas e inversas hasta `organization`). Si no hay camino, devuelve un filtro vacío y el usuario acotado no ve filas, sin aviso. Las relaciones polimórficas (`ownerType` y `ownerId`) no son FK.
- **Método:** cargar todos los objetos (core y mods), armar el grafo no dirigido de FK por `references`, y recorrerlo desde cada objeto hasta `organization`. Registrar profundidad y si el primer salto es una FK propia (directa) o una referencia desde otro objeto (inversa). Marcar los objetos con `ownerType`, `targetType`, `entityType` o `refType`. Respetar la lista de objetos exentos del core.
- **Resultado:** de 54 objetos de los 3 mods, 39 con camino por FK propia, 13 solo por referencias inversas (incluye `curricularsection`, `developmentlevel` y `performancescale`, polimórficos) y 2 sin camino: `requirement` (polimórfico) e `instructionalcomponenttype`.
- **Ticket que reproduce:** UPONE-2061 (`requirement` sin camino). Los polimórficos con camino inverso son coherentes con lo que describe el ticket para las secciones; no se verificó en un tenant.
- **Limitación importante:** el core arma el grafo desde `core_FieldDefinition` en la base de datos y puede usar un camino precalculado. La sonda lo aproxima con los archivos `objects/*.json`.

## Cómo se hace (propuesta)

- **Forma:** comando de línea sin dependencias, de solo lectura, que imprime un resumen, un JSON y un informe HTML. Lee el árbol de up1 por ruta. Se puede ubicar en `mcp/atlas/` junto al atlas (módulos separados) o como paquete propio.
- **Entradas:** `object-manager/objects/business/Base/*.json`, `common.json`, `mods/*/objects/*.json`, `mods/*/config/layouts/*.json`, `mods/*/lang/<idioma>/*.i18n.json`, `mods/*/logic/*.graphql` y `*.resolver.js`.
- **Hallazgos con identificador estable**, por ejemplo `guarda:academic-scheduling:scenarioCreatedBy`, `columna:Section.shiftId:es`, `relacion:section-list.json:shift`, `alcance:requirement`. Eso permite comparar corridas y distinguir hallazgos nuevos de los que ya existían.
- **Excepciones por mod** en un archivo versionado, con motivo y responsable. Una consulta abierta a propósito se declara allí, igual que hoy lo hacen los comentarios.
- **Uso en PR:** fallar solo con hallazgos nuevos, no con la deuda existente. Así se puede adoptar sin corregir todo antes.
- **Configuración:** vocabulario de guardas por mod, campos de sistema excluidos, objetos exentos.
- **Archivos de la corrida de prueba:** el script `consistency-probe.py` (adjunto en esta carpeta como texto) y la muestra HTML.

## Calibración (lo que la primera corrida hizo mal)

- La comprobación 1 marcó sin guarda a `scenario-excel`, `scenario-calendar-pdf` y `scheduling-inputs`, que sí validan: usan el helper `requireScenarioView` y la llamada `_checkCapability` con guion bajo. Curriculum-design y curriculum-mapping salían sin guarda en casi todo porque usan otro vocabulario (`checkObjectPermissions`, `checkPermission`).
- El mapeo operación a archivo por búsqueda amplia asignaba una consulta a varios archivos. Se corrigió exigiendo la clave al inicio de línea.
- La comprobación 3 daba un falso positivo en `sourceScenarioId`: la relación no se nombra por el objeto referenciado.
- Los campos de sistema se separaron del conteo porque no se sabe si se traducen en otro namespace.
- Una primera cifra en la conversación (7 archivos sin guarda, tomada como hallazgo) incluía esos falsos positivos y se corrigió.

## Limitaciones

- La guarda se atribuye por archivo, no por función. Un archivo con una consulta guardada y otra sin guarda aparece como guardado.
- No se evaluaron las mutations. Las que delegan en el CRUD genérico heredan la guarda del core. Quedan 4 con solo sesión y 4 sin guarda visible por revisar a mano.
- Solo se evalúan listas cuyo objeto tiene JSON propio: 14 de 14 en academic-scheduling, 6 de 7 en curriculum-design y 1 de 3 en curriculum-mapping (las otras apuntan a tipos de registro).
- La comprobación 4 es una aproximación del grafo del core, sin base de datos.
- No detecta lógica de negocio (por ejemplo UPONE-2035 y UPONE-2047, doble conteo de secciones en listas cruzadas), ni errores de orden en la sync (UPONE-2030), ni comportamiento de UI (UPONE-2027, 2020).
- Los datos salen de las ramas `develop` locales del 8 de octubre: up1 2c19522, academic-scheduling 3908d9c, curriculum-design 6e2988f, curriculum-mapping a456b14.

## Ventajas

Las ventajas siguientes se apoyan en lo observado. No se midió ahorro de tiempo ni de costo.

1. **Detecta antes.** Cuatro hallazgos que hoy tienen ticket se reprodujeron leyendo archivos: UPONE-2036 apareció en la QA de UPONE-1611 (severidad ALTA); UPONE-2038, 2039 y 2043 salieron de una revisión del entorno demo DEMO03 el 7 de octubre. Con una corrida en el PR del mod, habrían aparecido al escribir el layout o el resolver.
2. **Es exacto donde importa.** En dos comprobaciones el resultado coincide con el ticket campo por campo (8 de 8 campos en UPONE-2038, 4 de 4 relaciones en UPONE-2039). Eso da confianza de que la regla es la misma que usa la UI.
3. **Separa olvido de decisión.** Distingue una consulta abierta con justificación escrita de una sin explicación. De 18 consultas sin chequeo, 16 tienen decisión declarada y 3 no; el revisor mira esas 3.
4. **Encuentra lo que aún no tiene ticket.** La columna `executionUnitId` en Activity, los 7 objetos sin archivo de idioma, `bibliographyreference` sin inglés ni portugués y las 3 consultas sin justificación no estaban en los tickets leídos.
5. **No depende de un LLM.** Es repetible, revisa todo en cada corrida, cada hallazgo apunta a un archivo y puede fallar un PR de forma objetiva, sin consumir tokens.
6. **Cubre lo que Bayley no.** Bayley muestra estructura; este verificador cruza capas y entrega veredictos. Las dos pueden convivir: Bayley para explorar, el verificador para controlar.
7. **Se adopta de a poco.** Con identificadores estables y comparación contra la corrida anterior, se puede bloquear solo lo nuevo sin tener que limpiar la deuda antes.
8. **Reutiliza el esfuerzo del atlas del MCP.** Comparten extractores de objetos, capabilities y esquema; el costo de una segunda herramienta baja si se diseña con módulos comunes.
9. **Apoya el flujo core y mod.** Varios tickets `core-extension` son defectos que el mod pudo ver al desarrollar (columna sin traducir, permiso sin chequear). Detectarlos en el mod evita escalarlos al equipo de core.

## Riesgos y costos

- Mantenimiento de la configuración (vocabulario de guardas por mod, convenciones de layout). Si cambian las convenciones sin avisar, aparecen falsos positivos.
- Una regla mal calibrada, usada como compuerta de PR, bloquea trabajo legítimo. Mitigación: empezar solo informativo.
- Riesgo de que "sin hallazgos" se lea como "sin problemas", cuando solo cubre estas 4 reglas.
- Los pesos y severidades no están definidos con el equipo.

## Decisiones abiertas

1. Dónde vive: junto al atlas en `mcp/atlas/`, paquete propio en el monorepo, o extensión de Bayley con una vista "Consistencia". Un comando en CI llega antes a un PR que una pantalla que alguien debe abrir; Bayley tiene el acceso a archivos y los parsers, pero declara no tocar la base de datos.
2. Revisión manual con el equipo de las 3 consultas sin justificación, antes de automatizar.
3. Qué severidad bloquea un PR y si la primera etapa es solo informativa.
4. Si se amplía a análisis por función (comprobación 1) y a mutations.
5. Si se agregan las ideas pendientes: mapa de reglas de servidor por objeto (hooks y overrides del CRUD genérico), máquinas de estado con capability por transición, matriz rol por capability por objeto, impacto de renombrar o cambiar un campo, deriva entre disco y base de datos, y mapa de dependencias entre mods.

## Archivos relacionados en esta carpeta

- "Atlas de reglas del MCP: idea, plan y decisiones abiertas" y "contexto y datos verificados".
- Muestra navegable del verificador (HTML) y script de la sonda (texto).
- Tickets citados: UPONE-1611, 2007, 2030, 2034, 2035, 2036, 2038, 2039, 2041, 2043, 2047, 2061, 2062.
