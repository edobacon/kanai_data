---
id: DECISION-006
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - recordtypes
  - customization
  - customsection
  - extensions
  - modelo
---

# DECISION-006: `CustomSection` es 1 RT FIJO con campos estandar; las variaciones por cliente van por Extensions

## Contexto

Open question Q3 planteo dos alternativas para modelar la flexibilidad de `CurricularSection` cuando el contenido no encaja en los RTs estandar (Modality, LearningOutcome, Content, Session, etc.):

- **A**: 1 RT generico `CustomSection` con estructura fija, suficiente para cubrir la mayoria de casos.
- **B**: N RTs custom dinamicos creados/configurables por institucion.

El analisis del codigo confirmo que UP1 NO tiene precedente de RTs custom dinamicos por institucion (solo existe `rt__Student__core_user.json` como RT estandar global).

## Drivers

1. **Estandarizacion sobre personalizacion**: Esteban explicito que la filosofia del modelo es "minima personalizacion, maxima estandarizacion". Cada cliente que crea un RT propio fragmenta la base de codigo y dificulta el mantenimiento.
2. **Extensions ya cubren custom fields**: el mecanismo de Extensions de UP1 (`ext__<client>__<base>.json`) permite agregar campos personalizados a un objeto/RT existente sin crear un RT nuevo.
3. **Mantenibilidad de RTs**: tener N RTs por institucion vuelve impractico mantener formularios, layouts y queries.
4. **Comodín CustomSection**: el RT existe precisamente como comodin para cualquier seccion estructural que no encaja en los RTs especificos.

## Alternativas evaluadas

| Opcion | Pro | Contra |
|--------|-----|--------|
| **A. 1 RT `CustomSection` con estructura fija** (elegida) | Estandariza el modelo. Mantenimiento simple. Extensions cubren campos custom. Comodin existente para casos no estructurales. | Las extensiones siempre van como campos en el RT existente, NO como RT nuevos — limita personalizacion estructural. |
| B. N RTs custom dinamicos por institucion | Maxima flexibilidad para cada cliente. | Sin precedente en UP1. Fragmenta la base de codigo. Mantenimiento explosivo. Layouts duplicados. |

## Decision

**Adoptar opcion A**: `CustomSection` es 1 RT FIJO con estructura estandar definida por la plataforma. Sirve como comodin para secciones que no calzan en los RTs especificos (Modality, LearningOutcome, Content, etc.).

**Estructura del RT** (a refinar en TICKET-009):
- Campos suficientes para cubrir la mayoria de casos estandar (a definir).
- **Campos NO obligatorios** (excepto los esenciales) — permite que cada cliente complete solo los datos que aplican.
- Estructura **identica** entre todos los tenants — independiente del cliente.

**Personalizacion por cliente**: via Extensions UP1 (`ext__<client>__<base>.json`), agregando campos extra al RT `CustomSection` existente. NO crear RTs custom propios por institucion.

## Cita verbatim de la reunion 2026-04-28

> Esteban Cortes: _"yo creo que deberia ser, o sea, la idea de como yo definiria objeto, eh, es que esten siempre porque hay uno que es como (...) un record type que es como comodin, por asi decirlo, que es como para cualquier otra estructura que sea solamente texto sin como datos especificos."_
>
> _"yo lo hice pensando en que claro, este es como el modelo de datos estandar (...) y despues lo que podria ocurrir es que un cliente tenga una extension de campos dentro del recorde que ya existe, campos personalizados, o haga uso del que es como que no es ninguno de los estandar, sino que es un campo como de texto adicional. (...) pero asi lo pense yo, como que siempre van a estar todos los recortes."_
>
> _"que la custom section tambien sea una estructura ya definida por nosotros (...) que tenga los campos suficientes como para ponernos en la mayoria de los casos estandar, que tampoco deberian ser infinitos, eh, pero que sea siempre igual."_
>
> _"probablemente que los campos entonces no sean todos de caracter obligatorio, porque podria un cliente tener mas o menos de esos datos, pero la custom section deberia ser siempre la del definida de la misma forma como independientemente del cliente tambien sea estandarizado."_
>
> _"si tenemos que como la menor cantidad de personalizacion en ese sentido, como que sea lo mas generico posible."_
>
> Juan Diego Galdames: _"limitar solamente como a campo custom, solamente como un campo extra, pero no un record dedicado."_

## Consecuencias positivas

- Modelo simple y mantenible. Solo 1 RT `CustomSection` para mantener.
- Coherente con el patron Extensions ya existente en UP1.
- Layout unico por RT (no proliferan).
- Cualquier cliente que necesite campos extra usa el mismo mecanismo.

## Consecuencias negativas

- Un cliente que requiera estructura fundamentalmente distinta (no resoluble con campos extra) no esta cubierto. Se evaluara caso a caso.
- Extensions agregan complejidad de schema cuando son muchas (acumulacion).

## Que cubre y NO cubre

### Cubre
- Decision de modelar `CustomSection` como 1 RT fijo.
- Mecanismo para personalizacion (Extensions, NO RTs custom).
- Flexibilidad de cardinalidad de campos (no obligatorios).

### NO cubre
- La estructura especifica de campos del RT `CustomSection` — se define en TICKET-009.
- Casos de uso para clientes con necesidades estructurales radicales (postergado).
- Layout especifico del RT `CustomSection` — se define en TICKET-009.

## Referencias

- [Open Questions Q3](../specs/curriculum-design/open-questions.md#q3)
- [DECISION-007 RecordTypes globales](DECISION-007-recordtypes-global.md) (consistente — RTs son universales)
- Patron Extensions UP1: `ext__<client>__<base>.json`
- Reunion 2026-04-28
