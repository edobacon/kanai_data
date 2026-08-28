---
id: DOC-kb-sp9-UPONE-1645-detalle
project: up1
type: doc
---

# UPONE-1645 - Core | Nav | Nombre de vista declarable por aplicacion

> Historia · Prioridad Mayor · Epic UPONE-1267 Curriculum Design · Asignado: Eduardo Bacon · Story Points: 3
> Sprint: Migracion uAssessment SP9 · Workspaces: `suite` (+ artefactos de sync en `object-manager`)
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1645
> **Core Extension, Change Type 3** (nueva capacidad opcional): requiere luz verde del equipo de core antes
> de implementar y aprobacion de core para mergear. Ver "Frontera core/mod (Aduana)" (pre-intake).
> **Origen:** hallazgo de UPONE-1616 (Curriculum Design, ajustar orden de los menus, SP9), donde bloquea
> parte del alcance. **Validado con un spike funcionando** (ver pre-intake, seccion Contexto).
>
> **Revision 2026-08-18 (flujo decidido por el equipo).** Se ejecuta y se **presenta a core para revision**:
> el equipo construye la capacidad (apoyandose en el spike ya validado) y la somete a core en el PR. La
> aprobacion de core es **gate de merge, no de inicio**, asi que el ticket arranca sin esperar luz verde
> previa. Las definiciones de forma/fallback pasan a ser **propuestas del equipo con recomendacion**, a
> validar por core en esa revision (ver Decisiones abiertas, pre-intake).

## Fuente canonica

No hay request de PO: **este caso no nace de una peticion de negocio sino de un bloqueo tecnico
verificado**. Su origen documentado es doble:

1. **UPONE-1616**, cuyo pedido de renombrar dos vistas no es ejecutable con la plataforma actual.
2. **El spike de validacion**, que probo en runtime que la capacidad propuesta resuelve el caso y aisla por
   aplicacion.

**Estado en Jira:** el ticket **ya esta creado** con todo este detalle en su **descripcion**, no como
comentario, porque lo redacto el equipo y no un PO. Si se edita el contrato aqui, la descripcion del ticket
es la que hay que mantener sincronizada.

## Historia de usuario

Como **equipo de un mod**, quiero declarar el nombre de la vista que mi app expone sobre un objeto, y que
ese nombre aplique solo a mi app, para poder llamar a cada cosa como se llama en mi dominio sin cambiarle el
nombre a las vistas de otro mod que comparte el mismo objeto.

## Objetivo

Desacoplar el nombre de una vista de navegacion del nombre del objeto que la respalda. Hoy estan pegados: la
etiqueta de la vista se indexa por objeto, asi que dos apps que declaran el mismo objeto Base comparten
forzosamente el mismo texto. El objetivo es que cada app pueda declarar el suyo, de forma opt-in y sin
alterar el comportamiento de quien no lo declare.

## Alcance

**Dentro:** que la entrada de una vista en la configuracion de navegacion de una app acepte, de forma
opcional, la clave de traduccion del nombre a usar; que esa clave gane sobre la clave global por objeto
cuando este declarada; que la declaracion se propague desde la configuracion del mod hasta el render, pasando
por el esquema, el resolver, el tipo GraphQL y el cliente; y la declaracion del campo en el esquema del
objeto de app, por correccion y documentacion.

**Fuera:** cambiar el sistema de etiqueta de negocio del objeto o cablearlo al menu (es otra linea de
trabajo, ver Decisiones abiertas en pre-intake); agregar dimension de aplicacion al contexto de i18n; que la
pestaña del navegador refleje la vista activa; y el orden de las vistas, que ya es una capacidad existente.

## Criterios de aceptacion (checkeables)

- [ ] Una vista puede declarar el nombre a mostrar en la propia entrada de navegacion de su app.
- [ ] Cuando la declara, ese nombre gana sobre la clave global por objeto.
- [ ] Cuando **no** la declara, el comportamiento es identico al actual (opt-in, compatible hacia atras).
- [ ] Dos apps que declaran el mismo objeto pueden mostrar nombres distintos, y **ninguna afecta a la otra**.
- [ ] Funciona sin importar si el objeto es propio del mod o es un objeto Base compartido; no depende de
      ningun concepto de propiedad del objeto.
- [ ] El nombre es traducible: se declara como clave, resuelta en los tres idiomas.
- [ ] La ruta de navegacion muestra el mismo nombre que la vista, sin trabajo adicional.
- [ ] Funciona igual en el sistema de vistas compartidas por todos los roles y en el de vistas por rol
      interno.
- [ ] El comportamiento cuando la clave declarada no existe en el catalogo esta definido y es razonable (no
      muestra el nombre tecnico de la tabla).

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp9/estandar-DoR-DoD.md`). Ademas, especifico de este caso:

- [ ] Cambio hecho en las **fuentes** de `suite`; las copias de `object-manager` regeneradas por sync, no
      editadas a mano.
- [ ] Verificado en runtime con **dos apps que comparten un objeto**, en el mismo tenant: una declara el
      nombre, la otra no cambia. Con evidencia (captura de los dos menus).
- [ ] Verificada la no regresion de una app que no declara ningun nombre.
- [ ] Verificada la ruta de navegacion en las vistas afectadas.
- [ ] Cobertura unitaria de la preservacion del campo en la normalizacion y de la preferencia sobre la clave
      global.
- [ ] Campo declarado en el esquema del objeto de app y en el tipo GraphQL, con su documentacion.
- [ ] Doc de plataforma actualizada: es una capacidad nueva de configuracion que los mods van a consumir.
- [ ] Sin drift tras el sync.

## Tests minimos (checkeables; ampliables en ejecucion)

- [ ] Entrada de vista **sin** el campo -> nombre resuelto como hoy (sin regresion).
- [ ] Entrada de vista **con** el campo -> el nombre declarado gana sobre la clave global.
- [ ] Dos apps declarando el mismo objeto, una con el campo y otra sin el -> cada una muestra lo suyo.
- [ ] Entrada en forma de string (formato legado) -> sigue funcionando.
- [ ] Entrada del tab especial de dashboards -> ignora el campo y conserva su nombre reservado.
- [ ] Campo declarado con una clave inexistente en el catalogo -> cae al comportamiento definido, **no** al
      nombre tecnico del objeto.
- [ ] La normalizacion en el servidor preserva el campo; el cliente lo recibe en la consulta.
- [ ] Vistas por rol interno: el campo funciona igual que en las vistas compartidas.
- [ ] Ruta de navegacion: refleja el nombre declarado.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): N/A. No cambia capabilities ni el filtrado de vistas por permiso.
- [ ] Historial / auditoria: N/A.
- [ ] Capa de lenguaje (i18n): **aplica y es el nucleo**. El nombre es una clave; cada mod la declara en su
      propio namespace, que es lo que evita la colision. Cubrir los tres idiomas.
- [ ] Accesibilidad (WCAG): aplica de forma ligera. Cambia texto visible de navegacion.
- [ ] Storybook: N/A. No introduce componente nuevo.
- [ ] Design tokens: N/A.
- [ ] Documentacion: **aplica**. Capacidad de configuracion nueva, consumida por mods.
- [ ] Convenciones de mod: N/A del lado del core; del lado del consumidor, la clave se declara en el
      namespace del mod y se propaga por sync.

## Dependencias

**Depende de:** nada. Es aditivo y se puede ejecutar de forma independiente.

**Desbloquea:** la parte de UPONE-1616 que hoy no es ejecutable (el nombre de las vistas de `Activity` y
`Offering` en Curriculum Design). Con este fix, ese renombre pasa a ser **una linea de configuracion en el
mod**, sin mas trabajo de plataforma.

**Beneficia ademas a:** cualquier mod que declare vistas sobre objetos Base que otra app ya declara. Hoy el
caso conocido es Curriculum Design con Engagement; el escenario se repite a medida que mas mods se montan
sobre los mismos objetos Base.

**Coordinar con:** el equipo de Engagement, que es el otro afectado por los objetos compartidos y el testigo
natural de la no regresion.

## Estimacion

**3 SP.** El cambio en si es menor y aditivo: cuatro archivos fuente, ya recorridos de punta a punta por el
spike, sin modelo de datos ni migracion. El peso esta en lo que rodea al cambio: cobertura unitaria de los
dos puntos funcionales, la verificacion en runtime **con dos apps** en el mismo tenant, la definicion del
comportamiento cuando la clave no existe, y la documentacion de una capacidad que otros mods van a consumir.

Baja a **2 SP** si se acepta cerrar sin definir el caso de clave inexistente (dejandolo con el fallback
actual). Sube a **5 SP** si core decide aprovechar para unificar los dos sistemas de etiquetado, que es otra
linea de trabajo (ver Decisiones abiertas en pre-intake).

## Guia de ejecucion: reglas y patrones up1 a considerar

- **[Gate]** Editar las **fuentes** en `suite`, nunca las copias sincronizadas de `object-manager`: se
  regeneran con el sync. _Fuente: `up1/CLAUDE.md` (Critical Rules, Sync Mechanism)._
- **[Advertencia]** La cadena tiene cinco eslabones y dos son faciles de olvidar: el **tipo GraphQL** y la
  **seleccion de campos del cliente**. Sin ellos el dato se descarta en silencio y el sintoma es
  indistinguible de "no funciona". _Fuente: el spike de validacion._
- **[A favor]** La entrada de vista **ya admite forma de objeto** y la normalizacion ya interpreta objeto mas
  layouts: el cambio se apoya en una forma existente en vez de inventar otra. _Fuente:
  `object-manager/objects/up1/suite/up1_suite_app.json`; `suite/logic/app.resolver.js:29-47`._
- **[A favor]** Existe precedente de mapa por pestaña dentro del composable (la allow-list de layouts por
  vista): seguir ese patron en vez de introducir otro. _Fuente:
  `suite/composables/useObjectManager.ts` (construccion de restricciones por vista)._
- **[A favor]** La clave la declara cada mod en su propio namespace, y por eso dos mods no pueden pisarse.
  Es la propiedad que hace correcto el diseno. _Fuente: `suite/scripts/lib/i18n-source-map.mjs`._
- **[Advertencia]** La resolucion de texto cae al nombre tecnico cuando la clave no existe. Cuidar el
  fallback. _Fuente: `suite/composables/useObjectManager.ts:625-633`._
- **[Gate]** Cierre con evidencia runtime en **dos** apps del mismo tenant: el criterio central es la
  ausencia de efecto cruzado, y eso no se prueba mirando una sola app. _Fuente: estandar DoD del equipo._
- **Transversal:** correr sync; no commitear artefactos de sync; en codigo, commits y PR usar solo el id del
  ticket cuando exista. _Fuente: `up1/CLAUDE.md`._

## Casos relacionados

| Caso | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1616 | Curriculum Design, ajustar orden de los menus | **Origen y consumidor**: aqui se destapo el bloqueo, y este ticket desbloquea la parte de su alcance que hoy no es ejecutable | Backlog |
| UPONE-1513 | PLAT-15: homescreen y orden de tabs de mods | Antecedente: construyo el sistema de vistas por app que este caso extiende | Finalizada |
| UPONE-1504 | Etiqueta de negocio del objeto (cascada por idioma) | Sistema de nombres paralelo, tambien por objeto y no por app. No resuelve este caso, y unificarlos es una linea aparte | Finalizada |

## Referencias

- Paquete de evidencia y peticion a core (interno, no pegar en Jira):
  `sp9/PRECONDICION-core-nombre-de-vista-por-app.md`. Contiene la evidencia por capas, el spike ejecutado con
  su resultado en las dos apps, la superficie real corregida, y los pasos para recuperar el spike desde el
  stash.
- Caso de origen: UPONE-1616, y su seccion de precondicion.
- Codigo: `suite/composables/useObjectManager.ts`, `suite/composables/navTabs.ts`,
  `suite/logic/app.resolver.js`, `suite/logic/app.schema.graphql`,
  `object-manager/objects/up1/suite/up1_suite_app.json`, `suite/utils/i18nBridge.ts`,
  `suite/scripts/lib/i18n-source-map.mjs`.
