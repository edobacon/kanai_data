---
id: DOC-kb-sp8-UPONE-1540-detalle
project: up1
type: doc
---

# UPONE-1540 - Alerta erronea de cambios sin guardar en creacion de plan de estudio

> Error · Prioridad Trivial (revisar, ver estimacion) · Epic UPONE-1267 Curriculum Design · Asignado: Eduardo Bacon
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1540

## Fuente canonica (PO)

Alerta erronea de cambios sin guardar en creacion de plan de estudio.

## Sintoma

Al crear un Plan de estudio (o al entrar en modo ver sin editar) y volver atras, el formulario pide confirmacion de "vas a perder los cambios sin guardar" a pesar de que el usuario no hizo cambios. Ademas un campo aparece invalidado en rojo. La carga inicial se interpreta como un cambio.

## Historia de usuario

Como usuario que crea o consulta un Plan de estudio, quiero que el sistema no me alerte de cambios sin guardar cuando no hice ningun cambio, para no recibir advertencias falsas ni ver campos invalidados sin motivo.

## Objetivo

Un formulario de Plan de estudio recien cargado, sin edicion, no queda marcado como "con cambios"; volver o cancelar sin editar no dispara el modal; en modo ver, volver o cancelar cierra directo; un campo obligatorio no queda invalido por la carga inicial cuando su valor es valido; y el caso legitimo se conserva (si el usuario edita, el modal si aparece).

## Contexto (para dimensionar)

Es un bug de la capa comun de detalle (core), no del mod de diseno curricular: se dispara en cualquier formulario que autocompleta datos al abrirse, y el Plan de estudio es uno de ellos. El disparador concreto es un campo que se autopuebla al montar (un obligatorio, como el Dueno del plan): al recalcularse queda marcado como cambiado, y si su valor no resuelve valido en ese instante, tambien invalido/rojo, todo sin edicion del usuario. Hay ademas un hueco secundario relacionado: al cancelar en modo ver el formulario igual pregunta por cambios. Ya existe una solucion construida para este mismo problema en una rama sin mergear (UPONE-912); rescatarla e integrarla sobre la reorganizacion posterior de esa capa es el grueso del trabajo, e implica coordinacion con core. No es el mismo caso que arreglo Francisco en curriculum mapping. Detalle tecnico en el pre-intake.

## Alcance

**Dentro:** que la carga inicial no marque cambios; que no aparezca el modal sin edicion real; que cancelar/volver en modo ver cierre directo (hueco secundario); que el campo obligatorio no quede invalido por la carga; preservar el caso en que si hay edicion.

**Fuera:** cambios en la configuracion del mod de diseno curricular (la causa no esta ahi).

## Criterios de aceptacion (checkeables)

- [ ] Formulario de creacion de Plan recien montado, sin editar: no queda marcado como "con cambios".
- [ ] Sin ediciones, al cancelar o volver: no aparece el modal de "cambios sin guardar".
- [ ] En modo ver, al cancelar o volver: se cierra directo, sin preguntar.
- [ ] Si el usuario edita un campo: el modal de "cambios sin guardar" si aparece.
- [ ] Con dato valido autocompletado: el campo obligatorio no queda invalido/rojo por la carga inicial.
- [ ] Otro formulario que autocompleta datos: tampoco queda con cambios al montar (sin regresion).

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp8/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] Todos los criterios de aceptacion verificados en el formulario real (evidencia runtime), incluido el caso legitimo de edicion.
- [ ] No-regresion verificada en al menos otro formulario que autocompleta datos.
- [ ] Al ser cambio en core, coordinado y validado con el equipo de core antes de integrar.

## Tests minimos (checkeables; ampliables en ejecucion)

> Conjunto minimo a cubrir. El dev puede y debe sumar mas casos durante la ejecucion si surgen.

- [ ] Abrir creacion de Plan y volver sin editar -> no pregunta por cambios.
- [ ] Abrir en modo ver y volver -> cierra directo, sin preguntar.
- [ ] Abrir, editar un campo y volver -> si pregunta por cambios.
- [ ] Abrir creacion con dato valido autocompletado -> el campo obligatorio no queda en rojo.
- [ ] Otro formulario con autocompletado, abrir y volver -> no pregunta por cambios.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): N/A - fix de comportamiento; no cambia gating. Cuidar no romper la paridad RBAC del detalle vs lista (ver Guia de ejecucion).
- [ ] Historial / auditoria (DataLog): N/A - no toca datos ni auditoria.
- [ ] Capa de lenguaje (i18n): N/A - no agrega textos; el modal de confirmacion ya existe y esta traducido.
- [ ] Accesibilidad (WCAG): N/A - corrige comportamiento, no cambia UI.
- [ ] Storybook: N/A - no hay componente nuevo.
- [ ] Design tokens (`var(--up1-*)`, sin hardcode): N/A - sin UI nueva.
- [ ] Convenciones de mod: N/A - es cambio en core `layout`, no en un mod (aplica el proceso de core: rama + PR, ver Guia).
- [ ] Documentacion: aplica - dejar registrada la causa raiz y el origen del fix (rama sin mergear) en el KB de core, para que no se pierda.

## Dependencias

El arreglo es en core (capa de detalle comun), no en el mod. Requiere coordinacion con el equipo de core y definir el ownership del cambio.

## Estimacion

**3 SP.** El sintoma es simple, pero el arreglo es en core: rescatar una solucion ya hecha en una rama sin mergear y reintegrarla sobre la reorganizacion posterior de esa capa, con regresion en varios formularios/modales. La prioridad "Trivial" subestima el costo por ser core; sugerencia: subir a Menor. Baja a **2 SP** con un arreglo puntual mas acotado, con la contra de no cubrir otros casos del mismo falso positivo.

## Decisiones abiertas

- [ ] Reintegrar la solucion completa de UPONE-912 (recomendado, cubre el problema de raiz) vs un arreglo puntual mas chico.
- [ ] Ownership del cambio en core: nuestro equipo con coordinacion, o el equipo de core (dueno de UPONE-912).
- [ ] Confirmar con captura del bug real cual es el campo que aparece en rojo.

## Guia de ejecucion: reglas y patrones up1 a considerar

> No dice como implementar; marca reglas/patrones (a favor) y antipatrones (evitar) de up1 que aplican a este ticket.

- **[Gate de proceso]** Es cambio en core `layout`: va en rama con el id Jira, con revision del equipo up1 antes de merge a develop; cerrar el ticket no implica merge. _Fuente: `up1/CLAUDE.md` (Critical Rules: no tocar core sin coordinar); proceso de PR del equipo (Bitbucket)._
- **[A favor]** Documentar el contrato de "cambios sin guardar"/autocompletado, no solo parchear el sintoma. Antecedente: dos fixes parciales consecutivos en el mismo archivo por un contrato no documentado. _Fuente: Jira UPONE-1515 (+ commit `fef065bd`); `layout/src/layouts/RecordDetail.vue` (enum en view)._
- **[A favor]** Al reenrutar una rama de codigo en core, auditar todos los consumidores/sinks y correr la suite unit completa como regresion, no solo la del area tocada. _Fuente: `object-manager/src/graphql/resolvers/instance.resolver.js` (precedente Jira UPONE-1479)._
- **[A favor]** Respetar el mecanismo real de autocompletado del formulario (autoPopulate/populateItems); no introducir un mecanismo paralelo. _Fuente: `layout/src/layouts/RecordDetail.vue:693` y `mods/curriculum-design/modsComposables/useOwnerIdOptions.ts`._
- **[Advertencia]** Paridad RBAC entre el detalle y la lista: si el fix toca esa zona, no reintroducir el gap de gating. _Fuente: Jira UPONE-1439 (paridad de RBAC en `RecordDetail`)._
- **[Advertencia]** Esta zona no tiene red de seguridad de render: cualquier cambio exige smoke runtime, no solo unit. Solucion ya existente: el fix del dirty se construyo en la rama `Feat/UPONE-912` y quedo sin mergear a develop. _Fuente: rama `Feat/UPONE-912` (commit `b58ce42c`); Jira UPONE-1515 (bug del mismo flujo en `RecordDetail`)._
- **Transversal:** en codigo/commits/PR usar solo el id Jira. _Fuente: `up1/CLAUDE.md` (Commit & Patch Notes)._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| Rama `Feat/UPONE-912` (commit `b58ce42c`) | Fix del false-positive de dirty (bulk modal hook) | la solucion ya construida a rescatar; quedo sin mergear a develop | rama remota |
| UPONE-1515 | conditions sobre enum en view (mismo `RecordDetail.vue`) | antecedente de fixes repetidos en la misma zona | Finalizada |
| UPONE-1439 | RBAC field-level no se enforza en RecordDetail | paridad a no romper si el fix toca esa zona | Finalizada |
| UPONE-1479 | Core: borrado por RecordType no cascadea (auditar sinks) | precedente de auditar consumidores al reenrutar codigo core | Developing |
| UPONE-1458 | Ajustes de dirty en el editor de niveles (curriculum-mapping) | precedente ya mergeado del enfoque "limpiar dirty al hidratar" (opcion B del fix), en otro componente | Finalizada |

## Referencias

- Fuente canonica: UPONE-1540.
- Planning SP8: `sp8/transcript-planning-2026-08-04.md` (alerta dirty erronea).
