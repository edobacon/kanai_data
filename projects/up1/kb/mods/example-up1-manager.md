---
id: SPEC-mods-026
project: up1
type: spec
module: mods
category: mods
tags: [up1-manager, mod, admin, object-manager-editor, ome, flow-viewer, n8n, report-builder, config, datalog, rbac]
fecha: 2026-08-17
sources:
  - mods/up1-manager/config/layouts/role-hub.json (hub Institutional/Internal roles, UPONE-1503)
  - mods/up1-manager/config/layouts/role-view.json (5 tabs: General, Capabilities, Internal Roles, Contexts, Users)
  - mods/up1-manager/config/layouts/report-list.json, reporttemplate-{list,create,edit}.json (MGR-10, modal XL + roles Admin)
  - mods/up1-manager/logic/appRoles.resolver.js (manageAppRoles, commit 49623ef)
  - mods/up1-manager/capabilities.json (sin capabilities nuevas en esta ventana)
  - up1/CLAUDE.md (secciones "Active mods", "Legacy removed mods/apps", "RBAC & Permissions")
  - mods/up1-manager/README.md
  - mods/up1-manager/config/app.json
  - mods/up1-manager/capabilities.json
  - mods/up1-manager/config/layouts/*.json (67+ layouts)
  - mods/up1-manager/seed/remove-legacy-apps.js
  - mods/up1-manager/config/layouts/objectdefinition-view.json (tabs Metadata/Fields/Validations/RecordTypes/Layouts/Permissions/Data Preview/Logs/Change History)
  - mods/up1-manager/config/layouts/fielddefinition-edit.json (enum-values-editor, enum-transitions-editor, json-schema-editor)
  - mods/up1-manager/modsComponents/JsonSchemaEditor/JsonSchemaEditorElement.vue, jsonSchemaOps.ts (branch feat/UPONE-1290, MGR-05)
  - object-manager/src/services/jsonSchemaMirror.js, src/services/customFields.js, src/graphql/resolvers/fieldDefinition.resolver.js (contrato updateCustomField jsonSchema -> properties.jsonSchema)
  - layout/src/components/molecules/JsonFieldViewer/JsonFieldViewer.vue, src/elements/JsonFieldViewerElement.vue, src/layouts/RecordDetail.vue (consumidor json-field-viewer, UPONE-1291/MGR-06)
  - mods/up1-manager/config/layouts/platform-config.json, app-config-modal.json, app-list.json
  - mods/up1-manager/config/layouts/core_user_admin_list.json, core_user_create.json
  - mods/up1-manager/config/layouts/report-list.json, reporttemplate-list.json, report-edit.json, reporttemplate-edit.json
  - mods/up1-manager/logic/objectRoles.resolver.js (getObjectRoleCapabilities, manageObjectRoles, RBAC_ROLE_CHANGE)
  - mods/up1-manager/logic/appRoles.resolver.js (manageAppRoles, diff de modRoleId)
  - mods/up1-manager/config/layouts/app-list.json, app-role-mapping-create.json, app-role-mapping-edit.json, app-role-mappings-list.json, app-edit.json
  - mods/up1-manager/seed/remove-internal-role-package-layouts.js
  - mods/up1-manager/modsComponents/CapabilityPatternEditor/CapabilityPatternEditorElement.vue, useCapabilityPatternEditor.ts, CapabilityPatternEditor.types.ts
  - mods/up1-manager/config/layouts/serviceaccount-create.json, serviceaccount-view.json, serviceaccount-list.json
  - mods/up1-manager/config/layouts/fielddefinition-create.json (vocabulario canonico de fieldType)
  - git log de mods/up1-manager (repo standalone, branch develop), desde 2026-05-16 hasta 2026-08-03 (commit 8482e0e)
  - specs/up1/features/config-system.md, features/enum-transitions.md, features/datalog.md, features/report-builder.md, features/rbac.md (documentos tecnicos de detalle; este documento enlaza a ellos en vez de duplicarlos; no existe features/security-hardening.md en el repo de docs al momento de esta revision)
---

# Ejemplo real: mod up1-manager (consola de administracion)

Guia practica que recorre `up1-manager`, el mod que absorbe la administracion de la plataforma uP1: metamodelo de objetos, RBAC, flows/n8n, reportes, configuracion del sistema y gestion de usuarios admin. A diferencia de `retention-wellbeing` (dominio funcional para el negocio del cliente), este mod es **infraestructura de plataforma**: opera sobre objetos core (`core_ObjectDefinition`, `core_FieldDefinition`, `core_Role`, `N8nWorkflow`, `Report`, etc.), no define objetos de negocio propios.

## Indice

1. [Vision general](#1-vision-general)
2. [Registro del mod (app.json)](#2-registro-del-mod-appjson)
3. [Vistas y consolas que expone](#3-vistas-y-consolas-que-expone)
4. [Object Manager Editor (OME)](#4-object-manager-editor-ome)
5. [Visor de DataLog (Change History)](#5-visor-de-datalog-change-history)
6. [Editor visual de transiciones de enum](#6-editor-visual-de-transiciones-de-enum)
7. [Editor visual de JSON Schema](#7-editor-visual-de-json-schema)
8. [ConfigPanel: Configuraciones del sistema](#8-configpanel-configuraciones-del-sistema)
9. [Report Builder: vistas propias, fuente tecnica externa](#9-report-builder-vistas-propias-fuente-tecnica-externa)
10. [Creacion de usuarios admin](#10-creacion-de-usuarios-admin)
11. [RBAC: namespace de capabilities](#11-rbac-namespace-de-capabilities)
12. [RBAC de objeto: guardas de autorizacion y auditoria](#12-rbac-de-objeto-guardas-de-autorizacion-y-auditoria-upone-1354-sec-01-upone-1417)
13. [Asignacion de roles internos por app: row action scoped por parentId](#13-asignacion-de-roles-internos-por-app-row-action-scoped-por-parentid-upone-1353)
14. [CapabilityPatternEditor para cuentas de servicio](#14-capabilitypatterneditor-para-cuentas-de-servicio-sin-ticket-jira)
15. [Hub de roles con dos tabs y detalle de 5 tabs (UPONE-1503)](#15bis-hub-de-roles-con-dos-tabs-y-detalle-de-5-tabs-upone-1503)
16. [Actividad reciente](#15-actividad-reciente)

---

## 1. Vision general

| Aspecto | Detalle |
|---------|--------|
| Nombre en sidebar | **uP1 Manager** |
| Repo/carpeta | `mods/up1-manager/` (repo git propio, branch `develop`) |
| Dominio | Administracion de plataforma: metamodelo, RBAC, flows, reportes, configuracion, usuarios |
| Objetos propios | 0. Opera sobre objetos core y sobre objetos tecnicos de `report-builder/` |
| Resolvers propios | 4 modulos en `logic/`: `n8nWorkflowProxy.js` + `flow.resolver.js` (proxy N8nWorkflow), `objectRoles.resolver.js` (RBAC por objeto) y `appRoles.resolver.js` (RBAC por app) |
| Objetos core que consume | `core_User`, `core_Role`, `core_RoleAssignment`, `core_Capability`, `core_RoleCapability`, `core_ObjectDefinition`, `core_FieldDefinition`, `core_ObjectValidation`, `core_ServiceAccount`, `core_ConfigDefinition`, `core_Context`, `core_SchemaAuditLog`, `DataLog`, `up1_layen_layout`, `up1_suite_app`, `up1_suite_app_role`, `N8nWorkflow`, `Report`, `ReportTemplate` |
| Layouts | 70+ (listas, edicion, wizards de creacion, modales de confirmacion, pickers) |
| Reemplaza a | `object-manager-editor` (mod legacy) y `flow-viewer` (mod legacy), ademas de absorber la vista de Suite del workspace `report-builder` |
| Capabilities RBAC | 28, namespace `mod/up1-manager/<domain>:<action>` |
| Tenants | `"*"` (disponible en todos los tenants actuales y futuros) |
| Roles con acceso | Admin, Consultor, Colaborador (segun `app.json`); granularidad fina por layout/capability |

```text
┌──────────────────────────────────────────────────────────────────┐
│  Mod: up1-manager                                                 │
│                                                                    │
│  ┌────────────────┐ ┌──────────────────┐ ┌───────────────────┐    │
│  │ 0 objetos      │ │ 4 resolvers      │ │ 70+ layouts       │    │
│  │ propios        │ │ propios (proxy   │ │                   │    │
│  │                │ │ N8nWorkflow +    │ │                   │    │
│  │                │ │ RBAC objeto/app) │ │                   │    │
│  └────────────────┘ └──────────────────┘ └───────────────────┘    │
│  ┌────────────────┐                                                │
│  │ 28 capabilities│                                                │
│  │ RBAC           │                                                │
│  └────────────────┘                                                │
└────────────────────────────┬───────────────────────────────────────┘
                             │ npm run sync
┌────────────────────────────┼───────────────────────────────────────┐
│  Objetos core administrados │                                      │
│                             │                                      │
│  core_ObjectDefinition  core_FieldDefinition  core_Role             │
│  core_User  DataLog  N8nWorkflow  Report  ReportTemplate            │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   uP1 Runtime   │
                    └─────────────────┘
```

**Historia**: `up1-manager` migro y consolido tres proyectos previos en un unico mod: el Object Manager Editor (ticket UPONE-1287, mods separado `object-manager-editor`), el Flow Viewer (proxy de N8nWorkflow), y las vistas Suite del workspace `report-builder`. El primer commit del repo lo declara explicito: "consolidate OM Editor, Report Builder and Flow Viewer" (commit `9c610f7`) seguido de "own manager views without absorbing report-builder source" (`3643f53`), que fija el limite: up1-manager es dueno de las **vistas**, `report-builder/` sigue siendo la fuente tecnica (objetos, resolvers, componentes, schema Prisma).

---

## 2. Registro del mod (app.json)

`config/app.json`:

```json
{
  "name": "up1-manager",
  "label": "uP1 Manager",
  "icon": "bi-columns-gap",
  "iconBg": "#4F46E5",
  "order": 3,
  "roles": ["Admin", "Consultor", "Colaborador"],
  "tenants": { "*": {} },
  "defaultObjects": [
    "core_User", "up1_suite_app", "core_ObjectDefinition", "core_Role",
    "core_ServiceAccount", "core_ConfigDefinition", "Report", "ReportTemplate", "N8nWorkflow"
  ],
  "requiredPermissions": [
    "mod/up1-manager/objectdefinition:view",
    "mod/up1-manager/n8nworkflow:view",
    "mod/up1-manager/report:view",
    "mod/up1-manager/config:view"
  ],
  "up1ModelVersion": 5
}
```

**Puntos a notar:**

- `tenants: { "*": {} }` (no un array de codigos de tenant) sincroniza la app a **todos** los tenants registrados, actuales y futuros, sin necesidad de tocar este archivo al dar de alta un tenant nuevo.
- `defaultObjects` son en su totalidad objetos **core** de la plataforma (mas `Report`/`ReportTemplate`/`N8nWorkflow`, que son objetos tecnicos de otros workspaces): el mod no aporta objetos propios.
- `requiredPermissions` a nivel de app filtra la visibilidad de la app entera en el sidebar; el acceso fino a cada vista se resuelve luego por `roles`/`requiredPermissions` de cada layout.
- El README del mod aclara que las capabilities de rol no se redefinen por esta disponibilidad de tenant: el acceso viene de las migraciones heredadas de Object Manager Editor, Flow Viewer y Report Builder.

---

## 3. Vistas y consolas que expone

`up1-manager` agrupa 70+ layouts en 6 consolas funcionales:

| Consola | objectName principal | Layouts representativos |
|---------|----------------------|--------------------------|
| **Object Manager Editor (OME)** | `core_ObjectDefinition`, `core_FieldDefinition`, `core_ObjectValidation` | `objectdefinition-list/view/create/edit`, `fielddefinition-create/edit`, `objectdefinition-fields-list`, `recordtype-list/view/create/edit`, `objectvalidation-*` |
| **Roles y capabilities** | `core_Role`, `core_RoleAssignment`, `up1_suite_app_role` | `role-list/view/create/edit`, `role-capabilities-list`, `role-contexts-list`, `role-roleassignments-list`, `rolecapability-*`, `role-picker`, `app-role-mapping-create/edit`, `app-role-mappings-list` (ver seccion 13) |
| **Usuarios** | `core_User` | `core_user_admin_list`, `core_user_create`, `core_user_account_view/edit`, `core_user_activate_confirm`, `core_user_deactivate_confirm`, `core_user_self_view`, `user-picker`, `user-roles-list` |
| **Aplicaciones (Suite apps) y layouts** | `up1_suite_app`, `up1_layen_layout` | `app-list/view/create/edit`, `app-layouts-list`, `app-config-modal`, `layout-list/view/create/edit`, `default_up1_layen_layout_create_custom` |
| **Flow Viewer / N8nWorkflow** | `N8nWorkflow` | `n8nworkflow_list` |
| **Report Builder** | `Report`, `ReportTemplate` | `report-list/view/create/edit`, `reporttemplate-list/create/edit` (`RecordList` generico, ver seccion 9) |
| **Configuracion del sistema** | `core_ConfigDefinition` | `platform-config` (nivel plataforma), `app-config-modal` (nivel mod, invocado desde `app-list`) |
| **Cuentas de servicio y contexto** | `core_ServiceAccount`, `core_Context` | `serviceaccount-list/view/create` (con `CapabilityPatternEditor`, ver seccion 14), `context-view`, `core_Context_tree_create` |
| **Auditoria** | `core_SchemaAuditLog`, `DataLog` | Tabs `logsList` y `dataLogList` embebidos en `objectdefinition-view` |

Todas las vistas admin auxiliares (create/edit/modales de confirmacion) declaran `"applicationId": null` y `"showInNav": false`: son layouts de soporte que se abren desde otra vista (row action, boton "crear"), no entradas de navegacion propias.

---

## 4. Object Manager Editor (OME)

Migrado desde el ticket **UPONE-1287** ("Migracion de features del OME de ticket 1287", commit `ea255d3`) hacia el mod consolidado.

`objectdefinition-view.json` es el layout central: un `RecordDetail` de `core_ObjectDefinition` con 9 tabs, cada uno delegando en un sub-layout:

| Tab | Contenido | Sub-layout / elemento |
|-----|-----------|------------------------|
| Metadata | name, label, labelPlural, gender, description, defaultLayoutType, source, timestamps (todos disabled) | inline |
| Fields | listado de `core_FieldDefinition` activos del objeto | `objectdefinition-fields-list` |
| Validations | listado de `core_ObjectValidation` del objeto | `objectvalidation-list` |
| Record Types | RTs del objeto (`rt__*__{name}`) | `recordtype-list` |
| Layouts | layouts asociados a este `objectName` | `layout-list` |
| Permissions | tags de solo lectura poblados via `autoPopulate` (`useRoleDefinitions`) para view/create/edit/delete por rol | inline (autoPopulate) |
| Data Preview | muestra de registros reales del objeto | `record-list` dinamico sobre `{{record.name}}` |
| Logs | `core_SchemaAuditLog` filtrado por `objectId` | inline |
| Change History | ver seccion 5 | `dataLogList` |

**Patron a notar**: el tab "Data Preview" usa `"objectName": "{{record.name}}"`, es decir, el `objectName` del sub-layout es un placeholder resuelto en runtime con el nombre del objeto que se esta viendo. Esto permite un unico layout de preview generico para cualquier `core_ObjectDefinition`.

La edicion de campos (`fielddefinition-edit.json`) soporta 16 `fieldType` (text, textarea, boolean, number, percent, currency, datetime, time, email, phone, url, json, reference, enum, Formula) y activa por `conditions` los editores especializados: `enum-values-editor` y `enum-transitions-editor` para enum, `formula-maker` para Formula. La mutacion custom `updateCustomField` envia `enumValues` y `transitions` como `JSON` junto al resto de metadatos del campo.

**Vocabulario de `fieldType` resuelto en runtime (UPONE-1386, UPONE-1497)**: `fielddefinition-create.json` y `fielddefinition-edit.json` ya no hardcodean la lista de `fieldType` como `items` estaticos en el layout; la resuelven via `autoPopulate` contra el composable `useFieldTypeVocabulary` (`getFieldTypeOptions`), que consulta `VALID_FIELD_TYPES` en el backend. Al migrar, las `conditions` que activan el editor de Formula quedaron comparando contra `"formula"` (minuscula) en `fielddefinition-create.json`, mientras el backend expone el valor canonico `"Formula"` (mayuscula, ver `object-manager`); el mismatch de casing se corrigio en UPONE-1497 (commit `bbd7cdc`), alineando las `conditions` de create al mismo valor que ya usaba edit. Confirmado en codigo: `config/layouts/fielddefinition-create.json` compara `["fieldType", "==", "Formula"]` en las tres condiciones que gatillan el editor de formula.

---

## 5. Visor de DataLog (Change History)

Ticket **UPONE-1282** ("Visor de DataLog en el OM editor", commit `aac3c48`).

El tab "Change History" de `objectdefinition-view.json` (elemento `dataLogList`) es un `record-list` sobre el objeto `DataLog`, filtrado por `objectName EQUALS {{record.name}}`, orden `createdAt desc`, sin create/edit/delete/bulk-delete, con busqueda habilitada. Es de solo lectura: expone quien hizo el cambio, que accion se ejecuto y que campos cambiaron para el objeto que se esta inspeccionando.

El commit tambien toco `app-list.json` y `app-view.json` (6 y 11 lineas respectivamente), y agrego `tests/datalog-viewer-contract.test.ts`.

Para el detalle tecnico del objeto `DataLog` (decorator `withDataLog`, atribucion polimorfica, `historyKey`, retiro de `ChangeLog`), ver `specs/up1/features/datalog.md`.

---

## 6. Editor visual de transiciones de enum

Ticket **AP-04**, integrado en tres commits sucesivos:

1. `eb0bef4` "Integracion de elementos referentes a cambios de objetos en modo transicion": crea `EnumTransitionsEditorElement.vue` y agrega el elemento `transitions` a `fielddefinition-edit.json`.
2. `1cbdf83` "Integracion de transicion al crear un elemento y covertura de paso inicial no repetible en llegada": extiende `fielddefinition-create.json` y la logica de `transitionRows.ts`.
3. `51da7f9` "Integracion de condicionales y elementos adicionales con UX": agrega condicionales y mas UX al editor (480 lineas de cambios en el componente).

En `fielddefinition-edit.json`, el elemento `transitions` (`type: enum-transitions-editor`) solo se muestra cuando `fieldType == "enum"` **y** `isBaseField == false`, es decir, exclusivamente para campos enum custom (no para enums base del sistema). Guarda en `jsonPath: properties.transitions` y viaja junto al resto del formulario en la mutacion `updateCustomField`.

Para el modelo de datos de transiciones (`versionableFromStates`, guard de validacion, integracion con versionado), ver `specs/up1/features/enum-transitions.md`.

---

## 7. Editor visual de JSON Schema

Ticket **UPONE-1290 (MGR-05)**. Editor visual que permite definir, campo por campo, la **forma interna de un campo de tipo `json`** (un `fieldType: "json"` de `core_FieldDefinition`) sin escribir JSON a mano. En vez de guardar un blob opaco, el administrador declara las sub-propiedades del objeto y su tipo, y esa forma (un JSON Schema) queda asociada al campo.

### Que permite editar

El elemento Vueform `JsonSchemaEditor` (`modsComponents/JsonSchemaEditor/JsonSchemaEditorElement.vue`, 448 lineas) renderiza un arbol aplanado (preorder) de las sub-propiedades del campo objeto. Por cada sub-propiedad permite:

- **Nombre** (validado: solo letras, numeros y guiones bajos, debe empezar con letra o guion bajo).
- **Tipo** entre 6 primitivos: `string`, `number`, `integer`, `boolean`, `date`, `object`.
- **Required** (marca la sub-propiedad como obligatoria).
- **Agregar / eliminar / renombrar** sub-propiedades, con anidamiento recursivo cuando el tipo es `object`.

Las operaciones son inmutables y viven separadas del componente en `modsComponents/JsonSchemaEditor/jsonSchemaOps.ts` (349 lineas): `add`, `remove` (con limpieza del array `required`), `rename` (preservando orden y schema anidado), `changeType`, `toggleRequired`, navegacion por path y serializacion UI type <-> nodo JSON Schema. Cubierto por `jsonSchemaOps.spec.ts` (34 tests de los escenarios del ticket).

### Donde aparece

1. **OM Editor (edicion del campo)**: en `fielddefinition-edit.json` el editor se registra bajo la clave `fieldSchema`, con `type: "json-schema-editor"` y `jsonPath: "properties.jsonSchema"`, condicionado a `fieldType == "json"`:

   ```json
   "fieldSchema": {
     "type": "json-schema-editor",
     "label": "Sub-propiedades del objeto",
     "jsonPath": "properties.jsonSchema",
     "conditions": [["fieldType", "==", "json"]]
   }
   ```

   El `customEndpoint` del layout mapea el valor del formulario al argumento de la mutation: `formData.fieldSchema -> jsonSchema` (tipo `JSON`). Los cambios se guardan al submitear el formulario, no en vivo.

2. **RecordDetail (edicion del valor del registro)**: el consumidor es el elemento `json-field-viewer` (`layout/src/elements/JsonFieldViewerElement.vue` + `components/molecules/JsonFieldViewer/JsonFieldViewer.vue`), ticket **UPONE-1291 (MGR-06)**. Cuando un registro tiene un campo `json` con schema declarado, RecordDetail construye inputs tipados por sub-propiedad (texto, numero, fecha, toggle) en vez de un textarea de JSON crudo. Si el campo no tiene schema, cae a un textarea de JSON en bruto. RecordDetail inyecta el schema al elemento (`RecordDetail.vue:2903` y siguientes) leyendo `fieldMetadata.jsonSchema ?? fieldMetadata.properties.jsonSchema`, y transporta el valor como string para evitar la corrupcion de objetos anidados de Vueform (`json-field-viewer` y `json-schema-editor` estan ambos en `JSON_STRING_TRANSPORT_TYPES`, `RecordDetail.vue:2466-2476`).

### Contrato jsonSchema -> properties

La mutation backend `updateCustomField` acepta un argumento `jsonSchema` (parseado desde string si llega como texto, `fieldDefinition.resolver.js:236`). El schema se persiste en dos lugares con roles distintos:

- **Fuente versionada**: tabla `core_FieldJsonSchema` (columnas `id`, `version`, `active`, `schema`). Cada guardado crea una nueva version activa y desactiva la anterior, dejando historial auditable. El schema se valida con AJV antes de persistir.
- **Espejo de lectura rapida**: `core_FieldDefinition.properties.jsonSchema`. El servicio `jsonSchemaMirror.js` (`applyJsonSchemaMirror`) copia el schema activo al JSON `properties` del campo, para que los consumidores (editores visuales, hidratacion de layouts) lo lean en el mismo fetch de la FieldDefinition, sin un segundo round-trip.

Semantica del espejo (`jsonSchemaMirror.js:38`):

- Un schema no vacio se copia bajo `properties.jsonSchema`.
- Pasar `null` (o un schema vaciado) elimina `jsonSchema` de `properties`.
- El resto de claves de `properties` se preservan.
- El flag legacy `hasJsonSchema` se elimina en cada escritura (quedo sin productores ni consumidores).

`isNonEmptySchema` decide entre update (schema con al menos una property) y soft-delete (schema vacio / `{}` / `{ properties: {} }`). Callers del mirror: los resolvers `updateJsonSchema` y `deleteJsonSchema`, el codegen `syncBaseFieldsToRegistry` (MGR-04), y el servicio `updateCustomField` cuando recibe el argumento `jsonSchema`.

### Estado de integracion (a la fecha)

- Backend (object-manager): contrato `updateCustomField(jsonSchema)` + `core_FieldJsonSchema` + espejo a `properties.jsonSchema` presente.
- Consumidor (layout, UPONE-1291/MGR-06): `json-field-viewer` y el transporte de `json-schema-editor` en RecordDetail estan mergeados a `develop` de layout.
- Editor (up1-manager, UPONE-1290/MGR-05): mergeado a `develop` del mod (commit `a27fae8`, pull request #9). El componente `JsonSchemaEditor` y el elemento `fieldSchema` ya estan presentes en `config/layouts/fielddefinition-edit.json` de `develop`. La integracion completa (backend + layout + up1-manager) esta cerrada.

Para el modelo general de objetos programaticos y campos custom, ver `specs/up1/core/programmatic-objects.md`.

---

## 8. ConfigPanel: Configuraciones del sistema

Feature integrada via PR #7 ("feature/config-system", commit de merge `3bddec5`), con commits previos: `4360514` (config panel integration), `f450111` (test config definitions), `5cd51be`/`e7e1ebd` (i18n), `bd9b7c7` (ocultar accion cuando la app no tiene configs), `d23529b` (rename a "Configuraciones del sistema"), `5c3c969` (remover mod settings placeholder).

Dos layouts `ConfigPanel` sobre el mismo objeto (`core_ConfigDefinition`), diferenciados por `configType`:

```json
// platform-config.json
{
  "name": "platform-config",
  "label": "Configuraciones del sistema",
  "layoutType": "ConfigPanel",
  "roles": ["Admin"],
  "showInNav": true,
  "layoutConfig": { "configType": "PLATFORM" }
}
```

```json
// app-config-modal.json
{
  "name": "app-config-modal",
  "label": "Configuraciones de aplicación",
  "layoutType": "ConfigPanel",
  "roles": ["Admin", "Consultor"],
  "layoutConfig": { "configType": "MOD" }
}
```

`platform-config` es una entrada de navegacion propia (`showInNav: true`, solo Admin), para settings globales de la plataforma. `app-config-modal` no tiene entrada de navegacion propia: se invoca como **row action** desde `app-list.json`, gateado por dos condiciones:

- `requiredCapability: "mod/up1-manager/config:edit"`
- `visibilityConditions`: el boton solo aparece si `hasConfigs == true` para esa fila (la app registra configuraciones definidas)

```json
"rowActions": [{
  "id": "app-config",
  "label": "Configuraciones",
  "type": "modal",
  "targetLayoutId": "app-config-modal",
  "modalTitle": "[record.label] - Configuraciones",
  "initialDataMapping": { "configType": "MOD", "appName": "record.name" },
  "requiredCapability": "mod/up1-manager/config:edit",
  "visibilityConditions": { "conditions": [{ "field": "hasConfigs", "operator": "==", "value": true }] }
}]
```

(nota: `app-list.json:94` separa `[record.label]` de "Configuraciones" con un guion largo en el archivo fuente; se muestra con guion simple aqui por estilo del documento)

Para el modelo de datos (`core_ConfigDefinition`, `core_Config`, resolvers, sync), ver `specs/up1/features/config-system.md`.

---

## 9. Report Builder: vistas propias, fuente tecnica externa

`up1-manager` es dueno del **namespace de capabilities** y de las **vistas** de reportes (`report-*`, `reporttemplate-*`); el workspace `report-builder/` sigue siendo la fuente tecnica: objetos (`Report`, `ReportTemplate`, `ReportPivot`, `ReportKpiCell`), resolvers GraphQL, componentes Vue (Flexmonster), schema Prisma, seeds, CSS y traducciones.

**Migracion a `RecordList` generico (UPONE-1377)**: `report-list.json` y `reporttemplate-list.json` dejaron de delegar en el custom element `report-list-manager` sobre un layout `RecordDetail`; ahora son `RecordList` genericos, con columnas explicitas, `relationDisplayFields: { "ReportCategory": "name" }` (resuelve el nombre de la categoria sin un segundo fetch), `openMode: { "view": "route", "edit": "route", "create": "route" }` (paginas completas en vez de modal) y una row action Duplicate.

- `report-list` / `report-view` / `report-edit` / `report-create` (sin restriccion de `roles`, gateados por `requiredPermissions: mod/up1-manager/report:view`)
- `reporttemplate-list` / `reporttemplate-create` / `reporttemplate-edit` (roles `Admin`, `Coordinador`, gateados por `mod/up1-manager/reporttemplate:view` + `:edit`)

```json
// report-list.json (extracto, estado actual)
{
  "name": "report-list",
  "objectName": "Report",
  "layoutType": "RecordList",
  "layoutConfig": {
    "relationDisplayFields": { "ReportCategory": "name" },
    "openMode": { "view": "route", "edit": "route", "create": "route" }
  }
}
```

**Bug de seguimiento (mismo ticket)**: `report-edit.json`/`reporttemplate-edit.json` quedaban en modo solo-lectura cuando la URL traia `instanceId`, porque `computedMode` de `RecordDetail` no encontraba un `mode` explicito en `layoutConfig` y asumia `view` por default. Se corrigio agregando `"mode": "edit"` + `"hasIntegratedControls": true` a ambos layouts (el wizard `ReportFormManager`, custom element embebido, ya trae sus propios controles Anterior/Siguiente/Guardar, por eso necesita `hasIntegratedControls` para que `RecordDetail` no dibuje los suyos encima). Confirmado en codigo: ambos archivos tienen `mode: "edit"` y `hasIntegratedControls: true` en `layoutConfig`. El patron es relevante para cualquier layout con un wizard custom embebido en `RecordDetail`: sin `mode` explicito y sin `hasIntegratedControls`, la sola presencia de `instanceId` en la URL fuerza modo vista.

El README del mod fija el limite explicitamente en una tabla de "Ownership Boundaries": registro de app, layouts de objectdefinition/roles y layouts de report en `up1-manager`; objetos, schema Prisma, logica GraphQL, componentes Vue, seeds, CSS y lang de reportes en `report-builder/`. No introducir nombres alternativos de layout de reporte (regla explicita del README, relacionada a UPONE-1286).

**MGR-10 (2026-08-11): plantillas dentro de un modal XL + restriccion de rol.** `reporttemplate-create.json`/`reporttemplate-edit.json` se abren ahora dentro de un modal `XL` en vez de una pagina completa (commit `19fd7f2`); `report-list.json` y `reporttemplate-list.json` recibieron mejoras de uso (recuento de vistas de plantilla, breadcrumbs, nombres de categoria, boton de reload) en la misma serie de commits. `reporttemplate-{list,create,edit}.json` restringen `roles: ["Admin"]`, mas estricto que `report-{list,view,edit,create}` (sin restriccion de rol, solo gateados por `requiredPermissions`). Confirmado en codigo: los 3 archivos de `reporttemplate-*` declaran `"roles": ["Admin"]`.

Para el detalle tecnico completo (Flexmonster, pivot, KPI cells, resolvers), ver `specs/up1/features/report-builder.md`.

---

## 10. Creacion de usuarios admin

Ticket **UPONE-909** (commit `249df03`, "admin user creation").

Cambios del commit:
- Nuevo layout `core_user_create.json` (`RecordDetail`, modo `create`, rol `Admin` unicamente, `applicationId: null`, `showInNav: false`): formulario con `name`, `email` (requerido + validacion `email`), `phone`, `state`, `program`, `cohort`.
- `core_user_admin_list.json` se conecta a el via `canCreateLayoutId: "core_user_create"` y `createModalTitle: "createUserTitle"`; el commit tambien quito el filtro por tenant de la lista.
- Capability `core_user:create` restringida a rol Admin via `seed/restrict-user-create-to-admin.js`.
- Claves i18n `createUserTitle` y namespace `coreUserCreate.*` en `es_CL`, `en_CL`, `pt_BR`.

`core_user_admin_list.json` ademas incluye row actions de `deactivate-user` / `activate-user` (modales de confirmacion, gateadas por `core_user:modify` y condiciones de visibilidad sobre el campo `active`) y `assign-roles` (`multiSelectPicker` sobre `core_Role`, con prefill de contexto via `core_Context` y `onConfirm.action: bulkCreate` contra `core_RoleAssignment`).

---

## 11. RBAC: namespace de capabilities

`capabilities.json` define **28 capabilities**, todas bajo el prefijo `mod/up1-manager/<domain>:<action>`:

```json
{
  "module": "up1-manager",
  "capabilities": [
    { "name": "mod/up1-manager/objectdefinition:view", "riskLevel": "low" },
    { "name": "mod/up1-manager/objectdefinition:create", "riskLevel": "high" },
    { "name": "mod/up1-manager/objectdefinition:edit", "riskLevel": "high" },
    { "name": "mod/up1-manager/objectdefinition:delete", "riskLevel": "high" },
    { "name": "mod/up1-manager/fielddefinition:view", "riskLevel": "low" },
    { "name": "mod/up1-manager/fielddefinition:create", "riskLevel": "high" },
    { "name": "mod/up1-manager/n8nworkflow:view", "riskLevel": "low" },
    { "name": "mod/up1-manager/n8nworkflow:create", "riskLevel": "medium" },
    { "name": "mod/up1-manager/flow:start", "riskLevel": "medium" },
    { "name": "mod/up1-manager/report:view", "riskLevel": "low" },
    { "name": "mod/up1-manager/report:delete", "riskLevel": "high" },
    { "name": "mod/up1-manager/config:view", "riskLevel": "low" },
    { "name": "mod/up1-manager/config:edit", "riskLevel": "high" }
  ]
}
```

(lista abreviada; 28 capabilities cubren 8 dominios: `objectdefinition`, `fielddefinition`, `n8nworkflow`, `flow`, `report`, `reporttemplate`, `reporttestdata`, `config`).

**Patrones a notar:**

- Separacion view/create/edit/delete consistente por dominio, con `riskLevel` creciente (view=low, create/edit=medium o high segun impacto, delete=high).
- `report:configure_layout` y `report:clone` son acciones intermedias entre view y edit/delete, para personalizacion sin permitir borrado.
- `reporttestdata:*` es un dominio separado para datos de prueba de reportes, no para reportes reales.

**Regla dura del CLAUDE.md del repo up1**: "New layouts and components must not use legacy names such as `objectdefinition:view`, `flow:start`, or `report:view`" referido a nombres **sin** el prefijo `mod/up1-manager/`. El README del mod aclara que nombres legacy de capability pueden seguir existiendo en bases de datos antiguas durante la transicion, pero todo layout o componente nuevo debe usar exclusivamente el namespace `mod/up1-manager/...`.

**Dato de ventana 2026-08-03..2026-08-17 (43 commits)**: `capabilities.json` no tuvo ningun cambio en esta ventana (0 commits sobre el archivo, conteo de capabilities estable en 28). Tanto el hub de roles (UPONE-1503, seccion 15bis) como el resto de features del periodo reusaron capabilities de objeto ya existentes (`up1_suite_app_role:*`, `core_Role:*`, etc.); la convencion `mod/up1-manager/<dominio>:<accion>` sigue vigente pero no se ejercito con una capability nueva.

Para el modelo de datos de roles y capabilities (`core_Role`, `core_Capability`, `core_RoleCapability`, `core_RoleAssignment`, jerarquia objeto/campo), ver `specs/up1/features/rbac.md`.

---

## 12. RBAC de objeto: guardas de autorizacion y auditoria (UPONE-1354, SEC-01, UPONE-1417)

Las mutations que administran las asignaciones de rol/capacidad **por objeto** (`logic/objectRoles.resolver.js`) tuvieron dos rondas de correcciones en esta ventana.

**SEC-01 (UPONE-1354, commit `d795773`): falta de guarda de autorizacion.** `getObjectRoleCapabilities` (query) y `manageObjectRoles` (mutation) no tenian ninguna verificacion de autorizacion: cualquier caller autenticado podia leer o reescribir las asignaciones de rol/capacidad de cualquier objeto del sistema. Se envolvieron con los helpers de `services/auth/withAuth.js`:

```js
// logic/objectRoles.resolver.js (estado actual)
getObjectRoleCapabilities: requireCapability(
  'mod/up1-manager/objectdefinition:view',
  async (_, { objectName }, { prisma }) => { /* ... */ }
),

manageObjectRoles: withAuth(
  ['mod/up1-manager/objectdefinition:create', 'mod/up1-manager/objectdefinition:edit'],
  async (_, { objectName, assignments }, context) => { /* ... */ }
)
```

Este es un endurecimiento de contrato observable: llamadas que antes tenian exito sin ningun capability ahora fallan si el caller no tiene `objectdefinition:view` (lectura) o `objectdefinition:create`/`edit` (escritura).

**Auditoria RBAC_ROLE_CHANGE (UPONE-1417, commit `84e0311`).** Tras persistir el nuevo set de asignaciones, `manageObjectRoles` registra un evento de auditoria via `logSchemaChange` (`services/auditService.js`), con `changeType: CHANGE_TYPES.RBAC_ROLE_CHANGE` y `entityType: ENTITY_TYPES.SECURITY`, capturando actor, objeto afectado y el detalle completo de las asignaciones nuevas. `logSchemaChange` traga sus propios errores por diseno (no puede romper la mutation principal si falla el log de auditoria), documentado inline en el resolver.

**Reconciliacion de roles de app: diff en vez de delete+recreate (UPONE-1354, commit `9c81510`).** Por separado, `manageAppRoles` (`logic/appRoles.resolver.js`, sobre `up1_suite_app_role`) hacia un delete-and-recreate completo de las filas de asignacion al reconciliar el set de roles de una app, lo que destruia el mapeo `modRoleId` (rol interno del mod, ver seccion 13) de las filas que de todas formas se mantenian. Se cambio a un diff contra las filas existentes: `deleteMany` solo de las que ya no aplican (`roleId: { notIn: desiredRoleIds }`), `create` solo de las nuevas, dejando intactas (y con su `modRoleId`) las que no cambian. Cubierto por `tests/appRoles.resolver.test.ts`.

**Segundo fix de seguridad real en `manageAppRoles`, sin verificacion previa (PR UPONE-1504, commit `49623ef`).** Independiente de SEC-01 (que cerro el gate de `objectRoles.resolver.js`), `manageAppRoles` seguia sin ninguna guarda de autorizacion: cualquier token de tenant valido podia reasignar los roles de una app. Se envolvieron las 3 operaciones con `withAuth` sobre las capabilities de objeto ya existentes de `up1_suite_app_role`. Ademas, el audit log de la mutation nunca escribia nada: el resolver comprobaba `prisma.dataLog`, un modelo inexistente en el cliente Prisma tenant-scoped, asi que la rama de auditoria era codigo muerto y el tenant tenia cero filas `APP_ROLES_UPDATED`. Corregido a `prisma.core_DataLog`. De paso, la comparacion de roles paso a ser por set (un reorden o un nombre repetido ya no cuenta como cambio) y un fallo de escritura de auditoria pasa a loguear en `warn` en vez de `error` (no bloquea la reconciliacion). Tests de este archivo pasaron de 2 a 8.

**Patron de hardening emergente en ambos resolvers de esta ventana**: validacion de argumentos con zod `.strict()` via el helper `withValidation` (`logic/appRoles.schema.js:26`, `logic/objectRoles.schema.js:26,29`), ubicada FUERA de la cadena de auth y logging para rechazar un input mal formado antes de tocar autorizacion o persistencia. Commits `71c540a`/`1c636c2`.

---

## 13. Asignacion de roles internos por app: row action scoped por parentId (UPONE-1353)

Feature completa de UX para mapear **roles internos del mod** (definidos en codigo, `mods/<mod>/roles/*.json`) a **roles institucionales** (`core_Role`), commits `90b4eac..8f75eb8`.

**Flujo final**: desde `app-list.json`, la row action "Roles" (`id: app-role-mappings`, icono `bi-person-badge`) abre un modal `RecordList` sobre `up1_suite_app_role` (`targetLayoutId: app-role-mappings-list`), scoped a la app de la fila via `{{parentId}}`. Desde ahi se crean/editan mapeos con `app-role-mapping-create.json` / `app-role-mapping-edit.json`, cuyo formulario tiene un campo `appId` (heredado del padre) y un selector `modRoleId` (rol interno) cuyas opciones se filtran por `appId`: el selector de rol interno esta scoped al padre desde el que se abrio, no lista roles internos de otras apps.

```json
// app-list.json (extracto)
{
  "id": "app-role-mappings",
  "label": "Roles",
  "icon": "bi-person-badge",
  "type": "modal",
  "targetLayoutId": "app-role-mappings-list",
  "targetObjectName": "up1_suite_app_role",
  "targetLayoutType": "RecordList",
  "modalTitle": "[record.label] - Asignación de roles",
  "requiredCapability": "up1_suite_app_role:view"
}
```

**Camino recorrido hasta llegar a esto** (commits sucesivos del ticket): primero se construyeron los layouts nuevos de mapeo; luego se descartaron los layouts legacy "internal role package" (`modrole-view`, `modrole-capabilities-list`) via el seed `seed/remove-internal-role-package-layouts.js`, que borra esas filas de `up1_layen_layout` (y sus roles asociados) en cada tenant: retiro de **dato de layout**, no de schema; se elimino el campo legado del editor de app; se escopeo el selector de rol interno por `appId` del padre; y finalmente se saco el mapeo de roles del tab de edicion de `app-edit.json` hacia esta row action independiente, eliminando un boton "Guardar" deshabilitado y confuso que quedaba en ese tab cuando no habia nada que guardar directamente ahi.

**Decision de diseno a notar**: mapeo N:M expuesto como row action independiente scoped por `parentId`, en vez de tab embebido en el editor del padre, cuando el editor padre no necesita persistir esa relacion directamente en su propio submit. Reutilizable para relaciones N:M similares dentro del mod. Cubierto por `tests/internal-role-package-layouts.test.ts`.

---

## 14. CapabilityPatternEditor para cuentas de servicio (sin ticket Jira)

Cambio sustantivo sin ticket asociado (commits `4813373`, `dca4d21`, `ad4b7f3`), en los layouts de `core_ServiceAccount`.

**Antes**: el campo `allowedOps` de una cuenta de servicio (patrones tipo `core_User:create` que determinan que operaciones puede ejecutar el token) era un input de texto libre: el administrador tipeaba a mano el patron `objeto:accion`, sin validacion contra capabilities reales ni autocompletado.

**Ahora**: `allowedOps` usa el componente `CapabilityPatternEditor` (`modsComponents/CapabilityPatternEditor/`), registrado en el layout como `type: "capability-pattern-editor"` con `sourceObject: "core_Capability"` y `searchField: "name"`:

```json
// serviceaccount-create.json (extracto, estado actual)
"allowedOps": {
  "type": "capability-pattern-editor",
  "label": "Allowed Ops",
  "labelKey": "capabilityPatternEditor.title",
  "rules": ["required"],
  "sourceObject": "core_Capability",
  "searchField": "name",
  "columns": 12
}
```

El componente busca `core_Capability` en vivo y arma los patrones wildcard objeto+accion desde definiciones reales de objeto, en vez de depender de que el administrador conozca de memoria el vocabulario de capabilities. `serviceaccount-list.json`/`serviceaccount-view.json` muestran `allowedOps` como chips de solo lectura.

**Bug de contrato corregido en el mismo lote (commit `ad4b7f3`)**: el backend habia eliminado el campo `allowedTenants` de `core_ServiceAccount` (commit de object-manager `b09498a3`), pero los layouts de service account seguian referenciandolo, lo que rompia la mutation de creacion. Se removio el campo de los layouts. Confirmado en codigo: `serviceaccount-create/view/list.json` ya no referencian `allowedTenants`.

**Riesgo a notar** (no resuelto): este tipo de drift, campo removido en backend pero aun referenciado en layout JSON, no tiene deteccion automatica; solo se detecta cuando la mutation falla en runtime.

---

## 15bis. Hub de roles con dos tabs y detalle de 5 tabs (UPONE-1503)

Reestructuracion completa de la superficie de roles, con dos capas de navegacion nuevas.

`role-hub.json` (`RecordDetail` de solo lectura sobre `core_Role`, `breadcrumbParent: core_User`, sin entrada de navegacion propia) agrupa 2 tabs: "Institutional roles" (`record-list` sobre `core_Role` con `role-list`) e "Internal roles" (`record-list` sobre `core_ModRole` con `modrole-list`). Se llega a el desde el detalle de un usuario, no desde el navbar. Fuente: `config/layouts/role-hub.json:14-27`.

El detalle de un rol institucional (`role-view.json`) tiene 5 tabs operables: General, Capabilities, Internal Roles, Contexts, Users. Fuente: `config/layouts/role-view.json` (labels de tabs).

**Asignacion cruzada usuario ↔ rol**: el tab "Users" del detalle de rol permite agregar/quitar usuarios asignados; en paralelo, `core_user_admin_list.json` (seccion 10) ya tenia una row action "assign-roles". La feature agrega el camino inverso completo: crear un rol con un usuario ya asignado en el mismo wizard, y asignar un rol desde el detalle del usuario pidiendo el contexto (`core_Context`) en el momento.

Es 100% capa de layout y JSON: no hay resolver nuevo (los commits de esta serie tocan solo `config/layouts/*.json` y `lang/*`).

## 15. Actividad reciente

74 commits en total en el repo (todo el historial), desde 2026-05-16 (el repo es reciente). Hitos principales, del mas antiguo al mas reciente:

1. **Consolidacion inicial** (`9c610f7`, `3643f53`, `f2da0c8`, `b417e67`): fusion de Object Manager Editor + Report Builder + Flow Viewer en un unico mod, sync a todos los tenants.
2. **UPONE-1286** (PR #1, `2e79808`): integracion de tickets AP (base de reportes).
3. **UPONE-1287** (PR #2, `1aaff51`, `ea255d3`): migracion de features del OM Editor original.
4. **AP-04, transiciones de enum** (`eb0bef4`, `1cbdf83`, `51da7f9`): editor visual de transiciones, solo para campos enum custom (seccion 6).
5. **UPONE-909, creacion de usuarios admin** (PR #4, `c1fa0f4`, `249df03`): formulario de alta de usuarios restringido a Admin (seccion 10).
6. **UPONE-1282, visor de DataLog** (`9c66ca0`, `aac3c48`): tab "Change History" en `objectdefinition-view` (seccion 5).
7. **PR #5, feature/plat-13c** y **PR #6, feat/AP-VUEFORM** (`af0b310`, `d23529b`, incluye `4360514`, `f450111`, `e7e1ebd`, `5cd51be`, `bd9b7c7`, `5c3c969`, `d23529b`): sistema de ConfigPanel completo, integracion, i18n, ocultamiento condicional, rename final a "Configuraciones del sistema" (seccion 8).
8. **PR #7, feature/config-system** (`3bddec5`): merge final del config system.
9. **Migracion i18n a i18next** (PR #8, `c42f5ae`): tres commits de migracion en fases (`60fcf36` Fase 3, `0f358c5` Fase 7, `4d1404e`), mas `4490ec3` (fix de claves y referencias para evitar confusion con objetos).
10. **UPONE-1290/MGR-05, editor visual de JSON Schema** (PR #9, `a27fae8`, commit `aaa1e3e`): mergeado a `develop` (seccion 7).
11. **Fix allowedTenants** (PR #10, `67e254c`) y **CapabilityPatternEditor** (PR #12, `754c4e6`, commits `4813373`/`dca4d21`/`ad4b7f3`): reemplazo del input de texto libre de `allowedOps` en cuentas de servicio, sin ticket Jira (seccion 14).
12. **UPONE-1377, Reports/ReportTemplate a RecordList generico** (PR #11, `05cd49f`, `47484fd`): migracion de listas de reportes + fix de modo read-only en edicion con `instanceId` (seccion 9).
13. **UPONE-1353, roles internos por app como row action** (PR #13, `726e907`, commits `8f75eb8`..`90b4eac`): retiro de layouts `modrole-*` via seed, escopeo por `appId`, mapeo movido a row action (seccion 13).
14. **UPONE-1354/SEC-01, guardas de autorizacion en RBAC de objeto** (PR #14 `1037690`, PR #16 `3238799`; commits `d795773`, `9c81510`): auth guard en `getObjectRoleCapabilities`/`manageObjectRoles`, diff en `manageAppRoles` que preserva `modRoleId` (seccion 12).
15. **UPONE-1417, auditoria RBAC_ROLE_CHANGE** (PR #17, `c074820`, commit `84e0311`): `manageObjectRoles` ahora audita cada reasignacion de rol/capability (seccion 12).
16. **UPONE-1386, vocabulario de fieldType desde backend** (`5d32270`) y **UPONE-1497, fix de casing "Formula"** (PR #19, `8482e0e`, commit `bbd7cdc`): seccion 4.
17. **PR #20, `fix/storybook-issues-model`**: mantenimiento de Storybook, sin cambios de producto.
18. **PR #21, `feature/UPONE-1425`** (`80a4c4a`): validacion zod `.strict()` en `manageObjectRoles`/`manageAppRoles` (seccion 12).
19. **UPONE-1504, restructuracion de apps** (PR #22, `528599c`): ConfigPanel embebido como tab, restructuracion de lista/detalle de apps, y el segundo fix de seguridad de `manageAppRoles` (auth guard + `prisma.core_DataLog`, commit `49623ef`, seccion 12).
20. **PR #24, `fix/elements-layouts`** (`1ab12c2`): consistencia de `CapabilityPatternEditor`, i18n del buscador de RecordList, revision de metadata.
21. **MGR-10, Report Builder** (PR #26, `18034d7`; commits `09dc1a5`..`02496ff`): mejoras de uso, breadcrumbs, plantillas en modal XL, restriccion de rol Admin en `reporttemplate-*` (seccion 9).
22. **UPONE-1503, hub de roles** (PR #27, `b574ddf`): hub Institutional/Internal roles, detalle de rol con 5 tabs, asignacion cruzada usuario-rol (seccion 15bis).

El commit mas reciente en `develop` del mod al momento de esta revision es `b574ddf` ("Merged in feat/UPONE-1503").

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: guia de ejemplo basada en el mod up1-manager (repo standalone, branch develop) |
| 2026-08-03 | Actualizacion contra codigo (develop, commit `8482e0e`): UX de roles internos por app como row action con retiro de `modrole-*` (UPONE-1353); `CapabilityPatternEditor` para service accounts (sin ticket); fix SEC-01 (auth guard en RBAC de objeto) y preservacion de `modRoleId` en diff de `manageAppRoles` (UPONE-1354); auditoria RBAC_ROLE_CHANGE (UPONE-1417); migracion de Reports/ReportTemplate a `RecordList` generico + fix de modo read-only (UPONE-1377); vocabulario de `fieldType` desde backend + fix de casing (UPONE-1386/1497); ademas se corrigio drift preexistente (resolvers propios de RBAC, ver seccion 1) y se confirmo el merge de UPONE-1290/MGR-05 a `develop` (seccion 7) |
| 2026-08-17 | Ventana 2026-08-03..2026-08-17 (43 commits): hub de roles institucional/interno + detalle de 5 tabs + asignacion cruzada usuario-rol (UPONE-1503, seccion 15bis); restructuracion de lista/detalle de apps con ConfigPanel embebido (UPONE-1504); MGR-10 (plantillas en modal XL, restriccion a rol Admin, mejoras de uso de Report Builder, seccion 9); fix de seguridad real en `manageAppRoles` (faltaba `requireCapability`, el audit log apuntaba a `prisma.dataLog` inexistente en el cliente tenant-scoped, corregido a `prisma.core_DataLog`, commit `49623ef`); patron de hardening con zod `.strict()` via `withValidation` en `manageAppRoles`/`manageObjectRoles`; confirmado que en toda la ventana no se declaro ninguna capability custom nueva del mod (seccion 11) |
