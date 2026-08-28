---
id: DOC-kb-sp9-PRECONDICION-core-nombre-de-vista-por-app
project: up1
type: doc
---

# Precondicion de core: nombre de vista por aplicacion

> **Que es esto.** El paquete de evidencia de la **precondicion** que hoy no esta cumplida: mientras la
> plataforma no la resuelva, no es posible dar nombre propio a la vista de un objeto que otra aplicacion
> tambien declara. No es una mejora posterior ni un follow-up opcional: es el requisito **sin el cual esa
> parte del trabajo no se puede ejecutar**, en un ticket ni en ninguno.
> **Documento redactado para compartirse con el equipo de core y obtener su visto bueno.**
>
> **Ticket que la implementa: UPONE-1645** (Core | Nav | Nombre de vista declarable por aplicacion), en el
> sprint SP9, epic UPONE-1267. Su contrato esta en `sp9/UPONE-1645-detalle.md` y su guia de implementacion en
> `sp9/UPONE-1645-pre-intake.md`. Este documento es su anexo de evidencia: contiene la prueba capa por capa,
> el spike ejecutado y los pasos para recuperarlo.
>
> **Caso que la destapo:** UPONE-1616 (Curriculum Design, ajustar orden de los menus, SP9). Ese ticket se
> limita a lo que la plataforma ya ofrece; la parte que depende de esta precondicion queda fuera de su
> alcance por bloqueo, no por decision.
> **Evidencia validada contra codigo commiteado, con frescura verificada el 2026-08-17.**

---

## Resumen para decidir (lectura de un minuto)

**La precondicion.** Para que un mod pueda nombrar la vista que expone sobre un objeto, la plataforma tiene
que permitir declarar ese nombre **por aplicacion**. Hoy no lo permite: el nombre visible de una vista se
indexa por objeto, y no existe ningun punto donde declarar uno propio por app.

**Que queda bloqueado mientras no se cumpla.** Cualquier renombre de una vista cuyo objeto otra app tambien
declare. Concretamente hoy: las vistas de `Activity` y `Offering` en Curriculum Design.

**El caso.** En el tenant UPU, Curriculum Design y Engagement declaran ambos `Activity` y `Offering` como
vistas de menu. Curriculum Design necesita llamarlas "Programa de asignatura" y "Silabos"; Engagement las
llama "Actividad" y "Ofertas". **Las dos lecturas son correctas en su dominio**: para Engagement `Offering`
es una oferta de servicio, no un silabo. No hay un nombre correcto que arbitrar: hay dos nombres correctos
que deben convivir.

**Por que no se puede sortear desde el mod.** Las cuatro vias posibles estan cerradas, y una falla de forma
silenciosa: declarar la clave en el propio mod **pierde** frente al otro mod por orden alfabetico de capas,
asi que el cambio no toma efecto en ninguna parte.

**Lo que pedimos.** Poder declarar el nombre de una vista **en la entrada de esa vista**, por aplicacion, en
vez de heredarlo del objeto. Cambio aditivo, opt-in, compatible hacia atras, **cuatro archivos fuente de
core**.

**Ya esta probado.** Se implemento en local y se verifico en runtime: Curriculum Design quedo con el orden y
los nombres que pide el PO, y el menu de Engagement no cambio en nada. Ver seccion 5bis.

**Si core no lo prioriza.** La precondicion queda incumplida y las vistas afectadas conservan un nombre que
no corresponde a su dominio. El bloqueo se repetira cada vez que otro mod declare vistas sobre objetos Base
ya declarados por alguien mas.

---

## 1. La precondicion, enunciada como contrato

> Un mod debe poder declarar el nombre de la vista que **el** expone sobre un objeto, y ese nombre debe
> aplicar **solo a su propia app**, sin alterar el nombre global del objeto ni el que ve cualquier otra app.
> Debe cumplirse igual **sea el mod dueño del objeto o no**: tanto para un objeto propio del mod como para un
> objeto Base que varias apps declaran como vista.

La clave es **desacoplar el nombre de la vista del nombre del objeto**. Hoy estan pegados, y de ahi nace el
bloqueo: toda via que pase por el nombre del objeto es global por objeto y se filtra a las demas apps. Ningun
concepto de "propiedad del objeto" lo resuelve, porque el conflicto no es de autoridad sino de dominio: la
misma entidad **es** otra cosa en cada app.

### Propiedades que la capacidad debe cumplir

- [ ] El nombre se declara **por vista de una app**, no por objeto.
- [ ] Declararlo en una app **no tiene ningun efecto** en las demas apps que declaren el mismo objeto.
- [ ] Se cumple sin importar si el objeto es propio del mod o compartido; no depende de propiedad del objeto.
- [ ] Es **traducible** a los tres idiomas, no texto literal fijo.
- [ ] Es **opt-in y compatible hacia atras**: una vista que no lo declara se comporta exactamente como hoy.
- [ ] La **ruta de navegacion** y el **encabezado de la vista** quedan coherentes con ese nombre.

---

## 2. Evidencia: por que hoy la precondicion no esta cumplida

Seis capas, todas verificadas contra codigo commiteado.

### 2.1 El nombre de la vista se resuelve por nombre de objeto

`suite/composables/useObjectManager.ts:625-633`:

```js
const translationKey = objectGroup.isDashboards
  ? 'object.Dashboards'
  : `object.${objectGroup.objectName}`;
const label = translateWithFallback(
  translationKey,
  objectGroup.isDashboards ? 'Dashboards' : objectGroup.objectName
);
```

La clave es `object.<NombreObjeto>`, sin calificador de aplicacion. Ese `label` es el que pinta la vista
(`suite/components/static/ObjectNavBar.vue:32`).

### 2.2 La configuracion de la app no tiene donde declarar un nombre por vista

`object-manager/objects/up1/suite/up1_suite_app.json` (version commiteada). Campos: `name`, `label`,
`version`, `icon`, `iconBg`, `isActive`, `order`, `requiredPermissions`, `homescreen`, `defaultObjects`,
`navByRole`, mas metadata. El unico `label` es el de la **app**.

La descripcion del propio esquema lo declara, etiquetada `[UPONE-1513]`:

> "Tabs de nav compartidos por todos los roles. Acepta **el nombre de un objeto** (string legado) o el tab
> especial de dashboards `{ "dashboards": [layoutId...] }`. Mutuamente excluyente con navByRole."

Forma real de `defaultObjects.items`: `oneOf` de `{type: string}` o `{dashboards: [string]}` con
`additionalProperties: false`.

### 2.3 La vista resuelta en el servidor descarta cualquier clave extra

`suite/composables/navTabs.ts`:

```ts
export interface NavTab {
  kind: 'object' | 'dashboards';
  object?: string | null;
  layouts?: string[] | null;
  dashboards?: string[] | null;
}
```

`suite/logic/app.resolver.js:29-47` reconstruye el objeto campo por campo, asi que un nombre puesto a mano en
la configuracion **se descarta en silencio**:

```js
if (typeof entry.object === 'string') {
  return {
    kind: 'object',
    object: entry.object,
    layouts: Array.isArray(entry.layouts) ? entry.layouts : null,
    dashboards: null
  };
}
```

### 2.4 El contexto de traducciones no tiene dimension de aplicacion

`suite/utils/i18nBridge.ts:70-73`:

```ts
export function contextKey(ctx: I18nContext): string {
  return [ctx.language, ctx.country, ctx.institution.toLowerCase(),
          ctx.objectName || '', ctx.layoutType || '', ctx.layoutName || ''].join('|');
}
```

Idioma, pais, institucion, objeto, tipo de layout y nombre de layout. **La app no aparece.** Los niveles de
override son por tipo de layout, nombre de layout y objeto; ninguno por app.

### 2.5 Las traducciones de todos los mods se fusionan, con precedencia fija

`suite/scripts/lib/i18n-source-map.mjs`. Namespace por workspace:

```js
const ns = tenant ? `tenants/${tenant}/${stem}` : `${workspace}/${stem}`;
```

Orden de fusion:

```js
function layerOrderFor(workspaces) {
  const core = CORE_LAYER_ORDER.filter((n) => workspaces.some((w) => w.name === n && !w.isMod));
  const mods = workspaces.filter((w) => w.isMod).map((w) => w.name).sort();
  return [...core, ...mods];
}
```

Comentado en el archivo como "core first, mods last, mods override core". En runtime, `resolveNamespaces`
(`suite/utils/i18nBridge.ts:109-131`) recorre todos los workspaces en ese orden y despues el override por
tenant. Para una clave repetida **gana la ultima capa**.

**Consecuencia que agrava el bloqueo:** los mods se ordenan **alfabeticamente**. `uengagement-up1` va despues
de `curriculum-design`, asi que si Curriculum Design declara `object.Activity`, Engagement lo sobreescribe y
el cambio **no toma efecto**.

### 2.6 La capacidad de etiqueta de negocio del objeto tampoco es por app

`layout/src/shared/objectLabels.ts`, de UPONE-1504. Su docstring:

> "Los mensajes, titulos y tooltips compuestos por el motor mencionaban el `objectName` tecnico
> (`up1_suite_app_role`) en lugar del nombre que el administrador reconoce. `core_ObjectDefinition` ya declara
> `label`, `labelPlural` y `gender`; lo que faltaba era una cascada unica que los use."

Es una capacidad real y reciente, con soporte de mapa por idioma. No cumple la precondicion por dos motivos
independientes:

- **No alimenta el menu.** Sus consumidores son
  `layout/src/components/molecules/TableCell/TableCell.vue:373` y
  `layout/src/layouts/RecordDetail/RecordDetail.vue:236`.
- **Su unidad de nombrado sigue siendo el objeto.** `label` vive en `core_ObjectDefinition`, una fila por
  objeto y tenant. `mods/curriculum-design/objects/activity.json:7-8` ya declara
  `label: "Programa de asignatura"`: si el menu se cableara a esta cascada, la vista de Engagement mostraria
  ese mismo texto.

**Sintesis:** up1 tiene **dos** sistemas de nombres para un objeto, y **ninguno tiene dimension de
aplicacion**.

---

## 3. Como se manifiesta hoy

| App | Declara como vistas de menu |
|---|---|
| Curriculum Design (`mods/curriculum-design/config/app.json:9`) | Activity, AcademicProgram, Offering, Curriculum, core_DataLog |
| Engagement (`mods/uengagement-up1/config/app.json`) | OrgUnit, **Offering**, **Activity**, ActivityType, FormTemplate, Feedback, ProgramEnrollment, RiskFactor, Report |

Las dos apps estan habilitadas en el tenant UPU.

Particion de las cinco vistas de Curriculum Design segun si la precondicion las afecta:

| Vista pedida | Objeto | La declara otra app? | Requiere la precondicion? |
|---|---|---|---|
| Programas academicos | AcademicProgram | No | No, se puede hoy |
| Planes de estudios | Curriculum | No | No, se puede hoy |
| Historial de cambios | core_DataLog | No | No, se puede hoy |
| Programa de asignatura | Activity | **Si, Engagement** | **Si, bloqueada** |
| Silabos | Offering | **Si, Engagement** | **Si, bloqueada** |

---

## 4. Las cuatro vias mod-side, y por que ninguna sortea el bloqueo

1. **Declarar la clave en el mod que la quiere.** Pierde por orden alfabetico si el otro mod la declara. El
   cambio no toma efecto.
2. **Declararla en el override por tenant.** Gana sobre todos los mods, pero se aplica a las dos apps.
3. **Poner un nombre en la entrada de la vista de la configuracion de la app.** El normalizador la descarta en
   silencio.
4. **Cablear el menu a la cascada de etiqueta de negocio del objeto.** Esa etiqueta tambien es por objeto:
   mismo resultado.

---

## 5. Forma propuesta para cumplirla

Permitir que la entrada de una vista declare de forma opcional la clave de traduccion del nombre a usar:

```
"defaultObjects": [
  "AcademicProgram",
  "Curriculum",
  { "object": "Activity", "labelKey": "nav.curriculumDesign.activity" },
  { "object": "Offering",  "labelKey": "nav.curriculumDesign.offering" },
  "core_DataLog"
]
```

**Por que una clave de traduccion y no texto literal:** conserva la traducibilidad a los tres idiomas y, al
ser una clave que **cada mod define en su propio namespace**, dos mods pueden nombrar el mismo objeto de
forma distinta sin pisarse. Es lo que resuelve el problema de raiz: se deja de compartir la casilla de texto.

**Por que encaja con lo que ya existe:** la entrada de vista **ya admite forma de objeto** en el esquema, y la
normalizacion en el servidor **ya interpreta** una entrada con objeto y layouts. Falta llevar un campo mas de
punta a punta.

### Superficie de cambio estimada en papel (**superada por 5bis**, se conserva por trazabilidad)

> Esta es la estimacion **previa al spike**. Tiene dos errores que el spike corrigio: incluye la
> validacion del sync, que en realidad **no necesita cambios**, y omite el **tipo GraphQL**, que si es
> obligatorio. La superficie real, medida, esta en la seccion 5bis. Se conserva para dejar rastro de que
> cambio y por que.

| Pieza | Cambio |
|---|---|
| `object-manager/objects/up1/suite/up1_suite_app.json` | Sumar el campo a la variante de objeto, en la lista de vistas compartidas y en las entradas por rol |
| ~~`object-manager/scripts/sync/dbSync.js`~~ | ~~Validar el campo nuevo al sincronizar~~ **No hace falta:** ya tolera claves extra |
| `suite/logic/app.resolver.js` | Preservar el campo al normalizar la vista, en vez de descartarlo |
| `suite/composables/navTabs.ts` | Sumar el campo a la interfaz de vista resuelta |
| `suite/composables/useObjectManager.ts` | Preferir la clave declarada por la vista sobre la clave por objeto |
| **Faltaba:** `suite/logic/app.schema.graphql` | Declarar el campo en el tipo de vista; sin esto la API lo descarta |

**No requieren cambios:** la ruta de navegacion, porque reutiliza la etiqueta ya resuelta del menu
(`suite/composables/breadcrumbTrail.ts:216-220`); y el encabezado de la vista, que ya se resuelve por layout,
propio de cada mod.

### Ejes de la propuesta

| Eje | Valoracion |
|---|---|
| Esfuerzo | **Menor.** Cinco archivos de core, aditivo, mas doc y tests |
| Sensibilidad | **Baja.** Opt-in por entrada; sin el campo, el comportamiento no cambia |
| Reversibilidad | **Alta.** Quitar el campo restaura el comportamiento actual |
| Alcance del beneficio | Cualquier mod que declare vistas sobre objetos Base compartidos |

---

## 5bis. Spike de validacion: ejecutado y funcionando

La propuesta **no es teorica**. Se implemento en local (sin commitear) y se verifico en runtime contra el
stack completo, tenant UPU. Resultado: **funciona, y aisla por app**.

### Resultado observado

| App | Menu antes | Menu despues |
|---|---|---|
| Curriculum Design | Actividad, Programas academicos, Ofertas, Planes de Estudio, Historial de cambios | **Programas academicos, Planes de Estudio, Programa de asignatura, Silabos, Historial de cambios** |
| Engagement | Centros de apoyo, Ofertas, Actividad, Feedback, Disponibilidad, Eventos, Docentes, Estudiantes | **Sin cambios** (Ofertas y Actividad intactas) |

Es decir: se obtuvo el orden **y** los dos nombres que estaban bloqueados, sin ningun efecto en la otra
app. La declaracion usada, en la configuracion de navegacion de Curriculum Design:

```json
["AcademicProgram", "Curriculum",
 {"object":"Activity","labelKey":"nav.curriculumDesign.activity"},
 {"object":"Offering","labelKey":"nav.curriculumDesign.offering"},
 "core_DataLog"]
```

Y las claves declaradas en el **namespace propio del mod**
(`mods/curriculum-design/lang/es/common.i18n.json`), que es lo que hace imposible la colision: otro mod no
puede pisar `nav.curriculumDesign.*`.

### Superficie real, corregida por el spike

El analisis en papel estimaba cinco piezas y **se le habian escapado dos**: el tipo GraphQL y la seleccion
de campos del cliente. La superficie real, separando fuentes de artefactos de sync:

| Pieza | Tipo | Necesaria? |
|---|---|---|
| `suite/logic/app.resolver.js` (`normalizeTab` preserva el campo) | fuente | **Si**, funcional |
| `suite/logic/app.schema.graphql` (campo en el tipo `NavTab`) | fuente | **Si**, sin esto GraphQL lo descarta |
| `suite/composables/navTabs.ts` (campo en la interfaz) | fuente | Si, tipo |
| `suite/composables/useObjectManager.ts` (pedir el campo en la query **y** preferirlo sobre la clave global) | fuente | **Si**, funcional |
| `object-manager/src/graphql/resolvers/up1/suite/app.resolver.js` | **gemelo sincronizado** | se regenera por sync |
| `object-manager/src/graphql/typeDefs/up1.js` | **gemelo sincronizado** | se regenera por sync |
| `object-manager/objects/up1/suite/up1_suite_app.json` (declarar la variante en el esquema) | fuente | Opcional: no bloquea, pero corresponde por correccion y documentacion |

**Cuatro archivos fuente.** Los dos de object-manager son las copias sincronizadas de los de suite: en el
spike hubo que parchearlas a mano porque no se corrio sync, y ese es justamente el hallazgo de proceso.

### Lo que no necesito ningun cambio

- **La validacion del sync.** Verificada **por lectura** del codigo (no ejecutando sync, porque el spike
  escribio la configuracion directo en la base): solo exige que `object` sea string o `dashboards` un array,
  y no rechaza claves extra.
- **La persistencia.** `defaultObjects` es columna JSON: guardo la estructura con el campo extra tal cual.
- **La ruta de navegacion.** Ningun cambio, y quedo coherente sola, como estaba previsto.

### Confirmacion empirica de la precedencia

El publicador de catalogos imprime el orden de capas, que confirma lo deducido en 2.5:

```
Layer order: suite → layout → report-builder → academic-scheduling →
             curriculum-design → curriculum-mapping → uengagement-up1 → up1-manager
```

`curriculum-design` va **antes** de `uengagement-up1`, asi que para una clave compartida gana Engagement. Es
la razon por la que declarar `object.Activity` en el mod no habria funcionado, y por la que la solucion pasa
por una clave propia del mod en vez de por la clave global.

### Confirmacion incidental

El titulo de la pestaña del navegador mostro "Curriculum-design - UPONE" y "Upone-engagement - UPONE": el
nombre de la **app** capitalizado, nunca el de la vista. Confirma en runtime lo dicho en el ticket sobre la
ambiguedad del segundo criterio de aceptacion.

### Estado del spike: guardado en stash, recuperable

El entorno quedo **limpio** y el spike **archivado en stash** para recuperarlo cuando se implemente. No se
commiteo nada.

Stashes, con el mismo nombre en los dos repos:

```
PRECONDICION nombre de vista por app - spike UPONE-1616 (labelKey por entrada de nav)
```

| Repo | Contenido del stash |
|---|---|
| `suite` | Los 4 archivos fuente: `composables/navTabs.ts`, `composables/useObjectManager.ts`, `logic/app.resolver.js`, `logic/app.schema.graphql` |
| `mods/curriculum-design` | `lang/es/common.i18n.json` con las claves `nav.curriculumDesign.{activity,offering}` |

Los dos archivos de `object-manager` **no se guardaron en stash a proposito**: son artefactos generados
(uno esta gitignoreado y el otro tenia cambios previos de una regeneracion ajena al spike, que no
correspondia tocar). Se revirtieron a mano linea por linea y el sync los regenera desde las fuentes de
suite.

**Para recuperar el spike:**

1. `git -C suite stash pop` y `git -C mods/curriculum-design stash pop`.
2. Replicar los dos parches en las copias sincronizadas de `object-manager` (el campo en el tipo `NavTab` de
   `src/graphql/typeDefs/up1.js` y en `normalizeTab` de
   `src/graphql/resolvers/up1/suite/app.resolver.js`), o correr sync para que se regeneren.
3. Republicar catalogos de i18n desde `suite` para que las claves del mod entren al catalogo.
4. Aplicar la configuracion de navegacion de prueba en la base local del tenant:

```sql
UPDATE up1_suite_app
SET "defaultObjects" = '["AcademicProgram", "Curriculum",
  {"object":"Activity","labelKey":"nav.curriculumDesign.activity"},
  {"object":"Offering","labelKey":"nav.curriculumDesign.offering"},
  "core_DataLog"]'::jsonb
WHERE name = 'curriculum-design';
```

Valor original, para restaurar despues:
`["Activity", "AcademicProgram", "Offering", "Curriculum", "core_DataLog"]`.

En la implementacion real este paso 4 no existe: la declaracion vive en `config/app.json` del mod y el sync
la materializa.

## 6. Alternativas consideradas y por que no

- **Agregar la aplicacion al contexto de traducciones.** Cumpliria la precondicion, pero toca todo el pipeline
  de i18n (contexto, niveles de override, resolucion de namespaces, publicacion de catalogos e invalidacion
  de cache) y afectaria a **todos** los textos de la plataforma, no solo a la navegacion. Riesgo
  desproporcionado.
- **Cablear el menu a la etiqueta de negocio del objeto y darle alcance por app.** Es la direccion correcta a
  largo plazo, porque hoy conviven dos sistemas de nombres desconectados, pero exige tocar el modelo de datos
  y cambia el comportamiento de consumidores que ya existen (celdas de tabla y detalle de registro). Mas caro
  y mas sensible que lo que este caso necesita. **Vale registrarla como direccion arquitectonica.**
- **Convenir un nombre neutro que sirva a los dos dominios.** Es el estado actual: la precondicion sigue
  incumplida y el pedido sin satisfacer. Empeora a medida que mas mods declaran vistas sobre los mismos
  objetos Base.

---

## 7. Que le pedimos a core

El ticket **ya esta creado como UPONE-1645** (sprint SP9, epic UPONE-1267), con todo el detalle en su
descripcion. Lo que falta es la conversacion con core:

1. **Visto bueno sobre el enunciado de la precondicion** (seccion 1), o su correccion si core ve una
   formulacion mejor.
2. **Eleccion de la forma** para cumplirla: la propuesta de la seccion 5, o la alternativa que core prefiera.
3. **Si core aprueba**, confirmar quien lo ejecuta y en que sprint, para desbloquear los casos que dependen
   de ella. El ticket esta hoy asignado y estimado en 3 SP.
4. **Si core no lo prioriza**, mover UPONE-1645 fuera del sprint y dejar registrada la precondicion como
   incumplida, para que el proximo mod que choque no vuelva a investigarlo y sepa de entrada que ese alcance
   no es ejecutable.

**Coordinacion necesaria:** el equipo de Engagement es el otro afectado, porque comparte los dos objetos en
conflicto. Cualquier decision que cambie el nombre de esos objetos les impacta.

---

## 8. Que bloquea esta precondicion, hoy

**La implementa UPONE-1645.** Mientras ese ticket no se ejecute, lo siguiente queda bloqueado.

**En UPONE-1616.** El ticket **se limita a las herramientas que la plataforma ya ofrece**:

- **Entrega:** el reordenamiento de las cinco vistas, adoptando la capacidad de ordenamiento por mod que ya
  existe; y el nombre de las tres vistas cuyos objetos no comparte ninguna otra app.
- **No entrega, por precondicion incumplida:** el nombre de las vistas de `Activity` y `Offering`, que
  conservan el actual.
- **Si la precondicion se cumple**, esos dos nombres se pueden completar: dentro de 1616 si aterriza antes de
  su cierre, o en el ticket que consuma la capacidad.

**Mas alla de 1616.** Queda bloqueado el mismo escenario para cualquier mod: nombrar una vista propia sobre un
objeto Base que otra app ya declara. Es la razon por la que esto es una precondicion de plataforma y no un
detalle de un ticket.

---

## 9. Validacion de frescura (2026-08-17)

| Repo | vs origin | Sin commitear | Nota |
|---|---|---|---|
| `suite` | 0 detras, 0 adelante | limpio | Base de la evidencia de 2.1, 2.3, 2.4 y 2.5 |
| `mods/curriculum-design` | 0 detras, 0 adelante | limpio | |
| `object-manager` | 0 detras, 0 adelante | 54 archivos | Todos artefactos de sync. La afirmacion del esquema (2.2) se verifico contra la version **commiteada**; el unico delta local en ese archivo era una linea de descripcion en un campo de timestamp |
| `mods/uengagement-up1` | **2 detras** | limpio | Los commits pendientes son una vista de detalle de bloques de disponibilidad. **No tocan** su configuracion de app ni sus traducciones comunes, asi que no alteran el caso |
