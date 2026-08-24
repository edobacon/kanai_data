# ANALISIS - El `label` de los nodos estructurales de `requirement`: texto persistido vs key traducible

> Evaluacion pedida por el dev el 2026-08-17 al revisar UPONE-1541. **No es alcance del 1541**, que
> queda acotado a ajustar el seed. Este documento evalua el cambio y deja el material para decidir si
> se abre ticket. Verificado contra `uplanner/up1/mods/curriculum-design` (rutas relativas al mod).

## El problema

El editor de requisitos persiste en `requirement.label` **texto ya traducido al idioma del usuario que
creo el nodo**, no una key:

```
containerLabels = { orRoot: t('requirementAddModal.orRootLabel'), via: t('requirementAddModal.viaGroupLabel') }
```
`RequirementEditorElement.vue:811-814`, y esos valores viajan como `label` al `createFn`
(`requirementCreate.logic.ts:68-76, 93-101`).

Consecuencia: un arbol creado por un usuario hispanohablante queda con "Cualquiera de las vias"
grabado en la fila. Un usuario en ingles ve ese mismo texto en español, porque ya es dato, no key. El
mismo efecto aplica al pool electivo ("Electivo: K de N", `:831`) y al label derivado de la metrica
("Metrica (creditos) ≥ 60", `:733-736`).

**Alcance correcto del problema:** solo los labels **generados por el sistema** para nodos
estructurales. Los labels de hoja de curso son **dato** ("Calculo I (C-CALCULOIT-001)", derivado del
nombre real de la Activity) y no deben traducirse nunca.

## Quien consume ese `label`

Esto es lo que define la viabilidad de cada opcion. `label` es `not_null: true` y esta en `required`
(`objects/requirement.json:61-65, 97`).

| Consumidor | Uso | Capa |
|---|---|---|
| Arbol del editor | `RequirementTreeNode.ts:262`, salvo Group-via que ya lo ignora | mod |
| Modales Ver / Editar / Eliminar | lo muestran crudo (`:324`, `:359`, `:898`) | mod |
| Texto de la regla | `formatLeaf` arma `(X Y Z) O W` (`:502-509`) | mod |
| Busqueda en el arbol | `nodeSearchHaystack` lo indexa (`requirementEditor.logic.ts:282`) | mod |
| Evaluador de la malla | `evaluateRequirementTree.logic.ts:227,285,298,345` | mod |
| Impacto de borrado | `deletionImpact.logic.ts:217` | mod |
| CRUD generico | 9 layouts `default_rt__*__requirement_{create,edit,view}.json` exponen "Etiqueta" **editable**; `requirement` tiene `defaultLayoutType: RecordList` | **core** |

Hallazgo colateral: el evaluador de la malla ya tiene texto duro en español como fallback de label
("Umbral de creditos" en `:227,285`, "Grupo de requisitos" en `:345`). O sea que la deuda de i18n de
esta area no empieza ni termina en el seed.

## Opciones

### 1a. Derivar el nombre en render, con `label` nullable

El render deja de leer `label` en Groups estructurales y lo deriva del descriptor, que ya trae
`combinator`, `minToSatisfy` y `creditsRequired`
(`describeRequirementNode.logic.ts:11-28`). Es lo que **ya se hace** con las vias: el arbol ignora el
label del Group-via y muestra "Via N" traducido (`RequirementTreeNode.ts:263,268`).

- **Pro:** el texto se traduce segun quien mira, no segun quien creo. El dato queda limpio.
- **Contra decisivo:** `label` pertenece al objeto **base** `requirement`, compartido por los tres
  RecordTypes. No se puede volver opcional "solo para Group": seria nullable para todos, y la
  obligatoriedad por RecordType tendria que moverse a la capa de aplicacion. Eso es cambio de esquema
  del mod (codegen mas migracion) mas validacion nueva.
- **Costo:** alto. **Reversibilidad:** baja (migracion de datos).

### 1b. Derivar el nombre en render, sin tocar el esquema (recomendada si se ataca)

Igual que 1a en el render, pero se sigue persistiendo un valor en `label` para satisfacer
`not_null`. El editor y el arbol nunca lo muestran para Groups estructurales; el CRUD generico de core
lo muestra y sigue siendo legible.

- **Pro:** resuelve lo que el usuario ve en el editor sin cambio de esquema, sin migracion y sin tocar
  core. Se puede hacer incremental (primero el contenedor OR y el pool, que son los dos casos donde
  hoy el label persistido si se muestra).
- **Contra:** el dato conserva un texto en un idioma, aunque deje de ser el que manda en pantalla.
  Deuda cosmetica, no visible en el editor.
- **Costo:** bajo a medio. Toca `RequirementTreeNode` y conviene alinear `formatLeaf`, los modales y el
  evaluador de la malla para que no reintroduzcan el label crudo.
- **Reversibilidad:** total.

### 2. Persistir keys i18n en `label`

Guardar `requirementAddModal.orRootLabel` y resolver la key al mostrar.

- **Contra decisivo:** el RecordList y el RecordDetail de `requirement` son de **core**, y la i18n de
  up1 traduce keys de layout y labels de campo, no contenido de filas. La key se mostraria **cruda**.
  Ademas el campo "Etiqueta" es **editable** en esos 9 layouts, asi que cualquier usuario puede pisar
  la key con texto libre y romper la convencion.
- **Frontera core/mod:** para cerrarlo habria que hacer que core resuelva keys en valores de datos, o
  sea **Core Extension**, con impacto en toda la plataforma y no solo en este mod.
- **Veredicto:** no recomendada.

### 3. Status quo, documentado

Dejar el texto persistido y registrar la limitacion.

- **Pro:** costo cero, y es coherente con el objetivo de UPONE-1541: el seed queda igual de "duro" que
  cualquier arbol creado por un usuario real, que es exactamente lo que el ticket busca.
- **Contra:** la deuda de i18n sigue abierta, y crece con cada arbol que se crea.

## Recomendacion

Opcion **3 ahora** (es lo que el 1541 ejecuta) y **1b como ticket aparte** si se decide atacarlo. 1b
consigue casi todo el beneficio de 1a sin migracion ni cambio de esquema, y sigue el patron que el
propio codigo ya eligio para las vias. La 2 se descarta por la superficie de core.

Importante para la secuencia: **el 1541 no queda inconsistente con esto**. El seed persistira los
mismos literales que persiste la UI hoy. Si mas adelante entra 1b, el render deja de leer esos labels y
el seed se simplifica junto con la UI. No hay trabajo que se pierda en el medio.

## Que habria que decidir si se abre el ticket

- Alcance del render derivado: solo el contenedor OR y el pool electivo (los dos casos donde el label
  persistido hoy si se muestra), o tambien alinear `formatLeaf`, los modales y el evaluador.
- Que hacer con los fallbacks en español ya hardcodeados del evaluador de la malla
  (`evaluateRequirementTree.logic.ts:227,285,345`), que son el mismo problema en otra capa.
- Si los labels de hoja de curso quedan explicitamente fuera (son dato, no texto de sistema): conviene
  dejarlo escrito para que un futuro cambio no los "traduzca".
