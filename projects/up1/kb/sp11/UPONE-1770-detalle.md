---
id: DOC-kb-sp11-UPONE-1770-detalle
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - curriculum-mapping
  - detalle
  - UPONE-1770
  - tributacion
  - pesos
  - aduana
---

# UPONE-1770-detalle

> ⚠️ **SUPERADO EN PARTE (2026-09-15) - leer con `UPONE-1770 - cierre de alcance y correcciones` (sp11), que es la version autoritativa del alcance.** Tras revisar contra la maqueta del PO (ver `UPONE-1770 - referencias visuales de la maqueta`, 10 capturas en sp11) y el codigo, tres puntos de este documento quedaron corregidos:
> - **R-9 (gate del peso por institucion): FUERA.** Es conducta de legacy (flag de `imp_courses_competencies` observado en `false`); no existe en up1 hoy (el unico parametro de tenant del mod es `cm.displayDecimals`). No es decision ni alcance de 1770. Ignorar el punto 5 de Alcance, R-9 en Reglas de negocio, y la Decision abierta de R-9.
> - **Asignacion desde la malla (D2): es cm-interno, NO cross-mod.** La maqueta muestra "Por malla" como un modo de vista de la propia tributacion (cm ya lee `planEntry` por periodo via `alignmentView.resolver.js`), no reuso del `CurriculumMesh` de curriculum-design. Ignorar el punto 7 de Alcance, la fila "Asignacion desde la malla" de la Aduana y la dependencia D2.
> - **Validacion de suma al publicar (D1): unico cross-mod real, VERIFICADO** en la maqueta y el plan de division del PO (`UPONE-1756-plan-po`). Sale de 1770 a su propio ticket. El resto (upsert de conjunto, peso + reparto, via masiva) es cm-interno.
>
> El nullable del peso es regla de dominio (obligatoriedad condicional), no opcional arbitrario. Story Points 13 se mantienen. Deuda de UI observada: el selector de asignatura se cuela en la vista solo lectura (corresponde solo al editor).

> **Copia en sp11.** El ticket UPONE-1770 pasa a trabajarse en sp11; el analisis original queda tambien en sp10 (`UPONE-1770-detalle` / `-aduana` / `-pre-intake` / `-explicativo.html`). Contenido identico.

> **Referencia externa:** UPONE-1770 · **Tipo:** Historia · **Prioridad:** Trivial · **Epica:** UPONE-1452 (Curriculum Mapping) · **Asignado:** por tomar (sin asignar en Jira) · **Story Points:** 13 (publicado) · **Sprint:** sp11 (follow-up)

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
- **La malla existe en OTRO mod:** `curriculum-design/modsComponents/CurriculumMesh/`. **[CORREGIDO - ver aviso arriba: la "vista por malla" de 1770 es un modo interno de tributacion, no este componente de cd.]**

## Alcance

**Dentro (curriculum-mapping):**

1. **Upsert transaccional de conjunto** de `CompetencyAlignment` por `(planId, matrixId)`: se recibe el mapa completo y el resolver reconcilia (crea, actualiza, retira lo que ya no viene) en una sola transaccion, corriendo R-1..R-5/R-10 sobre cada fila.
2. **Gobierno del peso del eje 1:** agregar `contributionPercentage` a la escritura gobernada + logica de reparto (automatico, manual, y accion "repartir en partes iguales"). Solo participan del peso las tributaciones `Evaluates` y `Both` (R-6).
3. **Via masiva** de tributacion: aplicar un destino (nivel + tipo de contribucion) a varias asignaturas de una vez, troceando el lote en el backend.
4. **Estado automatico/manual del grupo DERIVADO** (no persistido): grupo automatico = todos los pesos iguales dentro de tolerancia. No se crea campo ni objeto "grupo".
5. ~~**Gate del peso por institucion (R-9)**~~ **[FUERA - ver aviso arriba: R-9 es legacy y no aplica.]**
6. **Vista "Por malla"** dentro de tributacion (asignaturas por periodo) **[cm-interno; ver aviso arriba]**.

**Fuera (tienen su propio ticket):**

- **Validacion "suma 100 al publicar el plan" (D1):** cross-mod hacia curriculum-design, ticket aparte (ver cierre).
- Indicadores de cobertura y versionado del plan (R-8, R-12): UPONE-1771.
- outcomeAlignment (F6) y retiro con aviso de dependientes (R-7): UPONE-1772.
- Migracion de niveles de matrices existentes: UPONE-1773.

## Criterios de aceptacion (checkeables)

- [ ] El guardado de una matriz de tributacion es un upsert de conjunto y transaccional: un fallo no deja filas a medias (todo o nada).
- [ ] En una celda con varias asignaturas `Evaluates`/`Both` se ve y se edita el peso de cada una; solo esas participan del peso (R-6).
- [ ] La accion "repartir en partes iguales" distribuye el 100 entre las filas del grupo.
- [ ] La suma del grupo se valida **al publicar el plan** (transicion a Activo), no en cada guardado. **[D1, fuera de 1770.]**
- [ ] Un grupo cuya matriz tiene `courseAggregationMode = Max` queda eximido de la validacion de suma.
- [ ] La asignacion desde la malla por periodo (vista Por malla) crea/edita tributaciones por la misma via gobernada que la grilla.
- [ ] La via masiva aplica un destino a varias asignaturas en una transaccion; reporta cuales se saltearon y por que.
- [ ] El estado automatico/manual del grupo se deriva de los pesos, no se persiste (no hay campo ni objeto nuevo).

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo (regla del proyecto). Ademas:

- [ ] **Logica server-side / MCP-ready:** el gobierno del peso y la reconciliacion del conjunto viven en el resolver gobernado; ninguna via de escritura del peso saltea las reglas (extender el test de paridad para cubrir `contributionPercentage`).
- [ ] Migracion sin drift si se toca schema; `sync`/`codegen` sin drift; artefactos de sync/seed no commiteados.
- [ ] El CRUD de tributacion de 1756 sigue verde tras el cambio a upsert de conjunto (no regresa la grilla ni sus specs de componente).

## Factores transversales (checkeables)

- [ ] **Logica server-side / MCP-ready:** aplica (peso y reconciliacion gobernados en el resolver).
- [ ] **Permisos (RBAC):** reusa `competencyalignment:create/modify/delete`; la escritura de conjunto exige las mismas caps que la fila (restituir el check al no delegar en el generic, patron `planEntry-batch`).
- [ ] **Capa de lenguaje (i18n):** aplica (copys nuevos: barra de guardado, modal de via masiva, celda de peso con "repartir en partes iguales").
- [ ] **Historial / auditoria:** el upsert de conjunto deja una sola entrada por guardado (patron de la grilla y del arbol), colgada del registro raiz.
- [ ] **Convenciones de mod:** escritura gobernada `*Validated`, transaccion propia (`runInTransaction`), sin llamar al CRUD generic.

## Frontera core/mod (Aduana)

**[CORREGIDO - ver aviso arriba. El veredicto por artefacto sigue siendo mod-only; se corrige la fila de "Asignacion desde la malla" (es cm-interno, no cross-mod). D1 (guard de publicacion) sigue siendo el unico cross-mod real hacia curriculum-design.]**

**Veredicto global (revisado): mod-only.** Todas las piezas dentro de 1770 son de curriculum-mapping. Ninguna toca el core. El unico cross-mod real es D1 (guard de suma al publicar), que sale a ticket aparte.

Evidencia extendida: `UPONE-1770-aduana` (leer con su aviso de cierre).

## Estimacion

**13 Story Points (publicado).** Con el alcance firme (upsert de conjunto, peso + reparto, dos vistas, via masiva) los 13 son apropiados. D1 sale a ticket aparte.

## Reglas de negocio a respetar

- **R-6:** solo `Evaluates` y `Both` producen evidencia de logro y participan del peso (`Develops` no pondera).
- **Estado del grupo derivado:** grupo automatico = todos los pesos iguales dentro de tolerancia; falso positivo inocuo. No crear campo ni objeto "grupo".
- **R-1..R-5/R-10 (de 1756):** se siguen aplicando por cada fila dentro del upsert de conjunto; el batch no las saltea.
- ~~**R-9**~~ **[FUERA - legacy, no aplica. Ver aviso arriba.]**

## Guia de ejecucion: reglas y patrones a considerar

- **[Patron] Upsert de conjunto:** copiar la semantica de `logic/competencyTree-upsert.resolver.js` (reemplazo total en `runInTransaction`) y el restablecimiento de RBAC de `curriculum-design/logic/planEntry-batch.resolver.js` (no delega en el generic). _Fuente: ambos resolvers._
- **[Regla] Reparto client-side (G-6):** el reparto en partes iguales es atajo de edicion en el cliente; lo que se persiste lo validan las reglas del resolver. _Fuente: CLAUDE.md del mod, G-6._
- **[Regla] Troceo en backend (AD-12):** el chunking del lote masivo vive en el backend, no en el cliente. _Fuente: CLAUDE.md del mod, AD-12; `matrixAdoption.resolver.js`._
- **[Vista por malla] cm-interno:** la vista por periodo se dibuja con `planEntry` que el mod ya lee (`alignmentView.resolver.js`); no importar `CurriculumMesh` de cd (M-26).
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

- **Cierre autoritativo:** `UPONE-1770 - cierre de alcance y correcciones` (sp11).
- **Referencias visuales:** `UPONE-1770 - referencias visuales de la maqueta` (10 capturas en sp11).
- Fuente canonica: UPONE-1770 (Jira). Epica UPONE-1452.
- Origen del peso y del nullable: `UPONE-1756-detalle-tecnico` §7. Division de tickets del PO: `UPONE-1756-plan-po`.
- Aduana (evidencia): `UPONE-1770-aduana`. Pre-intake (el como): `UPONE-1770-pre-intake`.
- Working copy: `curriculum-mapping@develop`, `curriculum-design@develop`.
