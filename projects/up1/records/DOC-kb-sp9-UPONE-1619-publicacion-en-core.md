---
id: DOC-kb-sp9-UPONE-1619-publicacion-en-core
project: up1
type: doc
---

# UPONE-1619 - Que se publica en core, y por que necesita ticket propio

> **Interno, no pegar en Jira.** Mide el lado **core** del refactor de InstructionalComponent: que archivos
> del repo `object-manager` cambian, cuales el sync propaga solo y cuales **no**.
>
> **Resolucion (2026-08-17): este tramo va DENTRO de UPONE-1619**, como sub-tarea 1C-c, no en un ticket
> aparte. Es la misma implementacion aunque viva en otro repo, y el precedente del equipo es exactamente
> ese. El razonamiento completo esta en la seccion 5.
>
> Nace de dos correcciones del dev (2026-08-17):
> 1. **En up1 hoy no hay datos productivos.** Todo el dato existente es de prueba, aunque se parezca al de
>    un cliente real. Eso desarma el gate de rescate/backfill que el contrato traia como bloqueante.
> 2. **Lo que si hay que coordinar con core es que este refactor toca objetos publicados dentro del core.**
>
> Base: el artifact "Plan de tickets · InstructionalComponent" y su bajada tecnica en
> `kb/sp8/instructional-component-plan-implementacion.md`. Contrato del ticket: `UPONE-1619-detalle.md`.
> Todo lo de aqui esta **verificado contra el repo `object-manager` el 2026-08-17**.

---

## 1. Por que existe este documento: lo que la pasada de Aduana no mide

La pasada de Aduana sobre los 7 artefactos dio `todo-mod-only`, y **sigue siendo correcta**: juzga
**genericidad** (si el artefacto deberia vivir en el core porque otro mod lo necesitaria), y ninguno de
los 7 lo es. La pieza de dictado es de curriculum-design, no de la plataforma.

Lo que ese eje no mide es la **mecanica de publicacion**: en up1 **todo objeto de mod termina publicado y
commiteado dentro del repo de core**. No es un efecto colateral, es como funciona el sync.

```
mods/curriculum-design/objects/**            fuente, repo del mod
        │  sync fase 1 (mirror) + fase 2 (merge)
        ▼
object-manager/objects/business/Base/*.json          81 archivos VERSIONADOS en core
object-manager/objects/business/RecordTypes/*.json
        │  codegen
        ▼
object-manager/prisma/<TENANT>/schema.prisma          18 schemas
object-manager/src/graphql/typeDefs/dynamic.js
```

Verificado: `git check-ignore` sobre el RecordType publicado devuelve que **no esta ignorado**, y
`git ls-files objects/business/` lista **81 archivos trackeados**.

Asi que un artefacto puede ser `mod-only` por genericidad y aun asi exigir **un commit en el repo de
core**. Son dos preguntas distintas y este ticket dispara las dos.

---

## 2. El hallazgo que obliga al ticket: el merge del sync no sabe quitar

El merge de la fase 2 es **union / append-only por diseño**: agrega lo que el mod declara y **nunca quita
lo que el mod deja de declarar**. Hay dos constancias en el historial del propio core.

**Precedente A, el de planEntry (el caso que el dev recuerda).** `UPONE-1623`, commit `fbdcfcb6`:

> "The core Base object kept `period` in planEntry.required, so codegen emitted period as NOT NULL,
> contradicting the field's own not_null:false and breaking inserts into modular plans. **The sync merge
> is union-only and cannot drop a required field, so this must be fixed in core.**"

Archivos que toco, y es exactamente la forma del cambio que aca se repite:

| Archivo | Repo |
|---|---|
| `objects/business/Base/planentry.json` | core |
| `prisma/BASEMODEL/schema.prisma` | core |
| `prisma/UPU/schema.prisma` | core |

Origen declarado en el propio commit: **UPONE-1539 (cerrada) dejo pendiente el lado de core**. Es decir,
ya paso una vez que un ticket de mod cerro dejando su deuda en core, y hubo que abrir otro despues.

**Precedente B, el de scheduling.** `UPONE-1523`, commit `00b35fb1`:

> "the merge is **append-only by design (never removes fields a mod stops declaring)**, so removing
> `Scenario.termId` required **deleting the stale merged `business/Base/scenario.json` once** and letting
> `sync:files` regenerate it from the current mod source. Leaving this uncommitted previously caused it to
> revert to the old termId-bearing version."

La ultima frase es la trampa operativa: si el archivo mergeado no se **commitea**, la proxima corrida lo
revierte a la version vieja y el retiro se deshace solo.

**Consecuencia para UPONE-1619:** quitar las cuatro columnas de horas del JSON del mod **no las quita de
la plataforma**. El RecordType publicado en core las conserva, el codegen las sigue emitiendo y las
columnas siguen vivas en los 18 schemas. El retiro **solo ocurre con una intervencion commiteada en el
repo de core**.

---

## 3. Medicion: que cambia en core, pieza por pieza

### 3.1 Altas, que el sync publica sin ayuda

| Artefacto | Archivo en core | Riesgo |
|---|---|---|
| Catalogo de tipos de pieza | `objects/business/Base/<catalogo>.json` (nuevo) | Bajo |
| RecordType de la pieza | `objects/business/RecordTypes/rt__InstructionalComponent__curricularsection.json` (nuevo, seria el **noveno** RT publicado de `curricularsection`) | Bajo |
| Modelos generados | 2 modelos nuevos en cada uno de los **18** `prisma/<TENANT>/schema.prisma` | Bajo |
| Tipos GraphQL | `src/graphql/typeDefs/dynamic.js` (auto-generado) | Bajo |

Aditivo y sin sorpresas: el merge suma. **Igual se commitea en core**, con el precedente literal del
commit `00b35fb1` ("sync UPONE-1523 objects into object-manager"), que hizo esto mismo para los objetos
nuevos de academic-scheduling.

### 3.2 El retiro, que el sync **no** propaga

Estado hoy en core, verificado:

- `objects/business/RecordTypes/rt__Modality__curricularsection.json:18-41` conserva las cuatro claves:
  `theoryHours`, `practiceHours`, `labHours`, `autonomousHours`.
- El modelo generado en `prisma/BASEMODEL/schema.prisma:3162-3173`:

```prisma
model rt__Modality__curricularsection {
  curricularsectionId String @id
  curricularsection   CurricularSection @relation(...)
  code            String?
  theoryHours     Int?
  practiceHours   Int?
  labHours        Int?
  autonomousHours Int?
  isDefault       Boolean?
  deliveryMode    String?
  ext__uplanner__rt__modality__curricularsection ext__uplanner__rt__modality__curricularsection?
}
```

- **18 de los 19 schemas** de `prisma/` contienen `theoryHours` (BASEMODEL mas 17 tenants: CONTINENTAL,
  DEMO01 a DEMO10, TEST, UCASMT, UCENG, UCPLN, UPU).

| Paso del retiro | Donde | Lo hace el sync? |
|---|---|---|
| Quitar las 4 claves del JSON del mod | `mods/curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json` | Si, es del mod |
| Quitar las 4 claves del **RecordType publicado** | `object-manager/objects/business/RecordTypes/rt__Modality__curricularsection.json` | **No.** Merge append-only: hay que borrar el mergeado y regenerar, y **commitearlo** |
| Quitar las 4 columnas del modelo | **18** `prisma/<TENANT>/schema.prisma` | Solo tras corregir el paso anterior |
| Quitar los campos del tipo GraphQL | `src/graphql/typeDefs/dynamic.js:2593-2596` | Se regenera, pero desde el JSON ya corregido |
| `DROP COLUMN` x4 en cada base | migracion por tenant | Requiere la ventana de ejecucion |

### 3.3 Lo que habilita, y es la razon de fondo para publicar

`academic-scheduling` no puede referenciar un objeto que viva **solo** en el repo del mod vecino: eso
seria dependencia cross-mod, prohibida por las reglas del proyecto. Lo referencia porque el objeto esta
**publicado en core**. El patron ya esta en produccion, en `mods/academic-scheduling/objects/Section.json:108-116`:

```json
"modalityId": {
  "type": "string",
  "description": "Modalidad de impartición de la sección (CurricularSection con recordType=\"Modality\", curriculum-design).",
  "isForeignKey": true,
  "references": "CurricularSection",
  "targetField": "id"
}
```

Referencia al objeto **Base publicado**, con el `recordType` validado en la capa de aplicacion. La FK
diferida a la pieza (`instructionalComponentId`) va a ser identica. Por eso la publicacion en core no es
tramite: es **la condicion para que la Fase 2 del plan exista**.

---

## 4. Efecto de "no hay datos productivos" sobre el contrato del ticket

Correccion del dev del 2026-08-17: **todo el dato de up1 hoy es de prueba**, aunque se parezca al de un
cliente real.

| Punto del contrato | Antes | Ahora |
|---|---|---|
| Rescate del dato antes del retiro | Gate bloqueante: "sin dato confirmado, el retiro no se ejecuta" | **Deja de ser gate.** No hay dato productivo que rescatar. El seed se reescribe con piezas, que es trabajo ya previsto en el alcance |
| Backfill de horas digitadas a piezas | Sub-tarea con su propia dependencia del loader | **Innecesario como rescate.** Si se hace, es para que el dato de prueba quede coherente, no para no perder informacion |
| Consentimiento por tenant | Pedido por riesgo de perdida de dato | **Cambia de motivo:** ya no protege dato, protege **la coordinacion del tren de core** (18 schemas y sus migraciones) |
| Riesgo real del retiro | Perdida de dato productivo | **Que el retiro no tome efecto** o se revierta solo, por el append-only del merge |

O sea que el ticket **no baja de sensibilidad, cambia de tipo de sensibilidad**: deja de ser un riesgo de
dato y pasa a ser un riesgo de **propagacion y coordinacion de core**.

---

## 5. Decision: va **dentro de UPONE-1619**, no en un ticket nuevo

**Resuelto por el dev el 2026-08-17.** Es un cambio de la misma implementacion, aunque viva en otro repo.
La primera version de este documento recomendaba abrir un ticket de core aparte; **esa recomendacion queda
corregida**, y el propio historial de core es lo que la corrige.

### Por que dentro

1. **Es como el equipo ya trabaja.** El commit `00b35fb1` se llama "sync **UPONE-1523** objects into
   object-manager": el ticket de mod commiteo su propia publicacion en core, con su id de Jira, e incluyo
   tanto el alta de objetos nuevos como el retiro de `Scenario.termId`. No es una excepcion, es el patron.
2. **El precedente de planEntry apunta en la misma direccion, no en la contraria.** `UPONE-1623` no
   demuestra que esto merezca ticket propio: existe **porque** `UPONE-1539` cerro dejando el lado de core
   pendiente. Separarlo por diseño seria reproducir a proposito el fallo que 1623 vino a reparar.
3. **Sin el tramo de core el ticket no entrega lo que promete.** Las columnas siguen existiendo, el
   objeto nuevo no esta publicado, y la FK que espera academic-scheduling no tiene a que apuntar. Un
   cierre asi seria "hecho" sobre algo que no cambio en la plataforma.
4. **El DoD del equipo ya lo exige.** Pide sync corrido, sin drift, migracion aplicada por tenant: eso ya
   es tocar el repo de core. Sacarlo del ticket lo dejaria sin poder cumplir su propio DoD.
5. **Un handoff entre dos tickets es justamente donde se pierde este cambio.** El riesgo real medido en la
   seccion 2 es que el retiro se revierta solo por quedar sin commitear; partirlo en dos tickets multiplica
   esa ventana en vez de cerrarla.

### Como entra: sub-tarea propia dentro del ticket

Se agrega como **1C-c, publicacion en core**, hermana de 1C-b y con la misma sensibilidad alta. Se
mantiene como sub-tarea separada por **trazabilidad y por ventana de ejecucion**, no porque sea otro
trabajo:

- Publicar en `objects/business/` el catalogo y el RecordType nuevos.
- Retirar las cuatro claves de horas del RecordType de modalidad **publicado**, por el procedimiento del
  precedente B: borrar el mergeado, regenerar con `sync:files`, **commitear**.
- Regenerar y commitear los 18 `prisma/<TENANT>/schema.prisma` y los typeDefs.
- Ejecutar la migracion `DROP COLUMN` por tenant en la ventana acordada.
- Verificar que una corrida posterior de sync **no revierte** el retiro.

Commits en `object-manager` con el id **UPONE-1619**, igual que hizo UPONE-1523 con el suyo.

### Lo unico que si abriria ticket aparte

Un solo escenario, y conviene dejarlo escrito para reconocerlo si aparece:

> Si se activa el plan de contingencia y **el drop se difiere** (entregar todo lo aditivo y dejar las
> columnas de horas vivas), entonces el retiro pendiente **necesita registro propio**, porque si no queda
> exactamente en la situacion de UPONE-1539: deuda de core sin dueño ni ticket. En ese caso este documento
> es el contenido del ticket a crear.

Fuera del ticket en cualquier caso: las FK de `academic-scheduling`, que son de la Fase 2 y de su equipo.

**Efecto en la estimacion:** los 13 SP del ticket ya contemplan 1C-b como pieza de esfuerzo menor y
sensibilidad alta. 1C-c es mecanica y esta documentada por dos precedentes; el peso esta en los 18
tenants y en verificar que el retiro no se revierte. Si al ejecutarla resulta mas cara de lo previsto,
sube el ticket, no se parte.

---

## 6. Que cambiar en el contrato de 1619 (aplicado el 2026-08-17)

- La decision abierta de **rescate del dato** deja de ser gate: se cierra con el motivo "no hay dato
  productivo en up1".
- La decision de **consentimiento por tenant** se reformula: sigue existiendo, pero por coordinacion del
  tren de core, no por proteccion de dato.
- El **alcance incorpora el tramo de core** como sub-tarea 1C-c, con sus archivos enumerados. No se deriva
  a otro ticket.
- Se agrega al DoD la verificacion de que **una corrida posterior de sync no revierte** el retiro.
- Queda registrado el unico caso que abriria ticket aparte: que el drop se difiera por contingencia.

## 7. Verificaciones pendientes (no bloquean el analisis)

- Conteo real de filas de `rt__Modality__curricularsection` con horas distintas de nulo por tenant. No
  cambia la decision, porque el dato es de prueba, pero dimensiona cuanto seed hay que reescribir.
- Si algun tenant tiene la columna con dato y **sin** modalidad correspondiente en el seed, que seria
  dato huerfano previo y conviene saberlo antes de la migracion.
