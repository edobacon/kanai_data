---
id: DOC-kb-sp8-PROPUESTA-jira-hard-delete-core-robustez-detalle
project: up1
type: doc
---

# PROPUESTA Jira - Robustez del hard-delete en core (backend + frontend)

> Bug · Prioridad Media · Epic: por confirmar (defecto de core, no de un mod) · Asignado: por confirmar
> Enlace: (ticket aun no creado; esta es la propuesta para levantarlo)
>
> **Regla de redaccion**: todo lo que esta ARRIBA del separador "Mapeo DKC (interno, no pegar en Jira)" es el cuerpo pegable en Jira. Ese cuerpo NO cita recursos inaccesibles para el lector del ticket: ni elementos DKC (`RULE-*`, `TICKET-*`, docs de deckard), ni archivos locales de la maquina. Las rutas del **repo** (`object-manager/...`, `layout/...`, `path:linea`) SI van: todo dev tiene el checkout. Los docs de analisis internos (deckard) viven en la seccion interna del final. El esfuerzo se mide en Story Points, nunca en tiempo.

## Fuente canonica (PO)

El ticket todavia no existe en Jira, asi que no hay descripcion literal del PO. Descripcion **propuesta** para levantarlo (redactar el PO en estos terminos):

> Al borrar registros en la plataforma hay dos problemas de robustez del hard-delete:
> 1. Un borrado masivo de ciertos registros se bloquea aunque no exista ninguna referencia externa real que lo impida.
> 2. Cuando un borrado se rechaza por una razon de negocio legitima, la aplicacion muestra una pantalla de error generica ("Ocurrio un error inesperado" / "Error al cargar") y se pierde la vista de la lista, en vez de un aviso claro y accionable.
> Objetivo: que se bloquee solo lo que corresponde, y que cualquier bloqueo legitimo se comunique de forma clara sin romper la vista.

## Historia de usuario

Como **usuario de la plataforma que administra catalogos** (por ejemplo esquemas de niveles, escalas de cobertura, o limpiezas de datos en bloque), quiero que un borrado se bloquee solo cuando realmente corresponde y que, si se bloquea, se me explique por que y como seguir, para no quedar frente a un error generico que rompe la pantalla ni frente a un bloqueo que no tiene causa real.

## Objetivo

1. **Backend**: el borrado en bloque de un registro que tiene capas internas de proyeccion deja de contar esas capas propias como referencia externa; solo bloquea cuando existe una referencia externa real (otro registro que lo apunta, o un campo personalizado de tipo referencia). Queda a paridad con el borrado individual, que ya lo resuelve bien.
2. **Frontend**: cuando un borrado gobernado es rechazado por el servidor, el mensaje del servidor se muestra como aviso (notificacion) y la lista permanece visible; deja de reemplazarse por la pantalla de error de carga con texto generico.

## Contexto (para dimensionar)

Son **dos defectos de plataforma independientes** que comparten el tema "robustez del hard-delete de cara al usuario", verificados contra el codigo. Se proponen como un solo ticket por afinidad de tema y para dar al PO una sola vista; la ejecucion se parte en dos por vivir en componentes distintos (ver mapeo interno al final).

**Defecto backend (se bloquea lo que no debe).** El borrado en bloque corre una validacion de referencias (`validateBulkDelete` en `object-manager/src/services/referenceValidationService.js`) que, al buscar quien apunta al registro por la convencion de nombre de la clave foranea (`<base>Id`), encuentra las tablas de proyeccion RecordType (`rt__<Rt>__<base>`) del propio registro y las trata como referencias externas. El id nunca llega al paso que ya sabe limpiar esas capas (`resolveRtProjectionFks` en `object-manager/src/graphql/resolvers/instance.resolver.js`), asi que el borrado se bloquea con `CONSTRAINT_VIOLATION`. El preview (`deleteImpactPreview`) dice "se puede borrar" porque usa otro mecanismo que si las excluye: hay divergencia entre lo que anticipa el preview y lo que hace la ejecucion. El borrado **individual** (`deleteInstance`) ya elimina estos registros sin bloquearse: existe un camino correcto ya en produccion al que llevar el borrado masivo a paridad. Disparador real: una limpieza de ~31k filas duplicadas de `InstructorAvailability` que quedo bloqueada.

**Defecto frontend (un bloqueo legitimo se ve mal).** Cuando el servidor rechaza un borrado por una regla de negocio (por ejemplo un esquema de niveles que esta en uso por una matriz), el mensaje llega como texto plano y el manejador de errores (`layout/src/composables/useFriendlyErrors.ts`) no lo reconoce, cayendo al mensaje generico. Ademas, `handleCriticalDeleteConfirm` (`layout/src/layouts/RecordList/RecordList.vue:6416`) escribe el error en el mismo estado que gobierna la pantalla de error de **carga** del listado (`RecordList.vue:60`), asi que reemplaza la vista entera en lugar de mostrar un aviso. El aviso de las acciones de fila (`layout/src/composables/useRowMutation.ts:151`) ya se muestra como notificacion sin romper la vista: ese es el comportamiento de referencia. Surgio al probar el borrado de esquemas de niveles (relacionado con UPONE-1573).

## Alcance

**Dentro:**
- Backend: excluir de la validacion de referencias del borrado en bloque las capas de proyeccion propias del registro que se borra, sin dejar de bloquear las referencias externas reales. Aplica a cualquier registro con capas de proyeccion, sin importar como este escrito el nombre de su clave foranea.
- Frontend: en el borrado gobernado del listado, mostrar el mensaje del servidor como aviso y conservar la vista de la lista. Aplica a todos los listados que usan borrado gobernado (no a un objeto en particular).

**Fuera:**
- Unificar en un solo mecanismo la deteccion de referencias del preview y la de la ejecucion: deuda tecnica mayor, follow-up aparte.
- Implementar la convencion de errores estructurados de dominio de punta a punta (que el servidor emita un codigo de error y el front lo consuma): follow-up aparte; excede este ticket.
- El guard de dominio en si (que un esquema en uso no se borre) es comportamiento correcto y no se toca.
- La limpieza puntual de las filas duplicadas de disponibilidad (se resuelve con un script one-off; no depende de este ticket).

## Criterios de aceptacion (checkeables)

Backend:
- [ ] Borrar en bloque un registro con capas de proyeccion y **sin** referencia externa real elimina el registro y todas sus capas, sin bloqueo y sin dejar huerfanos.
- [ ] Borrar en bloque un registro que **si** es apuntado por otro registro externo sigue bloqueando con el mensaje de referencia.
- [ ] Borrar en bloque un registro apuntado por un campo personalizado de tipo referencia sigue bloqueando.
- [ ] El comportamiento es identico sin importar como este escrito el nombre de la clave foranea de la proyeccion (mayusculas o minusculas).
- [ ] El borrado individual del mismo registro sigue funcionando igual (paridad).

Frontend:
- [ ] Un borrado gobernado rechazado por el servidor muestra el mensaje del servidor como aviso (notificacion) y la lista permanece visible.
- [ ] Un error de **carga** de la lista sigue mostrando la pantalla de error a pantalla completa (no se degrada ese caso).
- [ ] Un borrado gobernado exitoso sigue mostrando confirmacion y refresca la lista.
- [ ] El caso reproduce: borrar un esquema de niveles en uso muestra el aviso "esta en uso, inactivalo en su lugar" con la lista intacta.

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo. Ademas, especifico de este ticket:

- [ ] Todos los criterios de aceptacion verificados con evidencia runtime real (backend: prueba contra base de datos real; frontend: captura del aviso + lista intacta).
- [ ] Sin regresion en: borrado individual, borrado en bloque con bloqueo legitimo, error de carga de lista, borrado exitoso.
- [ ] Backend verificado contra base de datos real (no solo pruebas unitarias con la capa de datos simulada, que pueden ocultar el bug).
- [ ] Artefactos de sync/seed no commiteados.
- [ ] En codigo, commits y PRs se usa solo el id de Jira.

## Tests minimos (checkeables; ampliables en ejecucion)

> Orden: primero la red de seguridad en verde sobre el codigo actual, luego el test que reproduce el bug (rojo), luego el fix.

Backend:
- [ ] (red de seguridad) Borrado en bloque de un registro sin capas hijas, apuntado por un registro externo real -> sigue bloqueando. Hoy sin cobertura.
- [ ] (red de seguridad) Precision: un registro con proyeccion propia + un tercer registro que ademas lo apunta legitimamente -> excluir la propia, seguir bloqueando por la ajena.
- [ ] (red de seguridad) El borrado individual equivalente sigue eliminando.
- [ ] (reproduce el bug) Borrado en bloque de un registro con proyeccion propia y sin referencia externa -> elimina registro + proyeccion, sin errores. Falla hoy.
- [ ] (matriz de escritura de la clave) Cubrir el nombre de la clave foranea en minusculas y en mayusculas.

Frontend:
- [ ] (red de seguridad) Error de carga (fetch/filtro) sigue mostrando la pantalla a pantalla completa.
- [ ] (red de seguridad) Borrado gobernado exitoso -> aviso de exito + refresco.
- [ ] (reproduce el bug) Borrado gobernado que rechaza -> se muestra el aviso con el mensaje del servidor y la lista NO se reemplaza. Falla hoy.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): N/A - no crea ni cambia capabilities; el borrado ya esta gateado.
- [ ] Historial / auditoria (DataLog): N/A - no cambia el modelo ni el registro de cambios.
- [ ] Capa de lenguaje (i18n es/en/pt): aplica (frontend) - el aviso del borrado debe salir traducido o via passthrough del texto del servidor; revisar que no quede un literal.
- [ ] Accesibilidad (WCAG): aplica (frontend, minimo) - el aviso debe ser accesible; sin cambio estructural de la lista.
- [ ] Storybook: N/A - no hay componente nuevo.
- [ ] Design tokens (`var(--up1-*)`, sin hardcode): aplica (frontend, minimo) - reusar el sistema de notificaciones existente, sin estilos hardcodeados.
- [ ] Convenciones de mod: N/A - el fix es de plataforma (backend y libreria de UI), no de un mod.
- [ ] Documentacion: aplica (minimo) - si cambia el comportamiento observable del borrado, anotarlo en la documentacion de borrado en cascada.

## Dependencias

- Depende de: nada bloqueante. Los dos defectos son independientes entre si (se pueden mergear en cualquier orden).
- Habilita: la limpieza estandar por la aplicacion de datos duplicados en bloque (hoy requiere script one-off); una experiencia de borrado clara en todos los catalogos gobernados (esquemas de niveles, escalas de cobertura).
- Relacion tematica con el borrado por alias de tipo de registro y con el motor de cascada, ambos tocados en sprints previos (ver Tickets relacionados).

## Estimacion

**3 a 5 SP** en total:
- Backend (exclusion de la proyeccion propia en la validacion + pruebas de integracion): ~1 a 2 SP.
- Frontend (aviso en lugar de pantalla de error + pruebas de componente + verificacion viva): ~2 SP.

Sube hacia 5 SP si armar la red de seguridad de pruebas de la validacion de referencias (hoy inexistente para registros sin capas hijas) resulta costosa. Baja hacia 3 SP si esa red se reusa de fixtures ya existentes.

## Decisiones abiertas

- [ ] Estructura en Jira: un solo ticket (esta propuesta) vs un parent + 2 sub-tasks (una por componente). Recomendacion: un solo ticket si el PO quiere una vista unica; parent + sub-tasks si necesita ver el avance por componente dentro de Jira.
- [ ] Epic contenedor: definir. Es un bug de plataforma, no encaja bajo un epic de un mod.
- [ ] Prioridad: propuesta Media (ninguno corrompe datos; ambos degradan un flujo legitimo). Confirmar con el PO.
- [ ] Follow-ups de deuda a registrar aparte: (a) unificar preview y ejecucion en un solo mecanismo de deteccion; (b) convencion de errores estructurados de dominio de punta a punta. No entran en este ticket.

## Guia de ejecucion: reglas y patrones up1 a considerar

- **[A favor]** Llevar el camino roto a paridad con el que ya funciona: en backend, el borrado individual (ya correcto) es el modelo del borrado masivo; en frontend, el aviso de las acciones de fila (ya correcto) es el modelo del borrado gobernado. No inventar comportamiento nuevo. _Fuente: `object-manager/src/graphql/resolvers/instance.resolver.js` (deleteInstance vs deleteBulkInstances); `layout/src/composables/useRowMutation.ts:151`._
- **[Gate]** Backend: verificar contra base de datos real. Una prueba unitaria con la capa de datos simulada no reproduce el casing de columnas ni el fallo silencioso del scan, y puede dar un falso verde. _Fuente: `object-manager/tests/integration/hard-delete-cascade.integration.test.js`._
- **[Advertencia]** La exclusion del backend debe apoyarse en la introspeccion real de la clave foranea de la proyeccion, no en un patron de texto tipo "cualquier tabla `rt__`": no excluir de mas una proyeccion de otro registro que legitimamente apunta a este. _Fuente: `object-manager/src/graphql/resolvers/instance.resolver.js` (resolveRtProjectionFks)._
- **[Advertencia]** Frontend: cambiar solo la rama de custom delete del manejo de error; no tocar el estado que muestra el error de carga del listado. _Fuente: `layout/src/layouts/RecordList/RecordList.vue:60,6416`._
- **[Evitar]** Reemplazar la validacion del borrado masivo por el mecanismo del preview (cambio literal): degrada performance en el caso masivo y cambia la semantica de bloqueo de muchos registros a la vez. _Fuente: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` (nota de diseño de la divergencia)._
- **Transversal**: mantener aislamiento por tenant en toda consulta; correr sync y no editar ni commitear archivos sincronizados; en codigo, commits y PRs usar solo el id de Jira. _Fuente: `up1/CLAUDE.md`._

## Tickets relacionados

> Ids no verificados en Jira en esta pasada (summary/status reales por confirmar antes de pegar en Jira).

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1479 | Borrado por alias de tipo de registro reruteado al objeto base | Antecedente: por el que ambos entrypoints caen en el mismo camino de borrado | Por verificar |
| UPONE-1382 | Motor de cascada del borrado (impacto/restriccion) | Contexto: el camino de cascada que el borrado masivo saltea para registros sin hijos | Por verificar |
| UPONE-1573 | Esquemas y escalas de curriculum-mapping (validacion de uso) | Donde afloro el defecto frontend al probar el borrado | Por verificar |

## Referencias

- Fuente canonica: descripcion del PO (a redactar al crear el ticket en Jira).
- Planning / Confluence: (enlazar si aplica).
- Codigo backend: `object-manager/src/services/referenceValidationService.js`, `object-manager/src/graphql/resolvers/instance.resolver.js`, `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js`.
- Codigo frontend: `layout/src/layouts/RecordList/RecordList.vue`, `layout/src/composables/useFriendlyErrors.ts`, `layout/src/composables/useRowMutation.ts`.
- Doc de plataforma: `object-manager/docs/features/delete-cascade.md`.

---

## Mapeo DKC (interno, no pegar en Jira)

Este ticket Jira se ejecuta como **dos tickets DKC hermanos**, ambos con `external: <UPONE del ticket una vez creado>`:

| Ticket DKC | module | work_type | Alcance | Repo / execute_scope | Rama sugerida |
|---|---|---|---|---|---|
| TICKET-A | object-manager | fix | Exclusion de la proyeccion RT propia en el gate de referencias del bulk | object-manager | `UPONE-XXXX-om-false-restrict` |
| TICKET-B | layout | fix | Render por notificacion del error de custom delete, sin romper la vista | layout | `UPONE-XXXX-layout-delete-render` |

Reglas del split (soportadas por el patron 1 Jira -> N DKC ya usado en el proyecto, ej. UPONE-1038 -> 11 tickets):
- Ambos tickets DKC comparten el mismo `external`; se desambiguan por `module`/`work_type`.
- SP: el `published` es unico (el de Jira); cada DKC estima su parte; la suma de `executed` se concilia contra el `published`.
- Cada DKC cierra independiente contra su propio acceptance; el ticket Jira cierra cuando los dos DKC estan cerrados.
- Relacionar los dos DKC entre si y cada uno con su md de analisis.
- Cada DKC ejecuta en su repo (respeta la guarda de rama por repo destino).

### Referencias DKC (no pegar en Jira)

Estos recursos SI quedan fuera del cuerpo Jira por vivir en deckard/DKC (inaccesibles para el lector del ticket). Los locators del repo (`object-manager/...`, `layout/...`) ya van en el cuerpo (seccion Referencias y Guia de ejecucion), porque el repo es accesible a todo dev.

- Analisis backend: `deckard/projects/up1/kb/sp8/BUG-core-bulkdelete-rt-projection-false-restrict.md`.
- Analisis frontend: `deckard/projects/up1/kb/sp8/BUG-core-recordlist-harddelete-block-renders-as-load-error.md`.
- Estandar del equipo: `deckard/projects/up1/kb/sp8/estandar-DoR-DoD.md`.
