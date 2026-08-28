---
id: DOC-kb-onboarding-05-del-modelo-a-las-vistas
project: up1
type: doc
---

# Del modelo a las vistas — enfoque de diseno de mods

En UP1 el modelo de datos no es un detalle tecnico que se ajusta al final — es el artefacto del que se deriva todo lo demas. Definir los objects primero y construir las vistas despues no es preferencia estetica: es la secuencia que te permite aprovechar el codegen, evitar refactors costosos, y mantener coherencia entre backend y frontend.

Esta guia recorre ese flujo end-to-end, mostrando como cada decision en el modelo determina un patron concreto en la UI.

## Por que empezar por el modelo

```
Modelo JSON  ──►  codegen  ──►  Prisma + GraphQL  ──►  API lista
                                        │
                                        ▼
                               Layouts JSON referencian objectName y campos
                                        │
                                        ▼
                               LayoutOrchestrator renderiza la UI
```

La UI en UP1 no es un render imperativo: es una proyeccion declarativa del modelo. Cada columna, cada select, cada sublista, cada filtro en un layout referencia un campo o una relacion del object. Si el modelo es solido, la UI se arma en minutos; si el modelo es ambiguo, la UI es un parche constante.

**Tres consecuencias practicas de respetar el orden:**

1. **No hay re-trabajo**. Cambiar un nombre de campo despues de tener vistas significa tocar layouts, i18n, resolvers, seeds. Cambiarlo antes de codegen es editar una linea.
2. **Las relaciones ya estan expuestas**. GraphQL entrega las relaciones automaticamente (`caLevelscheme { name }`). Los layouts solo las consumen via `relations` + `relationDisplayFields`.
3. **Los limites quedan claros**. Definir donde vive cada object (business / tenants / mod) define tambien quien puede verlo en la UI y desde que tenants.

## Fase 1 — Modelar el dominio

El detalle exhaustivo esta en [04 — Modelar datos](04-modelar-datos.md). Aqui, los tres pasos imprescindibles antes de pensar en vistas.

### 1.1 Identificar entidades y relaciones

Dibuja el modelo como si fuera un ER tradicional. Para cada entidad responde:

| Pregunta | Impacto en UP1 |
|----------|---------------|
| ¿Quien la crea/edita/consulta? | Define si necesita RecordList, RecordDetail create, RecordDetail view/edit |
| ¿Tiene hijos? | Los hijos seran una sublista embebida (`record-list`) dentro del padre |
| ¿Referencia algo externo? | Define si es FK directa (mismo scope) o `publicId + denormalizacion` (cross-scope) |
| ¿Tiene jerarquia (parent-child)? | `parentId` con `references: "self"` + arbol como custom element |
| ¿Tiene estados/workflow? | El campo `status` habilita filtros, sub-layouts por estado, acciones condicionadas |

### 1.2 Decidir ubicacion de cada object

```
¿Core educativo compartido?      →  objects/business/Base/
¿Core pero variante por tenant?  →  objects/tenants/{TENANT}/Base/
¿Feature especifica del mod?     →  mods/{mod}/objects/
¿Campos extra sobre algo core?   →  objects/business/Extended/ext__<cliente>__<obj>.json
```

Esta decision determina **el scope de la UI**:

- Object en `mods/{mod}/objects/` → solo visible desde layouts de ese mod
- Object en `business/Base/` → reusable por layouts de cualquier mod
- Object en `tenants/{TENANT}/` → solo layouts con ese tenant en `tenants: [...]`

### 1.3 Resolver relaciones cross-scope

Si tu mod referencia una entidad core (ej: `Faculty` del tenant) **no uses FK directa**. Usa el patron `publicId + denormalizacion`:

```json
{
  "facultyPublicId": { "type": "string", "not_null": true },
  "facultyName": { "type": "string", "description": "Denormalized for display" }
}
```

En la UI ese par de campos se convierte en una celda que muestra `facultyName` directamente — sin join, sin relations, sin sobrecarga en el layout. La denormalizacion que en DB parece un snapshot historico, en la UI es rendimiento gratis.

## Fase 2 — El puente: modelo → patrones de UI

Aqui ocurre la traduccion que la mayoria de los mods hacen implicita. Vale la pena hacerla explicita: **cada decision del modelo determina un patron de layout concreto**.

### 2.1 Entidad simple (sin hijos) → RecordList + RecordDetail create/view

```
Object  ┬──► {object}_list      (RecordList, tabla)
        ├──► {object}_create    (RecordDetail mode: create, modal)
        └──► {object}_view      (RecordDetail mode: view)
```

Minimo viable para que una entidad sea gestionable desde la UI. Los tres layouts cubren crear, listar y ver. Editar se agrega con un cuarto layout `{object}_edit` si el flujo lo requiere.

### 2.2 FK interna (mismo scope) → columna con `relations`

Campo en el modelo:

```json
"caLevelSchemeId": { "isForeignKey": true, "references": "CaLevelScheme" }
```

Traduccion directa en el layout:

```json
{
  "key": "caLevelSchemeId",
  "label": "Esquema de Niveles",
  "relations": "calevelscheme",
  "relationDisplayFields": "CaLevelScheme.name"
}
```

El layout consume la relacion que el codegen ya expuso. No se escribe logica extra: el LayoutOrchestrator resuelve el join via GraphQL.

### 2.3 FK cross-scope (denormalizada) → columna directa al campo denormalizado

Campo en el modelo:

```json
"facultyName": { "type": "string", "description": "Denormalized for display" }
```

En el layout, se muestra el campo plano como cualquier otro:

```json
{ "key": "facultyName", "label": "Facultad", "sortable": true }
```

La diferencia conceptual: no hay `relations` porque no hay relacion Prisma. El dato vive en la misma tabla.

### 2.4 Relacion padre-hijo → sublista embebida con `{{parentId}}`

Si tu modelo tiene `ChildObject.parentObjectId → ParentObject`, la UI natural es:

- Padre: `RecordDetail` con un tab que contiene un `record-list`
- Hijo: `RecordList` normal, filtrado por el padre

```json
"childrenList": {
  "type": "record-list",
  "objectName": "ChildObject",
  "layoutId": "child_list",
  "layoutConfig": {
    "filters": [
      { "field": "parentObjectId", "operator": "EQUALS", "value": "{{parentId}}" }
    ]
  }
}
```

`{{parentId}}` lo inyecta el LayoutOrchestrator con el ID del padre. Sin esto, la sublista mostraria todos los hijos de todos los padres.

### 2.5 Jerarquia (self-reference) → custom element de arbol

```json
// Modelo
"parentId": { "type": "string", "references": "self" }
```

La UI ya no es una tabla plana. Se necesita un custom Vueform element que renderice el arbol:

```json
// Layout
"competencyTree": {
  "type": "competency-tree",
  "label": "Arbol",
  "columns": { "container": 12 }
}
```

El custom element se ubica en `modsComponents/CompetencyTree/CompetencyTreeElement.vue` y hace sus propias queries.

### 2.6 Campo `status` con workflow → sub-layouts filtrados + acciones condicionadas

Un campo `status` con valores discretos (`DRAFT`, `REVIEW`, `PUBLISHED`) habilita dos patrones a la vez:

**Vistas por estado** — varios RecordList con el mismo `objectName` y filtros predefinidos:

```json
"layoutConfig": {
  "filters": [{ "field": "status", "operator": "EQUALS", "value": "DRAFT" }]
}
```

**Row actions condicionadas** — visibilidad segun estado:

```json
{
  "label": "Eliminar",
  "type": "delete",
  "conditions": [{ "field": "status", "operator": "EQUALS", "value": "DRAFT" }]
}
```

Sin el campo `status` en el modelo, estos patrones no son expresables — obligan a logica custom en resolvers o handlers.

### 2.7 Tabla junction → layout de asociacion + sublista en ambos lados

Una tabla junction como `CaMatrixFaculty` (con denormalizacion) habilita:

- Sublista en el detalle de `CaCompetencyMatrix` → muestra facultades asociadas
- Sublista en el detalle de `Faculty` (si aplica) → muestra matrices asociadas
- Layout de creacion de la asociacion → modal para agregar una facultad a la matriz

Los campos denormalizados (`facultyName`) eliminan la necesidad de un join en la UI: la tabla de asociaciones ya tiene el nombre listo para mostrar.

## Tabla de traduccion rapida

| En el modelo (object JSON) | En el layout JSON | Produce en la UI |
|---------------------------|-------------------|-----------------|
| Campo `string` simple | columna `key` | Celda de texto |
| Campo `enum` / `static_default` | `select` con `items` | Dropdown con opciones fijas |
| `isForeignKey: true` (mismo scope) | columna con `relations` + `relationDisplayFields` | Celda con nombre del relacionado |
| `publicId` + campo denormalizado | columna directa al campo denormalizado | Celda con snapshot del nombre |
| `required: true` / `not_null: true` | `rules: ["required"]` | Asterisco + validacion client-side |
| FK hijo-padre | `record-list` con `{{parentId}}` | Sublista embebida en tab del padre |
| `parentId` con `references: "self"` | Custom element (`competency-tree`) | Arbol drag-and-drop |
| Campo `status` enumerado | sub-layouts con filters + rowActions con conditions | Vistas por estado + acciones condicionales |
| Tabla junction con campos denormalizados | `record-list` en ambas entidades | Panel de asociaciones bidireccional |

## Fase 3 — Construir las vistas

El detalle de cada tipo de layout esta en [03 — Construir vistas](03-construir-vistas.md). Con el modelo listo, el orden recomendado es:

```
1. {object}_list          → tabla base (RecordList minimo)
2. {object}_create        → modal de creacion
3. {object}_view          → detalle (pestana "General")
4. Sublistas hijas        → tabs adicionales con record-list embebido
5. Custom elements        → arboles, widgets, graficos
6. Row actions            → acciones por fila con permisos y condiciones
7. Sub-layouts por estado → vistas filtradas (borradores, publicadas, ...)
```

Cada paso es aditivo: el mod sigue funcionando entre paso y paso. Si te saltas alguno, simplemente esa interaccion no existe todavia — no rompes las demas.

## Caso end-to-end: un mod de Student Support

Para ilustrar la secuencia completa, un mod pequeno: gestion de casos de soporte estudiantil.

### Paso A — Modelo (antes de escribir un solo layout)

```
StudentSupport          ← entidad principal
  ├── code (string, unique)
  ├── studentPublicId   ← referencia cross-scope a Person
  ├── studentName       ← denormalizado para mostrar
  ├── status (OPEN / IN_PROGRESS / CLOSED)
  ├── priority (LOW / MEDIUM / HIGH)
  └── assigneeId → User (FK interna si User esta en el mismo scope)

SupportHistory          ← hijo (1:N)
  ├── studentSupportId → StudentSupport (FK)
  ├── action
  ├── actorName
  └── timestamp

SupportCategory         ← catalogo
  ├── code
  └── name
```

Decisiones del modelo:

- `StudentSupport` y `SupportHistory` viven en `mods/student-support/objects/` — son feature del mod
- `studentPublicId + studentName` porque `Person` vive en `business/Base/` — cross-scope → denormalizacion
- `assigneeId` como FK directa porque `User` lo asumimos dentro del mismo scope del mod
- `status` enumerado para habilitar vistas por estado y acciones condicionadas

### Paso B — Codegen y migracion

```bash
npm run sync
npm run codegen --workspace=@uplanner/object-management-backend
npx prisma migrate dev --name student_support_initial
```

En este punto, GraphQL ya tiene `studentSupports`, `createStudentSupport`, `updateStudentSupport`, `deleteStudentSupport`, etc. La UI aun no existe, pero el API esta viva — queryable desde el playground.

### Paso C — Mapeo modelo → layouts

| Elemento del modelo | Layouts derivados |
|--------------------|-------------------|
| `StudentSupport` (entidad con estados) | `student_support_list`, `student_support_create`, `student_support_view` |
| `status` enumerado | `student_support_open`, `student_support_closed` como sub-layouts |
| `studentName` (denormalizado) | Columna directa en el listado |
| `assigneeId` (FK interna) | Columna con `relations: "user"` + `relationDisplayFields: "User.name"` |
| `priority` | Columna sortable + select con `items` en el create |
| Relacion `StudentSupport ← SupportHistory` | Tab "Historial" en `student_support_view` con `record-list` embebido |
| Accion "Cerrar caso" | rowAction con `conditions: status != CLOSED` + capability |

### Paso D — Orden de construccion

1. **student_support_list** — tabla basica con `code`, `studentName`, `status`, `priority`
2. **student_support_create** — modal con campos requeridos + select de categoria
3. **student_support_view** — detalle con tab General
4. Agregar tab **Historial** a `student_support_view` con `record-list` hijo
5. Agregar **rowActions**: navegar a detalle, cerrar caso (condicionada), eliminar (solo DRAFT + permiso)
6. Agregar sub-layouts **student_support_open** / **student_support_closed** con filters predefinidos
7. `config/app.json` declara `defaultObjects`: tab "Casos de Soporte" apuntando a `student_support_list`

Cada paso es verificable en la UI antes de continuar. Si el paso 1 no funciona, no tiene sentido construir el paso 4.

## Anti-patrones de la secuencia

### Anti-patron 1: construir layouts antes de tener el modelo cerrado

```
❌  Escribiste student_support_list.json apuntando a campos que aun no estan en el object.
    El layout falla en runtime; cuando agregas el campo, hay que volver a tocar el layout.

✅  Cierra el modelo + codegen + migration primero. Layouts despues.
```

### Anti-patron 2: disenar el modelo pensando solo en DB, sin visualizar la UI

```
❌  Modelaste { matrixId, facultyId } como junction pura.
    Cuando vas a mostrar facultades de la matriz en la UI, tienes que hacer join en cada render.

✅  Si vas a mostrar la relacion, incluye campos denormalizados (facultyName) en el modelo
    desde el diseno. La UI sera trivial.
```

### Anti-patron 3: agregar campos "de UI" que no son de dominio

```
❌  Agregas displayOrder, isCollapsed, lastViewedAt al object porque la UI los necesita.
    Estos campos son estado de UI, no de dominio — ensucian la tabla y la API.

✅  Estado de UI vive en el cliente (local storage, estado de Vue, composables).
    El modelo solo persiste lo que es dominio.
```

### Anti-patron 4: duplicar vistas por cada estado en vez de sub-layouts

```
❌  Creas un object separado CaMatrixDraft, CaMatrixPublished, CaMatrixReview.

✅  Un solo object CaCompetencyMatrix con campo status + sub-layouts filtrados.
    El modelo queda limpio y la UI organizada.
```

### Anti-patron 5: reflejar en la UI distinciones que el modelo no hace

```
❌  En el layout mezclas condiciones que no tienen campo de respaldo:
    "mostrar este boton solo si el usuario es tutor del estudiante" — pero el modelo no tiene esa relacion.

✅  Si la UI necesita la distincion, primero asegurate que el modelo la expresa
    (campo, relacion, o capability). Si no, falla silenciosamente o devuelve permisos inconsistentes.
```

## Checklist consolidado

Antes de escribir el primer layout:

```
[ ] Dibuje el modelo (entidades, relaciones, cardinalidades, estados)
[ ] Identifique relaciones cross-scope → denormalice
[ ] Decidi ubicacion de cada object (business / tenants / mod)
[ ] Verifique que no existen duplicados en el monorepo
[ ] Defini campos de status / workflow si aplica
[ ] Corri codegen + migration + verifique en GraphQL playground
[ ] Mapee cada entidad a sus layouts necesarios (list / create / view)
[ ] Mapee cada relacion a su patron de UI (relations / record-list / custom element)
[ ] Defini capabilities + condiciones de rowActions antes de escribirlos
```

Solo entonces: abrir el primer archivo en `config/layouts/`.

## Resumen

- El modelo manda. Las vistas son proyecciones declarativas del modelo.
- Cada decision del modelo tiene un patron de UI correspondiente — la fase 2 hace ese mapeo explicito.
- Modelar primero ahorra refactors, expone el API gratis, y simplifica los layouts.
- La UI no debe inventar distinciones que el modelo no expresa.
- Orden: **modelo → codegen → mapeo → layouts → iteracion**. Sin saltos.

---

Anterior: [04 — Modelar datos](04-modelar-datos.md)
