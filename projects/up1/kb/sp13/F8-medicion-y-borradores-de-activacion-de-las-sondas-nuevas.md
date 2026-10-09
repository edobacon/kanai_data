---
id: DOC-kb-sp13-F8-medicion-y-borradores-de-activacion-de-las-sondas-nuevas
project: up1
type: doc
tags:
  - sondas
  - medicion
  - F8
  - borrador
---

# F8 medicion y borradores de activacion de las sondas nuevas

Medicion de las sondas nuevas (`entry-guards`, `field-keys`, `list-relations`, `org-scope`) sobre el codigo base de `develop` del 2026-10-09 y borradores listos para activar. **Ningun `probes.yaml` real fue modificado**: la activacion se hace con `kn-probes` y el OK del dev (tipo por tipo y proyecto por proyecto).

## Criterio (D2)
Por proyecto: como maximo una tarjeta nueva por ticket en promedio sobre el conjunto de referencia, y ruido no mayor al 50% actual de up1.

## up1 (conjunto de referencia: TICKET-143 a 152, solo el titulo como pedido)
| Configuracion | Tarjetas nuevas | Promedio por ticket | Tickets con tarjeta nueva |
|---|---|---|---|
| Sin `trigger` (claves de idioma, relaciones, alcance) | 10 | 1.00 | 5 de 10 |
| Con `trigger` de vocabulario de interfaz y de permisos | 2 | 0.20 | 1 de 10 |
| `entry-guards` con `trigger` de permisos | 1 | 0.10 | 1 de 10 |

Conclusion: sin `trigger`, las sondas de capas de interfaz cumplen el limite justo y casi todas serian ruido (tickets de logica que no tocan listas). **Con `trigger` cumplen D2 con holgura.** El pedido de la medicion fue solo el titulo, asi que con el texto completo del ticket el vocabulario aparecera mas veces (la cifra es una cota inferior).

### Reproduccion de los hallazgos conocidos (barrido de develop)
- `entry-guards` (graphql): academic-scheduling 30 consultas, 2 sin guarda (`scenarioCreatedBy` y una mas); curriculum-design 1 de 3 sin guarda (`validateActivityEvaluations`); curriculum-mapping 0. Coincide con la calibracion.
- `field-keys`: Section sin 8 claves (activityId, termId, orgUnitId, shiftId, modalityId, requiredInstructors, accessibilityRequired, sectionClusterId) en es, en y pt.
- `list-relations`: `section-list.json` sin `orgunit`, `shift`, `modality` y `sectioncluster`; `default_Activity_list.json` con `executionUnitId` visible sin relacion (por verificar en pantalla: el layout trae `relationDisplayFields` por objeto).
- `org-scope`: `requirement` e `InstructionalComponentType` sin camino al ancla; `CurricularSection`, `DevelopmentLevel` y `PerformanceScale` polimorficos con camino solo inverso.

Ruido: aun no medido sobre tickets nuevos. `probe_metrics` a las dos semanas de activar es la medicion de verdad.

## taomangalam (65 tickets TAO, solo el titulo como pedido)
`entry-guards` con fuente `openapi-routes`: 2 de 8 operaciones autenticadas sin guarda de capacidad (`POST /cuenta/registro` y `PUT /cuenta/correo`, en `cuenta.ts`): **pendientes de confirmar con el equipo** (pueden ser intencionales). Con un `trigger` amplio (`rol`, `guard`, `acceso`) levanto 8 tarjetas en 65 tickets y 6 eran ruido de infraestructura; con el trigger ajustado levanto 2 (promedio 0.03) y una fue ruido (TAO-166). Se recomienda el trigger ajustado.

## Borradores para activar con kn-probes (OK del dev)
Todos con `enabled: true` solo despues de la revision; hoy se proponen como bloque a agregar al `probes.yaml`.

### up1
```yaml
catalog:
  calibrated: [academic-scheduling, curriculum-design, curriculum-mapping]
probes:
  - id: guardas-de-entrada
    kind: entry-guards
    trigger: '\bpermiso|\bcapability|\bautoriz|\bguard|\bacceso|\brol\b'
    params:
      source: graphql
      schemas: 'logic/*.graphql'
      resolvers: 'logic/*.resolver.js'
      helpers: 'logic/**/*.js'
      guards: ['\w*[cC]heckCapability', '\bhasCapability', '\brequireCapability', '\bcheckObjectPermissions', '\bloadCheckObjectPermissions', '\bcheckPermission', '\bwithObjectAuth', '\bwithCapability']
      declaredOpen: 'sin capability custom|sin rbac propio|lectura autenticada|solo exige sesion'
  - id: claves-de-idioma
    kind: field-keys
    trigger: 'lista|listado|columna|campo|idioma|traduc|etiqueta|layout|pantalla|grilla|tabla|vista'
    params:
      lang: 'lang/{locale}/{object}.i18n.json'
      common: ['lang/{locale}/common.i18n.json']
      locales: [es, en, pt]
      layouts: 'config/layouts/*.json'
  - id: relaciones-de-lista
    kind: list-relations
    trigger: 'lista|listado|columna|campo|layout|pantalla|grilla|tabla|vista'
  - id: alcance-organizacional
    kind: org-scope
    trigger: 'permiso|organizacion|alcance|tenant|contexto|objeto nuevo|nuevo objeto|crear objeto|rol|capability'
    params:
      coreObjects: ['objects/business/Base/*.json', 'objects/business/RecordTypes/*.json', 'objects/core/*.json']
      exempt: [core_User, core_Role, core_Capability, core_Context, core_RoleAssignment, core_RoleCapability, core_ObjectDefinition, core_FieldDefinition, core_Tenant, up1_suite_app, up1_layen_layout, up1_notification, Feedback]
```

### taomangalam
```yaml
catalog:
  calibrated: []   # marcar solo tras medir y confirmar las 2 señales pendientes
probes:
  - id: guardas-de-entrada
    kind: entry-guards
    trigger: '\bpermiso|\bcapacidad|\bcapability|\bautoriz|\bautentic'
    params:
      source: openapi-routes
      contract: server/contract/openapi.yaml
      routes: 'server/src/**/*.ts'
      guards: [autenticacion]
      capabilityGuards: [capacidad]
```
Los otros tipos no aplican a taomangalam (sin layouts, idiomas por objeto ni aislamiento por tenant).

## Estado
- Medido: si. Activado: no (espera OK del dev).
- Proximo paso tras activar: `probe_health` limpio y, a las dos semanas, `probe_metrics` por proyecto.
