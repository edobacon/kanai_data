---
id: DOC-kb-sp10-UPONE-1755-detalle
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - UPONE-1755
  - competency-matrix-shell
  - flujo-creacion
  - aduana-todo-mod-only
---

# UPONE-1755 Detalle (Curriculum Mapping: pestana de Medicion)

> **Referencia externa:** UPONE-1755 · **Tipo:** implement (Jira: Historia) · **Prioridad:** Critica · **Epica:** UPONE-1452 (Curriculum Mapping) · **Asignado:** Francisco Navarro · **Story Points:** 5
>
> Contrato del ticket (que conseguir). El detalle tecnico code-grounded (el como, con rutas y evidencia) vive en el explicativo del mismo sprint: `UPONE-1755-explicativo`.

## Fuente canonica (PO)

La descripcion en Jira no trae texto: es un enlace a la maqueta de sp10 (Curriculum Mapping, v29). El alcance lo fija el titulo del ticket:

> Curriculum Mapping | Matriz de competencia | Pestana de Medicion y otros ajustes.

## Historia de usuario

Como disenador de matrices de competencia, quiero una pestana dedicada donde definir con que se mide y como se consolida el logro, separada de la identidad y la gobernanza de la matriz, para configurar el instrumento de medicion sin mezclarlo con los datos generales y para que la creacion de una matriz pida primero lo minimo para que exista.

## Objetivo

- Abrir una **cuarta pestana "Medicion"** en el shell de la matriz y mover a ella todo lo que responde con que se mide y como se consolida el logro.
- Extender el modelo de la matriz con los campos que la medicion necesita (escala, niveles, modelo de medicion, base del logro y los tres ejes de consolidacion), retirando el eje unico anterior.
- Dejar el flujo de creacion coherente: la matriz se crea con identidad y gobernanza, y la medicion se completa a continuacion.

## Contexto (para dimensionar)

- La matriz se edita en un shell propio (`CompetencyMatrixShell`) que ya resolvio los problemas dificiles: las pestanas se declaran en el layout, tienen modo de guardado y pueden quedar bloqueadas con su motivo cuando requieren que el registro exista. La cuarta pestana entra en esa misma familia sin inventar mecanismo.
- El cambio de modelo es la parte de peso: **6 campos nuevos** en el record type de la matriz, **retiro de `aggregationMode`** (el eje unico pasa a tres ejes), y el renombre del valor de enum `Criterion` a `Analytic`. Los tres ejes se apagan solos segun la forma del diseno.
- **Depende de UPONE-1753:** la pestana Medicion selecciona los dos catalogos, que 1753 renombra a Escala de desempeno y Niveles de desarrollo. Este ticket usa los nombres nuevos.
- **Nota de frescura (verificada):** el bug de Prisma que valida estaticamente la rama `create` del record type en updates parciales **ya tiene workaround generalizado en el mod** (`MATRIX_RT_REQUIRED` completa desde la fila actual antes de delegar al `updateInstance` generico). No es una mutation nueva por escribir: agregar campos opcionales nuevos no obliga a tocarlo.
- Verificado sobre `curriculum-mapping` en `develop` @ `584499e` (el submodulo no avanzo respecto del explicativo).

## Alcance

**Dentro:**

1. Declarar la pestana `medicion` en los tres layouts (create/edit/view) y repartir los elementos entre las cuatro pestanas.
2. Agregar al record type de la matriz los campos de medicion (escala, niveles, modelo de medicion, `requiresAllCriteria`, base del logro y los tres ejes de agregacion) y retirar `aggregationMode`; renombrar el valor `Criterion` a `Analytic`.
3. Ajustar las mutations de create/update de la matriz y sus validadores a la firma nueva y a las reglas de combinacion.
4. Cerrar el flujo de creacion en cuatro pasos, con la medicion como paso que requiere que la matriz exista.

**Fuera:**

- El renombre de los catalogos (UPONE-1753).
- Modelar las plantillas de perfil como objeto: son solo interfaz (pre-llenan campos), no se persisten.
- La tributacion y los indicadores derivados (UPONE-1756).

## Criterios de aceptacion (checkeables)

- [ ] La matriz se edita en cuatro pestanas: General, Medicion, Adopcion, Competencias (mas Historial en vista), en el orden del flujo.
- [ ] Informacion general queda con identidad y gobernanza; los campos de medicion viven en Medicion.
- [ ] Al crear una matriz, se pide primero lo minimo para que exista; Medicion, Adopcion y Competencias quedan bloqueadas con su motivo hasta que la matriz tenga id.
- [ ] Guardar Informacion general en creacion **no navega al listado**: se conserva la pantalla y las otras pestanas se desbloquean con el id.
- [ ] El record type de la matriz tiene los campos de medicion nuevos y ya no tiene `aggregationMode`; el modelo de rubrica usa `Analytic` en vez de `Criterion`.
- [ ] Las reglas de combinacion se cumplen: los tres condicionamientos internos, y el bloqueo de escala cualitativa contra promedio ponderado.
- [ ] La escala de desempeno y los niveles de desarrollo son obligatorios **para publicar**, no para crear.
- [ ] La pestana Competencias no opera hasta que la escala este definida (la rubrica no tiene columnas sin ella).
- [ ] La vista (solo lectura) muestra la pestana Medicion.

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo (regla del proyecto; `estandar-DoR-DoD` del sprint). Ademas, especifico:

- [ ] Recorrido de creacion en cuatro pasos verificado end to end en runtime, incluido que General no navega al listado y que las otras pestanas se desbloquean con el id.
- [ ] Validacion de pesos **por grupo y su eje** (no por matriz): criterios y RA se validan siempre; los grupos que agregan con `Max` se eximen.
- [ ] Obligatoriedad de los dos catalogos como gate de **publicacion**, con aviso mientras se edita.
- [ ] Migracion del record type sin drift; sync corrido sin editar archivos sincronizados.
- [ ] i18n de la pestana y de los campos nuevos en es/en/pt con paridad.
- [ ] Tests unit de los validadores y de los tres ejes; smoke del flujo de creacion.
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

- [ ] Crear una matriz: al guardar General se obtiene id y las otras tres pestanas se desbloquean.
- [ ] Medicion guarda por actualizacion (la matriz ya existe) y persiste escala, niveles, modelo y ejes.
- [ ] Publicar sin escala o sin niveles: se bloquea con su aviso.
- [ ] `requiresAllCriteria` solo aparece con modelo por criterios; queda en `null` en los demas.
- [ ] Base del logro `RepresentativeLevel` apaga el eje entre niveles.
- [ ] Escala cualitativa con un eje en promedio ponderado: bloquea el guardado y nombra los ejes a corregir.
- [ ] Un grupo que agrega con `Max` no exige que sus pesos sumen 100; criterios y RA si, siempre.
- [ ] La vista muestra Medicion en solo lectura.

## Factores transversales (checkeables)

- [ ] Capa de lenguaje (i18n): **aplica.** Pestana y campos nuevos en es/en/pt.
- [ ] Accesibilidad (WCAG): aplica al formulario de la pestana (labels, estados bloqueados con motivo legible).
- [ ] Storybook: N/A (el shell es componente existente; evaluar si el editor de la pestana lo amerita).
- [ ] Design tokens: aplica (formulario con tokens del design system).
- [ ] Documentacion: aplica (nuevo modelo de medicion y flujo de creacion).
- [ ] Convenciones de mod: **aplica.** Schema-driven (objects -> codegen -> migrate), escrituras por mutations `*Validated`, i18n como fuente de verdad. Ver Guia.
- [ ] Permisos (RBAC): N/A nuevo (la pestana usa los permisos de la matriz existentes; `requiredCapability` de pestana no reemplaza el chequeo del backend).
- [ ] **Logica server-side / MCP-ready (regla del proyecto, get_rules):** aplica. Las reglas de combinacion, el bloqueo de escala cualitativa y la validacion de pesos viven en el resolver/validadores del servicio (mutations *Validated), no en el cliente.

## Frontera core/mod (Aduana)

Pasada de Aduana en subagente de contexto limpio, modo analisis, contra el working copy real.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Pestana `medicion` + reparto de `elements` en los 3 layouts | `mod-only` | Config de `schema.matrixShell.tabs` que consume un componente propio del mod; ningun tipo de tab vive en core | `mods/curriculum-mapping/config/layouts/default_CompetencyNode_{create,edit,view}.json` |
| 6 campos nuevos + retiro de `aggregationMode` en el record type | `mod-only` | Extension del RecordType del mod (satelite propio); no toca objetos Base de core | `objects/RecordTypes/rt__Matrix__competencynode.json:41-80` |
| Mutations create/update + validadores | `mod-only` | Firma y reglas viven en `logic/`; delegan al `create/updateInstance` generico del core sin modificarlo | `logic/competencyMatrix-{create,update}.resolver.js`; `logic/helpers/validateCompetencyMatrix.js:24-56` |
| Contrato de pestana del shell (extender con `requiresFields`) | `mod-only` | `tabs.ts` es un modulo TS puro dentro del mod, sin contraparte en `layout`/`object-manager`; agregar `requiresFields?` y usarlo en `isTabLocked` es 100% local | `modsComponents/CompetencyMatrixShell/tabs.ts:59-100,150-156` |
| Bug de Prisma (upsert valida rama `create` estatica en updates parciales) | `mod-only`, ya resuelto | El workaround no es una mutation nueva: es el backfill generico `MATRIX_RT_REQUIRED` que completa desde la fila actual antes de delegar al generico | `logic/helpers/validateCompetencyMatrix.js:30-56`; `logic/competencyMatrix-update.resolver.js:222-236` |

**Veredicto global: `todo-mod-only`.** Ningun artefacto requiere tocar `object-manager`, `layout` o `suite`. Se ejecuta dentro del mod, sin coordinacion con core. No se genera seccion de Dependencias externas.

## Dependencias

- **Depende de:** UPONE-1753 (renombre de los catalogos; la pestana Medicion los selecciona con el nombre nuevo). Coordinar el orden: 1753 antes, o consensuar los nombres para no re-renombrar.
- **Se relaciona con:** UPONE-1756 (tributacion, consume el modelo de medicion y los tres ejes).
- **Habilita:** que la tributacion (1756) opere sobre una matriz que ya declara su escala, sus niveles y su forma de consolidacion.

## Estimacion

**5 SP.** Alcance en un solo mod (3 layouts, record type con 6 campos nuevos, 2 resolvers, shell TS puro), pero con superficie ancha: reglas de combinacion no triviales (tres ejes, condicionamientos cruzados) y verificacion end to end del flujo de creacion en cuatro pasos.

## Decisiones abiertas

- [ ] **Flujo de creacion (A/B/C):** recomendada **A** (Medicion con `requiresRecord: true`, igual que Adopcion y Competencias). Verificada contra el codigo actual: es aplicar el patron existente, no requiere decision nueva de arquitectura. Se deja explicita para firma del tech lead.
- [ ] **Dependencia de Competencias sobre la escala:** `requiresFields: string[]` en el contrato del shell (motivo visible antes de entrar) vs. guardia dentro del editor del arbol (estado vacio al entrar). Las dos son mod-only; es decision de UX/tech lead.
- [ ] **Enum unico de modelo de medicion:** hoy la cuarta combinacion invalida se evita normalizando `rubricModel` a `null`; un enum de tres valores la haria imposible por construccion. No es de este ticket; si se decide, es el momento barato.

## Guia de ejecucion: reglas y patrones up1 a considerar

- **[A favor]** Las pestanas se declaran en el layout y despachan por su modo `save`; `requiresRecord` bloquea con motivo en vez de esconder. _Fuente: `modsComponents/CompetencyMatrixShell/tabs.ts`._
- **[Advertencia]** No usar el submit del core para el header de la matriz en creacion: su `customEndpoint` emite `instance-created` y navega al listado, y se pierde la pantalla justo cuando las otras pestanas se desbloquean. _Fuente: la nota del propio `tabs.ts` y los resolvers._
- **[Advertencia]** Guardar parcialmente el record type choca con la validacion estatica de Prisma; el mod ya lo resuelve con el backfill `MATRIX_RT_REQUIRED`. Si algun campo nuevo se hiciera obligatorio, sumarlo a esa lista. _Fuente: `logic/helpers/validateCompetencyMatrix.js:30-56`._
- **[Gate]** Validar pesos por grupo y su eje, no por matriz; criterios y RA siempre suman 100. _Fuente: explicativo, seccion 7._
- **Transversal:** schema-driven (objects -> codegen -> migrate), correr sync, i18n con paridad, no commitear artefactos de sync/seed. _Fuente: `CLAUDE.md` del mod._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1452 | Epic Curriculum Mapping | contenedor | Backlog |
| UPONE-1753 | Menus y terminologia | dependencia: renombra los catalogos que esta pestana selecciona | Backlog |
| UPONE-1756 | Tributacion | hermano sp10; consume el modelo de medicion y los tres ejes | Backlog |
| UPONE-1633 | Matriz de competencia: Adopcion y Competencias | antecedente: construyo el shell y las pestanas Adopcion/Competencias que este ticket extiende | Finalizada |

## Referencias

- Fuente canonica: UPONE-1755 (Jira) y la maqueta de sp10 (Curriculum Mapping v29).
- Detalle tecnico code-grounded: `UPONE-1755-explicativo` (este sprint).
- Working copy verificado: `curriculum-mapping` @ `develop` `584499e`.
