---
id: DOC-kb-sp9-UPONE-1686-detalle
project: up1
type: doc
---

# UPONE-1686 - RecordList: columnas de proyeccion de relacion (dot-path)

> **Tipo:** Historia (stand-in temporal de "UP1 Feature"; el issue type propio aun no esta configurado
> en Jira). **Prioridad:** Menor. **Sprint:** SP9 (Migracion uAssessment). **Epic:** sin epic vinculado
> en Jira (verificado). **Asignado:** Eduardo Bacon. **Story Points:** sin estimar en Jira (ver seccion
> Estimacion). **Label:** `core-extension`. **Core/mods:** CORE. **Change Type:** New optional capability.
> **Origen:** UPONE-1619 (mod curriculum-design). **No bloquea** a UPONE-1619.
> **Jira:** https://u-planner.atlassian.net/browse/UPONE-1686
>
> **AVISO DE VERIFICACION (leer antes que nada).** La verificacion de codigo del 2026-08-20 refuta la
> premisa central del ticket: la capacidad que se pide construir en el RecordList **ya existe y esta
> mergeada a develop**. Ver seccion Contexto y la Decision abierta de re-scope. El request del PO se cita
> literal e intacto abajo (no se reescribe); la realidad verificada se encausa por Decisiones abiertas.

---

## 1. Fuente canonica (PO)

Descripcion del ticket en Jira, citada literal (no se reescribe):

> **Core Extension** (frontera core/mod). Issue type **Historia** usado como stand-in temporal: el tipo
> "UP1 Feature" aun no esta configurado en Jira. Origen: UPONE-1619 (mod curriculum-design). **No bloquea**
> a UPONE-1619.
>
> **Change Type:** New optional capability (agrega superficie nueva que ningun consumidor existente usa;
> el core team da green-light antes de implementar, luego PR + aprobacion core).
>
> **Descripcion funcional.** Una tabla (RecordList) hoy solo puede mostrar como columnas los campos
> reales del objeto base que lista. No puede mostrar, como columna, un atributo de un objeto relacionado
> (por ejemplo los campos de un RecordType satelite, o de una FK). El config del layout ya permite
> declarar la relacion a traer (clave `relations`) y columnas con sintaxis punto (`<relacion>.<campo>`),
> pero el motor las descarta: solo renderiza columnas que sean campo real del base. Se pide que el motor
> reconozca las columnas con sintaxis punto, las agregue como columnas (virtuales) y resuelva el valor
> caminando el dato de la relacion ya traido, respetando el RBAC del objeto relacionado. Beneficia a
> cualquier mod que quiera mostrar atributos de un objeto relacionado en una tabla.
>
> **Alcance: RecordList, no RecordDetail.** El RecordDetail ya resuelve el caso equivalente (en UPONE-1619
> el tipo de pieza se muestra por nombre con select nativo `references` + `valueField` + `displayField`).
> Este ticket es exclusivamente del RecordList (tabla/listado).
>
> **Criterios de aceptacion (del PO):** una columna con `key` = `<rel>.<campo>` renderiza el valor de la
> relacion (`item.data[<rel>].<campo>`); funciona en listado embebido y standalone; respeta el RBAC del
> objeto relacionado; se corrige el comentario obsoleto de `RecordList.vue:~7421`; se documenta la clave
> en `layout/docs/reference/record-list-config-keys.md`; tests (dot-path renderiza, relacion no declarada
> no rompe, sin permiso degrada); cero regresion en columnas existentes.
>
> **Consumidor:** el listado embebido de piezas dentro de la Modalidad (curriculum-design), que ya declara
> `relations` + columnas dot-path y hoy solo muestra "Nombre". UPONE-1619 cierra sin este ticket.

_(Texto completo en Jira. Sin comentarios ni adjuntos en el ticket a la fecha.)_

## 2. Historia de usuario

Como **disenador curricular**, quiero que el listado embebido de piezas dentro de una Modalidad muestre
los atributos de cada pieza (Tipo, Horas semanales, Tamano de grupo, Docentes) y no solo el Nombre, para
leer la carga de dictado sin abrir el detalle de cada pieza.

Como **equipo de plataforma**, quiero que cualquier RecordList pueda mostrar como columna un atributo de
un objeto relacionado, para no re-resolver este patron mod por mod.

## 3. Objetivo

Que un RecordList (embebido o standalone) muestre, como columna renderizada, el valor de un atributo de
un objeto relacionado declarado con sintaxis punto (`<relacion>.<campo>`), resolviendo el dato ya traido
por `relations` y respetando el RBAC del objeto relacionado. Como resultado concreto: que el listado de
piezas de la Modalidad muestre sus 4 columnas de atributos, no solo Nombre.

## 4. Contexto (para dimensionar)

> Esta seccion contiene el hallazgo que cambia el ticket. Todo lo de aqui esta verificado contra el
> codigo real de `layout` (rama develop) el 2026-08-20, salvo lo marcado como pendiente.

- **La capacidad pedida YA existe en el RecordList y esta mergeada a develop.** El mecanismo de columnas
  de proyeccion de relacion (dot-path, "to-one relation columns") vive hoy en:
  - `layout/src/composables/useColumnConfiguration.ts:108-119` (`relationColumnFields`): detecta una
    columna cuyo `key` contiene punto y no es campo real del base, y la construye como columna sintetica
    `fieldType: 'RelationField'`.
  - `layout/src/composables/useColumnConfiguration.ts:121-125` (`effectiveFields`): la mergea junto a los
    campos reales.
  - `layout/src/composables/useColumnConfiguration.ts:203-219` (gate): la columna de relacion es
    **opt-in**, se muestra solo si el layout la declara `visible: true`.
  - `layout/src/utils/recordListFormatters.ts:261-301` (`getDisplayValue`): camina el dot-path sobre
    `item.data` / `item.extended` / `item`, parseando objetos anidados serializados, y devuelve `-` si el
    camino es nulo.
  - El fetch lo sigue alimentando la clave `relations` ya existente
    (`layout/src/composables/useDataFetching.ts:143-156`; `RecordList.vue:2504`, `7447-7463`).
  - Merge: commit `4b9bf665` "feat(recordlist): support opt-in to-one relation columns" (2026-08-12), via
    PR #351, presente en `develop` y `origin/develop` (verificado con `git merge-base --is-ancestor`).
- **Por que el smoke vio solo "Nombre".** No es que el motor descarte las columnas: es que el mecanismo es
  opt-in y las 4 columnas dot-path del consumidor (`piezasList` en curriculum-design) **no declaran
  `visible: true`**. Verificado: en `mods/curriculum-design/config/layouts/default_rt__Modality__curricularsection_view.json:64-70`
  y `..._edit.json:40-45`, las columnas de relacion traen solo `key` y `label`, sin `visible`. Con el gate
  actual, una columna dot-path sin `visible: true` entra al arreglo como `visible: false` (aparece en el
  selector de columnas, no se renderiza).
- **Que parte del pedido del PO ya esta cubierta.** El AC principal ("una columna `<rel>.<campo>` renderiza
  el valor de la relacion") y el de list embebido/standalone estan satisfechos por el mecanismo actual una
  vez la columna declara `visible: true`. Lo que SI falta hoy: (a) el comentario obsoleto de
  `RecordList.vue:7417-7423` (atribuye el "append de columnas virtuales" a `applyLayoutColumnOverrides`,
  que no hace eso; el mecanismo real esta en `useColumnConfiguration.ts`); (b) la documentacion de la
  clave dot-path y del opt-in `visible: true` en `layout/docs/reference/record-list-config-keys.md` (hoy
  `relations` figura solo como fetch, sin clave de render); (c) `visible: true` en las 4 columnas del
  consumidor curriculum-design (esto es trabajo de MOD, no de core).
- **La premisa del ticket viene de un analisis previo desactualizado.** El analisis que origino este ticket
  (follow-up del smoke de UPONE-1619) inspecciono `applyLayoutColumnOverrides` (`RecordList.vue:7283-7298`)
  y concluyo que la capacidad no existia. Esa funcion efectivamente no agrega columnas dot-path, pero no es
  la funcion que las maneja: el mecanismo real (UPONE-1503 en el nombre de rama/PR) habia mergeado 7 dias
  antes por otra ruta de codigo. Es una contradiccion de frescura, no una falla del motor.
- **Fix vs feature:** contra la realidad verificada, esto NO es "construir una capacidad nueva". Es, a lo
  sumo, un cierre de deuda (comentario + doc) mas un cambio de config en el mod. Ver Decisiones abiertas.

## 5. Alcance

**Dentro** (si el ticket se mantiene, ya re-encausado a la realidad verificada):
- Corregir el comentario obsoleto/mal atribuido de `RecordList.vue:7417-7423`.
- Documentar la columna de proyeccion de relacion (dot-path) y su opt-in `visible: true` en
  `layout/docs/reference/record-list-config-keys.md`.
- Tests que fijen el contrato ya vigente (dot-path con `visible: true` renderiza; relacion no declarada no
  rompe; sin permiso del objeto relacionado degrada; columnas existentes sin regresion).
- Verificacion runtime (smoke) de que el consumidor real renderiza sus columnas con `visible: true`.

**Fuera:**
- Construir el mecanismo de dot-path desde cero (ya existe; ver Contexto).
- El cambio de `visible: true` en `piezasList` de curriculum-design: es trabajo de MOD (repo
  curriculum-design), no de este ticket de core. Se coordina, no se ejecuta aqui.
- La resolucion de nombre de FK escalar en celda (el "Ticket 1" acotado que se barajo en UPONE-1619):
  descartado para este caso; queda como candidato de plataforma independiente.
- Cualquier cambio al RecordDetail (ya resuelto en UPONE-1619).

## 6. Criterios de aceptacion (checkeables)

> Nota: varios AC del PO ya estan satisfechos por el mecanismo vigente. Se listan igual para verificar
> contra la entrega; la mayoria se cierran con evidencia de que ya se cumplen mas que con codigo nuevo.

- [ ] Una columna con `key` = `<rel>.<campo>`, con `<rel>` declarada en `relations` y `visible: true`,
      renderiza el valor de la relacion (`item.data[<rel>].<campo>`). _(Ya cubierto por el mecanismo
      vigente; verificar por smoke.)_
- [ ] Funciona en listado embebido (tab de un RecordDetail) y en listado standalone.
- [ ] Respeta el RBAC del objeto relacionado (degradacion controlada sin permiso).
- [ ] El comentario de `RecordList.vue:7417-7423` queda corregido y consistente con el mecanismo real
      (`useColumnConfiguration.ts`), sin atribuir el append a `applyLayoutColumnOverrides`.
- [ ] `layout/docs/reference/record-list-config-keys.md` documenta la columna dot-path y el opt-in
      `visible: true`.
- [ ] Cero regresion en columnas existentes que no usan dot-path.
- [ ] El opt-in `visible: true` queda documentado como requisito explicito (comportamiento distinto al
      default de campos reales, que son visibles salvo `visible: false`).

## 7. Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo (`sp9/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] Decision abierta de re-scope resuelta antes de entrar a sprint (mantener acotado / cerrar como ya
      resuelto / ampliar). Ver seccion Decisiones abiertas.
- [ ] Cambio en `layout` (comentario + doc + tests) revisado por el core team (proceso core-extension).
- [ ] Tests unit verdes que fijan el contrato del dot-path (no solo que pasan: que muerden si se rompe).
- [ ] Smoke runtime con evidencia (screenshot/DOM) del listado de piezas renderizando sus columnas con
      `visible: true`, en un tenant real. Hoy el consumidor solo esta verificado a nivel API/resolver
      (commit `840ba6c`, "Verificado por API"), no a nivel de render.
- [ ] No-regresion verificada en al menos un RecordList existente sin columnas dot-path.
- [ ] Si el veredicto es "cerrar como ya resuelto": el ticket declara explicitamente que el mecanismo ya
      existia (commit/PR de referencia) y que el gap real era doc + comentario + config de mod.
- [ ] Artefactos de sync/seed no commiteados.

## 8. Tests minimos (checkeables; ampliables en ejecucion)

- [ ] Columna dot-path con `visible: true` sobre una relacion declarada en `relations` -> renderiza el
      valor de la relacion.
- [ ] Columna dot-path **sin** `visible: true` -> no se renderiza (queda como opcion en el selector),
      confirmando el opt-in.
- [ ] Columna con `key` dot-path cuya relacion NO esta declarada en `relations` -> no rompe el render
      (la tabla sigue mostrando el resto).
- [ ] Sin permiso de lectura sobre el objeto relacionado -> degradacion controlada, la tabla no se rompe.
- [ ] RecordList con solo columnas de campo real (sin dot-path) -> render identico a antes (regresion).
- [ ] Smoke: abrir el detalle de una Modalidad con piezas y comprobar que Tipo, Horas semanales, Tamano
      de grupo y Docentes se muestran (con el consumidor en `visible: true`).

## 9. Factores transversales (checkeables)

- [ ] Permisos (RBAC): **aplica**. El render de la celda de relacion debe respetar el RBAC del objeto
      relacionado; verificar la degradacion sin permiso. _Fuente:_ `layout/src/utils/recordListFormatters.ts:261-301`.
- [ ] Historial / auditoria (DataLog): **N/A**. Cambio de presentacion en un listado, no de datos.
- [ ] Capa de lenguaje (i18n): **N/A** para el motor; los labels de columna los define el consumidor en su
      layout. Documentar en `record-list-config-keys.md` no introduce strings de UI.
- [ ] Accesibilidad (WCAG): **aplica (leve)**. Las columnas nuevas visibles en el listado embebido deben
      ser accesibles como cualquier columna de la tabla.
- [ ] Storybook: **aplica si** se agrega/ajusta una story del RecordList para el caso dot-path; **N/A** si
      el cambio es solo comentario + doc + tests.
- [ ] Design tokens (`var(--up1-*)`): **N/A**. No hay UI nueva; la celda usa el render existente.
- [ ] Documentacion: **aplica (nucleo del ticket)**. Documentar la clave dot-path y el opt-in `visible:
      true` en `layout/docs/reference/record-list-config-keys.md`.
- [ ] Convenciones de mod: **N/A en core**; el unico artefacto de mod (el `visible: true` de `piezasList`)
      es trabajo del repo curriculum-design, fuera de este ticket.

## 10. Frontera core/mod (Aduana)

**N/A por tipo de ticket:** UPONE-1686 es un **ticket core-only** (modifica `layout`, workspace de core).
La pasada de Aduana (frontera core/mod) corre para tickets que crean o modifican codigo de **un mod**; la
decision de frontera para esta capacidad ya se tomo en UPONE-1619 (se juzgo core-worthy y este ticket es
su materializacion). No se genera `aduana.md`.

Observacion de reparto (no es Aduana formal, es consecuencia del hallazgo): el trabajo se reparte en dos
lados y conviene tenerlo claro para no mezclarlos en un commit:

| Artefacto | Donde vive | Lado |
|---|---|---|
| Correccion del comentario `RecordList.vue:7417-7423` | `layout` (core) | core, este ticket |
| Doc de la clave dot-path + opt-in `visible:true` | `layout/docs/reference/record-list-config-keys.md` (core) | core, este ticket |
| Tests del contrato dot-path | `layout` (core) | core, este ticket |
| `visible: true` en las 4 columnas de `piezasList` | `mods/curriculum-design/config/layouts/default_rt__Modality__curricularsection_{view,edit}.json` | **mod**, fuera de este ticket (coordinar con curriculum-design) |

## 11. Dependencias

- **Depende de:** nada bloqueante. El mecanismo ya esta en develop.
- **Habilita:** que el listado de piezas de la Modalidad (curriculum-design) muestre sus columnas, una vez
  el mod agregue `visible: true`. Ese ultimo paso es del mod, no de aqui.
- **Coordinar con:** el equipo core (proceso core-extension para tocar `layout`) y con curriculum-design
  (para el cambio de config del consumidor).

## 12. Estimacion

**1 SP** si se re-encausa a la realidad verificada (comentario + doc + tests + smoke; el mecanismo ya
existe). **0 SP / cierre** si se decide cerrarlo como "ya resuelto" dejando el comentario y la doc como
tareas menores absorbidas por otro ticket o por el cambio de config del mod. La estimacion original
implicita (construir la capacidad de plataforma) **no aplica**: ese trabajo ya esta hecho y mergeado. El
factor que mueve la estimacion es la Decision abierta de re-scope, no el esfuerzo tecnico.

## 13. Decisiones abiertas

- [ ] **Re-scope del ticket (bloqueante para DoR).** La capacidad pedida ya existe y esta mergeada a
      develop (commit `4b9bf665`, PR #351, 2026-08-12). Opciones: **(A)** mantener el ticket acotado a lo
      que falta de verdad (corregir el comentario de `RecordList.vue:7417-7423`, documentar la clave
      dot-path + opt-in `visible:true`, agregar tests, smoke del consumidor) ~1 SP; **(B)** cerrarlo como
      "ya resuelto por el mecanismo existente" y mover el comentario/doc a una tarea menor; **(C)**
      ampliarlo si se quiere ademas la resolucion de nombre de FK escalar en celda (capacidad distinta, no
      pedida por el consumidor actual). **Recomendacion: A.** Requiere confirmacion del autor/PO. No se
      reescribe el request del PO; se encausa aqui.
- [ ] **Contradiccion de id a resolver.** El mecanismo mergeo bajo una rama/PR nombrada `feat/UPONE-1503`,
      pero en Jira **UPONE-1503 es otro tema** ("MGR-05 Revision: Roles y Permisos", asignado a Ignacio
      Jorquera, estado Developing). Confirmar bajo que ticket real quedo esa entrega para trazabilidad, y
      no citar UPONE-1503 como el ticket de las columnas dot-path. La evidencia solida es el commit/PR, no
      el id.
- [ ] **El `visible: true` en el consumidor es trabajo de mod.** Confirmar que el cambio de config en
      `piezasList` (curriculum-design) se toma en un ticket/tarea del mod, no dentro de este ticket de core.
- [ ] **Verificacion runtime pendiente del consumidor.** Hoy `piezasList` solo esta verificado a nivel API
      (commit `840ba6c` del mod: "Verificado por API"). Falta smoke de render. Confirmar que ese smoke lo
      cubre este ticket (recomendado, como cierre de la capacidad) o el ticket del mod.

## 14. Guia de ejecucion: reglas y patrones up1 a considerar

- **[Advertencia]** La columna de proyeccion de relacion es **opt-in**: se muestra solo con `visible:
      true`. Es el default opuesto al de un campo real (visible salvo `visible: false`). No asumir que
      declarar la columna basta para verla. _Fuente: `layout/src/composables/useColumnConfiguration.ts:203-219`._
- **[A favor]** El dato de la relacion se resuelve caminando `item.data[<rel>].<campo>`; el consumidor
      debe traer la relacion con `relations` y que el resolver enriquezca el objeto anidado. _Fuente:
      `layout/src/utils/recordListFormatters.ts:261-301`; `layout/src/composables/useDataFetching.ts:143-156`._
- **[A favor]** El RecordDetail es la implementacion de referencia del caso equivalente de FK escalar por
      nombre; NO rehacerlo. _Fuente: `layout/src/layouts/RecordDetail/RecordDetail.vue:2045` y `3427`._
- **[Evitar]** No atribuir el append de columnas virtuales a `applyLayoutColumnOverrides`
      (`RecordList.vue:7283-7298`): esa funcion no agrega columnas; el comentario de `7417-7423` que lo
      sugiere esta desactualizado. _Fuente: `layout/src/layouts/RecordList/RecordList.vue:7283-7298, 7417-7423`._
- **[Gate]** Tocar `layout` (core) va por el proceso core-extension: green-light del core team antes de
      implementar, PR con aprobacion core. _Fuente: label `core-extension` del ticket; `docs/guides/core-mod-boundary-workflow.md`._
- **Transversal:** en codigo, commits y PR usar solo el id de Jira; no editar archivos sincronizados a
      mano; tenant isolation en toda query. _Fuente: `up1/CLAUDE.md`._

## 15. Tickets relacionados

| Ticket | Que es | Relacion | Estado en Jira |
|---|---|---|---|
| UPONE-1619 | Curriculum Design: Implementacion de InstructionalComponent (Tarea) | antecedente / origen: de su smoke salio este follow-up; su `piezasList` es el consumidor concreto. No bloqueado por este ticket | Developing (En curso) |
| UPONE-1503 | MGR-05 Revision: Roles y Permisos (Historia, Ignacio Jorquera) | **contradiccion de id**: la rama/PR `feat/UPONE-1503` (commit `4b9bf665`, PR #351) shippeo el mecanismo dot-path, pero este id en Jira es otro tema. Confirmar trazabilidad | Developing (En curso) |

## 16. Referencias

- Fuente canonica: ticket Jira UPONE-1686 (descripcion del PO, citada en seccion 1).
- Evidencia de codigo (verificada 2026-08-20): `layout/src/composables/useColumnConfiguration.ts:108-125,
  203-219`; `layout/src/utils/recordListFormatters.ts:261-301`; `layout/src/composables/useDataFetching.ts:143-156`;
  `layout/src/layouts/RecordList/RecordList.vue:2504, 7283-7298, 7417-7423`;
  `layout/src/layouts/RecordDetail/RecordDetail.vue:2045, 3427`;
  `mods/curriculum-design/config/layouts/default_rt__Modality__curricularsection_view.json:58-86` y
  `..._edit.json:33-69`; `mods/curriculum-design/logic/curriculum-read.resolver.js:437-480, 512`;
  `layout/docs/reference/record-list-config-keys.md`.
- Merge del mecanismo: commit `4b9bf665` (2026-08-12), PR #351, en `develop`/`origin/develop`.
- Analisis interno (no pegar en Jira): registro de reconciliacion y pre-intake en el KB del sprint.
