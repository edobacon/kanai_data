# UPONE-1616 - Curriculum Design | Ajustar orden de los menus

> Tarea · Prioridad Mayor · Epic UPONE-1267 Curriculum Design · Asignado: Eduardo Bacon · Story Points en Jira: sin asignar
> Sprint: Migracion uAssessment SP9
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1616

## Fuente canonica (PO)

> Criterios de aceptacion:
>
> - Se debe implementar el siguiente orden y nombre de vistas:
>
> | **Actual** | **Actividad** | **Programas academicos** | **Ofertas** | **Planes de estudios** | **Historial de cambios** |
> | --- | --- | --- | --- | --- | --- |
> | Necesario | **Programas academicos** | **Planes de estudios** | Programa de asignatura | Silabos | **Historial de cambios** |
>
> - El nombre de la pestana debe estar alineado con el nombre de la vista
> - Asegurarse que quede correcto a nivel de breadcrum y jerarquia actual

Sin comentarios ni adjuntos. El request no se reescribe.

**Nota para postear en Jira:** el ticket ya tiene descripcion del PO, asi que este detalle va como
**comentario**, no pisando la descripcion.

## Historia de usuario

Como **disenador curricular**, quiero que las vistas de Curriculum Design aparezcan en el orden en que
trabajo (primero la carrera, despues el plan, despues la asignatura) y que cada una se llame igual en
el menu, en el encabezado y en la ruta de navegacion, para dejar de traducir mentalmente que "Actividad"
es el programa de asignatura y que "Ofertas" son los silabos.

## Objetivo

Que el menu de Curriculum Design presente sus cinco vistas **en el orden pedido**, adoptando la
capacidad de ordenamiento de vistas por mod que la plataforma ya ofrece, y que el nombre de cada vista
sea el mismo en el menu, la ruta de navegacion y el encabezado **en todos los casos donde el mod puede
controlarlo por su cuenta**.

El eje del ticket es el **orden**. Este ticket **se limita a las herramientas que la plataforma ya ofrece** y
no construye capacidades nuevas: el renombre alcanza a los objetos que ningun otro mod declara como vista, y
los dos que si estan compartidos quedan bloqueados por una **precondicion de plataforma incumplida** (ver
"Limitacion conocida" mas abajo, y su detalle completo en el pre-intake).

## Alcance

**Dentro:** el **orden** de las cinco vistas segun la tabla del PO, adoptando la capacidad de
ordenamiento por mod ya existente; el nombre visible de las **tres vistas cuyo objeto no comparte otra
app**; la coherencia del nombre entre el menu, la ruta de navegacion y el encabezado en esos casos; y la
actualizacion del test que fija el array de vistas.

**Fuera:** el renombre de las vistas de **Activity y Offering**, **bloqueado por una precondicion de
plataforma incumplida** (su objeto lo declara tambien la app de Engagement y no existe via por mod que
funcione); **construir** esa precondicion, que es trabajo del equipo de core y no de este ticket; hacer que la
pestana del navegador refleje la vista activa, si esa fuera la lectura del criterio; la adopcion del orden de
vistas **por rol**, que existe pero el equipo decidio no necesitar ahora; y el rediseno de la jerarquia visual
entre menu y ruta de navegacion, que el equipo dejo como tema de diseno para el core.

## Limitacion conocida

Los nombres de las vistas de **programa de asignatura** (objeto `Activity`) y de **silabos** (objeto
`Offering`) no se pueden cambiar desde el mod: la app de Engagement declara esos mismos dos objetos como
pestanas en el mismo tenant, y el nombre visible de una pestana se indexa por objeto, no por aplicacion, asi
que no hay via del mod que aisle el cambio sin afectar a Engagement. Esto queda **bloqueado por
UPONE-1645** (precondicion de plataforma, ver Dependencias). El analisis completo (por que, requisito,
forma propuesta, alternativas descartadas) esta en el pre-intake.

## Criterios de aceptacion (checkeables)

- [ ] El menu de Curriculum Design presenta sus vistas en el orden pedido por el PO: programas
      academicos, planes de estudios, programa de asignatura, silabos, historial de cambios.
- [ ] El orden queda declarado en la configuracion del mod, usando la capacidad de ordenamiento de vistas
      que la plataforma ya ofrece (sin cambios en core).
- [ ] Las tres vistas cuyo objeto no comparte otra app (programas academicos, planes de estudios,
      historial de cambios) se llaman igual en el menu, en la ruta de navegacion y en el encabezado.
- [ ] **El nombre de las vistas de la app de Engagement no cambia** como efecto colateral de este
      ticket. Es la regresion critica.
- [ ] Queda documentado por que las vistas de programa de asignatura y silabos conservan su nombre
      actual, y cual es la capacidad que haria falta para cambiarlo.
- [ ] Los tres idiomas (es/en/pt) quedan con paridad de claves para los nombres que se toquen.
- [ ] El test que fija el array de vistas de la app queda actualizado y verde.

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp9/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] **Verificado en el tenant UPU con evidencia runtime**: captura del menu con el orden y los
      nombres nuevos, y de la ruta de navegacion coherente. No basta con la config ni con la base.
- [ ] **Verificado que la app de engagement sigue mostrando sus propios nombres** en el mismo tenant.
      Es la regresion critica de este ticket.
- [ ] Recorrido de las cinco vistas: el encabezado de cada una coincide con su entrada de menu.
- [ ] Sync corrido; sin editar a mano archivos sincronizados.
- [ ] i18n en es/en/pt con paridad de claves.
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

> Conjunto minimo a cubrir. El dev puede y debe sumar mas casos durante la ejecucion si surgen.

- [ ] El array de vistas de la app queda en el orden objetivo y el test que lo fija lo refleja.
- [ ] Render del menu en el tenant UPU -> las cinco entradas en el orden pedido con los nombres
      pedidos.
- [ ] Render del menu de la app de engagement en el mismo tenant -> sus nombres siguen intactos.
- [ ] Navegar a cada vista -> la ruta de navegacion muestra el mismo nombre que el menu.
- [ ] Navegar a cada vista -> el encabezado muestra el mismo nombre que el menu.
- [ ] Cambio de idioma -> los nombres nuevos aparecen traducidos y sin claves crudas.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): N/A. No cambia capabilities. Nota: una vista sin permiso ya se oculta, y el
      orden se mantiene logico, que es la razon por la que el equipo decidio no necesitar orden por rol.
- [ ] Historial / auditoria (DataLog): N/A.
- [ ] Capa de lenguaje (i18n): **es el nucleo del ticket**. Los nombres de las vistas son claves de
      traduccion; hay que cubrir es/en/pt con paridad. Ojo: hoy la clave del historial de cambios
      existe en en/pt pero no en es.
- [ ] Accesibilidad (WCAG): aplica de forma ligera. El menu y la ruta de navegacion deben mantener su
      semantica y su orden de foco coherente con el orden visual.
- [ ] Storybook: N/A. No hay componente nuevo.
- [ ] Design tokens (`var(--up1-*)`): N/A. No hay cambio visual mas alla del texto y el orden.
- [ ] Documentacion: aplica de forma minima. El cambio es observable para el usuario y para QA.
- [ ] Convenciones de mod: aplica. La declaracion de vistas y sus traducciones viven en el mod; sync
      sin editar archivos sincronizados a mano.

## Dependencias

**Depende de:** nada bloqueante para el orden ni para los tres nombres libres. Ese alcance se ejecuta solo.

**Bloqueado por (precondicion): UPONE-1645**, la capacidad de plataforma para declarar el nombre de una vista
**por aplicacion**. Sin ella, el renombre de las vistas de `Activity` y `Offering` no es ejecutable:
declararlo desde el mod no toma efecto, y la unica capa que gana afecta tambien a Engagement. Es trabajo de
core; este ticket no la construye. Si UPONE-1645 aterriza antes del cierre de este ticket, los dos nombres se
completan aqui.

**Coordinar el orden de ejecucion con UPONE-1615 (hermano SP9).** Hoy las dos apps curriculares son
visibles para cualquier rol, porque el resolver trata una app sin roles asignados como publica. Si 1615
crea las filas de vinculo entre rol y app antes, y el perfil con el que se verifica queda fuera de la
lista de roles habilitados, la verificacion de este ticket no se puede ejecutar con ese usuario. No
cambia el alcance de ninguno de los dos, pero define con que rol se toma la evidencia.

**Coordinar con:** el equipo dueno de la app de engagement, porque comparte los dos objetos en
conflicto.

## Estimacion

**3 SP** para el alcance ejecutable: reordenar las vistas adoptando la capacidad existente, alinear los
tres nombres libres, cubrir los tres idiomas, actualizar el test del array, y verificar el render real
mas la no regresion de Engagement. El cambio en si es de configuracion; **la verificacion pesa mas que el
cambio**, porque hay que comprobar dos apps en el mismo tenant.

Baja a **2 SP** si el alcance se acota a solo el orden mas el test, sin tocar nombres.

Los dos renombres bloqueados **no estan estimados aqui**: dependen de una capacidad de core que no
existe. La via rapida (pisar la clave en el override por tenant) seria trivial en esfuerzo pero
introduciria una regresion en Engagement, asi que no se propone.

## Guia de ejecucion: reglas y patrones up1 a considerar

> No dice como implementar; marca reglas y patrones (a favor) y antipatrones (evitar) de up1 que
> aplican a este ticket.

- **[A favor]** El orden de las vistas es la posicion en el array de la config de la app del mod: se
  reordena ahi, no en el core. La capacidad ya existe y esta validada en el sync. _Fuente:
  `mods/curriculum-design/config/app.json:9`; `suite/logic/app.resolver.js:145-160`._
- **[A favor]** Si mas adelante se necesita orden o subconjunto de vistas **por rol**, la capacidad
  tambien existe: se declara por rol interno en lugar del array plano, y ambos son mutuamente
  excluyentes. _Fuente: `object-manager/scripts/sync/dbSync.js:1092-1186` (validacion);
  `mods/hello-world-mod/config/app.json:10-17` (consumidor real)._
- **[Advertencia]** Cada mod declara sus traducciones en su propio namespace, pero en runtime todos se
  fusionan en un solo catalogo por tenant e idioma: precedencia core, luego mods **en orden alfabetico**,
  luego override por tenant. Para una clave repetida gana la ultima capa, y el contexto de i18n **no
  incluye la aplicacion**. _Fuente: `suite/scripts/lib/i18n-source-map.mjs` (namespace por workspace y
  orden de capas); `suite/utils/i18nBridge.ts:70-131` (contexto y resolucion)._
- **[Advertencia]** Consecuencia practica: para un objeto que otro mod declara con nombre distinto, la
  declaracion propia puede **perder** por orden alfabetico. Verificar quien gana antes de asumir que
  declarar la clave alcanza. _Fuente: la misma funcion de orden de capas; `mods/uengagement-up1` se carga
  despues de `mods/curriculum-design`._
- **[Advertencia]** El esquema de la app no tiene campo de etiqueta por pestana, y la interfaz de tab
  resuelta server-side descarta claves extra. No se puede declarar el nombre en la config de la app.
  _Fuente: `object-manager/objects/up1/suite/up1_suite_app.json`; `suite/logic/app.resolver.js:29-47`._
- **[Advertencia]** Activity y Offering estan declarados como vistas por defecto en dos apps del mismo
  tenant. Cualquier rename se verifica en **las dos**. _Fuente:
  `mods/curriculum-design/config/app.json:9`; `mods/uengagement-up1/config/app.json:35-36`._
- **[A favor]** La ruta de navegacion hereda la etiqueta del menu: no hay que tocarla por separado.
  _Fuente: `suite/composables/breadcrumbTrail.ts:216-220`._
- **[Advertencia]** El menu **no** consume la etiqueta de objeto declarada en el JSON, aunque ahi ya
  este el nombre correcto: son dos sistemas de etiquetado distintos. No asumir que cambiar uno mueve el
  otro. _Fuente: `mods/curriculum-design/objects/activity.json:7-8`; `layout/src/shared/objectLabels.ts:68-84`._
- **[Gate]** Hay un test del mod que fija el array exacto de vistas: se actualiza en el mismo cambio o
  el build queda rojo. _Fuente:
  `mods/curriculum-design/tests/integration/layouts-declared.test.ts:231-237`._
- **[Evitar]** No editar a mano los archivos de traduccion sincronizados: se edita la fuente en el mod y
  se corre el sync. _Fuente: `up1/CLAUDE.md` (Critical Rules, i18n)._
- **[Gate]** Cierre con render real: es un cambio de UI puro, y el criterio de aceptacion es
  literalmente lo que el usuario ve. _Fuente: estandar DoD del equipo._
- **Transversal:** correr sync; no commitear artefactos de sync; en codigo, commits y PR usar solo el id
  de Jira. _Fuente: `up1/CLAUDE.md`._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1645 | Core: nombre de vista declarable por aplicacion | **precondicion**: sin ella dos de los renombres de este ticket no son ejecutables. Creada desde este hallazgo y ya validada con un spike | Backlog |
| UPONE-1513 | PLAT-15: homescreen y orden de tabs de mods | antecedente: construyo el mecanismo de orden de vistas que este ticket usa, y tambien el orden por rol que el equipo creia no construido | Finalizada |
| UPONE-1615 | Implementar logica de Roles internos | hermano SP9; **coordinar**: al asignar roles a las apps curriculares estas dejan de ser publicas, lo que afecta con que usuario se toma la evidencia runtime de este ticket. Ademas, si se adoptara orden de vistas por rol, se apoyaria en sus roles internos | Backlog |

## Referencias

- Fuente canonica: UPONE-1616 (criterios de aceptacion del PO, con la tabla de orden actual y objetivo).
- Refinamiento 2026-08-13: `transcripts/2026-08-13-refinamiento-sprint-uassessment.md` (orden y nombres
  de vistas, la duda abierta de mod vs core, el pedido de cubrir tambien la ruta de navegacion y el
  titulo, y el descarte de orden de vistas por rol para este sprint).
- Paquete de la precondicion para compartir con core (interno, no pegar en Jira):
  `sp9/PRECONDICION-core-nombre-de-vista-por-app.md`. Contiene la evidencia por capas, las propiedades que
  debe cumplir, la forma propuesta con su superficie de cambio, el **spike ejecutado con su resultado en las
  dos apps**, las alternativas descartadas, que se le pide a core y la validacion de frescura.
- Precondicion, ya con ticket propio: **UPONE-1645**. Su contrato y guia de implementacion, en el KB del
  equipo (interno, no pegar en Jira): `sp9/UPONE-1645-detalle.md` y `sp9/UPONE-1645-pre-intake.md`.
- Codigo: `mods/curriculum-design/config/app.json`, `mods/curriculum-design/lang/`,
  `mods/curriculum-design/config/layouts/`, `suite/composables/useObjectManager.ts`,
  `suite/composables/navTabs.ts`, `suite/composables/breadcrumbTrail.ts`,
  `suite/pages/[tenant_id].vue`, `mods/uengagement-up1/config/app.json`.

> Analisis completo del por que (contexto de dimensionamiento, la limitacion conocida en detalle, la
> precondicion de plataforma con requisito/forma propuesta/alternativas, la frontera core/mod de Aduana,
> y las decisiones abiertas): ver `UPONE-1616-pre-intake.md` (interno, no pegar en Jira).
