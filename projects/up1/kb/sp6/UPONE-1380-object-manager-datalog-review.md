# UPONE-1380 — Cambios en `object-manager` para DataLog e historial unificado

> **Para**: team core / reviewers de `object-manager`.
> **Rama**: `feat/UPONE-1380-datalog-history`.
> **Contexto**: SP6 necesita retirar el audit bespoke del mod `curriculum-design` (`ChangeLog` + eventos + flow) y consolidar el historial de cambios en `core_DataLog`. El punto delicado no es escribir una fila de audit, sino que el historial visible desde un objeto padre incluya tambien las mutaciones de sus hijos polimorficos (`CurricularSection`, `CurricularLink`, RTs) sin hardcodear reglas del mod dentro de core.

---

## TL;DR

- `core_DataLog` gana columnas de atribucion: `parentObject`, `parentId`, `childRecordType` y `historyKey`.
- `withDataLog` deja de registrar solo "objeto mutado" y ahora puede atribuir una mutacion de hijo al objeto padre que debe ver ese cambio en su tab Historial.
- Se agrega `polymorphicAttribution.js`, un reverse-index generico construido desde metadata declarativa de los objetos (`polymorphicChildren` / `polymorphicChildrenDerived`), no desde nombres del mod.
- Se normalizan aliases de RecordType (`rt__Plan__curriculum`, `rt__Minor__curriculum`) al objeto base canonico (`Curriculum`) para que el DataLog no se pierda en rutas reales de UI.
- Se exporta `recordMutationDataLog(...)` para que overrides de mods que saltan la cadena de decorators puedan registrar DataLog explicitamente.
- El cambio es necesario porque `ChangeLog` se retira en 1380; resolverlo solo en el mod mantendria dos sistemas de auditoria o duplicaria logica que ya pertenece a plataforma.

---

## Alcance del cambio en `object-manager`

| Archivo | Tipo | Que cambia | Riesgo |
|---|---|---|---|
| `objects/core/core_DataLog.json` | core object | Agrega columnas de atribucion e indices `parentObject,parentId` y `historyKey,createdAt` | Medio: schema core, pero aditivo |
| `src/events/decorators/withDataLog.js` | logica core | Normaliza aliases RT, construye `historyKey`, llama atribucion polimorfica y expone `recordMutationDataLog` | Medio-Alto: ruta transversal de auditoria |
| `src/events/decorators/polymorphicAttribution.js` | logica core nueva | Reverse-index generico hijo -> padre desde metadata de objetos | Medio: nuevo helper, pero aislado |
| `src/graphql/resolvers/instance.resolver.js` | docs/comentarios | Actualiza referencias stale a `ChangeLog` retirado | Bajo |
| `docs/features/datalog.md` | documentacion | Documenta aliases RT, invariante de decorators, nuevas columnas y retiro de `ChangeLog` | Bajo |
| tests `withDataLog` / `polymorphicAttribution` / integration | cobertura | Cubre atribucion directa, recursiva, derivada, aliases RT y path real del override del mod | Bajo |

Queda fuera de este reporte el merge reciente de `origin/develop` con UPONE-1396, porque corresponde a codegen/report-builder y no al cambio funcional de DataLog de UPONE-1380.

---

## Que se modifico y por que

### 1. `core_DataLog` deja de ser solo "log del objeto mutado"

Antes, una mutacion de `CurricularSection` quedaba como:

```text
objectName = CurricularSection
recordId   = <id de la seccion>
```

Eso sirve para auditar la seccion en abstracto, pero no para el caso de uso de SP6: abrir un `Activity`, `Curriculum`, `Offering` o `AcademicProgram` y ver un historial consolidado del padre mas sus hijos.

Por eso se agregan:

- `parentObject`: objeto padre atribuido, por ejemplo `Activity`.
- `parentId`: id del padre.
- `childRecordType`: tipo concreto del hijo, por ejemplo `EvaluationComponent`, `GraduationProfile` o `CurricularLink`.
- `historyKey`: clave denormalizada del historial consultable: `Activity:<id>` para cambios atribuidos al padre, o `Activity:<id>` tambien para cambios directos del propio padre.

El objetivo es que la UI pueda consultar el historial con un filtro simple:

```text
historyKey == "Activity:{{parentId}}"
```

Ese detalle importa porque el motor de listas/layouts trabaja mucho mejor con filtros escalares simples que con ORs compuestos entre `objectName/recordId` y `parentObject/parentId`.

### 2. `withDataLog` centraliza la escritura reutilizable

`withDataLog` ya era el decorator core que registraba creates/updates/deletes exitosos. UPONE-1380 lo extiende en tres direcciones:

- Normaliza aliases `rt__<RT>__<base>` al objeto base canonico. Ejemplo: `rt__Plan__curriculum` debe auditar como `Curriculum`, no como un alias sin objeto base propio.
- Construye `historyKey` en cada mutacion con registro concreto.
- Exporta `recordMutationDataLog(...)` para rutas que no pasan por el decorator.

El ultimo punto es importante: algunos mods tienen overrides que reemplazan `updateInstance` y hacen writes Prisma propios. Si esos overrides no pasan por la cadena `withEventPublish -> withObjectAuth -> withDataLog`, el audit generico no se ejecuta. En 1380 se documenta el contrato: un override debe delegar al generic o llamar `recordMutationDataLog(...)`.

### 3. `polymorphicAttribution.js` resuelve hijo -> padre sin hardcode del mod

La atribucion se construye leyendo metadata declarativa de todos los objetos del tenant:

- `metadata.polymorphicChildren`
- `metadata.polymorphicChildrenDerived`

Con eso arma un indice inverso:

```text
childObjectName -> estrategia de atribucion
```

Soporta tres casos:

1. **Owner directo**: el hijo trae `ownerType` / `ownerId` en su snapshot.
2. **Recursivo**: el hijo tiene un self-ref (`parentId`) y se sube hasta la fila raiz que tiene owner.
3. **Derivado**: el hijo no tiene owner directo, pero referencia otro hijo que si lo tiene. Ejemplo: `CurricularLink` puede resolverse via una seccion referenciada.

La regla central: core no conoce `CurricularSection` como caso especial. Core conoce una convencion declarativa de polimorfismo y la aplica de forma generica.

---

## Que se quiere conseguir con este cambio

El resultado funcional esperado es:

1. El mod deja de tener dos fuentes de verdad para auditoria (`ChangeLog` y `core_DataLog`).
2. El tab Historial de un objeto padre muestra:
   - cambios directos del padre;
   - cambios de hijos polimorficos;
   - cambios hechos por rutas de RecordType;
   - cambios hechos por overrides que llamen explicitamente al helper exportado.
3. Los layouts pueden consultar el historial con un solo filtro por `historyKey`.
4. La auditoria queda en una capacidad reutilizable de plataforma, no en un subsistema aislado de `curriculum-design`.

En terminos de negocio: cuando un usuario edita una seccion de evaluacion, una bibliografia, un perfil de egreso o un link curricular, esa accion debe aparecer en el historial del plan/silabo/actividad al que realmente pertenece. El usuario no piensa "edite una fila tecnica de CurricularSection"; piensa "cambie el plan".

---

## Que parte de la historia lo hace necesario

Este cambio responde al punto de SP6 sobre **historial de cambios** (`CAP-CUR-050`) y al alcance de UPONE-1380:

- 1379 amplio el uso de secciones polimorficas del mod, incluyendo nuevos record types como `GraduationProfile`.
- 1380 decide retirar `ChangeLog`, que era el historial bespoke del mod.
- Al retirar `ChangeLog`, los cambios de hijos ya no pueden depender de eventos/flows propios del mod para aparecer en el historial.
- `core_DataLog` ya existia, pero registraba la mutacion donde ocurria, no necesariamente donde el usuario necesitaba verla.

La historia exige entonces dos cosas a la vez:

1. Consolidar audit en `core_DataLog`.
2. Preservar la semantica de historial por objeto de negocio, incluyendo hijos.

Sin la atribucion hijo -> padre, cumplir solo el punto 1 produciria una regresion funcional: DataLog tendria datos, pero el tab Historial del padre no veria mutaciones relevantes.

---

## Por que hacerlo en `object-manager` y no solo en el mod

### Porque `DataLog` es core

La escritura de `core_DataLog` ocurre en la cadena generica de resolvers de `object-manager`. Si el mod intentara corregir la atribucion por fuera, tendria que duplicar o interceptar una decision que ya se toma en core: cuando registrar, con que actor, con que diff y en que tenant.

### Porque el problema no es exclusivo de `curriculum-design`

El patron "hijo polimorfico que debe auditarse bajo un padre" no es una rareza del mod; es una forma de modelado soportada por la plataforma. Si otro mod declara hijos polimorficos, necesitara el mismo comportamiento de historial. Resolverlo en core transforma un caso de SP6 en capacidad de plataforma.

### Porque la alternativa mod-only reintroduce `ChangeLog` por otra puerta

Una solucion contenida en el mod tendria dos opciones malas:

- mantener/extender `ChangeLog`, perpetuando dos sistemas de audit;
- escribir DataLog manualmente desde cada resolver/flow del mod, duplicando logica de diff, actor, tenant, alias RT y best-effort.

Ambas alternativas chocan con el objetivo de 1380: consolidar audit general en `core_DataLog`.

### Porque `historyKey` depende del contrato del motor de listas

La decision de usar `historyKey` no es solo del mod. Es una adaptacion al modo en que los layouts consultan record-lists: una clave escalar filtrable con `EQUALS` es mas robusta que pedirle al mod que arme queries especiales o filtros OR para cada pantalla.

### Porque el mod igual conserva su punto de extension

El cambio no elimina autonomia del mod. Al contrario: le da un helper explicito (`recordMutationDataLog`) para los pocos caminos donde el mod de verdad reemplaza el generic. La diferencia es que esos caminos siguen escribiendo con el contrato core, no con un audit paralelo.

---

## Por que no basta con permisos o layouts

En `curriculum-design`, las tabs nuevas usan `core_datalog:view` y apuntan a `core_DataLog`. Eso resuelve visibilidad y UI, pero no resuelve la semantica del dato.

Sin cambios en `object-manager`:

- una edicion de `CurricularSection` se registra bajo `CurricularSection`;
- una edicion por alias `rt__Plan__curriculum` puede no pasar el gate `enableDataLog` del objeto base;
- un override que no pasa por `withDataLog` no registra nada;
- el tab del padre no puede recuperar el historial consolidado con un filtro simple.

Por eso el cambio core no es accesorio: es la pieza que hace que los layouts de 1380 tengan datos correctos que mostrar.

---

## Blast radius y compatibilidad

- Las columnas nuevas en `core_DataLog` son nullable: no rompen registros anteriores.
- `historyKey` tambien es nullable para operaciones bulk sin `recordId`.
- Objetos sin polimorfismo siguen registrando como antes: `parentObject`/`parentId` quedan null y `historyKey` apunta al propio objeto.
- La atribucion es best-effort: si falla, no rompe la operacion principal.
- `core_DataLog` no se auto-loguea, manteniendo la proteccion anti-recursion.
- La normalizacion de aliases RT solo aplica a nombres con forma `rt__...__base`; el resto de objetos conserva su nombre original.

El riesgo principal esta en la ruta transversal de auditoria (`withDataLog`), mitigado con tests unitarios e integracion contra los caminos reales de UI.

---

## Que revisar / como probar

1. **Schema core**: validar que `core_DataLog` solo agrega columnas nullable e indices aditivos.
2. **Cambio directo**: editar un `Activity`/`Curriculum` y verificar `historyKey = "<Objeto>:<id>"`.
3. **Hijo owner directo**: editar una `CurricularSection` con `ownerType/ownerId` y verificar `parentObject`, `parentId`, `childRecordType` y `historyKey`.
4. **Hijo recursivo**: editar una seccion anidada y verificar que se atribuye al owner raiz.
5. **Hijo derivado**: editar un `CurricularLink` y verificar que se atribuye al padre de la seccion referenciada.
6. **Alias RecordType**: editar `rt__Plan__curriculum` / `rt__Minor__curriculum` y confirmar que audita como `Curriculum`.
7. **Override del mod**: probar el path de `polymorphicUpdate.resolver.js` para `rt__*__curricularsection`; debe llamar `recordMutationDataLog`.
8. **UI**: abrir el tab Historial del padre y confirmar que lista cambios directos + cambios de hijos con `core_datalog:view`.

---

## Resumen del "por que core"

| | Solucion solo mod | Cambio en `object-manager` |
|---|---|---|
| Fuente de verdad | Riesgo de mantener `ChangeLog` o writes manuales | Un solo `core_DataLog` |
| Atribucion hijo -> padre | Reglas bespoke por objeto del mod | Reverse-index generico desde metadata |
| Alias RT | Cada mod debe acordarse de normalizar | Normalizacion en la ruta generica |
| Overrides | Cada override inventa su audit | Helper core reutilizable |
| UI historial | Queries/filtros especiales por pantalla | `historyKey` escalar y uniforme |
| Reutilizacion | Solo `curriculum-design` | Cualquier mod con polimorfismo declarado |

El cambio en `object-manager` es el minimo necesario para que la deprecacion de `ChangeLog` sea real y no solo cosmetica. La historia pide historial general de cambios sobre objetos de negocio; eso vive mejor en el motor generico que ya conoce operaciones, actor, tenant, diff y autorizacion. El mod declara su modelo y consume el historial; core se hace cargo de registrarlo correctamente.
