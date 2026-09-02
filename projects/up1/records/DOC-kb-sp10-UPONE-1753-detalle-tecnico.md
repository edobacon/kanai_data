---
id: DOC-kb-sp10-UPONE-1753-detalle-tecnico
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle-tecnico
  - fuente-po
  - referencia-cruzada
  - UPONE-1753
---

# UPONE-1753-detalle-tecnico

> **Fuente:** artefacto de detalle tecnico entregado por el PM. URL: https://claude.ai/code/artifact/c2916f16-efec-4b27-bed5-0ac93890670a. CC: Francisco Navarro. Guardado en el KB como **referencia cruzada** de los tickets (informacion cruzada del PM), no es un contrato generado por nosotros. A validar contra el codigo/PR al ejecutar.

**UPONE-1753** (Epica UPONE-1452, curriculum-mapping)

Detalle tecnico para implementar el ticket: que objetos y archivos se tocan, que reglas del mod hay que respetar, y que decision hay que tomar antes de escribir codigo. Contrastado contra el estado real del repositorio, no contra la propuesta.

| | |
|---|---|
| Asignado | Francisco Navarro |
| Repo | curriculum-mapping, develop |
| Ultimo commit | 584499e, PR #21 |
| Maqueta | v29 |

## 1. Alcance

El ticket tiene dos partes, y su descripcion es un enlace a la maqueta. La maqueta muestra bastante mas de lo que este ticket pide, asi que el alcance lo fija el titulo:

| Parte | Que pide | Donde se implementa |
|---|---|---|
| **A. Menus** | Que los dos catalogos dejen de ser entradas de menu y se alcancen desde la lista de matrices | `config/app.json` + `config/layouts/default_CompetencyNode_list.json` |
| **B. Terminologia** | "Esquema de niveles" pasa a **Escala de desempeno**; "Esquemas de cobertura" pasa a **Niveles de desarrollo** | `objects/`, `lang/`, y segun la decision de S4, mas |

#### Fuera de alcance

La maqueta v29 incluye la pestana **Medicion**, el **modelo de medicion** como una sola eleccion, los **tres ejes de consolidacion** y las plantillas de perfil. Nada de eso entra aca: son cambios de modelo, y S6 los lista aparte porque tocan los mismos archivos y conviene no hacer el trabajo dos veces.

## 2. Punto de partida en el repo

El mod es repositorio propio, en `develop`, y su ultimo trabajo (PR #21, UPONE-1689) ya cerro desfases del modelo. Lo relevante para este ticket:

### Los tres objetos del modulo y su menu

```
// config/app.json
"defaultObjects": [
  "rt__Matrix__competencynode",   // Matrices de competencia
  "rt__Scheme__levelscheme",      // Esquema de niveles      <- sale del menu
  "CoverageScheme"                // Esquemas de cobertura   <- sale del menu
]
```

Las tres entradas son las tres pestanas que hoy se ven. Notese que no son homogeneas: dos apuntan a un *record type* y la tercera al objeto, porque `CoverageScheme` no declara archivos de record type (ver S5).

### Etiquetas actuales

| Objeto | `metadata.label` | `metadata.labelPlural` | Capabilities |
|---|---|---|---|
| `LevelScheme` | Esquema de niveles | Esquemas de niveles | `levelscheme:view, create, modify, delete, version` |
| `CoverageScheme` | Esquema de cobertura | Esquemas de cobertura | `coveragescheme:view, create, modify, delete` |
| `CompetencyNode` | Matriz de competencias (via `lang/es/common.i18n.json`) | (idem) | (n/a) |

### Configuracion de la matriz, hoy

Los campos de la matriz viven en el record type, no en el objeto base. Esto es lo que hay declarado en `objects/RecordTypes/rt__Matrix__competencynode.json`:

| Campo | Valores | Estado |
|---|---|---|
| `levelSchemeId` | FK al catalogo de escalas | existe |
| `matrixType` | `Generic, Values, Disciplinary, Professional` | existe |
| `adoptionScope`, `adoptionPolicy` | `Institution, OrgUnit, Explicit`, `Optional, Mandatory` | existe |
| `defaultEvaluationMode` | `OwnRubric, DerivedFromOutcomes` | existe |
| `defaultRubricModel` | `Holistic, Criterion` | existe |
| `aggregationMode` | `Min, Max, WeightedAvg, Mode, Last` | existe |
| `status` | `Draft, InReview, Approved, Active, Deprecated, Archived` | existe |
| `coverageSchemeId` | FK al catalogo de cobertura | no existe |

Que `coverageSchemeId` no exista importa para este ticket por una razon de nombre: cuando se agregue, ya deberia nacer con la terminologia nueva en vez de repetir el renombre.

## 3. Parte A. Menus

La capacidad que hace falta **ya existe y esta en produccion** en otro mod: es el boton *Catalogo bibliografico* de la lista de Programas de asignatura. Se declara en el layout de lista, no en codigo, y abre otra vista como modal. El precedente literal esta en `curriculum-design/config/layouts/default_Activity_list.json`:

```
// layoutConfig, el precedente, tal como esta hoy en curriculum-design
"modalActionButtons": [
  {
    "label": "Catalogo bibliografico",
    "languageTag": "action.bibliographyReferences",
    "layoutName": "bibliographyReferences",
    "layoutType": "RecordList",
    "objectName": "BibliographyReference",
    "icon": "bi bi-journal-bookmark",
    "requiredPermission": "bibliographyreference:view",
    "modalTitle": "Catalogo bibliografico"
  }
],
"layoutNameMap": {
  "bibliographyReferences": "default_BibliographyReference_list"
}
```

### Que hay que escribir

Dos archivos, ningun componente nuevo:

```
// 1. config/app.json, el menu queda con una entrada
"defaultObjects": [
  "rt__Matrix__competencynode"
  // se elimina: "rt__Scheme__levelscheme", "CoverageScheme"
]

// 2. config/layouts/default_CompetencyNode_list.json -> layoutConfig
"modalActionButtons": [
  {
    "label": "Niveles de desarrollo",
    "languageTag": "action.developmentSchemes",
    "layoutName": "developmentSchemes",
    "layoutType": "RecordList",
    "objectName": "DevelopmentScheme",     // nombre nuevo (S4)
    "icon": "bi bi-signpost-split",
    "requiredPermission": "developmentscheme:view",
    "modalTitle": "Niveles de desarrollo"
  },
  {
    "label": "Escala de desempeno",
    "languageTag": "action.performanceScales",
    "layoutName": "performanceScales",
    "layoutType": "RecordList",
    "objectName": "PerformanceScale",
    "icon": "bi bi-bar-chart-steps",
    "requiredPermission": "performancescale:view",
    "modalTitle": "Escala de desempeno"
  }
],
"layoutNameMap": {
  "developmentSchemes": "default_DevelopmentScheme_list",
  "performanceScales":  "default_PerformanceScale_list"
}
```

### Reglas a respetar

- **El `layoutName` es un alias, no un id.** Se resuelve por `layoutNameMap`; si el alias no esta mapeado, el boton abre vacio. Los cuatro layouts de cada catalogo (`list, view, edit, create`) ya existen, asi que no hay que crearlos.
- **`requiredPermission` usa las capabilities que ya estan declaradas.** Son las mismas cinco y cuatro de hoy con el nombre nuevo. Un permiso inexistente esconde el boton en silencio, asi que el renombre de capabilities tiene que estar hecho antes que el boton.
- **El `languageTag` manda sobre el `label`.** Hay que crear las dos claves en `lang/{es,en,pt}`; el `label` queda como ultimo recurso si falta la traduccion.
- **Los layouts de los dos catalogos no declaran `openMode`**, asi que el registro abrira con el comportamiento por defecto. En el precedente abre **anidado en Modo Vista**, que es lo que la maqueta replica; si en local abriera como ruta y sacara al usuario del modal, hay que declararlo explicitamente en el layout de destino.

> **Verificar antes de cerrar:** sacar un objeto de `defaultObjects` le quita la entrada de menu, pero **no comprobamos si ademas le quita la ruta directa**. Si la ruta sigue viva, el catalogo queda accesible por URL y eso esta bien; si el sync la elimina, hay que confirmar que el modal no dependa de ella. Es la unica incognita de la Parte A y se resuelve levantando el entorno local.

## 4. Parte B. Terminologia

El cambio de vocabulario viene del estado del arte en diseno curricular, y la razon por la que importa es que los dos nombres actuales son ambiguos entre si: "esquema de niveles" y "esquema de cobertura" se distinguen solo por la segunda palabra, y ninguna dice que mide.

| Hoy | Pasa a | Por que |
|---|---|---|
| Esquema de niveles | **Escala de desempeno** | *Performance levels / proficiency scale*. Es la escala con que se juzga el logro: nombra que mide, no que es un esquema |
| Esquema de cobertura | **Niveles de desarrollo** | *Developmental levels*. Es la progresion curricular I/R/M. "Cobertura" sugeria cuanto se cubre, que es otra cosa |

> **No usar "nivel de dominio":** en la tradicion anglosajona *mastery* designa el eje de logro, y ademas "Domina" es uno de los **valores** de la escala de desarrollo. Usarlo como nombre del catalogo choca con su propio contenido.

### El renombre alcanza a los objetos

No es solo cambiar etiquetas: el alcance incluye la **identidad de los objetos**, de modo que codigo y producto queden hablando el mismo idioma. Son dos capas, y la segunda es la que define el tamano del trabajo.

| Capa | Que cambia | Archivos |
|---|---|---|
| **Visible** | `metadata.label`, `labelPlural`, `description`, `gender`, y las claves de `lang/{es,en,pt}` | ~10 |
| **Identidad** | `title` del objeto, ids de record type, FKs, capabilities, mutations GraphQL, nombres de layout y de componente, seeds y tests | ~50 |

#### El mapa de renombres

Los nombres nuevos salen de la propuesta de dominio, para que el modelo y la interfaz coincidan:

| Que | Hoy | Pasa a |
|---|---|---|
| Objeto | `LevelScheme` | `PerformanceScale` |
| Objeto | `CoverageScheme` | `DevelopmentScheme` |
| Record types | `rt__Scheme__levelscheme`, `rt__Level__levelscheme` | `rt__Scheme__performancescale`, `rt__Level__performancescale` |
| FK de la matriz | `levelSchemeId` | `performanceScaleId` |
| FK de la rubrica | `RubricDescriptor.levelId` -> `LevelScheme` | la referencia apunta al nombre nuevo; el campo puede quedarse |
| FK de la tributacion | `CompetencyAlignment.coverageLevelId` -> `CoverageScheme` | `developmentLevelId` -> `DevelopmentScheme` |
| Capabilities | `levelscheme:{view,create,modify,version,delete}`, `coveragescheme:{view,create,modify,delete}` | `performancescale:*`, `developmentscheme:*` |
| Mutations | `upsertLevelScheme[Validated]`, `deleteLevelScheme[Validated]`, y sus pares de `CoverageScheme` | los cuatro pares con el nombre nuevo |
| Layouts | `default_LevelScheme_{list,view,edit,create}` y los cuatro de `CoverageScheme` | ocho archivos renombrados, mas su `id` y `objectName` interno |
| Componente | `modsComponents/LevelSchemeEditor/` (3 archivos) | `PerformanceScaleEditor/` |

> **El riesgo real, y lo que hay que confirmar con el tech lead:** la pregunta ya no es *si* se renombra, sino **como se ejecuta**. En `object-manager/scripts/sync/` hay renombre para *valores de enum* (`SyncManager.js`), pero **no encontramos ruta para el nombre de un objeto**. Si no existe, cambiar el `title` se comporta como *objeto nuevo mas objeto huerfano*: el sync crea la estructura nueva y los datos quedan en la vieja.
>
> Los dos record types **comparten tabla** (decision D-12a del mod), asi que no es mover una tabla: es una tabla con dos poblaciones separadas por el enum `recordType`. Antes de tocar el `title` hay que saber si el sync lo migra, si hace falta un script, o si conviene recrear desde seed, que hoy es viable porque el mod aun no esta en produccion, y es justamente la razon para hacerlo ahora y no despues.

> **Lo que el renombre si resuelve de una vez:** hacerlo ahora evita que siga naciendo codigo con el nombre viejo. El caso inmediato es el `coverageSchemeId` que le falta a la matriz (S2): si se agrega antes del renombre, hay que renombrarlo dos veces.

### Inventario de la capa visible

Los archivos de etiquetas y textos, con su conteo verificado. La capa de identidad son los renombres de la tabla de arriba mas sus referencias:

| Archivo | Que contiene | Claves |
|---|---|---|
| `objects/LevelScheme.json` | `metadata.label`, `labelPlural`, `description` | 3 |
| `objects/CoverageScheme.json` | idem | 3 |
| `lang/es/common.i18n.json` | `object.LevelScheme`, `object.CoverageScheme` | 2 |
| `lang/{en,pt}/common.i18n.json` | idem, traducidos | 4 |
| `lang/*/LevelScheme.i18n.json` | `parentId` dice "Esquema padre" | 3 |
| `lang/*/CoverageScheme.i18n.json` | idem | 3 |
| `lang/*/{levelScheme,coverageScheme}Editor` | Confirmaciones de activar/inactivar que dicen "el esquema" y "la escala" | ~12 |
| `config/layouts/default_*_{list,view,edit,create}.json` | Titulos y textos de modal | 8 |

> **Cuidado con el genero:** `metadata.gender` esta en `masculino` para los dos, correcto para "el esquema". **"Escala de desempeno" es femenino**, asi que hay que cambiarlo o los mensajes generados por el core saldran como "el escala". Los textos de `coverageSchemeEditor` ya mezclan los dos generos hoy ("el esquema" y "la escala" en el mismo archivo): conviene unificar en la misma pasada.

## 5. Reglas del mod que aplican

Estan en el `CLAUDE.md` del mod, y las cuatro que este ticket puede romper:

| Regla | Que implica aca |
|---|---|
| **Escrituras por mutations `*Validated`** | Nunca CRUD generico ni Prisma directo, porque las constraints de Prisma no cubren las validaciones del mod. Excepcion documentada: los seeds dev-controlled. Este ticket no deberia escribir datos, pero si el renombre exige tocar seeds, van por la excepcion |
| **El `appId` se resuelve por el nombre de la carpeta** | `configSync.js:103,143` busca `up1_suite_app` por el nombre del folder, no por el `name` del `app.json`. Cambiar uno sin el otro rompe el sync. El repo ya paso por esto: se llamaba `curricular-mapping` |
| **D-12a. `isActive` cascadea a los niveles** | Un nivel no tiene ciclo de vida propio. Cualquier texto de confirmacion que se reescriba tiene que seguir diciendo que la accion arrastra los niveles, porque describe lo que de verdad pasa en la transaccion |
| **D-imp-5. no se declaran RT vacios** | Por eso `CoverageScheme` no tiene archivos de record type y su entrada de menu apunta al objeto. Al mover el boton hay que apuntar al objeto (`DevelopmentScheme` tras el renombre) y dejar que el layout filtre por `recordType`, sin inventar un `rt__Scheme__developmentscheme` |

## 6. Deltas entre la maqueta y el repo

No son parte del ticket. Se listan porque **tocan los mismos archivos**, y quien entre a renombrar los va a ver: conviene saber si se arreglan de paso o se dejan para su propio ticket.

| Campo en el repo | Maqueta / propuesta | Que hay detras |
|---|---|---|
| `defaultRubricModel: Holistic, Criterion` | `Holistic, Analytic` | Terminologia: la literatura llama *analytic rubric* a la desglosada en criterios. Es un renombre de valor de enum, y el sync **si** soporta eso |
| `defaultEvaluationMode`, `defaultRubricModel` | sin el prefijo `default` | El prefijo suponia override por competencia. Se retiro: el instrumento rige en toda la matriz, porque si cada competencia usa otro, sus logros no son comparables |
| `aggregationMode` con 5 modos, un eje | 2 modos, 3 ejes + base del logro | Se retiraron `Mode` y `Last` por falta de sustento teorico, y `Min` con una consecuencia declarada: es la regla conjuntiva de acreditacion, y sin ella una matriz ABET no es representable |
| (no existe) | `requiresAllCriteria` | Booleano: si el logro exige cobertura total de criterios o se calcula sobre los evaluados |
| (no existe) | `coverageSchemeId` | La matriz aun no declara su catalogo de niveles de desarrollo. Al agregarlo, que nazca con el nombre nuevo |

## 7. Orden de ejecucion

El orden importa en un punto: **el renombre va antes que el boton**, porque el boton declara `objectName` y `requiredPermission`, y los dos cambian con el renombre.

1. **Resolver como se ejecuta el renombre de los objetos** con el tech lead: si el sync migra la tabla, si hace falta un script, o si se recrea desde seed.
   Bloquea todo lo demas. Es la unica pregunta abierta del ticket (ver S4).

2. **Renombre de los objetos**: `title`, record types, FKs, capabilities, mutations, layouts y componente, segun el mapa de S4. Y la **capa visible** en la misma pasada: `metadata` de los dos objetos y las claves de `lang/{es,en,pt}`, incluido el `gender` de la escala.
   `objects/**`, `logic/**`, `config/layouts/**`, `lang/**`, `capabilities.json`, `seed/**`.

3. **Menu**: dejar `defaultObjects` con la matriz.
   `config/app.json`.

4. **Botones**: `modalActionButtons` y `layoutNameMap` en el layout de lista de la matriz, mas las dos claves de `languageTag`.
   `config/layouts/default_CompetencyNode_list.json`, `lang/**`.

5. **Sync y verificacion en local**: que el menu quede con una entrada, que los dos botones abran su lista, que el registro abra anidado en Modo Vista, y que crear, editar, clonar e inactivar sigan funcionando *desde dentro del modal*, es lo que mas facil se rompe, porque el contexto del objeto ya no viene de la pestana activa.
   Incluye el caso de la ruta directa que quedo como incognita en S3.

6. **Tests**: `tests/integration` tiene 10 archivos que nombran los catalogos. Si el alcance es solo etiquetas, deberian pasar sin cambios; si alguno falla, esta afirmando una etiqueta y conviene que afirme el codigo en su lugar.
   `tests/integration/**`.

---

Preparado sobre el repo `curriculum-mapping` en `develop` (ultimo commit `584499e`) y la maqueta v29. Los conteos de archivos y los nombres de campo se verificaron en el codigo; lo unico no verificado esta marcado como tal en S3 y S4. Si el repo avanzo despues de esta fecha, revalidar S2 antes de usar S7.
