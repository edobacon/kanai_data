---
id: DECISION-007
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - recordtypes
  - multi-tenant
  - modelo
  - globales
---

# DECISION-007: Los `RecordTypes` de `CurricularSection` son GLOBALES, NO per-tenant

## Contexto

Tenant Question T2 planteo si los RecordTypes (`Modality`, `LearningOutcome`, `Content`, `Session`, `EvaluationComponent`, `Bibliography`, `CustomSection`, etc.) deben ser:

- **A**: Globales, declarados en `up1/object-manager/objects/business/RecordTypes/`. Disponibles para todos los tenants.
- **B**: Per-tenant, declarados en `up1/object-manager/objects/tenants/<TENANT>/RecordTypes/`. Cada tenant solo tiene los RTs que usa.

El analisis del codigo confirmo que UP1 soporta ambas modalidades (existen RTs globales como `rt__Student__core_user.json` y RTs per-tenant en `objects/tenants/UPU/RecordTypes/`).

## Drivers

1. **Los RTs son base del modelo, no del cliente**: Esteban fue explicito — los RTs definen la estructura del agregado, no la configuracion de cada institucion.
2. **Cliente decide via instancias, no via tipos**: si un tenant no usa un RT, simplemente NO crea instancias de ese RT en su DB. Pero el tipo siempre esta disponible.
3. **Layouts y formularios universales**: si el tenant decide habilitar el RT mas adelante, no requiere migracion de schema, solo configuracion de UI.
4. **Mantenibilidad**: 1 set de RTs para mantener vs N sets duplicados.
5. **Consistencia con DECISION-006**: la flexibilidad por cliente va via Extensions (campos), NO via RTs duplicados.

## Alternativas evaluadas

| Opcion | Pro | Contra |
|--------|-----|--------|
| **A. RTs globales** (elegida) | 1 set de tipos para mantener. Cliente decide via instancias. Layouts universales. Si tenant habilita un RT mas adelante, no requiere migracion. | Cada tenant ve todos los RTs — la UI puede mostrar opciones que el cliente "no usa". Resoluble por configuracion de UI o filtros visuales. |
| B. RTs per-tenant | Cada tenant solo ve sus RTs. Limpieza visual. | Duplica RTs entre tenants. Layouts duplicados. Si tenant quiere agregar un RT existente en otro tenant, requiere copiar archivos. Mantenibilidad pesima. |
| C. Mixto (algunos globales + algunos per-tenant) | Flexibilidad. | Complejidad alta. Sin criterio claro para decidir cual es cual. |

## Decision

**Adoptar opcion A**: TODOS los RecordTypes de `CurricularSection` (y demas objetos del modulo) son **globales**, declarados en `up1/object-manager/objects/business/RecordTypes/`.

**Convencion de naming**: `rt__<RecordType>__<baseObjectLower>.json`. Ej: `rt__Modality__curricularsection.json`, `rt__LearningOutcome__curricularsection.json`.

**Si un tenant no usa un RT**:
- NO crea instancias de ese RT en su DB.
- Opcionalmente, su UI puede filtrar visualmente las opciones de RT no usadas (configuracion de mod, no de schema).
- El tipo sigue disponible si decide habilitarlo en el futuro.

**Variaciones por cliente**: via Extensions (campos extra al RT existente), NO via RTs nuevos por tenant.

## Cita verbatim de la reunion 2026-04-28

> Esteban Cortes: _"Tienen que ser para todos pues, o sea, porque los record son base del modelo, por asi decirlo. (...) yo entiendo que existen siempre esos tipos de record, pero dependiendo del cliente va a ser si es que la instancia de ese record va a tener o no va a tener data y dependiendo del cliente va a depender si es que tiene o no eh configurado un formulario que ocupe ese recorte."_
>
> Juan Diego Galdames: _"se podria amenazar una diferenciacion por tenants ahi, pero tambien la (...) no se que mas practico para ti si es que todos tengan todos los recordes y ahi por tenant se distingue que se usa o hacerlos como nativos en cada tenant."_
>
> Esteban Cortes (cierre): _"yo creo que deberia, o sea, la idea de como yo definiria objeto, eh, es que esten siempre (...) como que siempre van a estar todos los recortes, no necesariamente van a estar siempre con datos dependiendo del cliente."_
>
> Eduardo Bacon: _"igual encontrar que era mejor la opcion de que fueran globales porque despues darle mantenibilidad de estos recortes per tenant a esta institucion o a este otro."_
>
> Esteban Cortes: _"para nada, no, no, si tenemos que como la menor cantidad de personalizacion en ese sentido, como que sea lo mas generico posible."_

## Consecuencias positivas

- Mantenibilidad alta: 1 set de RTs para todos los tenants.
- Layouts universales por RT.
- Activar/desactivar RT en un tenant no requiere migracion de schema.
- Coherente con la filosofia "minima personalizacion" del modulo.
- Coherente con [DECISION-006](DECISION-006-custom-section-fixed-rt.md) (CustomSection comodin global).

## Consecuencias negativas

- La UI de creacion de `CurricularSection` muestra todos los RTs disponibles a todos los tenants. Si un tenant nunca usa `Bibliography`, el usuario lo ve igual en el menu (resoluble por configuracion de UI o filtros, no de schema).

## Estructura de archivos resultante

```
up1/object-manager/objects/business/RecordTypes/
├── rt__Modality__curricularsection.json          (global)
├── rt__LearningOutcome__curricularsection.json   (global)
├── rt__Content__curricularsection.json           (global)
├── rt__Session__curricularsection.json           (global)
├── rt__EvaluationComponent__curricularsection.json  (global)
├── rt__Bibliography__curricularsection.json      (global)
├── rt__CustomSection__curricularsection.json     (global, ver DECISION-006)
└── rt__ApprovalCondition__curricularsection.json (global, pendiente Q5)
```

NO hay duplicados en `up1/object-manager/objects/tenants/<TENANT>/RecordTypes/`.

## Que cubre y NO cubre

### Cubre
- La regla: **todos** los RTs son globales por defecto.
- Patron de naming.
- Mecanismo de personalizacion por cliente (Extensions, no RTs duplicados).

### NO cubre
- Cuales RTs especificos entran en TICKET-009 (resuelto parcialmente por [DECISION-008](DECISION-008-draft-rts-defer.md), pendiente Q11).
- Estructura interna de cada RT (a refinar en TICKET-009).
- Mecanismo de UI para "ocultar" RTs no usados por tenant (postergado, no es schema).

## Referencias

- [Open Questions T2](../specs/curriculum-design/open-questions.md#tenant-questions-t1t5)
- [DECISION-006 CustomSection RT fijo](DECISION-006-custom-section-fixed-rt.md)
- [DECISION-008 RTs draft postergados](DECISION-008-draft-rts-defer.md)
- Patron `rt__<RT>__<base>.json` (UPONE-938..947 epica RecordTypes)
- Reunion 2026-04-28
