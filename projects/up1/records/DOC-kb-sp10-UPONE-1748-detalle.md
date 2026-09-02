---
id: DOC-kb-sp10-UPONE-1748-detalle
project: up1
type: doc
module: curriculum-design
tags:
  - sp10
  - curriculum-design
  - detalle
  - UPONE-1748
  - carga-datos
  - ibero
  - inventario-brechas
  - tenant-test
---

# UPONE-1748 Detalle (Curriculum Design: carga y configuracion IBERO en tenant TEST)

> **Referencia externa:** UPONE-1748 · **Tipo:** explore (carga de datos + inventario de brechas) · **Prioridad:** Critica · **Epica:** UPONE-1267 (Curriculum Design) · **Asignado:** Gian Adofacci · **Story Points:** ~8
>
> Contrato del ticket (que conseguir). Ticket de otro dev: sin pre-intake (el "como" lo define quien ejecuta).

## Fuente canonica (PO)

Descripcion del PO en Jira (citada en lo esencial):

> Necesitamos saber que tan lejos esta uP1 de sostener el diseno curricular de un cliente real. Universidad Iberoamericana es un buen primer caso: cliente productivo con modelo de competencias, con 119 carreras, 87 planes de estudio y mas de 3.000 asignaturas.
>
> Objetivo: cargar en el tenant TEST de uP1 el caso completo de **una carrera** de Ibero, replicando la configuracion legacy del programa de asignatura del cliente, y producir el inventario de lo que **hoy no se puede replicar ni mapear**. Dos resultados, ambos obligatorios: (1) el caso de la carrera cargado y operable en TEST; (2) dos inventarios de brechas (capacidades de configuracion no replicables, y estructuras de datos no mapeables). Si el trabajo termina con los datos cargados y sin inventario, el ticket no esta cerrado.

## Historia de usuario

Como responsable de producto/plataforma, quiero cargar en el tenant TEST el caso completo de una carrera real de Ibero y registrar todo lo que uP1 hoy no puede replicar ni mapear, para medir la distancia entre uP1 y la operacion real de un cliente y para alimentar el roadmap con brechas concretas.

## Objetivo

- Cargar en el tenant TEST una carrera completa de Ibero (la carrera, todos sus planes, sus mallas, todas sus asignaturas con datos generales, y el contenido detallado del programa de asignatura en una o dos de las mas completas), replicando la configuracion legacy del programa de asignatura.
- Producir dos inventarios de brechas con evidencia: (a) capacidades de configuracion del legacy que uP1 aun no ofrece; (b) estructuras de datos del legacy que aun no se pueden mapear correctamente, distinguiendo lo que no entra de lo que entra perdiendo significado.

## Contexto (para dimensionar)

- El tenant TEST se ha poblado hasta ahora con datos fabricados, que se acomodan al modelo por construccion y no revelan las estructuras raras, los campos propios ni las configuraciones que una institucion acumulo en el legacy. Ibero es el primer caso real con variedad.
- **Carrera candidata (del comentario de Esteban Cortes, sobre datos del ambiente Ibero Prod al 2026-08-31):** Fisioterapia (PFT). La respaldan los conteos: 2 planes activos (P4PFT con 54 cursos, P5PFT con 55), niveles 0 a 9, 106 asignaturas distintas en malla; flujo recorrido (52 programas publicados, 30 en edicion, 24 abiertos); y 13 de los 20 programas de asignatura mas completos de todo Ibero son de esta carrera. Las dos asignaturas para la carga en profundidad: FT21016 Morfofisiologia Integral y FT22152 Taller de Evaluacion. Ver Decisiones abiertas.
- **Regla de trabajo:** no forzar el dato. Cuando algo del legacy no tenga equivalente en uP1, se registra como brecha con evidencia, no se improvisa un acomodo. Si un acomodo es necesario para avanzar, se aplica, se deja anotado como provisorio y se registra igual la brecha.

## Alcance

**Dentro:**

1. Habilitacion de acceso: cuentas de servicio con permiso de carga sobre el tenant TEST del ambiente de desarrollo, registradas en el ticket.
2. Carga estructural: la carrera, sus planes, sus mallas y los datos generales de todas sus asignaturas.
3. Configuracion de las vistas del programa de asignatura de Ibero, evaluando las cuatro capas del legacy (estructura de componentes, tipo de cada componente, flujo de trabajo, grilla de permisos por rol).
4. Carga detallada del programa de asignatura en una o dos asignaturas hasta el fondo.
5. Los dos inventarios de brechas, con el formato acordado.

**Fuera:**

- Cargar el cliente entero (solo una carrera).
- Resolver las brechas: quedan registradas y se evaluan despues como candidatas a requerimiento de producto.

## Criterios de aceptacion (checkeables)

- [ ] Existen cuentas de servicio operativas con permiso de carga sobre el tenant TEST, y quedo registrado que se creo y con que alcance.
- [ ] La carrera seleccionada esta registrada con su codigo y con los conteos que justifican por que cumple el criterio de seleccion.
- [ ] El tenant TEST tiene cargada la carrera, todos sus planes, sus mallas y todas sus asignaturas con datos generales.
- [ ] Los totales cargados se contrastan contra los del legacy para esa carrera y las diferencias estan explicadas, no solo reportadas.
- [ ] La configuracion del programa de asignatura de Ibero esta replicada en todo lo que uP1 permite hoy, evaluando las cuatro capas.
- [ ] Existe el inventario de capacidades de configuracion no replicables, con el formato acordado.
- [ ] Al menos una o dos asignaturas tienen su programa de asignatura cargado en su maxima extension y recorrible en la interfaz.
- [ ] Existe el inventario de estructuras de datos no mapeables, distinguiendo lo que no entra de lo que entra perdiendo significado.
- [ ] Todo acomodo provisorio aplicado durante la carga esta anotado y su brecha registrada.
- [ ] El proceso de carga quedo documentado a nivel suficiente para repetirlo con otra carrera u otro cliente.

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo (para trabajo de tipo explore/carga). Ademas:

- [ ] Los dos inventarios son el entregable principal, no un subproducto: sin ellos el ticket no cierra.
- [ ] Cada brecha documenta: que necesita el cliente (en su operacion, no en tablas), como lo resuelve el legacy hoy, que paso al intentarlo en uP1 (no existe / parcial / cambia el significado), volumen afectado, y provisorio aplicado si hubo.
- [ ] Los conteos de asignaturas excluyen los servicios y los de seccion/silabo excluyen las ofertas de servicio (no inflar los numeros).
- [ ] Datos sensibles del cliente tratados segun politica (ambiente de desarrollo/TEST).

## Tests minimos / verificacion (checkeables)

- [ ] Los totales por nivel (carrera/plan/asignatura/seccion) en TEST coinciden con el legacy para esa carrera, o la diferencia esta explicada.
- [ ] Las dos asignaturas de carga profunda se recorren completas en la interfaz.
- [ ] Cada acomodo provisorio tiene su brecha registrada.
- [ ] El proceso quedo reproducible (otra carrera u otro cliente).

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): aplica a las cuentas de servicio de carga (alcance acotado a TEST).
- [ ] Documentacion: **aplica** (los inventarios y el proceso son el entregable).
- [ ] Capa de lenguaje / accesibilidad / Storybook / tokens: N/A.
- [ ] Convenciones de mod: N/A (no se modifica codigo del mod; es carga de datos y configuracion de tenant).
- [ ] Tenant isolation: aplica (la carga es sobre el tenant TEST; no contaminar otros).
- [ ] **Logica server-side / MCP-ready (regla del proyecto, get_rules):** N-A. Es carga de datos y configuracion de tenant, sin logica de negocio nueva; la validacion de las cargas la aplica el servicio (escrituras gobernadas), no el cliente.

## Frontera core/mod (Aduana)

**N/A + motivo:** este ticket **no crea ni modifica codigo de un mod**. Es carga de datos y configuracion de tenant (mas la produccion de dos inventarios de brechas). La pasada de Aduana no aplica. Si al intentar replicar una capacidad del legacy se detecta que uP1 la necesita en el producto, eso se registra como **brecha** (candidata a requerimiento), no como cambio de codigo de este ticket.

## Dependencias

- **Depende de:** la habilitacion de cuentas de servicio con permiso de carga sobre el tenant TEST (Frente 1, prerrequisito de todo lo demas), y del acceso a la configuracion legacy de Ibero.
- **Alimenta:** el roadmap de uP1 (las brechas se evaluan despues como candidatas a requerimiento de producto).

## Estimacion

**~8 SP.** Una carrera, pero con carga estructural completa (planes, mallas, todas las asignaturas), evaluacion de las cuatro capas de configuracion del programa de asignatura, carga profunda de una o dos asignaturas, y los dos inventarios con evidencia. **Palanca:** sube si la variedad del legacy de Ibero destapa muchas brechas de mapeo (que es justamente lo que el ticket busca), o si la habilitacion de cuentas se demora.

## Decisiones abiertas

- [ ] **Confirmar la carrera:** Fisioterapia (PFT) es la candidata respaldada por conteos (2 planes, 106 asignaturas, 13 de los 20 programas mas completos de Ibero). Confirmar la seleccion y las dos asignaturas de carga profunda (FT21016, FT22152).
- [ ] **Cuentas de servicio:** que cuentas se crean y con que alcance sobre el tenant TEST; quien las provee.
- [ ] **Politica de acomodos provisorios:** criterio para cuando un acomodo es aceptable para seguir vs cuando se detiene y se registra solo la brecha.
- [ ] **Formato acordado de los inventarios:** confirmar la plantilla de brecha (los campos ya definidos por el PO) y donde viven (en el ticket / en un doc del KB).

## Guia de ejecucion: reglas y patrones a considerar

- **[Gate]** No forzar el dato: un dato metido a la fuerza en el campo mas parecido esconde exactamente la brecha que el ticket busca. Registrar la brecha con evidencia.
- **[A favor]** Orden por frentes (cada uno depende del anterior): 1 habilitacion de acceso, 2 carga estructural, 3 configuracion de vistas del programa de asignatura (cuatro capas), 4 carga detallada en profundidad.
- **[Advertencia]** Excluir servicios (asignaturas) y ofertas de servicio (seccion/silabo) de los conteos: comparten espacio con la oferta de engagement e inflan los numeros.
- **[Advertencia]** La brecha mas peligrosa es la que entra perdiendo significado (un dato en el campo equivocado), no la que no entra: distinguirlas en el inventario.

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1747 | Home dashboard de metricas | hermano sp10; lee las mismas poblaciones (carrera/plan/asignatura/seccion) que esta carga puebla | Backlog |

## Referencias

- Fuente canonica: UPONE-1748 (Jira) y el comentario de Esteban Cortes (carrera Fisioterapia PFT, datos Ibero Prod 2026-08-31).
