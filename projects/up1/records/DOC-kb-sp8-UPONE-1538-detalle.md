---
id: DOC-kb-sp8-UPONE-1538-detalle
project: up1
type: doc
---

# UPONE-1538 - Configuracion de plan de estudio modular

> Historia · Prioridad Mayor · Epic UPONE-1267 Curriculum Design · Asignado: Eduardo Bacon
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1538

## Fuente canonica (PO)

> Ajustar flujo de creacion para que en el tipo Plan de estudio:
> - El total de creditos sea independiente del tipo de progresion.
> - El total de periodos se solicite solamente si el tipo de progresion es "Secuencial".
> - El tipo de periodo se solicite solamente si el tipo de progresion es "Secuencial" (por confirmar).

## Historia de usuario

Como **Disenador Curricular**, quiero que al crear o editar un Plan de estudio los campos de periodos dependan del tipo de progresion (Secuencial vs Modular), para no pedir datos de periodos fijos en un plan modular, donde la progresion depende de la inscripcion del estudiante.

## Objetivo

En el formulario del Plan de estudio (crear, editar y ver): total de creditos visible siempre; total de periodos visible solo si la progresion es Secuencial; tipo de periodo visible solo si la progresion es Secuencial (sujeto a confirmacion, ver Decisiones abiertas). El Minor no ofrece progresion, creditos ni periodos.

## Contexto (para dimensionar)

Es un fix de configuracion, no una feature. El tipo de progresion Secuencial/Modular (default Secuencial) ya existe en el modelo del Plan: se cerro como enum en SP5 precisamente como discriminador del modo, anticipando que la progresion derivaria la regla de periodo; este ticket materializa esa intencion. Hoy los tres campos (creditos, periodos, tipo de periodo) dependen del tipo de registro (Plan), no de la progresion; el Minor no ofrece ninguno de ellos. No requiere nuevo campo, migracion ni cambios de backend, y la visibilidad se resuelve con el mecanismo nativo de condiciones del formulario. Independiente de UPONE-1539 (que consume el mismo dato de progresion para la malla). Dato pendiente heredado de SP5: los valores del catalogo de `tipo de periodo` nunca se cerraron.

## Alcance

**Dentro:** la regla de visibilidad de los tres campos segun la progresion, en crear/editar/ver (incluido que en modo ver la condicion se evalue sobre el valor real del enum, no la etiqueta), y el caso de cambiar la progresion con campos ya cargados sin romper el guardado. Sin regresion en el Minor.

**Fuera:** cualquier cambio de modelo de datos; la malla modular (UPONE-1539); la configuracion de rotacion (`rotationConfig`, fuera del layout de detalle).

## Criterios de aceptacion (checkeables)

- [ ] Plan con progresion Secuencial: se muestran total de creditos, total de periodos y tipo de periodo.
- [ ] Plan con progresion Modular: se muestra total de creditos y se ocultan total de periodos y tipo de periodo (escenario A; en B, tipo de periodo permanece).
- [ ] Total de creditos permanece visible en un Plan cualquiera sea la progresion.
- [ ] Minor: no se muestran progresion, creditos, periodos ni tipo de periodo.
- [ ] Cambiar de Secuencial a Modular con periodos/tipo de periodo cargados y guardar no falla; los campos ocultos no bloquean el envio por obligatoriedad.
- [ ] El comportamiento es identico en crear, editar y ver.

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp8/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] Todos los criterios de aceptacion verificados en el formulario real (evidencia runtime: captura por modo y progresion).
- [ ] Escenario de `tipo de periodo` (A o B) resuelto, o marcado explicitamente como pendiente de confirmacion.
- [ ] Sin regresion en el Minor ni en el Plan Secuencial existente.
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

> Conjunto minimo a cubrir. El dev puede y debe sumar mas casos durante la ejecucion si surgen.

- [ ] Plan Secuencial -> se ven creditos, periodos y tipo de periodo.
- [ ] Plan Modular -> se ve creditos; se ocultan periodos (y tipo de periodo en escenario A).
- [ ] Minor -> no se ven progresion/creditos/periodos.
- [ ] Secuencial -> Modular con periodos cargados y guardar -> guarda sin error; campos ocultos no bloquean.
- [ ] La regla de visibilidad funciona tambien en modo VER (no solo crear/editar): la condicion por `progression` se evalua sobre el valor real, no sobre la etiqueta traducida (evitar reincidir en el bug conocido de `conditions` sobre enum en view).

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): N/A - no crea capabilities ni cambia el gating; solo condiciona la visibilidad de campos que ya existen en el Plan.
- [ ] Historial / auditoria (DataLog): N/A - sin cambio de modelo ni de datos.
- [ ] Capa de lenguaje (i18n): N/A - no agrega textos nuevos; los campos ya tienen labels. Verificar que ninguna etiqueta quede faltante al cambiar la visibilidad.
- [ ] Accesibilidad (WCAG): N/A - no cambia la estructura del formulario, solo la visibilidad condicional (ya soportada).
- [ ] Storybook: N/A - no hay componente nuevo (cambio de configuracion de layout).
- [ ] Design tokens (`var(--up1-*)`, sin hardcode): N/A - sin UI nueva.
- [ ] Convenciones de mod: aplica (minimo) - es config de layout del mod; correr sync y no editar ni commitear archivos sincronizados.
- [ ] Documentacion: N/A - cambio de visibilidad; anotar en KB solo si cambia comportamiento visible.

## Dependencias

Ninguna dura. Comparte el dato de progresion con UPONE-1539 (independientes). UPONE-1450 (versionamiento del Plan, Finalizada) ya modifico los mismos layouts/RT de `Curriculum`; revisar su cambio para no chocar.

## Estimacion

**2 SP.** Cambio de configuracion acotado; el peso esta en verificar los tres modos por las dos progresiones y el caso de cambio de progresion con campos cargados.

## Decisiones abiertas

- [ ] `tipo de periodo`: escenario A (depende de progresion, solo Secuencial; recomendado, coherente con que el modular no fija periodos) vs B (dato general, se conserva en todo Plan porque el estudiante igual inscribe en un periodo academico). Accion de Esteban. El delta entre A y B es solo la condicion de ese campo.
- [ ] Valores del catalogo de `tipo de periodo` (sin cerrar desde SP5). No bloquea el cambio de visibilidad.

## Guia de ejecucion: reglas y patrones up1 a considerar

> No dice como implementar; marca reglas/patrones (a favor) y antipatrones (evitar) de up1 que aplican a este ticket.

- **[A favor]** La visibilidad condicional en layouts up1 se declara solo con la sintaxis nativa `conditions: [[campo, op, valor]]`. Variantes tipo `visibleWhen`/`showIf` no existen (verificado: no aparecen en `layout/src`). _Fuente: `layout/src/layouts/RecordDetail.vue` (conditions vs visibleWhen); ejemplo `mods/curriculum-design/config/layouts/default_Curriculum_create.json` (campos con `conditions`)._
- **[A favor]** Los labels de enums van a los archivos de idioma (`lang/es_CL@*.json`), no hardcodeados en el JSON del layout. _Fuente: `up1/CLAUDE.md` (i18n) y los `lang/` del mod._
- **[Evitar]** No crear un layout con otro nombre para variar por progresion: es el mismo objeto `Curriculum`; se respeta el naming `default_{Objeto}_{modo}` (la resolucion por nombre/fallback depende de el). _Fuente: `up1/CLAUDE.md` (Default layout naming convention) y `layout/docs`._
- **[Advertencia]** El enum de `progression` es un `String` en el modelo generado, sin enforcement en backend: la condicion es barrera de UI/MCP, no server-side. _Fuente: `object-manager/prisma/UPU/schema.prisma` (`progression String?`) y `typeDefs/dynamic.js` (`progression: String`)._
- **[Advertencia]** Antecedente de bug: las `conditions` sobre enum en modo ver comparan contra la etiqueta traducida, no el valor; ya paso con `recordType`, aplicar el mismo patron de campo espejo para `progression`. _Fuente: Jira UPONE-1515 (fix del enum en view de `RecordDetail.vue`)._
- **[Gate]** Mientras sea solo JSON de config del mod no es cambio core; si hubiera que tocar el motor de condiciones pasaria a core y exige rama + revision del equipo. _Fuente: `up1/CLAUDE.md` (Critical Rules: no modificar core cuando el cambio es del mod); proceso de PR del equipo (Bitbucket)._
- **Transversal:** correr sync tras el cambio; no editar archivos sincronizados a mano; en codigo/commits/PR usar solo el id Jira. _Fuente: `up1/CLAUDE.md` (Critical Rules, Sync, Commit & Patch Notes)._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1539 | Malla para plan modular | hermano SP8, consume el mismo dato `progression` | Backlog |
| UPONE-1540 | Alerta dirty al crear plan | hermano SP8 (mismo formulario) | Backlog |
| UPONE-1344 | MC-01 Ajustes de modelo base del plan | origen del enum `progression` (Sequential/Modular) | Finalizada |
| UPONE-1515 | conditions sobre enum en view comparan la etiqueta | antecedente del patron de campo espejo a aplicar en modo ver | Finalizada |
| UPONE-1450 | Versionamiento de plan de estudio | ya modifico los mismos layouts/RT de `Curriculum` | Finalizada |

## Referencias

- Fuente canonica: UPONE-1538.
- Planning SP8: `sp8/transcript-planning-2026-08-04.md` (dueno de inputs por progresion).
