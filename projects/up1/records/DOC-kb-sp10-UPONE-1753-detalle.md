---
id: DOC-kb-sp10-UPONE-1753-detalle
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - UPONE-1753
  - renombre-objetos
  - menu-config
  - aduana-hay-core-worthy
---

# UPONE-1753 Detalle (Curriculum Mapping: menus y terminologia)

> **Referencia externa:** UPONE-1753 · **Tipo:** improvement (Jira: Tarea) · **Prioridad:** Mayor · **Epica:** UPONE-1452 (Curriculum Mapping) · **Asignado:** Francisco Navarro · **Story Points:** 5
>
> Contrato del ticket (que conseguir). El detalle tecnico code-grounded (el como, con rutas y evidencia) vive en el explicativo del mismo sprint: `UPONE-1753-explicativo`.

## Fuente canonica (PO)

La descripcion en Jira no trae texto: es un enlace a la maqueta de sp10 (Curriculum Mapping, v29). El alcance lo fija el titulo del ticket:

> Curriculum Mapping | Ajustar menus de Curriculum Mapping y actualizar terminologia de "Esquema de niveles" y "Esquemas de cobertura".

## Historia de usuario

Como administrador curricular de Curriculum Mapping, quiero que los catalogos de escalas y niveles dejen de ocupar entradas propias del menu y se alcancen desde la lista de matrices, y que su terminologia sea inequivoca, para navegar el modulo por su unidad de trabajo real (la matriz) y para que los nombres de los catalogos digan que miden.

## Objetivo

- **A. Menus:** los dos catalogos dejan de ser entradas del menu principal y se alcanzan como botones-modal desde la lista de matrices de competencia.
- **B. Terminologia:** renombrar los dos catalogos a "Escala de desempeno" y "Niveles de desarrollo", en la capa visible y en la identidad de los objetos, para que codigo y producto hablen el mismo idioma.

## Contexto (para dimensionar)

- El mecanismo de boton-modal ya existe y esta en produccion (precedente "Catalogo bibliografico" en curriculum-design). La Parte A es config declarativa, sin componentes nuevos.
- La Parte B no es solo etiquetas: el alcance incluye la identidad de los objetos (title, record types, FKs, capabilities, mutations, layouts, componente), del orden de 50 archivos, mas la capa visible del orden de 10.
- **Riesgo de dimensionamiento verificado:** `object-manager` NO tiene via de sync para renombrar la identidad (`title`) de un objeto preservando sus datos; solo renombra valores de enum. Cambiar el `title` se comporta como objeto nuevo mas objeto huerfano. Los dos record types comparten tabla fisica (decision D-12a del mod): no es mover una tabla, es una tabla con dos poblaciones separadas por el enum `recordType`. Ver Frontera y Decisiones abiertas.
- El mod aun no esta en produccion, asi que recrear desde seed es viable hoy, y es la razon para hacer el renombre ahora y no despues.
- Verificado sobre `curriculum-mapping` en `develop` @ `584499e` (el submodulo no avanzo respecto del explicativo).

## Alcance

**Dentro:**

1. Sacar los dos catalogos de `defaultObjects` y exponerlos como botones-modal desde la lista de matrices.
2. Renombrar los dos catalogos a "Escala de desempeno" y "Niveles de desarrollo" en la capa visible (labels, i18n es/en/pt, genero gramatical) y en la identidad de los objetos.
3. Ajustar las claves i18n de los dos botones.

**Fuera:**

- Los cambios de modelo de la maqueta v29 (pestana Medicion, modelo de medicion, tres ejes de consolidacion, plantillas de perfil): son de UPONE-1755 y del delta de modelo.
- Agregar el campo `coverageSchemeId` a la matriz (se hace en su propio trabajo; si se agrega, que nazca con el nombre nuevo).

## Criterios de aceptacion (checkeables)

- [ ] La app Curriculum Mapping muestra una sola entrada de menu (Matrices de competencia); los dos catalogos ya no son pestanas.
- [ ] Desde la lista de matrices, dos botones abren "Escala de desempeno" y "Niveles de desarrollo" como modal, con su lista operable.
- [ ] Los dos catalogos se llaman "Escala de desempeno" y "Niveles de desarrollo" en es/en/pt, con paridad de idiomas.
- [ ] La identidad de los objetos quedo renombrada (title, record types, FKs, capabilities, mutations, layouts, componente) y no quedan referencias al nombre viejo en el codigo del mod.
- [ ] El genero gramatical de "Escala de desempeno" es femenino y los mensajes generados por el core concuerdan.
- [ ] Ningun boton queda oculto por permiso inexistente: las capabilities renombradas existen antes que los botones.

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo (regla del proyecto; `estandar-DoR-DoD` del sprint). Ademas, especifico de este ticket:

- [ ] Sync corrido; el menu queda con una entrada y los dos catalogos materializados con el nombre nuevo sin colisiones.
- [ ] Sin regresion: crear/editar/clonar/inactivar de los dos catalogos funciona desde el modal; los permisos efectivos por rol se conservan.
- [ ] Decidido y ejecutado el mecanismo de renombre de identidad (ver Decisiones abiertas) sin dejar objeto huerfano ni datos bajo el nombre viejo.
- [ ] i18n con paridad es/en/pt; sin claves faltantes que caigan al label.
- [ ] Doc breve del renombre (los dos catalogos cambian de nombre en producto y en codigo, y 5 documentos los citan).
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

- [ ] El menu queda con una sola entrada tras el sync.
- [ ] Cada boton abre su catalogo como modal y lista sus registros.
- [ ] Crear un registro desde el modal persiste y respeta su validacion.
- [ ] Editar/clonar/inactivar desde el modal funciona (el contexto no viene de la pestana activa).
- [ ] Tras el renombre, no hay referencias al nombre viejo en objects/lang/layouts/capabilities/tests del mod.
- [ ] Los tests de integracion que nombran los catalogos: pasan sin cambios si el alcance es etiquetas, o se actualizan a proposito si afirman una etiqueta que cambio.

## Factores transversales (checkeables)

- [ ] Capa de lenguaje (i18n): **aplica.** es/en/pt con paridad; genero correcto en la escala.
- [ ] Accesibilidad (WCAG): N/A. No hay UI nueva; los layouts existen.
- [ ] Storybook: N/A.
- [ ] Design tokens: N/A.
- [ ] Documentacion: **aplica** (cambio observable de nombres, en producto y en codigo).
- [ ] Convenciones de mod: **aplica.** Escrituras por mutations `*Validated`, `appId` por nombre de carpeta, D-12a (`isActive` cascadea a niveles), D-imp-5 (no declarar RecordTypes vacios). Ver Guia.
- [ ] Permisos (RBAC): **aplica.** Capabilities renombradas y cableadas; boton oculto si falta permiso.
- [ ] **Logica server-side / MCP-ready (regla del proyecto, get_rules):** aplica. El renombre toca mutations/resolvers del servicio; ninguna regla del catalogo debe quedar solo en el cliente.

## Frontera core/mod (Aduana)

Pasada de Aduana en subagente de contexto limpio, modo analisis, contra el working copy real.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Boton modal "Niveles de desarrollo" en el layout de lista | `mod-only` | Usa `modalActionButtons`/`layoutNameMap`, mecanismo ya generico y en produccion | precedente `mods/curriculum-design/config/layouts/default_Activity_list.json:63-77`; destino `mods/curriculum-mapping/config/layouts/default_CompetencyNode_list.json` |
| Boton modal "Escala de desempeno" en el layout de lista | `mod-only` | Idem, mismo mecanismo de layout-config | mismo precedente |
| `config/app.json`: sacar 2 entradas de `defaultObjects` | `mod-only` | Config declarativa del mod | `mods/curriculum-mapping/config/app.json:11-16` |
| Renombre de labels / i18n (metadata + `lang/{es,en,pt}`) | `mod-only` | Datos propios del mod, sin mecanismo nuevo | `objects/LevelScheme.json`, `objects/CoverageScheme.json`, `lang/*/common.i18n.json` |
| Renombre de identidad (contenido de title, record types, FKs, capabilities, mutations, layouts, componente) | `mod-only` | Edicion de archivos propios del mod | `capabilities.json:14-80`; `objects/RecordTypes/rt__Matrix__competencynode.json:11,160` |
| **Via de sync para renombrar la identidad (title) de un objeto preservando datos** | **`core-worthy`** | `object-manager/scripts/sync` solo renombra valores de enum; matchea objetos por `title` como identidad y borra el Base huerfano por nombre viejo, sin migrar datos. No existe rename-with-data-migration | `object-manager/scripts/sync/SyncManager.js:867,882-883`; `fileSync.js:431`; `fileSync.js:657-674` |

**Veredicto global: `hay-core-worthy`.** Todo el trabajo de menu/labels/identidad es mod-only; el unico artefacto core-worthy es la ausencia de un mecanismo de plataforma para renombrar la identidad de un objeto preservando sus datos.

## Dependencias

- **Depende de:** (ninguna dura para la Parte A). Para la Parte B (identidad), el mecanismo depende de la decision de plataforma de abajo.
- **Se relaciona con:** UPONE-1755 (pestana Medicion, mismo mod, usa los nombres nuevos) y UPONE-1756 (tributacion, usa `developmentLevelId` del nombre nuevo).
- **Habilita:** que 1755 y 1756 se construyan con el vocabulario nuevo sin re-renombrar.

### Dependencias externas (avaladas por Aduana)

**Dependencia 1: mecanismo de rename-con-migracion-de-datos para la identidad (`title`) de un objeto en `object-manager/scripts/sync`.**

- **Repo objetivo:** core (`object-manager`).
- **Aval de Aduana:** veredicto `core-worthy`; fuente `object-manager/scripts/sync/SyncManager.js:867,882-883` (solo enum), `fileSync.js:431` (match por title), `:657-674` (cleanup por nombre, no migra).
- **Change Type:** 3 (New optional capability). No rompe consumidores; agrega una via nueva y acotada del sync.
- **Viabilidad en el sprint:** **mitigada.** El mod no esta en produccion, asi que "recrear desde seed" evita depender del Core Extension este sprint. Si se decide la via sync-migra-datos, es un Core Extension Type 3 (luz verde de core antes de implementar) y el tramo de identidad quedaria fuera del sprint.

## Estimacion

**5 SP.** La Parte A es del orden de 1 SP (config declarativa, mecanismo probado). El grueso es la Parte B (identidad, del orden de 50 archivos mas los tests) por la via mas economica (reseed, viable porque el mod no esta en produccion). **Palanca:** sube si se exige la via de sync-migra-datos (depende del Core Extension) o si aparecen datos que preservar en dev/staging.

## Decisiones abiertas

- [ ] **Como se ejecuta el renombre de identidad de objeto:** el sync no lo migra hoy. Opciones: escribir un script de migracion ad-hoc, o recrear desde seed. Es decision de tech lead y bloquea el orden de ejecucion. Recomendacion: reseed, dado que el mod no esta en produccion.
- [ ] **Si se opta por reseed:** confirmar que es aceptable perder datos de `LevelScheme`/`CoverageScheme` en ambientes con carga (dev/staging).
- [ ] **Ruta directa tras sacar de `defaultObjects`:** verificar si el sync tambien elimina la ruta directa del objeto; si la elimina, confirmar que el modal no dependa de ella. Se resuelve levantando el entorno local.
- [ ] **Genero de `metadata.gender`:** "Escala de desempeno" es femenino vs. `masculino` actual; unificar junto con los textos mixtos de `coverageSchemeEditor`.
- [ ] **Si se crea el Core Extension** de la Dependencia 1: decidir si bloquea el sprint o si el mod avanza con reseed mientras la via de plataforma se resuelve en paralelo.

## Guia de ejecucion: reglas y patrones up1 a considerar

- **[A favor]** Boton-modal declarado en el layout de lista (`modalActionButtons` + `layoutNameMap`), sin componente nuevo. _Fuente: `mods/curriculum-design/config/layouts/default_Activity_list.json:63-77`._
- **[Gate]** `requiredPermission` usa capabilities existentes; renombrarlas antes que el boton, o el boton se oculta en silencio. _Fuente: `mods/curriculum-mapping/capabilities.json`._
- **[Advertencia]** `object-manager` no renombra la identidad de un objeto preservando datos (solo enum). _Fuente: `object-manager/scripts/sync/SyncManager.js:867`._
- **[A favor]** D-imp-5: no declarar RecordTypes vacios; el boton del catalogo apunta al objeto y el layout filtra por `recordType`. _Fuente: `CLAUDE.md` del mod._
- **[Advertencia]** `appId` se resuelve por el nombre de la carpeta; no cambiar uno sin el otro. _Fuente: `configSync.js:103,143`._
- **Transversal:** correr `sync`, no editar archivos sincronizados a mano, no commitear artefactos de sync/seed. _Fuente: `CLAUDE.md` del mod._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1452 | Epic Curriculum Mapping | contenedor | Backlog |
| UPONE-1454 | Curriculum Mapping: Esquema de niveles | antecedente: creo el catalogo y sus capabilities que aqui se renombran | Finalizada |
| UPONE-1755 | Matriz de competencia: pestana de Medicion | hermano sp10; usa los nombres nuevos de los catalogos | Backlog |
| UPONE-1756 | Tributacion | hermano sp10; usa `developmentLevelId` del nombre nuevo | Backlog |

## Referencias

- Fuente canonica: UPONE-1753 (Jira) y la maqueta de sp10 (Curriculum Mapping v29).
- Detalle tecnico code-grounded: `UPONE-1753-explicativo` (este sprint).
- Working copy verificado: `curriculum-mapping` @ `develop` `584499e`.
