---
id: DOC-kb-sp12-UPONE-1771-detalle
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp12
  - curriculum-mapping
  - curriculum-design
  - UPONE-1771
  - UPONE-1452
  - tributacion
  - versionado
  - indicadores
  - R-8
  - R-12
  - detalle
---

# UPONE-1771 · Detalle · Tributación: indicadores y versionado del plan

**Tipo:** Historia · **Prioridad:** Trivial (Jira) · **Épica:** UPONE-1452 Curriculum Mapping · **Asignado:** sin asignar · **Estado Jira:** Backlog · **Esfuerzo (PO):** 10 SP · **Referencia:** UPONE-1771

> Verificado el 2026-10-06 contra el código (develop local y `origin/develop` de cada repo) y en vivo contra el MCP de up1 sobre el tenant de desarrollo. Los `develop` locales están por detrás de `origin/develop` (cm 32 commits, cd 7, object-manager 42, layout 68): el ticket debe construirse sobre `origin/develop`. Versión 2 del documento: incorpora la verificación de hipótesis y el análisis del uso por MCP.

## 1. Fuente canónica (PO)

> Los indicadores del mapa con sus denominadores, y el comportamiento de la tributación cuando se versiona un plan.
>
> **Esfuerzo:** 10 SP · **Sensibilidad:** Media · **Sprint:** follow-up
>
> **Qué entra**
>
> **Indicadores**, con su denominador declarado según la vista:
> * desarrollo tributado, contado **por celda declarada** y no por competencia
> * competencias con evaluador
> * asignaturas sin tributar
> * filas fuera de diseño
>
> Cuando achievementBasis es RepresentativeLevel, el segundo indicador se especializa a **con evaluador en el nivel representativo**: sin quien evalúe ahí, la competencia no produce logro por más que tenga evaluador en los otros tramos.
>
> **Versionado del plan (R-8):**
> * Al versionar se elige entre replicar el mapa o empezar sin tributación.
> * Replicar es **remapear**: el planEntry de origen se resuelve al equivalente de la versión nueva, conservando developmentLevelId, y se reporta cuántas filas quedan sin destino.
> * Engancha en el flujo existente: asNewVersion + sourceId + hook inheritRecordTypeExtensionOnVersion.
> * Las filas fuera de diseño se muestran marcadas y no se borran solas.
>
> **Criterios de aceptación**
> * Los indicadores cuentan por celda declarada y declaran su denominador según la vista.
> * Con achievementBasis = RepresentativeLevel, el indicador de evaluador se especializa.
> * Al versionar, quien tiene permiso de escritura en curriculum-mapping elige replicar o partir limpio. **Sin ese permiso, se replica por defecto.**
>
> **Dependencias:** Requiere UPONE-1770 (pesos) y UPONE-1769 (developmentSchemeId y achievementBasis). Cross-mod: lectura del permiso de curriculum-mapping vía RBAC, sin Core Extension.

Sin comentarios ni adjuntos en Jira. Referencias del PO: maqueta, detalle técnico y plan de partición (artifacts de claude.ai).

## 2. Historia de usuario

Como coordinador curricular, quiero ver cuánto del mapa de tributación está realmente cubierto (con el denominador explícito) y decidir al versionar un plan si el mapa se replica o se parte limpio, para no perder tributaciones por accidente ni arrastrar un mapa que ya no corresponde a la nueva malla. Como persona que opera UP1 por un agente (MCP), quiero poder consultar esos mismos indicadores y versionar con las mismas reglas que en pantalla.

## 3. Objetivo

1. Que los indicadores de cobertura del mapa digan siempre contra qué denominador se calculan, según la vista donde se miran, y que se puedan leer igual por pantalla y por MCP.
2. Que versionar un plan no deje la tributación en un estado ambiguo: la v2 nace con el mapa replicado (remapeado a su malla) o vacío, según una elección explícita de quien tiene permiso, y quien versiona se entera de cuántas filas no tuvieron destino, sea por pantalla o por MCP.

## 4. Contexto (para dimensionar)

- **Linaje.** Cuarto ticket de la partición de la feature de tributación: 1756 (CRUD por competencia), 1769 (cableado del modelo), 1770 (pesos, malla, vía masiva), 1771 (este), 1772 (outcomeAlignment y retiro con aviso), 1773 (migración de niveles). Estados en Jira: 1756, 1769 y 1770 Finalizadas; 1771, 1772 y 1773 en Backlog sin asignar. Los trabajos de cm de 1769 y 1770 están mergeados a `develop`. No existe trabajo previo del 1771 en ninguna rama de ningún repo; solo hay comentarios que lo citan como pendiente.
- **Indicadores: la mitad ya existe.** cm ya muestra tres tarjetas de cobertura calculadas en el cliente: desarrollo tributado (ya cuenta por celda declarada), competencias con evaluador (denominador: todas las competencias de la vista) y asignaturas sin tributar (`mods/curriculum-mapping/modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridCoverageSummary.ts:76`, montado en `CompetencyAlignmentGridElement.vue:237`). La cuarta tarjeta (fuera de diseño) está excluida a propósito y diferida a este ticket (`CoverageSummary.ts:12-14`), y hay tests que hoy la prohíben (`tests/component/competency-alignment-grid.coverage-summary.component.spec.ts:52-61`).
- **Lo que falta de indicadores:** declarar el denominador por vista, la especialización con nivel representativo y la tarjeta de fuera de diseño. El campo `isRepresentative` existe (`mods/curriculum-mapping/objects/CompetencyNodeDevelopmentLevel.json:33`) pero **nadie lo escribe ni lo lee**: ningún resolver, pantalla, seed ni validación lo toca, y en el tenant de desarrollo las 36 filas están sin valor. El aviso actual "Falta evaluador en Master" usa el último nivel del esquema (`CompetencyAlignmentGridTable.ts:510`).
- **Indicadores por MCP: no existen.** La lectura MCP (`cm_alignment_view`, `cm_list_alignments`) devuelve datos crudos, sin indicadores ni denominadores, y no incluye `achievementBasis` ni `isRepresentative`. Además la vista **descarta en silencio** las filas cuya competencia ya no está en el árbol (`mods/curriculum-mapping/logic/alignmentView.resolver.js:328`), por lo que "fuera de diseño" no es visible. El cálculo vive solo en el cliente.
- **Versionado hoy.** "Crear nueva versión" de un Plan es inmediata, sin modal ni elección (`mods/curriculum-design/config/layouts/default_Curriculum_list.json:20-31`). Clona la malla pero **ignora la tributación**: la v2 nace con la malla y cero filas de tributación; las de la v1 quedan intactas. **Tampoco copia la adopción de matriz** (`MatrixAdoption` no está entre los hijos clonados de `mods/curriculum-design/objects/Curriculum.json`): la v2 nace sin matrices adoptadas.
- **Versionado por MCP: ya es posible, pero sin guía.** El MCP versiona un plan con la creación genérica (origen y bandera de versión), entra por el mismo override y hook que la pantalla y con el mismo usuario y rol. No existe ficha ni guía de versionado de planes (`mods/curriculum-design/ai/index.js:36` lo deja "pendiente"), y la guía de lectura de cm manda a versionar "en UP1" (`mods/curriculum-mapping/ai/tools.js:508-513`, fijado por `tests/unit/aiPack.test.js:1390`). La **escritura de tributaciones por MCP está cerrada** a propósito (`mods/curriculum-mapping/ai/index.js:346-350`): ningún agente puede crearlas ni editarlas.
- **Consecuencia de las dos cosas anteriores:** si el versionado replica tributación, esa sería la única vía por la que una acción de un agente MCP escribe tributación, y lo haría sin que el agente pueda elegir ni ver el informe, salvo que el contrato lo contemple.
- **El hook citado por el PO no es de core.** `inheritRecordTypeExtensionOnVersion` vive en curriculum-design (`mods/curriculum-design/logic/sectionValidation.resolver.js:299`, invocado en `:338`). Corre después de crear la versión y fuera de su transacción; si falla, la v2 queda creada. Recibe el resultado (con el mapa viejo a nuevo de planEntry, hoy sin uso) y el contexto con usuario y capabilities, pero no recibe ninguna elección.
- **Identificar el planEntry equivalente.** No hay vínculo persistido: `sourceEntryId` queda nulo en la v2. El mapa viejo a nuevo existe solo en el resultado de crear y por tanto solo se puede usar en el momento de versionar.
- **Reglas que una copia directa se saltaría.** La adopción vigente (R-1) exige que el plan tenga la matriz adoptada. Sin arrastrar la adopción, replicar por la vía gobernada fallaría en todas las filas, y replicar por acceso directo dejaría filas que violan R-1. El bloqueo de escritura genérica en el servidor de cm fue retirado (UPONE-1758); hoy solo existe en la puerta del MCP.
- **Nombres.** El ticket cita `developmentSchemeId`; ese nombre no existe. El código usa `developmentLevelId`, decisión de UPONE-1753.
- **Definiciones faltantes.** R-8 y R-12 no tienen definición en el repo, solo en la documentación del sprint 10.
- **Deudas enlazadas a este ticket por 1756 y 1770:** la escritura genérica que salta el resolver gobernado (cerrada solo en la puerta MCP) y el selector de asignatura que se cuela en la vista de solo lectura.

## 5. Alcance

**Dentro**
- Los cuatro indicadores con denominador declarado por vista, con la especialización según la base de logro de la matriz, disponibles por pantalla y por MCP.
- Al versionar un plan: elegir replicar o empezar limpio; replicar remapea al planEntry equivalente conservando el nivel de desarrollo, y copia el resto de la fila tal cual.
- Informar a quien versiona (pantalla y MCP) cuántas filas quedaron sin destino.
- Marcar las filas fuera de diseño sin borrarlas y hacerlas visibles también por MCP.
- Sin permiso de escritura de tributación: se replica por defecto, sin mostrar la opción.
- Lo necesario para que la replicación respete las reglas de tributación (incluida la adopción de matriz de la versión nueva).

**Fuera**
- Pesos, asignación por malla y vía masiva (1770, ya entregado).
- Retiro con aviso de dependientes y outcomeAlignment (1772).
- Migración de niveles de matrices existentes (1773). Versionar no hereda niveles.
- Versionar la matriz: versionar un plan no versiona la matriz.
- Guard de suma al publicar (derivado de 1770, ticket aparte).
- Abrir la escritura de tributaciones por MCP en general (hoy cerrada a propósito); solo se discute la replicación al versionar.

## 6. Criterios de aceptación (checkeables)

- [ ] Cada indicador muestra su denominador y este cambia según la vista: en la lectura del plan abarca todas las matrices adoptadas; en el componente de tributación, solo la matriz en trabajo.
- [ ] Desarrollo tributado cuenta celdas declaradas (competencia por nivel declarado) con al menos una tributación; un nivel declarado sin asignatura cuenta en el denominador; un nivel no declarado no cuenta.
- [ ] Con achievementBasis = RepresentativeLevel el indicador pasa a "con evaluador en el nivel representativo"; una competencia con evaluador solo en otros niveles no cuenta. Si la competencia no tiene nivel representativo, el comportamiento está definido (decisión D8).
- [ ] La tarjeta "fuera de diseño" aparece solo cuando hay filas afectadas; las filas se muestran marcadas y no entran al cálculo.
- [ ] Un agente MCP puede leer los mismos indicadores, con el mismo denominador declarado y las filas fuera de diseño marcadas, sin tener que recalcularlos.
- [ ] Al crear una nueva versión, quien tiene permiso de escritura de tributación elige entre replicar el mapa y empezar limpio.
- [ ] Quien no tiene ese permiso no ve la opción y la versión nueva nace con el mapa replicado.
- [ ] Replicar: cada fila apunta al planEntry equivalente de la versión nueva, con el mismo nivel de desarrollo, tipo de contribución y peso (copiado sin reformatear); las filas sin equivalente no se crean y se informa la cantidad.
- [ ] Las filas replicadas son legibles y gestionables en la versión nueva (la matriz queda adoptada o se define cómo, decisión D12).
- [ ] Empezar limpio: la versión nueva nace sin filas de tributación; el plan anterior conserva las suyas.
- [ ] Versionar un plan no modifica ni la matriz ni las tributaciones del plan origen.
- [ ] Por MCP: versionar permite expresar la elección y devuelve el informe de filas sin destino; quien no tiene el permiso obtiene la réplica por defecto igual que en pantalla; reintentar no duplica filas ni versiones.

## 7. Definition of Done (checkeable)

Aplica el estándar DoR/DoD del equipo (regla del proyecto). Además, específico de este ticket:
- [ ] Evidencia runtime: versionar un plan con tributaciones en ambos caminos (replicar y limpio) y ver los indicadores en las dos vistas, por pantalla y por MCP.
- [ ] No regresión: versionado de plan sin tributaciones, clon de plan, vista de tributación en plan publicado (solo lectura).
- [ ] RBAC efectivo: con y sin permiso de escritura de tributación, verificado con usuarios de rol (no Admin) y por MCP con esos mismos usuarios.
- [ ] Tests que prohíben la cuarta tarjeta y que fijan los textos de las guías MCP actualizados con aprobación del equipo.
- [ ] Contratos MCP de cd y cm actualizados y sincronizados; pruebas de paridad pantalla/MCP extendidas al versionado.
- [ ] Documentación del mod actualizada (indicadores y versionado).
- [ ] Artefactos de sync/seed no commiteados.

## 8. Tests mínimos (checkeables; ampliables en ejecución)

- [ ] Competencia con 3 niveles declarados y tributación en 1 -> indicador "1 de 3".
- [ ] Mismo plan visto en lectura (2 matrices adoptadas) y en componente (1 matriz) -> denominadores distintos y declarados.
- [ ] RepresentativeLevel, evaluador solo en nivel no representativo -> no cuenta como con evaluador.
- [ ] Matriz sin nivel representativo marcado -> comportamiento definido.
- [ ] Fila en nivel no declarado o con competencia fuera del árbol -> marcada, no cuenta, no se borra, visible por MCP.
- [ ] Versionar con N filas, M sin planEntry equivalente -> v2 con N menos M filas e informe de M.
- [ ] Versionar con permiso eligiendo limpio -> v2 con 0 filas; v1 intacta.
- [ ] Versionar sin permiso (rol sin `competencyalignment:create`) -> v2 replicada, sin opción visible.
- [ ] Peso (texto decimal) se copia sin cambios de formato.
- [ ] Fallo parcial al replicar -> estado definido, comunicado y reintentable sin duplicar.
- [ ] Reintentar la replicación sobre la misma versión -> sin filas duplicadas.
- [ ] Versionar por MCP con y sin la elección -> mismo resultado que por pantalla; sin permiso, réplica por defecto.
- [ ] Lectura de indicadores por MCP de un plan con varias matrices adoptadas.
- [ ] Plan versionado con matriz adoptada en la v1 -> las filas replicadas se leen y se pueden retirar en la v2.

## 9. Factores transversales (checkeables)

- [ ] i18n: aplica (etiquetas nuevas en es, en, pt).
- [ ] Accesibilidad (WCAG): aplica (tarjeta nueva, marcas de fila, diálogo de elección si existe).
- [ ] Storybook: N-A salvo que se agregue un componente nuevo reutilizable.
- [ ] Design tokens: aplica a la tarjeta y a las marcas.
- [ ] Documentación: aplica (docs de cm y cd).
- [ ] Lógica server-side / MCP-ready: aplica de lleno. Indicadores, remapeo, decisión por permiso e informe se resuelven en servidor y se exponen por contrato; la pantalla y el MCP consumen la misma fuente.
- [ ] RBAC: aplica (permiso de escritura de tributación leído en runtime desde curriculum-design; definir cuál de las capabilities lo gobierna).
- [ ] Historial / auditoría: aplica (la replicación debe quedar auditada como cualquier escritura de tributación y atribuida a quien versiona).
- [ ] Escritura gobernada: aplica (las filas replicadas deben respetar las reglas de tributación o declarar por qué no).
- [ ] Contratos MCP, seed, cleanup: aplica (fichas de cd y cm, guía del agente, sincronización).

## 10. Frontera core/mod (Aduana)

> La pasada formal de la skill Aduana no corrió. Esta tabla sale de la verificación de código y del análisis MCP y no reemplaza a Aduana.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Cálculo de indicadores y tarjetas | mod-only | Vive íntegro en cm, front más resolver de lectura | `mods/curriculum-mapping/modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridCoverageSummary.ts:76` |
| Indicadores en el resolver de lectura (con denominador, base de logro, nivel representativo y filas fuera de diseño) | mod-only | El resolver y su esquema de lectura son de cm | `mods/curriculum-mapping/logic/alignmentView.resolver.js:328` |
| Ficha MCP de lectura de indicadores | mod-only | Las fichas de cm se declaran en el mod | `mods/curriculum-mapping/ai/tools.js:480` |
| Remapeo de tributaciones al versionar | mod-only | El override de creación de cd recibe el mapa viejo a nuevo y el contexto del usuario | `mods/curriculum-design/logic/sectionValidation.resolver.js:299` |
| Lectura server-side del permiso de cm desde cd | mod-only | Hay precedente de cd evaluando permisos de cm y el contexto trae capabilities de todos los mods | `mods/curriculum-design/logic/helpers/authCheckerLoader.js` |
| Arrastre de la adopción de matriz a la versión nueva | mod-only (decisión de dueño) | Es un hijo más del clonado de Curriculum (cd) o una reacción de cm al versionado | `mods/curriculum-design/objects/Curriculum.json` |
| Ficha o parámetro MCP de versionado | mod-only | Fichas y contratos de cd | `mods/curriculum-design/ai/tools.js` |
| Paso de elección replicar o limpio en "Crear nueva versión" (pantalla) | core-worthy si es declarativo | La acción de crear solo envía origen y bandera de versión; la confirmación es binaria; no admite parámetros | `layout/src/composables/useCreateRowAction.ts:76-85` |
| Informe "filas sin destino" en pantalla | core-worthy si es declarativo | El aviso tras crear solo muestra el número de versión | `layout/src/composables/useCreateRowAction.ts:126-138` |
| Hook post-versión nativo de core | core-worthy (alternativa) | Core solo admite ganchos antes de crear y antes de actualizar | `object-manager/src/services/objectHooks.js:47` |

**Veredicto global: `hay-core-worthy`, condicionado.** Indicadores, MCP y replicación se resuelven dentro de los mods. El paso de elección y el informe **en pantalla** solo son mod-only si se resuelven con una pieza propia del mod (acciones de tipo mutation sobre una mutation propia de cd, o un componente propio); el camino declarativo exigiría Core Extension. Esto contradice "sin Core Extension" del PO y queda como decisión abierta.

## 11. Dependencias

- Requiere UPONE-1770 y UPONE-1769 (Finalizadas, mergeadas en cm).
- Debe construirse sobre `origin/develop` de object-manager: en el `develop` local versionar un Curriculum falla por `internalId` (corregido por UPONE-2003, solo en origin).
- Habilita UPONE-1772 (retiro con aviso).
- Coordinar con UPONE-1773: herencia de niveles es de migración, no de versionado.
- Coordinar con UPONE-1758 (arquitectura MCP de cm, Finalizada): contratos y bloqueo de escritura genérica.
- Coordinar con UPONE-1968 (pestaña Competencias de la asignatura en cd, en origin): precedente de lectura cd a cm con permisos.

## 12. Estimación

**10 SP (valor del PO), a revisar al alza o a dividir.** Indicadores con ficha MCP: front más resolver de lectura más contrato (5 SP). Versionado con réplica gobernada, arrastre de adopción, elección en pantalla y por MCP, informe e idempotencia: 8 SP o más, sin contar un posible Core Extension. Con el alcance MCP el total supera los 10 SP; la división en dos tickets (D2) se vuelve la opción natural. Lo que más mueve el esfuerzo: D1 (dónde vive la elección) y D4 (dónde vive la réplica).

## 13. Decisiones abiertas

- [ ] **D1 · Elección y informe en pantalla.** No existe soporte declarativo. Opciones: (a) acciones de tipo mutation sobre una mutation propia de cd, sin cambiar layout; (b) extender layout (Core Extension); (c) elegir después de crear, desde el componente de tributación de la v2. Recomendación en el pre-intake. Requiere PO y core si se elige (b).
- [ ] **D2 · Partir el ticket.** Indicadores (cm, front y MCP de lectura) y versionado (cd, cm y MCP) son separables y con el alcance MCP el 1771 supera los 10 SP.
- [ ] **D3 · Default sin permiso.** El PO lo fija como replicar. La documentación lo llama inferencia y a la vez "parámetro institucional configurable", pero no existe ningún parámetro institucional para esto. Confirmar regla fija o parámetro nuevo con default.
- [ ] **D4 · Dónde vive la réplica.** (a) En cd por acceso directo replicando las reglas de cm (se salta historial y reglas, riesgo de divergencia); (b) cd invoca el punto de entrada gobernado de cm (acopla los dos mods, deja pantalla y MCP idénticos); (c) gancho post-versión en core (Core Extension).
- [ ] **D5 · Qué permiso gobierna la elección.** Son tres capabilities separadas (`competencyalignment:create|modify|delete`) y los perfiles tienen combinaciones distintas (la autoridad curricular solo tiene delete). Propuesta: `create`.
- [ ] **D6 · Atomicidad y reintento.** El hook corre fuera de la transacción de versionado. Opciones: aceptar una v2 sin tributación ante un fallo con informe y una operación aparte e idempotente de "replicar desde la versión anterior", o pedir a core que corra dentro de la transacción. Reintentar la creación hoy crea otra versión.
- [ ] **D7 · Equivalencia del planEntry.** Usar el mapa del resultado de crear (propuesta) o poblar `sourceEntryId` (cambia también el clon). No hay unicidad `(plan, asignatura)`.
- [ ] **D8 · Nivel representativo.** Nadie lo marca hoy y no se exige que exista ni que sea único. Definir quién lo marca (pantalla, seed, MCP) y el fallback si falta o hay varios.
- [ ] **D9 · Definición de "fuera de diseño".** Nivel no declarado, fila colgada de un nodo que consolida, y competencia que salió del árbol (hoy descartada en silencio por la lectura). Confirmar cuáles cuentan y que la vista deje de descartarlas.
- [ ] **D10 · Indicadores en lectura vs componente.** La maqueta del plan (v17) deja tres indicadores en la lectura y los otros dos solo en el componente; el PO pide los cuatro con denominador en ambas. La etiqueta también difiere ("asignaturas que tributan" vs "sin tributar"). Confirmar.
- [ ] **D11 · Canal de la elección por MCP.** (a) Clave nueva dentro de los datos de la creación genérica (simple, invisible para el agente sin contrato); (b) ficha dedicada de versionado de planes, con permiso `curriculum:version` y retorno tipado (descubrible). Y el informe: la capa MCP elimina las claves que empiezan con guion bajo, por lo que debe viajar en una clave normal.
- [ ] **D12 · Adopción de matriz en la versión nueva.** No se copia hoy. Sin ella, R-1 rechaza las filas replicadas por la vía gobernada y quizá no se vean en la grilla. Decidir si se arrastra al versionar (parte del alcance de este ticket) o se exige adoptar.
- [ ] **D13 · Escritura por MCP.** La escritura de tributaciones por MCP está cerrada. Confirmar que replicar al versionar por MCP es una excepción aceptada y cómo se audita a nombre de quien versiona.
- [ ] **D14 · Deriva de `origin/develop`.** Releer antes de implementar: `CompetencyAlignment.json` (sourceId polimórfico, planId con referencia), resolver de lectura y batch de cm, helpers nuevos de cd y el flujo de object-manager con UPONE-2003.
- [ ] **D15 · Dependencia nombrada mal.** El ticket dice `developmentSchemeId`; el nombre real es `developmentLevelId`.
- [ ] **D16 · Plan publicado y vías no gobernadas.** La tributación se bloquea en plan publicado solo en las vías gobernadas; la escritura genérica y el bulk-edit del core no pasan por esa regla (deuda enlazada a este ticket). Definir si este ticket la cierra.
- [ ] **D17 · Numeración de reglas.** Los códigos R-1 a R-5 colisionan entre escala de desempeño, tributación y 1753. Citar siempre con el objeto.
- [ ] **D18 · Guía MCP de cm.** La guía actual manda a versionar "en UP1" y un test la fija; hay que decidir su texto final.

## 14. Guía de ejecución: reglas y patrones a considerar

- **[A favor]** Resolver en servidor: validaciones, remapeo, decisión por permiso e indicadores no viven solo en el cliente; la pantalla y el MCP consumen la misma fuente (patrón de paridad de cd, `weightedSum.parity`). _Fuente: `CLAUDE.md` de los mods y `mods/curriculum-design/docs/patterns/resolver-override.md`._
- **[A favor]** Un solo override de creación por mod con patrón validar y delegar; capturar los datos de versión antes de delegar porque core los borra, y quitar cualquier clave propia antes de delegar (core pasa las desconocidas a la base de datos y esta las rechaza). _Fuente: `mods/curriculum-design/logic/sectionValidation.resolver.js:321-325`._
- **[Advertencia]** Un segundo override de creación en cm colisiona con el de cd (gana el último). _Fuente: comentario del scanner en `sectionValidation.resolver.js`._
- **[A favor]** Evaluar permisos con la función pura de object-manager (no lanza ni audita), igual que cm para escribir. _Fuente: `object-manager/src/services/auth/authChecker.js:286` y `mods/curriculum-mapping/logic/competencyAlignment-batch.resolver.js:564`._
- **[Evitar]** Escribir tributación por acceso directo saltándose las reglas de cm y su historial; la regla que cm dejó escrita para herramientas futuras lo prohíbe. _Fuente: `mods/curriculum-mapping/ai/index.js:336-345`._
- **[Evitar]** Reintentar la creación para reparar una réplica fallida: crea otra versión. _Fuente: `object-manager/src/graphql/resolvers/helpers/version-from-source.js:29`._
- **[Evitar]** Copiar el peso reparseándolo: es texto decimal. _Fuente: `mods/curriculum-mapping/objects/CompetencyAlignment.json:73`._
- **[Evitar]** Reintroducir `DevelopmentScheme`; el nombre vigente es `DevelopmentLevel`. _Fuente: UPONE-1753._
- **[Gate]** Versionar exige `curriculum:version` (estática) y origen aprobado o activo. _Fuente: `mods/curriculum-design/objects/Curriculum.json:53-60`._
- **[Gate]** `competencyalignment:*` no se rige por una capability única de escritura; definir cuál. _Fuente: `mods/curriculum-mapping/capabilities.json:99`._
- **Transversal:** aislamiento por tenant, correr el sync al terminar y no editar archivos sincronizados; en commits y PR solo la referencia `UPONE-1771`. _Fuente: `CLAUDE.md` del proyecto._

## 15. Tickets relacionados

| Ticket | Qué es | Relación | Estado (Jira, 2026-10-06) |
|---|---|---|---|
| UPONE-1452 | Épica Curriculum Mapping | Épica contenedora | Backlog |
| UPONE-1756 | CRUD por competencia (grilla) | Antecedente (ya muestra tres tarjetas) | Finalizada |
| UPONE-1769 | Cableado del modelo y rename | Dependencia | Finalizada |
| UPONE-1770 | Pesos del eje 1, malla y vía masiva | Dependencia (deuda enlazada) | Finalizada |
| UPONE-1772 | outcomeAlignment y retiro con aviso | Habilitado por este | Backlog |
| UPONE-1773 | Migración de niveles | Coordinar (herencia de niveles es de migración) | Backlog |
| UPONE-1753 | Terminología de esquema y niveles | Antecedente (fija developmentLevelId) | Finalizada |
| UPONE-1758 | Arquitectura MCP de cm | Coordinar (contratos y bloqueo genérico) | Finalizada |

Otros números aparecen en el código y no se verificaron en Jira: UPONE-2003 (copia sin `internalId`, necesario) y UPONE-1968 (precedente de lectura cd a cm), ambos solo en `origin/develop`.

## 16. Referencias

- Fuente canónica: UPONE-1771 en Jira y los tres artifacts del PO.
- KB del sprint 10: detalle técnico y partición de tributación, followup y followup-delta de 1756, maqueta del slice (vistas de indicadores y versionado), gaps de fidelidad, deuda de escritura genérica.
- KB del sprint 11: cierre de alcance y adendas de 1770, decisión del guard interino, matriz de preparación MCP de cm y cd.
- Pre-intake: `UPONE-1771-pre-intake` (enfoques, hipótesis resueltas, evidencia en vivo).
