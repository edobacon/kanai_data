---
id: DECISION-008
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - recordtypes
  - sprint-futuro
  - postergado
  - draft
---

# DECISION-008: Postergar RTs `GeneralData`, `GraduationProfile`, `EntryProfile` (sin campos refinados en Confluence)

## Contexto

Open question Q5 detecto 4 RTs mencionados en Confluence Learning Assurance pero sin campos definidos:

- `GeneralData`
- `GraduationProfile`
- `EntryProfile`
- `ApprovalCondition` (parcial — caso Univalle "habilitacion" semana 18)

Esteban confirmo que la documentacion Confluence se cargo en estado **draft** intencionalmente — incluyendo todos los objetos del modelo pero sin refinar los campos de los menos prioritarios. La idea es ir refinando funcionalidad por funcionalidad.

## Drivers

1. **Trabajo iterativo del modelo**: refinar TODOS los RTs antes de implementar el primero seria over-engineering. Se refinan a medida que se implementan capabilities especificas.
2. **Sin requerimiento concreto este sprint**: ningun ticket de SP1 requiere instancias de estos RTs.
3. **Riesgo de retrabajo**: definir campos sin contexto de capability lleva a refactor cuando llegue el contexto real.
4. **Alcance del TICKET-009 (UPONE-1035)**: probar variabilidad entre tenants. Los 3 RTs draft NO aportan a esa prueba (nadie los usa en el legacy v2.2).

## Decision

**Postergar** los RTs `GeneralData`, `GraduationProfile`, `EntryProfile` a sprint futuro. **NO crear** archivos `rt__<RT>__curricularsection.json` para estos 3 en TICKET-009.

**Subset efectivo de RTs para TICKET-009** (a refinar con Q11):
- `Modality` ✅
- `LearningOutcome` ✅
- `Content` ✅
- `Session` ✅
- `EvaluationComponent` ✅
- `Bibliography` ✅
- `CustomSection` ✅ (ver [DECISION-006](DECISION-006-custom-section-fixed-rt.md))
- `ApprovalCondition` ⚠️ pendiente — Q5 no esta totalmente resuelta. El caso Univalle "habilitacion" se trata como `Session` normal (NO requiere modelar ApprovalCondition este sprint).

**Caso Univalle semana 18 "habilitacion"**: tratar como instancia de `Session` con descripcion "habilitacion". NO modelar como `ApprovalCondition`. El analisis IA habia sobre-interpretado el texto.

## Cita verbatim de la reunion 2026-04-28

Sobre RTs sin campos:

> Eduardo Bacon: _"este es el (...) lista record validos para curricular section y estos estan sin campos como que esta el record pero no hay mas detalle. Esto me imagino que es simplemente porque no hemos llegado hasta alla."_
>
> Esteban Cortes: _"Exacto. Si, si, si. Porque aqui la idea es que implementemos los objetos que estamos como considerando. Yo cargue esta documentacion con todos los objetos que tengo hasta este punto, pero la idea es ir marcando como draft de manera que todos nosotros y otras personas que esten interesados puedan ver como la propuesta del modelo completo, aun cuando algunos todavia podrian sufrir modificacion a medida que vamos implementando funcionalidad a funcionalidad."_
>
> _"Asi que si, hay campos que no van a estar del todo refinados porque si no seria como nos demorariamos mucho en tener como un modelo que sabemos que la practica puede ir cambiando cuando vayamos implementando las cosas."_

Sobre caso Univalle "habilitacion":

> Eduardo Bacon: _"me alerta por el tema de Univalle, la habilitacion donde aparece esto de semana 18. habilitacion como sesion normal con descripcion habilitacion, pero conceptualmente segun el modelo de confluence aparece approval condition que es un recorte propio de condiciones de aprobacion."_
>
> Esteban Cortes: _"esta diciendo: estoy utilizando una curricular section, en particular el record de sesion (...) y esta diciendo que en la sesion 18 hay un dato. Tiene una descripcion y la descripcion es habilitacion, es una descripcion bien escueta. Eh, entonces te esta diciendo, ah, quizas la habilitacion se refiere a que es una condicion de aprobacion esa sesion numero 18 (...) y se fue la profunda. Pero yo diria que hay que ignorar no mas ese caso."_
>
> _"hay que considerarlo como una descripcion de la sesion simplemente y no tiene relacion al ApprovalCondition realmente es un estandar."_

## Consecuencias positivas

- TICKET-009 con scope realista (7 RTs concretos vs 11 incluyendo drafts).
- Sin retrabajo cuando se refinen los campos en sprint futuro.
- Coherente con el approach iterativo del modelo.

## Consecuencias negativas

- El seed legacy de Univalle/AIEP no representara estos 3 RTs (esperado — tampoco los usan).
- Si un cliente futuro requiere `GeneralData`/`GraduationProfile`/`EntryProfile` antes de que se refinen, requerira sprint dedicado.

## Que cubre y NO cubre

### Cubre
- Decision de NO crear los 3 RTs draft en TICKET-009.
- Tratamiento del caso Univalle "habilitacion" como `Session` normal.
- Composicion del subset efectivo de RTs para TICKET-009 (a confirmar con Q11).

### NO cubre
- La estructura final de los 3 RTs cuando se refinen (sprint futuro).
- La decision sobre si modelar `ApprovalCondition` en este sprint o no (Q5 sigue parcialmente abierta — pero el caso Univalle ya no obliga a modelarlo).
- Q11: Es la totalidad de los 7 RTs efectivos lo que va en TICKET-009 o un subset menor.

## Referencias

- [Open Questions Q5](../specs/curriculum-design/open-questions.md#q5)
- [Open Questions Q11](../specs/curriculum-design/open-questions.md#q11)
- [DECISION-006 CustomSection](DECISION-006-custom-section-fixed-rt.md)
- [DECISION-007 RTs globales](DECISION-007-recordtypes-global.md)
- Reunion 2026-04-28
