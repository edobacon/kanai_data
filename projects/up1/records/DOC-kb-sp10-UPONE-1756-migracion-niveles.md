---
id: DOC-kb-sp10-UPONE-1756-migracion-niveles
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - follow-up
  - UPONE-1756
  - migracion
  - niveles
  - CompetencyNodeDevelopmentLevel
---

# UPONE-1756-migracion-niveles

> **Referencia externa:** por asignar (ticket a crear en Jira). **Follow-up de UPONE-1756 (fast-follow del sprint).** · **Tipo:** migracion de datos · **Epica:** UPONE-1452 (Curriculum Mapping) · **Asignado:** por definir · **Story Points:** 5 (Considerable · Sensibilidad Alta)
>
> Habilita la tributacion por competencia sobre las matrices que **ya existen** hoy. No es trabajo de fondo del follow-up: es un **fast-follow del sprint**, porque sin esta migracion el CRUD entregado en el sprint no opera sobre los datos ya cargados.

## Fuente canonica (PO)

Regla de migracion del detalle del PO (`UPONE-1756-detalle-po`, seccion 3): "Una competencia que todavia no declara sus tramos hereda **todos** los del esquema, no solo el ultimo. Quedarse con el ultimo invalidaria de golpe toda tributacion ya registrada en los tramos anteriores. Declarar todo preserva lo cargado y deja que la institucion estreche despues, que es una decision suya y no un efecto del cambio."

## Historia de usuario

Como responsable curricular de una institucion con matrices ya cargadas, quiero que sus competencias declaren sus niveles de desarrollo automaticamente, para poder tributar sobre ellas sin tener que re-declarar a mano lo que ya existia.

## Objetivo

Poblar `CompetencyNodeDevelopmentLevel` para las matrices existentes, haciendo que cada competencia medible herede **todos** los niveles del `developmentScheme` de su matriz, de forma idempotente y por tenant, para habilitar el CRUD de tributacion (ticket del sprint) sobre datos ya cargados.

## Contexto (para dimensionar)

- El sprint crea el objeto `CompetencyNodeDevelopmentLevel` (ticket CRUD, F1), que declara por competencia sus niveles de desarrollo. Las matrices **nuevas** los declaran al construirse; las que **ya existen** quedan con cero niveles declarados porque el objeto no existia.
- **Impacto funcional (por que es fast-follow):** R-4 exige que el nivel de una tributacion sea uno de los **declarados** por la competencia. Sin niveles declarados, la tributacion por competencia sobre matrices existentes **no se puede usar**. Esta migracion es lo que habilita el CRUD del sprint sobre los datos que el cliente ya tiene; si queda al fondo del follow-up, el sprint entrega un CRUD que anda en matrices nuevas pero no en las existentes, y no se ve como bloqueante hasta que un usuario real lo choca.
- Un nodo que consolida **no** declara niveles (los declaran sus hojas): no se migra.
- Es migracion de datos del propio mod, sin logica de negocio nueva.

## Alcance

**Dentro:**

1. Para cada competencia **medible** (hoja / `isHolistic`) de matrices existentes cuya matriz tiene `developmentScheme`, crear las filas `CompetencyNodeDevelopmentLevel` con **todos** los niveles del scheme.
2. **Idempotencia:** correr la migracion dos veces no duplica filas ni pisa declaraciones ya hechas a mano.
3. **Por tenant**, con tenant isolation.
4. **Reporte** de matrices existentes sin `developmentScheme` (no se migran a ciegas; quedan listadas para resolver aparte).

**Fuera:**

- **Estrechar** niveles (quedarse con un subconjunto): es decision posterior de la institucion, no de esta migracion.
- Matrices **nuevas** (declaran sus niveles al construirse).
- `isRepresentative`: solo aplica cuando la matriz usa `achievementBasis = RepresentativeLevel`; si no hay que fijarlo, no se toca aqui. Si se decide un default, se coordina con el ticket que introduce `achievementBasis` (delta del sprint / follow-up), no aca.

## Criterios de aceptacion (checkeables)

- [ ] Cada competencia medible de una matriz existente **con** `developmentScheme` queda con **todos** los niveles del scheme declarados en `CompetencyNodeDevelopmentLevel`.
- [ ] Los nodos que consolidan **no** quedan con niveles declarados.
- [ ] Correr la migracion dos veces no duplica filas ni altera declaraciones previas (idempotente).
- [ ] Una tributacion ya registrada sobre un nivel **intermedio** sigue siendo valida despues de la migracion (no se invalida por haber heredado solo el ultimo).
- [ ] Las matrices existentes **sin** `developmentScheme` se reportan, no se migran a ciegas.
- [ ] Tras la migracion, una matriz existente permite tributar por competencia (R-4 se satisface con los niveles declarados).

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo. Ademas:

- [ ] Migracion sin drift; idempotente; corrida por tenant con tenant isolation.
- [ ] Verificada en runtime: sobre una matriz existente, el CRUD de tributacion por competencia pasa de no operar a operar (R-4 satisfecho).
- [ ] Reporte de matrices sin `developmentScheme` generado y entregado.
- [ ] Corre despues del rename `CoverageScheme -> DevelopmentScheme` (ticket delta del sprint), sin referencias al nombre viejo.

## Frontera core/mod (Aduana)

**`todo-mod-only`**: es dato del propio mod (`CompetencyNodeDevelopmentLevel`, `developmentScheme`). Sin Core Extension.

## Dependencias

- **Depende del sprint:** el objeto `CompetencyNodeDevelopmentLevel` (ticket "CRUD de tributacion por competencia", F1) y el rename `CoverageScheme -> DevelopmentScheme` (ticket "Cableado del modelo + rename"). **No** depende de los pesos, la segunda forma ni los indicadores del follow-up.
- **Habilita** el uso real del CRUD del sprint sobre matrices existentes; por eso conviene priorizarla pegada al sprint (fast-follow), no al final del follow-up.

## Estimacion (calibrada)

`Esfuerzo: Considerable (5) · Sensibilidad: Alta`. Es migracion de datos sobre el tenant vivo: leer el `developmentScheme` de cada matriz, poblar la tabla de union por competencia medible, manejar matrices sin scheme, garantizar idempotencia y correr por tenant. La sensibilidad es Alta porque toca datos existentes y una migracion mal hecha (heredar solo el ultimo nivel) invalidaria tributacion ya cargada. **5 SP.**

## Decisiones abiertas

- [ ] **`isRepresentative` en la migracion:** confirmar si se fija un default al migrar (solo relevante para matrices con `achievementBasis = RepresentativeLevel`) o si se deja para cuando se use ese eje. Recomendacion: dejarlo fuera hasta que `achievementBasis` se consuma.

## Referencias

- Regla de migracion: `UPONE-1756-detalle-po` (seccion 3). Feature y familia de tickets: `UPONE-1756-followup`.
- Dependencias de sprint: ticket CRUD (objeto `CompetencyNodeDevelopmentLevel`) y ticket delta (rename a `DevelopmentScheme`).
- Working copy: `curriculum-mapping@584499e`, `curriculum-design@8a151e7`.
