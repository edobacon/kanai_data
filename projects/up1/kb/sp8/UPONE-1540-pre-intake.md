# Pre-intake tecnico - UPONE-1540 (alerta dirty erronea)

> Material de trabajo del implementador (Eduardo). Alimenta el intake/execution del ticket UPONE-1540.
> Ticket (contrato): `sp8/UPONE-1540-detalle.md`. Verificado contra codigo real en `uplanner/up1` (2026-08-04).

## Veredicto

Bug de core (`layout`, capa de detalle comun), no del mod. Ya existe resuelto en una rama sin mergear (UPONE-912).

## Causa raiz

- `isDirty()` en `layout/src/layouts/RecordDetail/RecordDetail.vue:5810-5812` delega ciego en `vueform.value?.dirty`; sin baseline propio ni comparacion initial-vs-current. (Refs a HEAD `f4ca7ac7`, 2026-08-05.)
- El `autoPopulate` con `triggerOnMount` (dual-populate) en `RecordDetail.vue` (`executePopulation` l.943-961, disparada por `triggerOnMount` l.970-976) hace `targetField.update(...)` en el mount (l.948 / l.961) sin limpiar el dirty despues. (Contraste: `useDetailContextReload.ts` si hace `el.clean()`.)
- El Plan de estudio cae en ese path: `mods/curriculum-design/config/layouts/default_Curriculum_create.json` define `ownerId` con `autoPopulate` (composable `useOwnerIdOptions`), `layoutType: RecordDetail` (estandar de core).
- Campo en rojo: `ownerId` es `required`; `useOwnerIdOptions.getOptionsByOwnerType` (l.88-91) devuelve `value:''` si el id no es `stillValid` en ese instante -> `update('')` sobre required -> invalido. Validar con captura real.
- Bug secundario: `ModalStackManager.vue` `handleCloseAttempt` (l.665-688, guard de view en l.669) bypassa la confirmacion en modo view, pero `handleCancelAttempt` (l.694-710) no.

## Solucion existente sin mergear (misma raiz)

UPONE-912, commit `b58ce42c` ("generic bulk modal hook + dirty-state false-positive fix"), autor Ignacio Jorquera, 2026-05-05, rama `origin/Feat/UPONE-912`. `git merge-base --is-ancestor b58ce42c HEAD` = falso (no esta en develop). HEAD de `layout`: `e4e69947`. Captura `initialFormSnapshot` al estabilizarse el data y hace `isDirty()` estructural con normalizacion. No confundir con el merge de `Feat/UPONE-912-delete-label` (PR #251, otra rama). La reorganizacion `b558a96f` (2026-08-03) movio `RecordDetail.vue` a `RecordDetail/RecordDetail.vue`; rescatar el commit implica rebase con conflicts.

## Opciones de arreglo

- A (raiz, recomendada): revivir/mergear UPONE-912.
- B (puntual): `el.clean()` tras cada `update()` de autoPopulate (l.948/961). **Precedente ya mergeado del mismo enfoque:** UPONE-1458 en `curriculum-mapping` limpia el dirty al hidratar en `modsComponents/RecordCollectionEditor/elementBridge.ts` (`writeElementValue` con `silent`/`clean()`), para distinguir hidratacion de edicion real del usuario. Mismo patron, otro componente: sirve de guia para la opcion B en core.
- Secundario (ambas): cerrar el gap de `handleCancelAttempt` para respetar modo view.

## Antecedentes de la zona (por que exige smoke runtime)

`RecordDetail.vue` (view vs edit) acumula bugs por falta de red de seguridad de render:
- `sp7/BUG-core-recorddetail-view-enum-conditions.md`: `conditions` sobre enum en view comparan contra la etiqueta traducida (mismo sintoma "view mal / edit bien", causa distinta). Su fix (enum como select disabled en view) corrigio de paso el campo `ownerId`/Dueño vacio en view: **evidencia independiente de que `ownerId` ya tiene fallas conocidas de autoPopulate en view**, lo que refuerza la hipotesis del campo en rojo de este ticket.
- Regresion previa en la misma zona por import faltante (`replaceRecordPlaceholders`), sin test que la atrapara: refuerza que la zona "no tiene red de seguridad que atrape una rotura de render". (Nota: el archivo de KB usa el prefijo UPONE-1353, pero ese id en Jira corresponde a otro tema RBAC; tratar solo como antecedente de la zona, no citar ese id.)

Moraleja para 1540: cualquier fix en `RecordDetail.vue` exige smoke runtime, no solo unit tests. Va al DoD.

## A resolver en intake

- Opcion A vs B; ownership del cambio en core (nuestro equipo con coordinacion, o el core team dueno de UPONE-912).
- Confirmar con captura del bug real cual es el campo en rojo (`ownerId` es la hipotesis).

## Reglas/patrones y su fuente (traza)

- Core -> rama con id Jira + revision del equipo antes de merge; cerrar != merge. Fuente: `up1/CLAUDE.md` (Critical Rules); proceso de PR (Bitbucket).
- Al reenrutar una rama de codigo, auditar todos los sinks y correr la suite unit COMPLETA como regresion. Fuente: `object-manager/src/graphql/resolvers/instance.resolver.js` (precedente Jira UPONE-1479).
- autoPopulate + populateItems es el mecanismo real; respetarlo, no un paralelo. Fuente: `layout/src/layouts/RecordDetail.vue:693`; `useOwnerIdOptions.ts`.
- Paridad RBAC del detalle vs la lista; no reintroducir el gap si el fix toca esa zona. Fuente: Jira UPONE-1439.
- Antecedente de dos fixes parciales consecutivos en el mismo flujo por contrato no documentado -> documentar el contrato dirty/autoPopulate. Fuente: Jira UPONE-1515 (commit `fef065bd`); `layout/src/layouts/RecordDetail.vue`.
- Si el fix tocara persistencia RT/ext, exige integration test contra BD real (probable N/A si es puro FE). Fuente: `object-manager` (resolvers de borrado/persistencia).
- Contratos de `layoutConfig` para tipos con valor objeto, revisar si el dirty-check interactua. Fuente: Jira UPONE-1377 / UPONE-1290.
- Solucion ya construida sin mergear. Fuente: Jira UPONE-912 (commit `b58ce42c`, rama `origin/Feat/UPONE-912`).

## Ubicacion

`layout` (core). No es el mismo caso que el fix de Francisco en curriculum-mapping (aquel fue modelar campos como string en un editor propio).
