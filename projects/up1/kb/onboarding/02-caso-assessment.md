# Caso practico: Assessment de suite-front en UP1

Este documento toma el modulo de Assessment de suite-front (matrices de competencias) como ejemplo real para mostrar como sus conceptos se mapean a UP1. Si ya conoces assessment en suite-front, este caso te ayuda a ubicar cada pieza en la arquitectura de mods.

## El modulo en suite-front

Assessment en suite-front permite a coordinadores academicos crear y gestionar **matrices de competencias**: documentos que definen las competencias que un egresado debe alcanzar, organizadas jerarquicamente, con esquemas de niveles de logro y workflow de aprobacion.

### Flujo funcional en suite-front

```
1. Crear matriz → formulario: codigo, nombre, facultades, tipo, planes de estudio
2. Editar matriz → tabs: datos generales + competencias
3. Seleccionar esquema de niveles → tabla de niveles y umbrales
4. Gestionar arbol de competencias → CRUD, jerarquia parent-child, drag-and-drop
5. Workflow → Draft → Review → Published
```

### Stack en suite-front

| Capa | Tecnologia | Donde vive |
|------|-----------|-----------|
| Frontend | AngularJS, Angular Material | `sandbox-front/src/app/improve-front/` |
| Store | AngularJS services | `improve-front/competency_matrix/` |
| API | Express, Sequelize | `sandbox-api/server/api/improve-api/competency_matrix/` |
| DB | MariaDB | 15+ endpoints REST |

### Entidades en suite-front

| Entidad | Campos clave |
|---------|-------------|
| MatrixData | code, name, description, competencyModel, levelSchemeId, typeId, statusId |
| MatrixCompetenciesNode | code, name, desc, isHolistic, id_parent, nmOrder |
| SchemaOption (LevelScheme) | code, name, description, competencyLevels, developmentLevels |
| NodeLevel | code, name, desc, threshold, isActiveLevel |
| NodeLevelCriteria | code, name |
| NodeLevelThresholds | name, min, max, isAccomplished |

### Componentes clave en suite-front

| Componente | Funcion |
|-----------|---------|
| CompetencyGeneralForm | Datos generales + facultades + planes |
| CompetencyMatrixEdit | Editor principal + schema selector |
| CompetencyTreeManager | Arbol drag-and-drop de competencias |
| CompetencyForm | Formulario individual de competencia |
| CompetencyRubric | Rubrica con criterios y niveles |
| MeasurementTypeModal | Seleccion formativa vs holistica |

---

## Como se traduce a UP1

### Mapeo entidad → object JSON

En suite-front hay tablas SQL con Sequelize. En UP1 hay **JSON objects** que generan todo automaticamente:

| suite-front (SQL/Sequelize) | UP1 (JSON object) | Observaciones |
|---|---|---|
| `competency_matrix` | `CaCompetencyMatrix.json` | Campos equivalentes. UP1 agrega `tenantId` automaticamente |
| `competency_matrix_node` | `CaCompetency.json` | Self-reference via `parentId` para jerarquia |
| `level_scheme` | `CaLevelScheme.json` | Entidad independiente con modo QUALITATIVE/QUANTITATIVE |
| `level_scheme_level` | `CaLevel.json` | FK a CaLevelScheme. Orden via campo `order` |
| `level_criteria` | `CaCriteria.json` | FK a CaLevel. Para medicion formativa |
| `level_threshold` | `CaThreshold.json` | FK a CaLevel. Min/max para medicion cuantitativa |
| Pivot matrix↔faculty | `CaMatrixFaculty.json` | PublicId denormalizado (no FK real a Faculty del core) |
| Pivot matrix↔curriculum | `CaMatrixCurriculum.json` | Idem |

**Ejemplo de traduccion — MatrixCompetenciesNode a CaCompetency.json:**

```json
{
  "name": "CaCompetency",
  "label": "Competency",
  "labelPlural": "Competencies",
  "fields": [
    { "name": "code", "type": "String", "required": true },
    { "name": "name", "type": "String", "required": true },
    { "name": "description", "type": "String" },
    { "name": "type", "type": "String", "enum": ["GENERIC", "SPECIFIC", "DISCIPLINARY"] },
    { "name": "isHolistic", "type": "Boolean", "default": false },
    { "name": "weight", "type": "Float" },
    { "name": "order", "type": "Int", "default": 0 },
    { "name": "parentId", "type": "String", "relation": "self" },
    { "name": "caCompetencyMatrixId", "type": "String", "relation": "CaCompetencyMatrix", "required": true }
  ]
}
```

Lo que en suite-front requeria crear tabla SQL + modelo Sequelize + endpoints REST, aqui es un JSON. `npm run codegen` genera: tabla Prisma, types GraphQL, queries/mutations CRUD.

### Mapeo API → GraphQL automatico

| suite-front (REST) | UP1 (GraphQL auto-generado) |
|---|---|
| `GET /api/competency_matrix` | `query { caCompetencyMatrixs { id code name status } }` |
| `POST /api/competency_matrix` | `mutation { createCaCompetencyMatrix(input: {...}) { id } }` |
| `PUT /api/competency_matrix/:id` | `mutation { updateCaCompetencyMatrix(id: "...", input: {...}) { id } }` |
| `DELETE /api/competency_matrix/:id` | `mutation { deleteCaCompetencyMatrix(id: "...") { success } }` |
| `GET /api/competency_matrix/:id/nodes` | `query { caCompetencys(where: { caCompetencyMatrixId: "..." }) { ... } }` |

**No se escribe ningun endpoint**. El CRUD completo viene del codegen. Solo se escriben resolvers para logica que va mas alla del CRUD (ej: workflow transitions).

### Mapeo componentes → layouts JSON + custom elements

| suite-front (componente Angular) | UP1 (layout/element) | Tipo |
|---|---|---|
| CompetencyGeneralForm | `ca-matrix-create.json` | Layout JSON (RecordDetail, mode: create) |
| Lista de matrices | `ca-matrix-list.json` | Layout JSON (RecordList) |
| CompetencyMatrixEdit (vista) | `ca-matrix-view.json` | Layout JSON (RecordDetail, mode: view, con tabs) |
| CompetencyTreeManager | `CompetencyTreeElement.vue` | Custom Vueform element (defineElement) |
| CompetencyRubric | Pendiente | Custom element o layout embebido |
| MeasurementTypeModal | Campo enum en layout | No requiere componente custom |
| Filtros por estado | `ca-matrix-drafts.json`, `ca-matrix-review.json`, `ca-matrix-published.json` | Layouts filtrados (RecordList con filters) |

**Criterio para elegir layout JSON vs custom element:**

| Escenario | Solucion |
|-----------|---------|
| CRUD standard (listado, formulario, detalle con tabs) | Layout JSON |
| Listado con filtros fijos | Layout JSON con `filters` |
| Vista de detalle con sublistas | Layout JSON con `record-list` embebido y `{{parentId}}` |
| Arbol jerarquico con drag-and-drop | Custom Vueform element |
| Grafico, heatmap, widget interactivo | Custom Vueform element |
| Botones de workflow (mutation custom) | Custom Vueform element |

### Mapeo store/service → composable + Apollo

| suite-front | UP1 |
|---|---|
| `competencyMatrixService.getAll()` | `client.query({ query: GET_MATRICES })` via Apollo |
| `competencyMatrixService.create(data)` | `client.mutate({ mutation: CREATE_MATRIX, variables: { input: data } })` |
| Store con estado local | `ref()` / `reactive()` en composable del componente |
| HTTP interceptor para auth | `useTenantApolloClient()` — maneja auth cookies automaticamente |

No hay capa de servicios separada. El componente (o su composable) habla directamente con Apollo GraphQL.

### Mapeo workflow → resolver custom

| suite-front | UP1 |
|---|---|
| Endpoint `PUT /api/competency_matrix/:id/transition` | Mutation `caMatrixTransition(matrixId, targetStatus)` |
| Logica en controller Express | Logica en resolver con `withAuth()` |
| Validaciones en middleware | Validaciones en el resolver antes del `update` |

**Ejemplo — transicion de estado en UP1:**

```javascript
// logic/caMatrixTransition.resolver.js
export const caMatrixTransitionMutation = {
  caMatrixTransition: withAuth(
    ['mod/assessment-matrix:transition_matrix'],
    async (_parent, { matrixId, targetStatus }, context) => {
      const { prisma } = context;
      const matrix = await prisma.caCompetencyMatrix.findUnique({ where: { id: matrixId } });

      // Validaciones de negocio
      if (currentStatus === 'DRAFT' && targetStatus === 'REVIEW') {
        const count = await prisma.caCompetency.count({ where: { caCompetencyMatrixId: matrixId } });
        if (count === 0) throw new Error('Requiere al menos 1 competencia');
      }

      return await prisma.caCompetencyMatrix.update({
        where: { id: matrixId },
        data: { status: targetStatus },
      });
    }
  ),
};
```

### Mapeo permisos

| suite-front | UP1 |
|---|---|
| Permisos en tabla de BD, validados en middleware | Capabilities en `capabilities.json`, validadas con `withAuth()` |
| Roles asignados en admin panel | Roles asignados via RBAC del sistema |
| Visibilidad de botones por rol en frontend | `requiredCapability` en row actions, `roles` en layouts |

### Mapeo i18n

| suite-front | UP1 |
|---|---|
| Archivos JSON en `src/lang/` | Archivos JSON en `mods/{mod}/lang/` |
| `$translate.instant('KEY')` | `$t('KEY')` |
| Un archivo por idioma | Archivo global + archivo por objeto por idioma |
| Traducciones de columnas en el mismo archivo | `lang/es_CL@{Object}.json` con key `column.{field}` |

## Resumen: que cambia y que se mantiene

| Concepto | suite-front | UP1 | Cambio |
|----------|-----------|-----|--------|
| Modelo de datos | SQL + Sequelize | JSON objects + codegen | **Declarativo** — no se escribe schema |
| API | REST endpoints manuales | GraphQL auto-generado | **Zero boilerplate** para CRUD |
| Frontend | Componentes Angular custom | Layouts JSON + custom elements | **Config-driven** para lo standard, codigo para lo complejo |
| Auth | Middleware custom | `withAuth()` + capabilities | **Declarativo** — capabilities en JSON |
| i18n | Archivos planos | 6 niveles de override por tenant/institucion | **Mas granular** |
| Multi-tenant | Separacion por BD o schema | Aislamiento por `tenantId` en app | **Un deploy** para todos |
| Permisos UI | Logica en templates | `requiredCapability` + `visibilityConditions` en JSON | **Declarativo** |
| Workflow | Controller + middleware | Resolver con validaciones | **Mismo patron**, diferente framework |
| Estado de la app | Services + $scope | `ref()` + composables + Apollo cache | **Composition API** |

## Lo que NO existe aun en UP1 (gaps respecto a suite-front)

Estos gaps se identificaron durante la investigacion del TICKET-005:

| Feature de suite-front | Estado en UP1 | Referencia |
|---|---|---|
| Drag-and-drop de competencias en arbol | Funciones preparadas, no conectadas al template | Backlog B2 |
| Traduccion de enums en celdas de listado | RecordList muestra valor raw | BUG-layout-003 |
| Titulo del registro en header de detalle | RecordDetail no tiene headerField | BUG-layout-002 |
| Rubrica completa (criterios + niveles en tabla) | No implementado | Requiere custom element |
| Equivalencias entre competencias | No implementado | Requiere objects + layouts nuevos |
| Scopes de competencias | No implementado | Campo adicional en CaCompetency |
| IA: comparador de planes, simulador | No implementado | Feature avanzada, fuera del POC |

---

Anterior: [01 — Desarrollar mods](01-desarrollar-mods.md)
