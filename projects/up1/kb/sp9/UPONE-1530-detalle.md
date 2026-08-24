# UPONE-1530 - Curriculum Mapping | MCP sync

> Tarea · Prioridad Trivial · Epic UPONE-1452 Curriculum Mapping · Asignado: Eduardo Bacon · Story Points en Jira: sin asignar
> Sprint: Migracion uAssessment SP9 (arrastre de SP8) · Entro al sprint como carga condicional
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1530

## Fuente canonica (PO)

El ticket **no tiene descripcion en Jira**: el titulo es el unico enunciado del PO.

> Curriculum Mapping | MCP sync

Sin comentarios ni adjuntos. Lo que define el alcance viene de la planificacion de SP9 (2026-08-14),
donde el dev confirmo que **el dominio de curriculum mapping todavia no esta en el MCP** y el PO lo
dejo en el sprint de forma **condicional**, para evaluar el lunes si hay espacio despues de la carga
grande.

**Nota para postear en Jira:** al estar la descripcion vacia, todo este detalle va en la
**descripcion** del ticket, no como comentario.

## Historia de usuario

Como **usuario que opera up1 conversacionalmente**, quiero poder consultar y gestionar el dominio de
mapeo curricular (esquemas de niveles, escalas de cobertura y matrices de competencia) desde el
asistente, para no tener que entrar a la interfaz para cada consulta, con los mismos permisos que
tengo en la plataforma.

## Objetivo

Que el dominio de curriculum mapping quede expuesto en el servidor MCP con el mismo estandar que ya
tiene curriculum design: operaciones consultables y gobernadas, con los permisos del usuario real como
frontera, cubiertas por pruebas y siguiendo los protocolos del propio MCP.

## Alcance

**Dentro:** habilitar el dominio de curriculum mapping en el servidor MCP, con las operaciones que
correspondan al subconjunto de objetos que se decida cubrir; sus pruebas segun el patron del MCP; el
cumplimiento de los protocolos del MCP; y la actualizacion de su catalogo y documentacion de
operaciones.

**Fuera:** completar el backend de curriculum-mapping (la asociacion a planes y la tributacion son
alcance de sus propios tickets, no de este); el servidor MCP remoto con autenticacion por navegador,
que es una linea de trabajo propia de plataforma anunciada para las semanas siguientes; y la
integracion automatizada extremo a extremo contra una instancia real, que es deuda declarada del
propio MCP.

## Criterios de aceptacion (checkeables)

- [ ] El dominio de curriculum mapping esta habilitado en el servidor MCP: sus objetos figuran entre
      los tipos permitidos.
- [ ] Se puede consultar el subconjunto de objetos acordado desde el asistente, y devuelve datos
      reales del tenant.
- [ ] Toda operacion de escritura que se incorpore respeta la vista previa antes de confirmar.
- [ ] Toda operacion verifica los permisos del usuario real antes de ejecutar, y un usuario sin la
      capability correspondiente no puede ejecutarla.
- [ ] Las referencias y los enums se resuelven por nombre y se le ofrecen al usuario como opciones
      reales, no como identificadores crudos.
- [ ] Las operaciones nuevas estan declaradas en el catalogo y la documentacion de operaciones del MCP.
- [ ] Las pruebas del MCP cubren la logica de las operaciones nuevas y estan verdes.
- [ ] La construccion y la suite completa del MCP quedan verdes.

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp9/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] Probado contra la plataforma real con un usuario autenticado, no solo con dobles: consultar y,
      si aplica, escribir, y verificar el resultado en la interfaz.
- [ ] Verificado con un rol sin permisos: la operacion no se ofrece o es rechazada.
- [ ] Sin regresion en las operaciones de los otros dos dominios ya expuestos.
- [ ] Checklist de la guia de extension del MCP completado (construccion y pruebas verdes, operacion
      declarada en el catalogo y en la documentacion de capacidades).
- [ ] Documentada la frontera de lo que quedo fuera y por que, para que el siguiente sepa donde
      retomar.

## Tests minimos (checkeables; ampliables en ejecucion)

> Conjunto minimo a cubrir. El dev puede y debe sumar mas casos durante la ejecucion si surgen.

- [ ] Consulta de cada objeto habilitado -> devuelve los registros esperados del tenant.
- [ ] Objeto no habilitado -> la operacion generica lo rechaza (la lista de tipos permitidos manda).
- [ ] Escritura sin confirmar -> devuelve vista previa y **no** muta.
- [ ] Escritura confirmada -> muta y el cambio se ve en la plataforma.
- [ ] Usuario sin la capability -> la operacion es rechazada.
- [ ] Resolucion de una referencia por nombre -> devuelve el identificador correcto.
- [ ] Regresion: las operaciones de curriculum design y engagement siguen respondiendo igual.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): aplica. Los permisos del usuario real son la frontera del MCP; cada operacion
      los verifica antes de ejecutar. Ojo con la coordinacion: si los roles curriculares cambian en
      este mismo sprint, lo que el MCP puede hacer cambia con ellos.
- [ ] Historial / auditoria (DataLog): aplica indirectamente. Las escrituras via MCP deben quedar
      auditadas igual que las de la interfaz; verificar que el camino usado no evada el registro.
- [ ] Capa de lenguaje (i18n): N/A en el MCP como tal, pero los nombres que se le presentan al usuario
      deben ser los del dominio, no identificadores internos.
- [ ] Accesibilidad (WCAG): N/A. No hay interfaz visual.
- [ ] Storybook: N/A.
- [ ] Design tokens (`var(--up1-*)`): N/A.
- [ ] Documentacion: aplica. El catalogo de operaciones y las capacidades del MCP son su contrato con
      el usuario.
- [ ] Convenciones de mod: N/A para el mod, aplican en cambio las convenciones del MCP (vista previa
      antes de confirmar, permisos como frontera, resolucion semantica, higiene de salida).

## Dependencias

**Depende de:** el estado del backend de curriculum-mapping. Los esquemas de niveles y de cobertura
estan Finalizados (UPONE-1454, UPONE-1455) y son terreno estable. La matriz (UPONE-1537, Finalizada)
tiene partes diferidas que **UPONE-1633 construye en este mismo sprint**.

**Se relaciona con:** UPONE-1619, que comparte el acuerdo de sincronizacion con el MCP del sprint; si
ese ticket introduce objetos nuevos en curriculum-design, su propia sincronizacion con el MCP corre por
su cuenta.

**Coordinar con UPONE-1615 (hermano SP9).** El MCP usa los **permisos del usuario real** como frontera,
asi que lo que el MCP puede hacer cambia si ese ticket migra los roles curriculares o completa sus
capabilities. Afecta sobre todo a la verificacion: el criterio de "usuario sin la capability es
rechazado" se prueba contra el modelo de roles vigente en ese momento. Acordar el orden de la
verificacion, no del desarrollo.

**Riesgo de secuencia:** si este ticket se ejecuta antes o en paralelo a UPONE-1633, parte del trabajo
se hace contra un modelo que va a cambiar dentro del mismo sprint.

## Estimacion

**3 SP** para el subconjunto estable (los dos esquemas mas la matriz en lectura).

Sube a **5 SP** si se decide cubrir tambien la matriz en escritura, porque exige vista previa,
verificacion de permisos y resolucion semantica sobre un modelo con ciclo de estados. Sube mas, y con
retrabajo probable, si se intenta cubrir las piezas que UPONE-1633 esta construyendo en paralelo.

## Guia de ejecucion: reglas y patrones up1 a considerar

> No dice como implementar; marca reglas y patrones (a favor) y antipatrones (evitar) que aplican a
> este ticket.

- **[Gate]** Habilitar el objeto en la lista de tipos permitidos es condicion previa: sin eso ni las
  operaciones genericas de consulta pueden tocarlo. _Fuente: registro de paquetes del servidor MCP._
- **[A favor]** Empezar por el camino mas barato de la guia de extension: declarar el tipo y su
  contrato cubre la consulta sin escribir codigo de operacion. _Fuente: guia de extension del MCP,
  receta 1._
- **[A favor]** Tomar como molde una operacion existente completa de curriculum design, que ya trae
  autenticacion, verificacion de permisos, esquema de entrada y vista previa antes de confirmar.
  _Fuente: operaciones de perfil de egreso del paquete de curriculum design._
- **[Gate]** Toda escritura devuelve vista previa si no viene confirmada. Es protocolo del MCP, no
  opcional. _Fuente: guia de extension del MCP._
- **[Gate]** Los permisos del usuario real se verifican antes de mutar: el MCP no ejecuta lo que el
  usuario no puede hacer en la plataforma. _Fuente: capa de permisos del servidor MCP._
- **[A favor]** Presentar referencias y enums como opciones reales resueltas por nombre, para que el
  usuario elija con informacion y se envie el identificador correcto. _Fuente: convenciones del MCP._
- **[Advertencia]** Las pruebas del MCP cubren logica pura con dobles: un verde ahi no prueba que la
  operacion funcione contra la plataforma real. Cerrar con verificacion real. _Fuente: hoja de ruta del
  MCP, integracion extremo a extremo declarada como pendiente._
- **[Advertencia]** El backend de este dominio esta en fase de diseno y con piezas diferidas. Confirmar
  contra el codigo que existe la operacion antes de exponerla, no contra la propuesta del dominio.
  _Fuente: documentacion del mod curriculum-mapping._
- **[Evitar]** No exponer un objeto para escritura si su unica via es el camino generico y el dominio
  exige validacion de negocio: eso convierte al MCP en una puerta lateral que evade reglas.

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1452 | Epic Curriculum Mapping | contenedor | Backlog |
| UPONE-1454 | Esquema de niveles | terreno estable a exponer | Finalizada |
| UPONE-1455 | Escalas de cobertura | terreno estable a exponer | Finalizada |
| UPONE-1537 | Matriz de competencia: datos generales | objeto a exponer; tiene partes diferidas que se construyen en este sprint | Finalizada |
| UPONE-1633 | Matriz de competencia: adopcion y competencias | **coordinar**: construye en SP9 las partes diferidas de la matriz; define si conviene esperarlo | Backlog |
| UPONE-1619 | Implementacion de InstructionalComponent | hermano SP9; comparte el acuerdo de sincronizacion con el MCP y compite por la capacidad del sprint | Backlog |
| UPONE-1615 | Implementar logica de Roles internos | hermano SP9; **coordinar la verificacion**: los permisos del usuario real son la frontera del MCP, asi que lo que el MCP puede hacer cambia con ese ticket | Backlog |

## Referencias

- Fuente canonica: UPONE-1530 (titulo; descripcion vacia en Jira).
- Planning SP9: `transcripts/2026-08-14-sprint-planning-sp9-uassessment.md` (el dominio no esta en el
  MCP, el acuerdo de que la sincronizacion es parte de cada historia, y el caracter condicional de este
  ticket).
- Documentacion del servidor MCP: su guia de incorporacion, guia de extension, arquitectura,
  convenciones, catalogo de operaciones y hoja de ruta.
- Codigo del dominio en la plataforma: `mods/curriculum-mapping/objects/`,
  `mods/curriculum-mapping/logic/`, y su documentacion de fases.
