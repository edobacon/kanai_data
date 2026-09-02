---
id: DOC-kb-sp10-UPONE-1747-detalle
project: up1
type: doc
module: curriculum-design
tags:
  - sp10
  - curriculum-design
  - detalle
  - UPONE-1747
  - dashboard
  - report-builder
  - por-configuracion
  - aduana-todo-mod-only
---

# UPONE-1747 Detalle (Curriculum Design: pestana Home / dashboard de metricas)

> **Referencia externa:** UPONE-1747 · **Tipo:** improvement (Jira: Tarea) · **Prioridad:** Mayor · **Epica:** UPONE-1267 (Curriculum Design) · **Asignado:** Giovanni Gonzalez · **Story Points:** 5
>
> Contrato del ticket (que conseguir). Ticket de otro dev: sin pre-intake.

## Fuente canonica (PO)

Descripcion del PO en Jira (citada en lo esencial):

> La app Curriculum Design no tiene pantalla de inicio: al entrar el usuario cae en el primer listado. Entregar un panel de estado del diseno curricular como pantalla de inicio, que en una sola vista muestre el tamano del portafolio curricular de la institucion y en que punto de su flujo esta cada poblacion de documentos.
>
> **Requisito de construccion:** el panel debe quedar **configurado, no programado**, usando solo la capacidad nativa de configuracion de un mod en uP1 (plantillas de reporte, definiciones de reporte, layout de panel y configuracion de la app). No forma parte de este ticket ninguna extension: ni consultas propias del mod, ni componentes de visualizacion propios.

Debe responder dos focos: (1) totales por nivel de la jerarquia curricular y su completitud; (2) desagregacion por estado dentro de cada flujo. Ocupa su propia pestana "Dashboards" y es el aterrizaje de la app.

## Historia de usuario

Como responsable de diseno curricular de una institucion, quiero un panel de estado como pantalla de inicio de Curriculum Design, para ver de un vistazo el tamano del portafolio y en que punto del flujo esta detenido el trabajo, sin recorrer listados uno por uno.

## Objetivo

Entregar en Curriculum Design un panel de estado del diseno curricular como pantalla de inicio, construido **solo por configuracion**, que muestre los totales por nivel de la jerarquia (carrera, plan, asignatura, seccion) con su completitud, y la desagregacion por estado de cada flujo que tenga estados.

## Contexto (para dimensionar)

- **La premisa "por configuracion" esta verificada como soportada:** el `report-builder` de uP1 cubre el 100% del mecanismo con datos, no codigo: `ReportTemplate.query` es un GraphQL que corre por `listInstances` (con filtros y campos), la agregacion por conteo/estado la hace el motor de reportes, el panel es un layout declarativo (`DashboardLayoutConfig`: mosaic, widgets `report`), y la pestana "Dashboards" es un tipo de tab reservado (`kind: "dashboards"`) consumido por `app.json` via `navByRole`. Precedente productivo 100% JSON: `mods/hello-world-mod` (`config/app.json` + un layout dashboard).
- Lo que hay que crear son **datos de configuracion** (ReportTemplate/Report del mod + el layout del panel + la pestana), no desarrollo.
- **Jerarquia confirmada en codigo:** `AcademicProgram` -> `Curriculum` (plan) -> `planEntry` -> `Activity` (asignatura/programa) -> `Offering` (seccion/silabo).
- **Estados por nivel:** Plan (`Curriculum.status`), Asignatura (`Activity.status`), Seccion (`Offering.lifecycleStatus`). **Carrera (`AcademicProgram`) NO tiene maquina de estados** (v1, CRUD plano): el foco 2 no es desagregable por estado para Carrera tal como esta modelado. Ver Decisiones abiertas.
- **Exclusiones para no inflar conteos:** asignaturas filtrar `recordType != Service`; secciones filtrar `recordType != ServiceOffer`.
- **Scoping de permisos por configuracion:** acotar los Report nuevos con `isPublic:false` + `visibleToRoles` a los roles de Curriculum Design; el catalogo general de reportes vive en la app `up1-manager` y no se abre. Ver el punto de permisos del PO.
- Verificado sobre `report-builder@915f1e9` y `curriculum-design@8a151e7`.

## Alcance

**Dentro (solo configuracion):**

1. La pestana "Dashboards" en `navByRole` de `config/app.json`, como aterrizaje de la app.
2. El layout del panel (`DashboardLayoutConfig`: mosaic + widgets tipo report), en `config/layouts/`.
3. Los ReportTemplate/Report (uno por nivel/grafico), como datos del mod, con sus queries (`listInstances`), filtros de exclusion de servicios y desagregacion por estado en el orden del flujo.
4. El scoping de visibilidad de esos reportes a los roles de Curriculum Design.

**Fuera:**

- Cualquier extension: consultas propias del mod, componentes de visualizacion propios, datos de relleno.
- Agregar una maquina de estados a `AcademicProgram` (seria cambio de objeto, fuera de "solo configuracion"). Ver Decisiones abiertas.

## Criterios de aceptacion (checkeables)

- [ ] Al abrir Curriculum Design, el usuario aterriza en el panel, no en un listado.
- [ ] La barra muestra la pestana "Dashboards" con el panel dentro, separada de las pestanas de objetos.
- [ ] El panel responde los dos focos: totales por nivel de la jerarquia, y desagregacion por estado de cada flujo que tenga estados.
- [ ] Cada nivel se cuenta una sola vez: no aparecen asignatura y su programa como poblaciones separadas, ni seccion y su silabo.
- [ ] Los estados se muestran en el orden del flujo (no alfabetico) y aparecen todos aunque alguno este en cero.
- [ ] Ningun widget queda en carga permanente ni vacio por error de config: un cero real se distingue de un fallo.
- [ ] Los conteos de asignaturas excluyen servicios y los de seccion excluyen ofertas de servicio, y coinciden con el listado equivalente filtrado a mano.
- [ ] Los graficos muestran todas sus categorias con etiqueta legible, sin recortes.
- [ ] El panel sigue funcionando despues de un ciclo completo de despliegue, sin intervencion manual.
- [ ] Los roles curriculares ven el panel y ningun rol gana acceso a reportes de otras apps.
- [ ] El resultado es unicamente configuracion: no se agrego logica ni componentes propios.
- [ ] La propuesta de indicadores y graficos fue revisada con el PM y los cambios quedaron registrados.

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo. Ademas, especifico:

- [ ] El panel se reconstruye solo por sync/deploy, sin pasos manuales (los reportes y el layout son datos versionados del mod).
- [ ] Conteos contrastados contra el listado equivalente filtrado a mano (servicios excluidos).
- [ ] Visibilidad de los reportes acotada a los roles de Curriculum Design; verificado que no abre el catalogo del tenant.
- [ ] Draft/preview del panel aprobado con el PM (crea vista nueva).
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos / verificacion (checkeables)

- [ ] Cada widget carga y muestra un numero contrastable con su listado filtrado.
- [ ] Un estado en cero se ve como cero, no como widget vacio por error.
- [ ] Un usuario de otra app no ve estos reportes; un rol curricular si ve el panel.
- [ ] Los conteos excluyen servicios/ofertas de servicio.

## Factores transversales (checkeables)

- [ ] Accesibilidad (WCAG): aplica (graficos con etiquetas legibles, sin recortes).
- [ ] Capa de lenguaje (i18n): aplica a titulos de widgets/indicadores en es/en/pt.
- [ ] Documentacion: aplica (panel nuevo, como se configura).
- [ ] Storybook / design tokens: N/A (no hay componente nuevo).
- [ ] Permisos (RBAC): aplica (visibilidad de reportes acotada por rol).
- [ ] Convenciones de mod: aplica (todo como datos/config del mod; sync; no commitear artefactos).
- [ ] **Logica server-side / MCP-ready (regla del proyecto, get_rules):** N-A. El panel es 100% configuracion (report templates + layout), sin logica de negocio nueva; los conteos/agregaciones los resuelve el motor de reportes del servicio, no el cliente.

## Frontera core/mod (Aduana)

Pasada de Aduana en subagente de contexto limpio, modo analisis, contra el working copy real.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `config/app.json` (tab `dashboards` en `navByRole`) | `mod-only` | Config del mod | precedente `mods/hello-world-mod/config/app.json:12-25` |
| `config/layouts/*dashboard*.json` (layout del panel) | `mod-only` | Layout declarativo, tipo ya soportado | `layout/src/shared/types/dashboard.ts:356-444` |
| ReportTemplate/Report nuevos (uno por nivel/grafico) | `mod-only` (dato, no codigo) | `dataSourceObject` es texto libre; se cargan como datos del mod | `report-builder/objects/ReportTemplate.json:43-64` |
| `report-builder` (codigo) | no se toca | Todo lo requerido ya existe generico | `report-builder/logic/*.resolver.js` |
| `object-manager` (codigo) | no se toca | `listInstances` ya soporta filtros/campos | `object-manager/src/graphql/typeDefs/up1.js:657-680` |

**Veredicto global: `todo-mod-only` (100% configuracion).** No cruza a `report-builder`, `object-manager`, `suite` ni `layout` como codigo. No se genera seccion de Dependencias externas.

## Dependencias

- **Depende de:** que existan datos en el tenant para que los conteos tengan sentido (se relaciona con UPONE-1748, que puebla el tenant TEST con una carrera real).
- **Habilita:** una lectura de gestion del portafolio curricular sin recorrer listados.

## Estimacion

**5 SP.** Es carga de configuracion pura (4 o 5 ReportTemplates con query y pivot, un layout Dashboard, una pestana), sin codigo, pero con superficie amplia de casos (cuatro niveles por exclusion de servicios por desagregacion por estado) y validacion manual de cada pivot contra datos reales. **Palanca:** sube si "completitud" exige razones (ver Decisiones) o si el indicador por unidad academica cambia el diseno de los reportes.

## Decisiones abiertas

- [ ] **Carrera sin flujo de estado:** `AcademicProgram` no tiene maquina de estados (v1). ¿Se excluye ese nivel de la desagregacion por estado (solo Plan/Asignatura/Seccion), o se le agrega `status` (cambio de objeto, sale de "solo config")? Decision del PO. Nota: el PO ya definio que la carrera se desagrega por otra dimension (grado y modalidad), lo que encaja con "solo config".
- [ ] **Completitud como razon (%):** el indicador KPI del report-builder expone un valor, no una razon entre dos medidas. Si "completitud" se quiere como porcentaje (ej. Activos/Total), confirmar si se resuelve con dos KPIs lado a lado o si el motor expone un valor calculado por config.
- [ ] **Avance por unidad academica** (deseable del PO): es alcanzable por config, como filtro (`executionUnitId`) o como pivot por unidad. Confirmar cual, porque cambia el diseno de los reportes.
- [ ] **Revisar la propuesta de indicadores/graficos con el PM** antes de cerrar (el PO lo pide explicitamente).

## Guia de ejecucion: reglas y patrones a considerar

- **[A favor]** Panel declarativo: `navByRole` con tab `dashboards` + layout `DashboardLayoutConfig` (mosaic + widgets `report`). _Fuente: `mods/hello-world-mod`._
- **[A favor]** Reporte por conteo/estado via `ReportTemplate.query` (`listInstances` con filtros). _Fuente: `report-builder/objects/ReportTemplate.json:43-64`._
- **[Gate]** Excluir `recordType Service`/`ServiceOffer` en los conteos, o los numeros salen inflados.
- **[Gate]** Acotar visibilidad de los reportes (`isPublic:false` + `visibleToRoles`) para no abrir el catalogo del tenant.
- **[Advertencia]** Carrera no tiene estados: no intentar desagregarla por estado; usar grado/modalidad.
- **Transversal:** todo como datos/config del mod, correr sync, no commitear artefactos de sync/seed.

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1748 | Carga IBERO en tenant TEST | hermano sp10; puebla las poblaciones (carrera/plan/asignatura/seccion) que este panel cuenta | Backlog |

## Referencias

- Fuente canonica: UPONE-1747 (Jira).
- Working copy verificado: `report-builder@915f1e9`, `curriculum-design@8a151e7`.
