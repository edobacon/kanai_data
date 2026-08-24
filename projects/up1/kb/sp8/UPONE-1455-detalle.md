# UPONE-1455 - Curriculum Mapping | Escalas de cobertura (coverageScheme)

> Historia · Prioridad Mayor · Epic UPONE-1452 Curriculum Mapping · Asignado: Francisco Navarro · Story Points en Jira: 5
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1455

## Fuente canonica (PO)

> Se debe implementar el objeto de `coverageScheme` y el mantenedor de "Esquemas de cobertura" de acuerdo con el detalle de la propuesta y la maqueta.

El dev (Francisco) adjunto ademas su propio plan de implementacion (ver Referencias).

## Historia de usuario

Como **Disenador Curricular**, quiero definir escalas de cobertura curricular reusables (por defecto Introduce/Reinforce/Master) para etiquetar en que punto de la progresion un curso aborda una competencia, en vez de depender de una escala fija, para configurar la cobertura segun la convencion de mi institucion.

## Objetivo

Un mantenedor de "Esquemas de cobertura" que permita crear, editar, clonar e inactivar escalas, cada una con su lista ordenada de niveles (codigo, nombre, descripcion), con la escala de plataforma Introduce/Reinforce/Master por defecto, e impidiendo el borrado de una escala en uso (ofreciendo inactivarla).

## Contexto (para dimensionar)

Es una escala configurable equivalente pero mas simple que el esquema de niveles de logro ya construido (UPONE-1454): comparte la forma de catalogo con niveles ordenados, pero sin umbrales ni tipo de escala. Es parte de las fundaciones del modelo de competencias (fase 1): reemplaza el valor fijo del legacy (`intensity`) por un catalogo configurable y trae la escala semilla de plataforma Introduce/Reinforce/Master. Junto con el esquema de niveles, es una configuracion previa necesaria antes de definir una matriz de competencia; su consumo real (etiquetar la tributacion) llega mas adelante. Hoy no existe en el producto. Se difirio de SP7 a SP8; dueno designado desde SP7: Francisco, que adjunto al ticket su propio plan de implementacion (ver Referencias).

## Alcance

**Dentro:** el objeto de escala de cobertura con sus niveles; el mantenedor (listar, crear, editar, clonar, inactivar) con su editor de niveles; la escala semilla de plataforma; los permisos del mantenedor; disponibilidad en los tres idiomas.

**Fuera:** el consumo de la escala en la tributacion curso-competencia (fase posterior); el heatmap/analitica de cobertura; el override institucional del esquema por defecto (diferido); el versionado de la escala.

## Criterios de aceptacion (checkeables)

- [ ] Se puede crear una escala de cobertura con sus niveles y aparece en el listado.
- [ ] La escala semilla Introduce/Reinforce/Master queda disponible en el tenant.
- [ ] Un esquema en uso no se puede eliminar; la interfaz ofrece inactivarlo.
- [ ] Borrar un esquema con niveles no deja registros huerfanos.
- [ ] Validacion: al menos dos niveles, cada uno con nombre y codigo; codigo unico dentro del esquema.
- [ ] Se puede clonar un esquema y reordenar sus niveles.
- [ ] El mantenedor esta disponible en los tres idiomas.

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp8/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] Crear/editar/clonar/inactivar una escala verificado en el tenant UPU (evidencia runtime).
- [ ] La semilla Introduce/Reinforce/Master presente en el tenant.
- [ ] Permisos del mantenedor (ver/crear/modificar/eliminar) efectivos para los roles curriculares.
- [ ] Al abrir el mantenedor sin editar y volver, no pregunta por cambios sin guardar.
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

> Conjunto minimo a cubrir. El dev puede y debe sumar mas casos durante la ejecucion si surgen.

- [ ] Crear esquema con dos niveles -> guarda y aparece en la lista.
- [ ] Eliminar un esquema en uso -> bloquea; ofrece inactivar.
- [ ] Eliminar un esquema con niveles (no en uso) -> borra sin dejar huerfanos.
- [ ] Cargar la semilla en tenant limpio -> escala Introduce/Reinforce/Master presente.
- [ ] Crear esquema con un solo nivel -> rechaza (minimo dos).
- [ ] Dos niveles con el mismo codigo -> rechaza (codigo unico).
- [ ] Abrir el mantenedor y volver sin editar -> no pregunta por cambios.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): aplica - declarar caps `coveragescheme:view/create/modify/delete` y cablearlas a los roles curriculares existentes (no crear roles nuevos). El cableado del `_data-rbac.js` del mod es Decision abierta.
- [ ] Historial / auditoria (DataLog): decision - el plan del dev propone historial consolidado por guardado con `enableDataLog:false` (sin DataLog nativo), como levelScheme; confirmar.
- [ ] Capa de lenguaje (i18n): aplica - labels del objeto, de los RecordTypes y de las columnas del editor en es/en/pt con paridad de keys.
- [ ] Accesibilidad (WCAG): aplica - mantenedor y editor de niveles accesibles (WCAG AA); reusar la a11y del editor generico.
- [ ] Storybook: aplica - story del mantenedor/editor de niveles de cobertura.
- [ ] Design tokens (`var(--up1-*)`, sin hardcode): aplica.
- [ ] Convenciones de mod: aplica - objeto Composite schema-driven (codegen + migrate), identidad `rt__<RT>__coveragescheme`, escritura gobernada (mutacion validada, no CRUD generico), seed idempotente + cleanup e indices en seed, sync sin commitear artefactos, tenant isolation.
- [ ] Documentacion: aplica - referencia del objeto y del mantenedor.

## Dependencias

Ninguna para construirse. Habilita la fase de tributacion (que consumira la escala de cobertura). Dependencia cruzada de decision: el `ownerType` de la escala (institucion vs unidad organizacional) sigue el mismo criterio que levelScheme (UPONE-1454, aun sin confirmar); si 1454 cambia, 1455 debe seguirlo.

## Estimacion

**5 SP** (coincide con Jira y con el enfoque del dev). Catalogo con niveles, mas simple que el esquema de logro ya construido, reusando trabajo existente. Sube a 8 si hay que dejar cableados los permisos del mod desde cero en este ticket.

## Decisiones abiertas

- [ ] Override institucional vs solo la escala por defecto en este sprint (recomendado: solo el default + poder crear escalas custom).
- [ ] Cablear los permisos del mod a los roles ahora o diferir.
- [ ] Codigo de la escala semilla (el dev propone dejarlo sin el prefijo redundante); confirmar con negocio.

## Guia de ejecucion: reglas y patrones up1 a considerar

> No dice como implementar; marca reglas/patrones (a favor) y antipatrones (evitar) de up1 que aplican a este ticket.

- **[A favor]** Seguir el molde ya probado del esquema de nivel (Composite Scheme/Level; self-FK solo en el hijo). _Fuente: `mods/curriculum-mapping/CLAUDE.md`, `docs/PLAN-esquema-de-niveles.md`, `objects/LevelScheme.json`; Jira UPONE-1454._
- **[A favor]** Escritura gobernada por una mutacion validada persistida por el layout; no CRUD generico ni Prisma directo en runtime (excepto seeds controlados). _Fuente: `mods/curriculum-mapping/CLAUDE.md` (Escrituras gobernadas) y `logic/levelScheme-upsert.resolver.js`._
- **[A favor]** Ciclo de vida por `isActive` + guard de borrado si esta en uso (sugiere inactivar); no hard-delete. _Fuente: `mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js` (guard de uso) y `docs/PLAN-esquema-de-niveles.md`._
- **[Evitar]** No crear roles nuevos: adjuntar las capabilities a los roles curriculares existentes. _Fuente: `mods/curriculum-design/seed/_data-rbac.js` (`attachCapabilitiesToRole`)._
- **[Evitar]** Invariantes de dominio (unicidad, minimos) validadas server-side, nunca solo en UI: el CRUD generico y el MCP bypasean el front. _Fuente: `mods/curriculum-mapping/CLAUDE.md` (Integridad de dominio)._
- **[A favor]** Identidad canonica `rt__<RT>__<base>` como clave real del modelo; el titulo humano no es clave. Indices reales van en el seed (el codegen ignora `metadata.indexes`). _Fuente: `object-manager/scripts/detect-schema-drift.js`; `up1/CLAUDE.md` (RecordType); Jira UPONE-1345 (indices por seed)._
- **Transversal:** tenant isolation en toda query; correr sync; no editar archivos sincronizados a mano ni commitear artefactos de sync/seed; en codigo/commits/PR usar solo el id Jira. _Fuente: `up1/CLAUDE.md` (Multi-Tenant, Critical Rules, Sync, Commit)._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1452 | Epic Curriculum Mapping | contenedor | Backlog |
| UPONE-1454 | Esquema de niveles (levelScheme) | molde/patron a replicar (version mas simple) | Finalizada |
| UPONE-1537 | Matriz de competencia, datos generales | hermano SP8 (ambos fundaciones del modelo) | Backlog |
| UPONE-1345 | Objetos planEntry + requirementCategory | origen del gotcha de indices por seed (codegen ignora `metadata.indexes`) | Finalizada |
| UPONE-1479 | Core: borrado por RecordType no cascadea | afecta el borrado de un Scheme con niveles | Developing |

## Referencias

- Fuente canonica: UPONE-1455 (descripcion + comentario de Francisco).
- Plan de implementacion del dev: `sp8/PLAN-esquema-de-coberturas-dev-francisco.md` (adjunto de Francisco; es su camino de implementacion, no parte del contrato del ticket).
- Propuesta de modelo: `competency-management-proposal_v3.md` (escala de cobertura, fases).
- Planning previa: `sp7/planning-2-transcript-2026-07-20.pdf` (cobertura como configuracion previa; diferida a SP8).
- Maqueta: `mockup-curriculum-mapping_v4.html` (mantenedor de esquemas de cobertura).
