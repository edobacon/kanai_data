---
id: DOC-kb-sp10-UPONE-1615-detalle
project: up1
type: doc
module: curriculum-design
tags:
  - sp10
  - curriculum-design
  - curriculum-mapping
  - detalle
  - UPONE-1615
  - rbac
  - roles-perfiles
  - aduana-mal-encuadrado
---

# UPONE-1615 Detalle (Curriculum Design y Mapping: roles a perfiles de aplicacion)

> **Referencia externa:** UPONE-1615 · **Tipo:** refactor · **Prioridad:** Critica · **Epica:** UPONE-1267 (Curriculum Design) · **Asignado:** Eduardo Bacon · **Story Points:** 8
>
> Contrato del ticket (que conseguir). Viene de sp9 y pasa a sp10 en **modo reconciliacion**: el delta contra el analisis original esta en `UPONE-1615-reconciliacion`; la evidencia extendida, el registro de decisiones y el pre-intake siguen en sp9 (`sp9/UPONE-1615-*`). Este detalle ya incorpora las correcciones de la reconciliacion.

## Fuente canonica (PO)

Criterios de aceptacion del PO (Jira), citados:

> - Para la lista de roles estandar ya definidos en Curriculum Design y Curriculum Mapping se debe migrar la logica actual a la nueva logica de "Roles internos" (definir en tiempo de sprint o refinamiento el mapeo entre los internos y los generales).
> - Validar (y completar en los casos necesarios) que los roles permiten hacer las acciones declaradas. Por ejemplo, la creacion del plan de estudio requiere permisos sobre instituciones por lo que el rol debe incluir dichas capabilities.

## Historia de usuario

Como administrador de la plataforma, quiero que los permisos curriculares se declaren como perfiles por modulo y que los roles curriculares apunten al perfil del modulo correspondiente, para que Curriculum Design y Curriculum Mapping concedan alcances distintos al mismo rol sin pisarse, para que los nombres no se confundan con los del core, y para que un Disenador Curricular pueda completar de punta a punta las acciones que su rol declara.

## Objetivo

Que los permisos curriculares dejen de colgar directo del rol y pasen a declararse como **perfiles de aplicacion por modulo** (el mecanismo que el core llamaba "rol interno / set", renombrado a "application profile" en UPONE-1699/1700); que los cuatro roles queden renombrados con su prefijo de familia y vinculados al perfil de cada modulo donde operan; que lo en desuso se retire; y que las capabilities de cada rol alcancen para las acciones que promete, empezando por el caso del PO (crear un plan de estudio requiere leer su institucion).

## Contexto (para dimensionar)

- **Re-scope confirmado (Aduana `mal-encuadrado`):** el titulo dice "Implementar logica de Roles internos" pero el mecanismo **ya existe integro en el core** (entro con UPONE-1353/1354, ambas Finalizadas). Es una **migracion mod-only**; lo unico que iba hacia core (un aviso por el punto ciego de nombres) ya no aplica.
- **El mecanismo cambio de nombre y de forma de uso desde sp9 (UPONE-1699/1700):** "rol interno / set" ahora es **"perfil de aplicacion"**; la carpeta del mod es `profiles/` (no `roles/`); y el vinculo rol-perfil ya NO se arma por consola admin, sino **declarativamente** en `config/app.json` (`profileRoleMapping`, con `syncAppProfileMapping`), con gate de exclusividad roles-XOR-profiles. Referente real: `mods/hello-world-mod/config/app.json`.
- **La superficie crecio:** UPONE-1619 (cd) y UPONE-1633 (cm), ya cerrados, agregaron capabilities de sus objetos nuevos (`instructionalcomponenttype:*`, `competencynode:adopt/exempt`) directo al rol en el mismo `_data-rbac.js` que este ticket reestructura. La migracion tiene que absorberlas.
- **El gap del PO sigue vigente:** los cuatro roles no tienen ninguna capability de institucion; crear un plan de estudio la requiere (el select de institucion lista instancias, gateado por `:view`).
- **El camino de perfiles no esta ejercitado por ningun mod curricular** (0 vinculos con perfil): seriamos los primeros. `modRoleCapabilities.js` (herencia, dedupe, precedencia rol-gana) esta intacto desde julio.
- Verificado contra `curriculum-design@8a151e7`, `curriculum-mapping@584499e`, `object-manager@7662190`.

## Alcance

**Dentro (mod-only):**

1. Declarar los perfiles por modulo (bases mas extensiones, composicion por modulo, herencia por `extendsId`), absorbiendo las capabilities que 1619/1633 dejaron colgadas del rol.
2. Declarar la capability de institucion en la base de Curriculum Design (criterio 2 del PO) y los transversales en las dos bases.
3. Renombrar los cuatro roles al formato `Learning Assurance - <Rol>`, reutilizando las entidades existentes (conservando las asignaciones de personas), con un paso de renombre idempotente en el seed.
4. Crear los vinculos rol-perfil **declarativamente** en `config/app.json` (`profileRoleMapping`), lo que ademas privatiza la visibilidad de las apps.
5. Retirar lo en desuso: el rol huerfano `GestorCurricular` y los 2 fixtures (hoy en `profiles/`).
6. Cobertura que ejercite el camino real (vinculo declarativo, herencia, deduplicacion, renombre sin forkear).

**Fuera:**

- Construir el mecanismo de perfiles: ya existe en el core.
- El mapeo de los roles del core (`Admin`, `Consultor`, `Coordinador`, etc.) hacia los perfiles curriculares: es la decision abierta (resuelta parcial en sp9, ver Decisiones abiertas).
- El tercer hermano de la familia: entra despues sin decisiones nuevas de rol.
- La correccion del alcance de caps de `Consultor`: la produce un mecanismo de core (`DEFAULT_ROLES`), tocarla seria tocar core.

## Criterios de aceptacion (checkeables)

- [ ] Los cuatro roles se llaman `Learning Assurance - <Rol>` (nombre del rol en espanol), reutilizando los existentes: siguen siendo 4 roles, con sus asignaciones intactas, y ninguno con el nombre anterior.
- [ ] Curriculum Design declara su base (`Curriculum Design - Consultor Curricular`) y tres perfiles que heredan de ella, con la composicion por modulo; Curriculum Mapping los suyos, sin depender del orden de corrida de los seeds.
- [ ] Ningun nombre de perfil coincide con un nombre de rol.
- [ ] Los vinculos rol-perfil quedan declarados en `config/app.json` (`profileRoleMapping`) y visibles en la administracion.
- [ ] Un usuario con uno de esos roles obtiene en runtime las capabilities del perfil, incluidas las heredadas de la base.
- [ ] Un usuario con el perfil de Curriculum Design y sin el de Mapping conserva sus permisos de Design y no obtiene los de Mapping.
- [ ] Los transversales (historial, nombre de usuario) llegan por cualquiera de los dos modulos por separado.
- [ ] Un Disenador Curricular completa la creacion de un plan de estudio de punta a punta, incluida la seleccion de su institucion duena.
- [ ] Cada rol fue auditado contra las acciones que declara; las capabilities faltantes quedaron agregadas o justificadas como intencionalmente ausentes.
- [ ] Las capabilities que 1619/1633 agregaron directo al rol quedaron resueltas (dentro del perfil o justificadas fuera).
- [ ] El rol huerfano `GestorCurricular` y los 2 fixtures ya no existen, y una segunda corrida del sync no los regenera.

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo. Ademas, especifico:

- [ ] Permisos efectivos verificados en el tenant UPU con evidencia runtime, entrando con cada rol y ejecutando sus acciones (no basta con que la capability este en la base ni con que pase el unit test).
- [ ] Caso del PO verificado end to end: crear un plan como Disenador Curricular con el select de institucion poblado.
- [ ] Sin regresion: ningun rol pierde capabilities respecto del estado previo (comparado antes y despues con el mismo criterio).
- [ ] Renombre verificado sobre una base que ya tenia los nombres viejos: 4 roles, no 8, asignaciones conservadas.
- [ ] Sync corrido; perfiles materializados sin colisiones; vinculos declarativos aplicados.
- [ ] Limpieza verificada: rol huerfano y fixtures retirados, y una segunda corrida del sync no los recrea.
- [ ] Doc actualizada: el cambio cruza los dos mods y cambia nombres de rol que varios documentos citan.
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

- [ ] Cada perfil declarado se materializa por sync con sus capabilities; una base no queda duplicada al heredarse.
- [ ] Un permiso declarado en las dos bases se inyecta una sola vez.
- [ ] Un rol con vinculo declarativo obtiene las capabilities del perfil en runtime; uno sin vinculo conserva exactamente lo que tenia.
- [ ] Con el perfil de Design y sin el de Mapping, tiene los de Design y no los de Mapping.
- [ ] Renombre sobre base con nombres viejos: 4 roles, asignaciones conservadas, ninguno con el nombre anterior.
- [ ] Disenador Curricular puede listar instituciones y crear un plan; Consultor Curricular no puede crear ni modificar.
- [ ] Los seeds de los dos mods corridos en cualquier orden dan el mismo resultado de roles/perfiles/capabilities.
- [ ] Auditoria por rol: cada accion declarada tiene su capability.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): **es el nucleo del ticket.** Perfiles declarados, roles renombrados y vinculados declarativamente, capabilities completas y verificadas como permisos efectivos por rol activo.
- [ ] Historial / auditoria (DataLog): el permiso de ver historial entra como transversal en las dos bases.
- [ ] Capa de lenguaje (i18n): aplica a nombres y descripciones de roles/perfiles si se muestran, es/en/pt con paridad. El nombre del rol va en espanol; el del modulo en el perfil, en ingles, a proposito.
- [ ] Accesibilidad (WCAG): N/A (no se construye UI; la administracion existe).
- [ ] Storybook / Design tokens: N/A.
- [ ] Documentacion: aplica (cambio observable de RBAC que cruza dos mods y cambia nombres de rol).
- [ ] Convenciones de mod: aplica. Naming de capabilities, declaraciones en el mod (`profiles/`), seed idempotente, sync sin editar archivos sincronizados, tenant isolation.
- [ ] **Logica server-side / MCP-ready (regla del proyecto, get_rules):** aplica. El cableado de permisos/perfiles se resuelve en el backend (seed/sync y resolvers de auth), no en el cliente; ninguna via (UI, API, MCP) obtiene permisos por fuera del servicio.

## Frontera core/mod (Aduana)

Veredicto global (de la pasada de sp9, reconfirmado): **`mal-encuadrado`**. El mecanismo ya esta construido integro en el core; el ticket es una **migracion mod-only**. Toda la evidencia por artefacto esta en `sp9/UPONE-1615-aduana.md`. Correccion de sp10: el unico artefacto que sp9 marcaba `hay-core-worthy` como aviso (el punto ciego de `validateModRoleNameCollisions`) **ya no aplica**: el core elimino ese detector (UPONE-1699/1700), no lo corrigio. Con eso, no queda nada hacia core.

## Dependencias

- **Depende de:** UPONE-1353 y UPONE-1354 (Finalizadas; construyeron el mecanismo que este ticket adopta). Se apoya ademas en UPONE-1699/1700 (Finalizadas; renombraron el mecanismo a "perfiles" y lo volvieron declarativo).
- **Se relaciona con:** UPONE-1393 (Finalizada; definio los 4 roles y su cableado, punto de partida de la migracion).
- **Habilita:** operar los flujos curriculares con rol curricular en vez de rol administrador (workaround vigente), y que el tercer hermano entre sin decisiones nuevas de rol.

## Estimacion

**8 SP.** El peso no esta en declarar los perfiles, esta en **verificar**: cuatro roles por dos modulos con evidencia runtime, mas el renombre con su paso de migracion en el seed, mas el retiro de tres entidades y la comprobacion de no-regeneracion. **Palancas:** el vinculo declarativo (`profileRoleMapping`) es mas barato que la carga por consola que asumia sp9 (baja algo el costo del cableado); en contra, la superficie crecio por las capabilities que 1619/1633 dejaron directo al rol y hay que absorber. Sube a 13 si el mapeo de roles core destapa convivencia con `Consultor`, o si la auditoria destapa huecos en varios roles.

## Decisiones abiertas

- [ ] **Mapeo de los roles del core hacia los perfiles curriculares** (resuelto parcial en sp9, 2026-08-26): el PO definio 2 de 10 filas (`Admin` y `Consultor` -> perfil "Disenador + Autoridad"). Se cablean 6 roles este sprint (Admin, Consultor + los 4 curriculares); el resto queda para el proximo. Sin tocar core. Ver `sp9/UPONE-1615-registro-de-decisiones.md` (O1).
- [ ] **Las capabilities que 1619/1633 dejaron directo al rol** (`instructionalcomponenttype:*`, `competencynode:adopt/exempt`): ¿entran a los perfiles en esta migracion, o quedan fuera con justificacion? Es superficie nueva que sp9 no dimensiono.
- [ ] **Privatizacion de apps vs evidencia de 1616:** crear el primer vinculo declarativo privatiza las apps; confirmar que no invalida una captura de menu ya cerrada por UPONE-1616.
- [ ] **Permiso de ofertas del Disenador** (`offering:*`) sobre el objeto compartido con engagement: se acota aqui o se registra de nuevo; requiere acuerdo con ese equipo.
- [ ] **Rol huerfano en tenant:** confirmar en runtime si `GestorCurricular` sigue vivo como rol institucional (dato de tenant, no de codigo).

## Guia de ejecucion: reglas y patrones up1 a considerar

- **[A favor]** Vinculo rol-perfil declarativo en `config/app.json` (`profileRoleMapping`, `syncAppProfileMapping`). _Fuente: `mods/hello-world-mod/config/app.json:22-26`._
- **[A favor]** Perfil base mas extensiones con herencia por `extendsId`; deduplicacion por nombre y precedencia "lo que el rol declara gana". _Fuente: `object-manager/src/services/auth/modRoleCapabilities.js`._
- **[Advertencia]** Renombrar el literal de un rol sin paso de reutilizacion forkea (crea nuevos, deja los viejos con sus asignaciones). El paso de renombre vive en el seed, no como SQL manual. _Fuente: `sp9/UPONE-1615-pre-intake.md` (gotchas)._
- **[Advertencia]** Rutas: hoy es `mods/<mod>/profiles/`, no `roles/`. _Fuente: UPONE-1700 (`e9f4a7c`)._
- **[Gate]** Exclusividad roles-XOR-profiles en el `app.json`; correr sync y confirmar materializacion sin colisiones.
- **Transversal:** tenant isolation, correr sync, no editar archivos sincronizados, no commitear artefactos de sync/seed. _Fuente: `up1/CLAUDE.md`._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1353 | RBAC-01: un rol puede tener un perfil distinto por mod | dependencia satisfecha: construyo el mecanismo | Finalizada |
| UPONE-1354 | RBAC-02: layouts por perfil del usuario | dependencia satisfecha | Finalizada |
| UPONE-1393 | Roles estandar del mod + wiring de capabilities | antecedente: definio los 4 roles | Finalizada |
| UPONE-1699 / 1700 | Renombre "rol interno" a "perfil de aplicacion" + vinculo declarativo | dependencia satisfecha: cambio el mecanismo que este ticket usa (invalida el cableado por consola de sp9) | Finalizada |
| UPONE-1619 | InstructionalComponent | antecedente cerrado: agrego capabilities directo al rol en el mismo `_data-rbac.js` a absorber | Finalizada |
| UPONE-1633 | Matriz: Adopcion y Competencias | antecedente cerrado: agrego `competencynode:adopt/exempt` directo al rol en cm | Finalizada |
| UPONE-1616 | Ajustar orden de menus | cerrado; revisar si su evidencia de menu asumio apps publicas antes de los vinculos | Finalizada |
| UPONE-1530 | Curriculum Mapping MCP sync | cerrado; el MCP usa los permisos del usuario real como frontera | Finalizada |

## Referencias

- Fuente canonica: UPONE-1615 (Jira).
- Delta a sp9: `UPONE-1615-reconciliacion` (este sprint). Evidencia extendida, decisiones y pre-intake: `sp9/UPONE-1615-*`.
- Working copy verificado: `curriculum-design@8a151e7`, `curriculum-mapping@584499e`, `object-manager@7662190`.
