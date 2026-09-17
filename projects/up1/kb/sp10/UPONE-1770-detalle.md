---
id: DOC-kb-sp10-UPONE-1770-detalle
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - UPONE-1770
  - tributacion
  - pesos
  - aduana
---

# UPONE-1770-detalle

> **MOVIDO A sp11 (2026-09-14).** El ticket UPONE-1770 se trabaja ahora en sp11. Esta copia queda en sp10 como registro historico; **todo analisis siguiente va sobre los docs de sp11** (`sp11/UPONE-1770-detalle`, `-aduana`, `-pre-intake`, `-explicativo.html`). No editar esta version.

> **Referencia externa:** UPONE-1770 · **Tipo:** Historia · **Prioridad:** Trivial · **Epica:** UPONE-1452 (Curriculum Mapping) · **Asignado:** por tomar (sin asignar en Jira) · **Story Points:** 13 (publicado) · **Sprint:** follow-up

> **Estado (2026-09-14):** completa la captura de tributacion iniciada en UPONE-1756 (CRUD) y UPONE-1769 (cableado del modelo), ambos finalizados. El cableado que este ticket consume (`contributionPercentage`, indice de grupo) ya vive en `develop`. Este contrato deja el que-conseguir verificado contra el codigo y encausa por Decisiones abiertas el alcance cross-mod hacia curriculum-design. No reescribe la descripcion del PO.

## Fuente canonica (PO)

> Completa la captura: el guardado como sesion de trabajo, el peso de las asignaturas que evaluan, y las dos vias que faltan para asignar.
>
> **Que entra.** Upsert transaccional de conjunto por plan y matriz (se envia el mapa completo, no una operacion por fila). Peso del eje 1, sobre el campo que definio el ticket de cableado, con reparto automatico o manual y la accion de repartir en partes iguales. Validacion de que el grupo suma 100 al publicar el plan, no en cada guardado; los grupos con Max quedan eximidos. Segunda forma: asignacion desde la malla por periodo, reutilizando el componente existente. Via masiva: aplicar varias tributaciones de una vez.
>
> **Que NO entra.** Indicadores y versionado, outcomeAlignment y R-7, migracion de niveles (cada uno tiene su ticket).
>
> **Criterios (PO).** El guardado de una matriz es un upsert de conjunto y transaccional. En una celda con varias asignaturas se ve y se edita el peso de cada una, y la suma se valida al publicar. La asignacion desde la malla y la via masiva funcionan. El estado automatico o manual del grupo se deriva, no se persiste.
>
> **Dependencias (PO).** Requiere UPONE-1756 (CRUD base) y UPONE-1769 (cableado). Tambien UPONE-1755 (modelo de medicion) y UPONE-1753 (nombres nuevos).

## Historia de usuario

Como Disenador Curricular, quiero terminar de cargar la tributacion del plan (guardar la matriz completa de una vez, ponderar las asignaturas que evaluan una competencia, y asignar tambien desde la malla o en lote), para que el mapa de competencias quede completo y consistente, y la suma de pesos se controle recien al publicar el plan.

## Objetivo

Sobre el CRUD de tributacion ya entregado (una fila por operacion), agregar: el guardado en conjunto y transaccional, el gobierno del peso del eje 1 con su reparto, la validacion de suma al publicar el plan, y dos vias mas de asignacion (malla y masiva). Todo del lado del backend gobernado, sin abrir la escritura del peso a una via que saltee las reglas.

## Contexto (para dimensionar, verificado contra codigo hoy)

- **El cableado que consume este ticket YA existe en `develop`** (lo dejo 1769):
  - `contributionPercentage` (string, nullable) en `objects/CompetencyAlignment.json:73`.
  - Indice de grupo `(planId, competencyNodeId, developmentLevelId)` en `objects/CompetencyAlignment.json:16` (es `index`, no `unique`).
  - `courseAggregationMode` (enum `WeightedAvg | Max`) en `objects/RecordTypes/rt__Matrix__competencynode.json`: es el **eje 1**, y su valor `Max` es el que exime al grupo de la validacion de suma.
  - > Correccion de frescura: el addendum del `UPONE-1769-detalle` (2026-09-09) daba `contributionPercentage` y el indice de grupo como pendientes. Verificado hoy en `curriculum-mapping@develop`: **ya estan**. El dato viejo quedo desactualizado.
- **La grilla hoy guarda fila por fila** (a proposito, REQ-09 de 1756): cada asignar/mover/retirar/editar dispara su propia mutation en `modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridElement.vue`. El propio resolver anticipa el batch: `logic/competencyAlignment.resolver.js` (header, "el batch y la UI llegan en tasks siguientes").
- **El peso NO esta gobernado todavia:** `contributionPercentage` no esta en `WRITABLE_FIELDS` (`logic/helpers/validateCompetencyAlignment.js:43-49`). Hoy solo se puede setear por la via no gobernada (CRUD generic / MCP), que es la deuda de paridad registrada en el discovery de 1756.
- **El guard de "suma 100 al publicar" NO existe para el Plan.** Existe el precedente para la Matriz: `logic/helpers/assertPublishable.js`, invocado en `logic/competencyMatrix-update.resolver.js:275-276` antes de delegar en el generic (porque el motor de transiciones del core no acepta hooks de contenido). Para el Plan iria en `curriculum-design/logic/curriculum-update.resolver.js:119-127` (transicion `Approved -> Active` declarada en `curriculum-design/objects/Curriculum.json:130`).
- **La malla existe en OTRO mod:** `curriculum-design/modsComponents/CurriculumMesh/`. Verificado (Aduana): NO hay hoy ningun import cross-mod de ese componente desde curriculum-mapping, ni un punto de extension (slot/evento) para inyectarle la accion de tributar. Reusarla no es "consumir algo ya expuesto": hay que agregarle el punto de extension en curriculum-design.

## Alcance

**Dentro (curriculum-mapping):**

1. **Upsert transaccional de conjunto** de `CompetencyAlignment` por `(planId, matrixId)`: se recibe el mapa completo y el resolver reconcilia (crea, actualiza, retira lo que ya no viene) en una sola transaccion, corriendo R-1..R-5/R-10 sobre cada fila.
2. **Gobierno del peso del eje 1:** agregar `contributionPercentage` a la escritura gobernada + logica de reparto (automatico, manual, y accion "repartir en partes iguales"). Solo participan del peso las tributaciones `Evaluates` y `Both` (R-6).
3. **Via masiva** de tributacion: aplicar un destino (nivel + tipo de contribucion) a varias asignaturas de una vez, troceando el lote en el backend.
4. **Estado automatico/manual del grupo DERIVADO** (no persistido): grupo automatico = todos los pesos iguales dentro de tolerancia. No se crea campo ni objeto "grupo".
5. **Gate del peso por institucion (R-9):** el peso solo se muestra/gobierna si la institucion lo tiene habilitado (parametro de tenant, patron `cm.displayDecimals`).

**Cross-mod (curriculum-design), ver Frontera y Dependencias externas:**

6. **Guard de "suma 100 al publicar el plan"** (grupos con `Max` eximidos): vive en el resolver de actualizacion de `Curriculum` (otro mod).
7. **Asignacion desde la malla por periodo:** requiere un punto de extension nuevo en `CurriculumMesh` (otro mod).

**Fuera (tienen su propio ticket):**

- Indicadores de cobertura y versionado del plan (R-8, R-12): UPONE-1771.
- outcomeAlignment (F6) y retiro con aviso de dependientes (R-7): UPONE-1772.
- Migracion de niveles de matrices existentes: UPONE-1773.

## Criterios de aceptacion (checkeables)

- [ ] El guardado de una matriz de tributacion es un upsert de conjunto y transaccional: un fallo no deja filas a medias (todo o nada).
- [ ] En una celda con varias asignaturas `Evaluates`/`Both` se ve y se edita el peso de cada una; solo esas participan del peso (R-6).
- [ ] La accion "repartir en partes iguales" distribuye el 100 entre las filas del grupo.
- [ ] La suma del grupo se valida **al publicar el plan** (transicion a Activo), no en cada guardado. Un plan con un grupo que no suma 100 no publica.
- [ ] Un grupo cuya matriz tiene `courseAggregationMode = Max` queda eximido de la validacion de suma.
- [ ] La asignacion desde la malla por periodo crea/edita tributaciones por la misma via gobernada que la grilla.
- [ ] La via masiva aplica un destino a varias asignaturas en una transaccion; reporta cuales se saltearon y por que.
- [ ] El estado automatico/manual del grupo se deriva de los pesos, no se persiste (no hay campo ni objeto nuevo).
- [ ] El peso solo aparece/gobierna si la institucion lo tiene habilitado (R-9).

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo (regla del proyecto). Ademas:

- [ ] **Logica server-side / MCP-ready:** la validacion de suma, el gobierno del peso y la reconciliacion del conjunto viven en el resolver gobernado; ninguna via de escritura del peso saltea las reglas (extender el test de paridad para cubrir `contributionPercentage`).
- [ ] Migracion sin drift si se toca schema; `sync`/`codegen` sin drift; artefactos de sync/seed no commiteados.
- [ ] El CRUD de tributacion de 1756 sigue verde tras el cambio a upsert de conjunto (no regresa la grilla ni sus specs de componente).
- [ ] Coordinado con curriculum-design para los dos artefactos cross-mod (guard de publicacion y punto de extension de la malla), o partido en ticket derivado (ver Decisiones abiertas).

## Factores transversales (checkeables)

- [ ] **Logica server-side / MCP-ready:** aplica (peso, suma y reconciliacion gobernados en el resolver).
- [ ] **Permisos (RBAC):** reusa `competencyalignment:create/modify/delete`; la escritura de conjunto exige las mismas caps que la fila (restituir el check al no delegar en el generic, patron `planEntry-batch`). El guard de publicacion del plan corre bajo `curriculum:publish`.
- [ ] **Capa de lenguaje (i18n):** aplica (copys nuevos: barra de guardado, modal de via masiva, celda de peso con "repartir en partes iguales", mensaje de bloqueo al publicar por suma).
- [ ] **Historial / auditoria:** el upsert de conjunto deja una sola entrada por guardado (patron de la grilla y del arbol), colgada del registro raiz.
- [ ] **Convenciones de mod:** escritura gobernada `*Validated`, transaccion propia (`runInTransaction`), sin llamar al CRUD generic.

## Frontera core/mod (Aduana)

**Veredicto global: `mal-encuadrado (parcial)`, sin artefactos core-worthy.** Ninguna pieza toca el core (`object-manager`/`layout`/`suite`/`flow`). Cuatro de seis son mod-only en curriculum-mapping; dos exceden el mod y son trabajo nuevo en curriculum-design (otro mod, no core). Si el ticket se cierra solo en curriculum-mapping, esos dos quedan sin dueno.

| Artefacto | Veredicto | Cross-mod | Motivo + fuente |
|---|---|---|---|
| Upsert transaccional de conjunto | mod-only | No | Reemplazo total con `runInTransaction` es patron ya establecido en el mod: `logic/competencyTree-upsert.resolver.js` (semantica de reemplazo total). Escritura gobernada del propio objeto. |
| Gobernar `contributionPercentage` + reparto | mod-only | No | `WRITABLE_FIELDS` es constante del mod (`logic/helpers/validateCompetencyAlignment.js:43`). El reparto en partes iguales ya esta decidido client-side (regla G-6, `weights.ts`). |
| Via masiva | mod-only | No | Patron bulk con troceo en backend ya usado en el mod: `logic/matrixAdoption.resolver.js:246-300` (regla AD-12). |
| Estado auto/manual derivado | mod-only | No | Logica de lectura/vista, estado derivado no persistido (patron `rowActions.ts`, AD-17). |
| Guard "suma 100 al publicar el plan" | mod-only para el objeto que gobierna, pero en OTRO mod | **Si** | La transicion `Approved -> Active` es del objeto `Curriculum` de **curriculum-design** (`curriculum-design/objects/Curriculum.json:130`); el guard iria en `curriculum-design/logic/curriculum-update.resolver.js:119-127`, analogo a `assertPublishable.js`. No core-worthy, pero no lo construye curriculum-mapping solo. |
| Asignacion desde la malla | no core-worthy per se, pero sin precedente de reuso | **Si** | `CurriculumMesh` vive en curriculum-design y no tiene punto de extension para que otro mod inyecte una accion; no hay import cross-mod hoy (grep vacio) y el sync aplana `modsComponents` (regla M-26, import roto no da senal antes de runtime). Es trabajo nuevo en curriculum-design, no reuso. |

Evidencia extendida: `UPONE-1770-aduana`.

## Dependencias externas (cross-mod, avaladas por Aduana)

Ninguna requiere Core Extension: las dos son trabajo de otro **mod** (curriculum-design), no del core. Lo que corresponde es coordinar con el dueno de curriculum-design o partir el ticket, no abrir una Core Extension.

| # | Dependencia | Naturaleza | Encause propuesto |
|---|---|---|---|
| D1 | Guard de publicacion del plan (suma 100, exencion `Max`) en `curriculum-update.resolver.js` | Capacidad nueva en curriculum-design (no existe hoy nada analogo en ese resolver) | Viable como sub-tarea del mismo ticket con coordinacion, o ticket derivado este sprint. Decidir con el dueno de curriculum-design. |
| D2 | Punto de extension en `CurriculumMesh` para inyectar la accion de tributar por periodo | Capacidad nueva en curriculum-design (el componente no expone slot/evento hoy) | Viable como ticket derivado; la premisa del PO ("reutilizando el componente existente") es imprecisa: hay que crear el punto de extension primero. |

## Estimacion

**13 Story Points (publicado).** El peso se concentra en el upsert transaccional de conjunto (reemplazo total: definir bien que se retira) y en los dos tramos cross-mod. Si D1 y D2 se parten a ticket derivado, el tramo de curriculum-mapping baja de tier; confirmar con PO/lead al encausar.

## Reglas de negocio a respetar

- **R-6:** solo `Evaluates` y `Both` producen evidencia de logro y participan del peso (`Develops` no pondera). Confirmado por la maqueta: el encabezado del grupo de peso dice "grupo de peso (Evaluates + Both)".
- **R-9:** `contributionPercentage` solo se muestra si la institucion lo tiene habilitado (parametro de tenant).
- **Estado del grupo derivado:** grupo automatico = todos los pesos iguales dentro de tolerancia; falso positivo inocuo (repartir a mano en partes iguales se lee como automatico). No crear campo ni objeto "grupo".
- **R-1..R-5/R-10 (de 1756):** se siguen aplicando por cada fila dentro del upsert de conjunto; el batch no las saltea.

## Decisiones abiertas

- [ ] **Encause cross-mod (D1, guard de publicacion):** mismo ticket con coordinacion con curriculum-design, o ticket derivado. Sin dueno definido, el tramo de publicacion queda sin construir.
- [ ] **Encause cross-mod (D2, malla):** la malla no es reuso directo (falta punto de extension en curriculum-design). Confirmar con el dueno de ese mod y decidir mismo-ticket vs derivado. La descripcion del PO se mantiene; se encausa aca.
- [ ] **Gate por institucion (R-9):** confirmar el parametro de tenant y su default (habilitado/deshabilitado) con el PO.
- [ ] **Paridad MCP del peso:** al gobernar `contributionPercentage`, la via generic/MCP seguira pudiendo setearlo sin reglas (deuda del discovery de 1756). Decidir si 1770 solo extiende el test de paridad (documenta el hueco) o si engancha con el cierre core "gobernado-only" (ticket aparte).
- [ ] **Story Points:** re-confirmar 13 segun se parta o no D1/D2.

## Guia de ejecucion: reglas y patrones a considerar

- **[Patron] Upsert de conjunto:** copiar la semantica de `logic/competencyTree-upsert.resolver.js` (reemplazo total en `runInTransaction`) y el restablecimiento de RBAC de `curriculum-design/logic/planEntry-batch.resolver.js` (no delega en el generic). _Fuente: ambos resolvers._
- **[Patron] Guard de publicacion:** espejar `logic/helpers/assertPublishable.js` (corre antes del generic en la transicion de estado, porque el motor del core no acepta hooks de contenido), pero para `Curriculum` en curriculum-design. _Fuente: `assertPublishable.js`, `competencyMatrix-update.resolver.js:275`._
- **[Regla] Reparto client-side (G-6):** el reparto en partes iguales es atajo de edicion en el cliente; lo que se persiste lo validan las reglas del resolver. _Fuente: CLAUDE.md del mod, G-6._
- **[Regla] Troceo en backend (AD-12):** el chunking del lote masivo vive en el backend, no en el cliente. _Fuente: CLAUDE.md del mod, AD-12; `matrixAdoption.resolver.js`._
- **[Advertencia] Cross-mod UI (M-26):** el sync aplana `modsComponents/`; un import roto mod->mod no da senal hasta runtime. No importar `CurriculumMesh` directo: hay que exponer un punto de extension en curriculum-design. _Fuente: CLAUDE.md del mod, M-26._
- **[Transversal] `sync`/`codegen` sin drift, no editar archivos sincronizados.** _Fuente: CLAUDE.md del mod._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1756 | CRUD de tributacion por competencia (grilla) | Base que este ticket extiende (de fila a conjunto); aporta R-1..R-5/R-10 | Finalizada |
| UPONE-1769 | Cableado del modelo + rename | Definio `contributionPercentage`, el indice de grupo y `courseAggregationMode` que consume este ticket | Finalizada |
| UPONE-1755 | Modelo de medicion (tres ejes) | Aporta `courseAggregationMode` (eje 1) y `achievementBasis` | Finalizada |
| UPONE-1753 | Renombre de catalogos / nombres nuevos | Fijo `developmentLevelId` / `DevelopmentLevel`; no reintroducir `DevelopmentScheme` | Finalizada |
| UPONE-1771 | Indicadores y versionado del plan | Depende de este (pesos); fuera de alcance aca | Backlog |
| UPONE-1772 | outcomeAlignment + retiro con aviso (R-7) | Depende de 1771; fuera de alcance aca | Backlog |
| UPONE-1773 | Migracion de niveles de matrices existentes | Habilita R-4 sobre matrices existentes; independiente de este | Backlog |

## Referencias

- Fuente canonica: UPONE-1770 (Jira). Epica UPONE-1452.
- Material de consulta previo (KB sp10): `Tributacion-CompetencyAlignment-detalle-tecnico-reglas-y-particion-UPONE-1756-17`, `Gaps-de-fidelidad-maqueta-vs-entregado-UPONE-1756-tributacion`, `Discovery-1756-gap-MCP-friendly-CRUD-generic-saltea-el-resolver-gobernado-deuda`, `UPONE-1769-detalle`.
- Maqueta (autoridad visual): `UPONE-1756-maqueta-slice.html`, Vistas 6 (malla), 7 (via masiva) y 8 (peso del eje 1).
- Aduana (evidencia): `UPONE-1770-aduana`. Pre-intake (el como): `UPONE-1770-pre-intake`. Explicativo: `UPONE-1770-explicativo.html`.
- Working copy: `curriculum-mapping@develop`, `curriculum-design@develop`.
