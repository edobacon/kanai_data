---
id: DOC-kb-onboarding-06-configuracion-por-cliente
project: up1
type: doc
---

# Configuracion de mods por cliente

Un mod en UP1 se escribe una sola vez pero se activa, limita y personaliza por cliente sin tocar su codigo. Esta guia documenta las capas de filtrado y como validar cada una.

## Premisa

UP1 es multi-tenant desde el diseno: un solo despliegue sirve a multiples instituciones. La configuracion por cliente es **declarativa** — ocurre en JSON (`app.json`, layouts, objects extended) y en asignaciones RBAC en BD. El codigo del mod nunca hace `if (tenant === "UPU")`.

**Regla de oro** ([creation-guide.md](../mods/creation-guide.md) §antipatrones):

```
❌  if (context.tenantId === 'UPU') { ... }
✅  tenants: ["UPU"] en config del mod/layout, o capability asignada solo a UPU
```

## Las seis capas de configuracion por cliente

```
1. Visibilidad del mod      ──► config/app.json          (tenants / roles)
2. Visibilidad por vista    ──► config/layouts/*.json    (tenants / roles)
3. Modelo extendido         ──► objects/business/Extended/ext__<TENANT>__*.json
4. Objects tenant-only      ──► objects/tenants/<TENANT>/Base/*.json
5. Permisos granulares      ──► capabilities.json + asignacion RBAC por tenant
6. Datos iniciales          ──► seed/*.js iterando con tenantManager
```

Cada capa es independiente — se pueden combinar libremente. Un mod puede usar solo la capa 1 (on/off por cliente) o las seis a la vez (feature rica y personalizada).

## Capa 1 — Visibilidad del mod (on/off por cliente)

Decide en que tenants aparece el mod en el sidebar de la Suite.

### Como hacer

`mods/{mod}/config/app.json`:

```json
{
  "name": "retention",
  "label": "Retention",
  "icon": "bi-person-check",
  "order": 50,
  "tenants": ["UPU", "DEMO"],
  "roles": ["Admin", "Coordinador"],
  "defaultObjects": [
    { "objectName": "RetentionCase", "layoutId": "retention_list" }
  ]
}
```

| Valor de `tenants` | Efecto |
|--------------------|--------|
| `["UPU"]` | Solo UPU ve el mod |
| `["UPU", "DEMO"]` | UPU y DEMO ven el mod |
| `["*"]` | Todos los tenants |
| Campo omitido | Todos los tenants |

El campo `roles` anade un filtro adicional: solo usuarios con esos roles en ese tenant veran el sidebar.

### Como validar

```bash
npm run sync
```

Luego en la UI:

```
Login como usuario del tenant UPU     →  mod visible en sidebar ✓
Login como usuario del tenant OTRO    →  mod NO aparece en sidebar ✓
```

Tambien se puede inspeccionar la tabla `up1_layen_application` en BD: las filas tienen columna `tenantId` y solo existen para los tenants declarados.

**Check rapido** con GraphQL playground:

```graphql
query { applications { name tenantId } }
```

El resultado debe listar la app solo para los tenants esperados.

## Capa 2 — Visibilidad por vista (layouts selectivos)

Dentro del mismo mod, cada layout puede tener su propio filtro por tenant y rol. Esto permite que dos clientes compartan un mod pero vean variantes distintas.

### Como hacer

**Variante generica** — `retention_list.json`:

```json
{
  "id": "retention_list",
  "objectName": "RetentionCase",
  "layoutType": "RecordList",
  "tenants": ["*"],
  "columns": [
    { "key": "code", "label": "Codigo" },
    { "key": "studentName", "label": "Estudiante" },
    { "key": "status", "label": "Estado" }
  ]
}
```

**Variante solo para UPU** con columnas adicionales — `retention_list_upu.json`:

```json
{
  "id": "retention_list_upu",
  "objectName": "RetentionCase",
  "layoutType": "RecordList",
  "tenants": ["UPU"],
  "roles": ["Admin"],
  "columns": [
    { "key": "code", "label": "Codigo" },
    { "key": "studentName", "label": "Estudiante" },
    { "key": "riskScore", "label": "Score UPU" },
    { "key": "advisorName", "label": "Tutor" }
  ]
}
```

Luego `config/app.json` decide cual expone cada tenant:

```json
{
  "defaultObjects": [
    { "objectName": "RetentionCase", "layoutId": "retention_list", "tenants": ["DEMO"] },
    { "objectName": "RetentionCase", "layoutId": "retention_list_upu", "tenants": ["UPU"] }
  ]
}
```

### Como validar

Navegar directamente a la URL del layout:

```
/UPU/RetentionCase/RecordList/retention_list_upu     →  carga ✓
/DEMO/RetentionCase/RecordList/retention_list_upu    →  403/no visible ✓
/DEMO/RetentionCase/RecordList/retention_list        →  carga ✓
```

Inspeccionar `up1_layen_layout`: cada fila tiene `tenantId`. Un layout declarado con `tenants: ["UPU"]` solo genera fila en el tenant UPU tras `npm run sync`.

## Capa 3 — Modelo extendido (campos solo de un cliente)

Agregar columnas a un object core (ej. `Person`) que solo existen para un cliente, sin tocar el Base.

### Como hacer

`objects/business/Extended/ext__UPU__person.json` — o si el mod lo define, `mods/{mod}/objects/ext__UPU__person.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ext__UPU__person",
  "type": "object",
  "properties": {
    "scholarshipType": {
      "type": "string",
      "enum": ["NONE", "PARTIAL", "FULL"],
      "title": "Tipo de Beca"
    },
    "riskScore": { "type": "number", "title": "Score de Riesgo" }
  }
}
```

El codegen crea una tabla separada `ext__UPU__person` con FK 1:1 a `Person`. El tipo GraphQL de `Person` **solo en el tenant UPU** incluye esos campos. En otros tenants la columna no existe.

**Naming**: `ext__<CLIENT_CODE>__<objectName>.json` — prefijo fijo, codigo del tenant en mayusculas, nombre del object en lowercase. ([objects-map.md](../mods/objects-map.md) §7).

### Como validar

```bash
npm run sync
npm run codegen --workspace=@uplanner/object-management-backend
npm run tenant:migrate --workspace=@uplanner/object-management-backend
```

Verificaciones:

1. **Prisma Studio en UPU** — tabla `ext__UPU__person` existe.
2. **Prisma Studio en otro tenant** — la tabla NO existe.
3. **GraphQL playground apuntando a UPU**:

   ```graphql
   query { person(id: "...") { firstName scholarshipType riskScore } }
   ```

   Debe resolver sin errores.

4. **Mismo query apuntando a otro tenant** → error de campo desconocido.

## Capa 4 — Objects tenant-only (entidades solo de un cliente)

Para entidades que no aplican a todos los tenants. Ej: `ResearchProject` solo existe en UPU.

### Como hacer

```
objects/tenants/UPU/Base/ResearchProject.json
```

Mismo formato que un object Base normal — la ubicacion bajo `tenants/{TENANT}/Base/` es lo que restringe el scope.

### Como validar

- Prisma Studio en UPU → tabla `ResearchProject` existe.
- En otro tenant → no existe.
- Un layout que la referencie (`objectName: "ResearchProject"`) solo debe declararse con `tenants: ["UPU"]`; si se declara con `["*"]`, el sync falla o la UI rompe en tenants donde la tabla no existe.

**Diferencia con Extended**: Extended agrega campos a algo que ya existe; tenant-only es una entidad nueva exclusiva del tenant.

## Capa 5 — Permisos granulares (capabilities + asignacion RBAC)

La forma mas fina de configurar. El mod define capabilities; el administrador de cada tenant las asigna a los roles que quiera.

### Como hacer

**En el mod** — `capabilities.json`:

```json
{
  "module": "retention",
  "version": "1.0.0",
  "capabilities": [
    { "name": "mod/retention:view_dashboard", "description": "Ver dashboard", "riskLevel": "low" },
    { "name": "mod/retention:create_intervention", "description": "Crear intervencion", "riskLevel": "medium" },
    { "name": "mod/retention:close_case", "description": "Cerrar caso", "riskLevel": "high" }
  ]
}
```

**En resolvers** — proteger con `withAuth`:

```javascript
export const retentionMutation = {
  closeCase: withAuth(
    ['mod/retention:close_case'],
    async (parent, args, context) => {
      return context.prisma.retentionCase.update({
        where: { id: args.id, tenantId: context.tenantId },
        data: { status: 'CLOSED' }
      });
    }
  ),
};
```

**En layouts** — proteger row actions:

```json
{
  "rowActions": [
    {
      "id": "close",
      "label": "Cerrar caso",
      "type": "modal",
      "targetLayoutId": "retention_close_modal",
      "requiredCapability": "mod/retention:close_case"
    }
  ]
}
```

**Asignacion por cliente** — ocurre en BD tras el sync: cada tenant puede mapear estas capabilities a roles distintos. Por defecto, los roles `Admin`, `Consultor` y `Colaborador` las reciben con `allow` automaticamente. Para ajustar, se edita via Prisma Studio o admin UI la tabla `core_RoleCapability` del tenant.

### Como validar

**Resolver**:

```graphql
# Login como usuario sin la capability
mutation { closeCase(id: "...") { id } }
# → Error: "No autorizado"

# Login como usuario con la capability
mutation { closeCase(id: "...") { id } }
# → Success
```

**UI**:

- Usuario sin `mod/retention:close_case` → boton "Cerrar caso" no aparece en el menu de la fila.
- Usuario con la capability → boton visible.

**Test automatico** (vitest en `tests/unit/resolvers/`):

```javascript
it('rechaza usuarios sin close_case', async () => {
  const context = { user: { capabilities: [] }, tenantId: 'UPU' };
  await expect(closeCase(null, { id: '1' }, context))
    .rejects.toThrow(/autorizado/i);
});

it('permite con capability', async () => {
  const context = { user: { capabilities: ['mod/retention:close_case'] }, tenantId: 'UPU' };
  const result = await closeCase(null, { id: '1' }, context);
  expect(result.status).toBe('CLOSED');
});
```

## Capa 6 — Datos iniciales distintos por cliente

Cada tenant puede recibir seeds distintos: catalogos, configuraciones, registros demo.

### Como hacer

`mods/{mod}/seed/catalogs.js`:

```javascript
import { tenantManager } from '@uplanner/object-management-backend/scripts/tenantManager.js';

const catalogsByTenant = {
  UPU: [
    { code: 'ACAD', name: 'Academico' },
    { code: 'FIN', name: 'Financiero' },
    { code: 'PSY', name: 'Psicosocial' }
  ],
  DEMO: [
    { code: 'GENERAL', name: 'General' }
  ]
};

export default async function seed() {
  for (const tenantId of await tenantManager.listTenants()) {
    const prisma = await tenantManager.getClient(tenantId);
    const catalogs = catalogsByTenant[tenantId] ?? [];
    for (const c of catalogs) {
      await prisma.retentionCategory.upsert({
        where: { code_tenantId: { code: c.code, tenantId } },
        update: { name: c.name },
        create: { ...c, tenantId }
      });
    }
  }
}
```

Reglas clave:
- Iterar con `tenantManager.listTenants()` — nunca hardcodear la lista
- Upsert para ser idempotente (se puede reejecutar sin duplicar)
- Prefijar con `_` el archivo si NO debe correr en el sync automatico

### Como validar

```bash
npm run seed --workspace=@uplanner/object-management-backend
```

Luego:

```bash
# Contar registros en cada tenant
npm run tenant:studio --workspace=@uplanner/object-management-backend
# → abrir Prisma Studio, cambiar entre tenants, inspeccionar RetentionCategory
```

UPU debe tener 3 categorias; DEMO, 1. Re-ejecutar el seed no debe duplicar filas.

## Caso end-to-end: mod "retention" para UPU y DEMO

Un mismo mod habilitado para dos clientes con comportamiento distinto.

### Decisiones

| Aspecto | UPU | DEMO |
|---------|-----|------|
| Mod visible en sidebar | Si | Si |
| Layout principal | `retention_list_upu` (7 columnas) | `retention_list` (4 columnas) |
| Campos extra en `Person` | `riskScore`, `scholarshipType` | — |
| Capability "cerrar caso" | Solo rol `Coordinador` | Rol `Admin` y `Coordinador` |
| Categorias semilla | ACAD, FIN, PSY | GENERAL |

### Archivos del mod

```
mods/retention/
├── config/
│   ├── app.json                      ← tenants: ["UPU", "DEMO"]
│   └── layouts/
│       ├── retention_list.json        ← tenants: ["DEMO"]
│       ├── retention_list_upu.json    ← tenants: ["UPU"]
│       ├── retention_view.json        ← tenants: ["*"]
│       └── retention_close_modal.json
├── objects/
│   ├── RetentionCase.json             ← object del mod
│   ├── RetentionCategory.json
│   └── ext__UPU__person.json          ← campos extra solo UPU
├── capabilities.json
├── logic/
│   └── closeCase.resolver.js
└── seed/
    └── catalogs.js
```

### Pasos de habilitacion

```bash
npm run sync
npm run codegen --workspace=@uplanner/object-management-backend
npm run tenant:migrate --workspace=@uplanner/object-management-backend
npm run seed --workspace=@uplanner/object-management-backend
```

### Matriz de validacion

| Verificacion | Comando / accion | Resultado esperado |
|--------------|-----------------|-------------------|
| Mod aparece en sidebar UPU | Login UPU | Tab "Retention" visible |
| Mod aparece en sidebar DEMO | Login DEMO | Tab "Retention" visible |
| Mod oculto en otro tenant | Login OTRO | Tab "Retention" ausente |
| Layout UPU carga | `/UPU/RetentionCase/RecordList/retention_list_upu` | Tabla 7 columnas |
| Layout DEMO carga | `/DEMO/RetentionCase/RecordList/retention_list` | Tabla 4 columnas |
| Layout cruzado falla | `/DEMO/RetentionCase/RecordList/retention_list_upu` | Error / no accesible |
| Extended en UPU | GraphQL UPU: `person { riskScore }` | Resuelve |
| Extended ausente en DEMO | GraphQL DEMO: `person { riskScore }` | Error "field unknown" |
| Cerrar caso con permiso | Coordinador UPU → boton "Cerrar" | Visible, ejecuta |
| Cerrar caso sin permiso | Docente UPU → boton "Cerrar" | No visible |
| Seeds por tenant | Prisma Studio | UPU: 3 categorias. DEMO: 1 |

Si las 11 filas pasan, la configuracion por cliente del mod esta validada end-to-end.

## Anti-patrones

### Anti-patron 1: hardcodear tenant en codigo

```javascript
// ❌
if (context.tenantId === 'UPU') {
  return prisma.retentionCase.findMany({ where: { riskScore: { gte: 80 } } });
}
```

Problema: rompe la neutralidad multi-tenant, exige redeploy para agregar clientes, no es testeable declarativamente.

**Solucion**: usar Extended objects (campo `riskScore` solo en UPU), o una capability que UPU asigne y otros no.

### Anti-patron 2: un object base con campos que solo usa un cliente

```json
// ❌ Person.json en business/Base/
{
  "properties": {
    "firstName": { "type": "string" },
    "upuScholarshipType": { "type": "string" },
    "unabInternalCode": { "type": "string" }
  }
}
```

Problema: contamina el modelo global, obliga a todos los tenants a tener columnas que no usan, dificulta cambios posteriores.

**Solucion**: `ext__UPU__person.json` y `ext__UNAB__person.json` separados.

### Anti-patron 3: filtrar tenants via query en vez de `tenants: [...]`

```javascript
// ❌ resolver
if (!['UPU', 'DEMO'].includes(context.tenantId)) throw new Error('No disponible');
```

**Solucion**: `tenants: ["UPU", "DEMO"]` en `app.json` — la Suite ni siquiera llama al resolver para los otros tenants.

### Anti-patron 4: duplicar el mod por cliente

```
❌ mods/retention-upu/
❌ mods/retention-demo/
```

Problema: bugs en uno deben reportarse al otro, imposible compartir mejoras.

**Solucion**: un solo mod, layouts y extended distintos.

### Anti-patron 5: olvidar `tenantId` en el resolver

```javascript
// ❌
return prisma.retentionCase.findMany({ where: { status: args.status } });
```

Aunque el mod este restringido a un tenant, el resolver puede ser invocado desde otro por un cliente malicioso. **Siempre** filtrar: `where: { tenantId: context.tenantId, ... }`. Es la regla 14 de deckard: el aislamiento multi-tenant se aplica en el resolver, no solo en config.

## Checklist de habilitacion por cliente

Antes de marcar la configuracion como lista:

```
[ ] app.json declara el array tenants correcto
[ ] Cada layout declara tenants y roles acordes
[ ] Extended objects siguen naming ext__<TENANT>__<obj>.json
[ ] Objects tenant-only solo se referencian desde layouts con ese tenant
[ ] capabilities.json enumera todos los permisos que usa el mod
[ ] Cada resolver sensible usa withAuth + filtra por context.tenantId
[ ] Cada rowAction destructiva usa requiredCapability
[ ] Seeds iteran con tenantManager, nunca hardcodean tenant IDs
[ ] Ejecute sync + codegen + tenant:migrate + seed
[ ] Matriz de validacion pasada: visibilidad, layouts, extended, permisos, seeds
[ ] Tests unitarios cubren: usuario con/sin capability, tenant correcto/incorrecto
```

## Resumen

- La configuracion por cliente es **declarativa**, no imperativa.
- Seis capas independientes: visibilidad del mod, visibilidad de vistas, modelo extendido, objects tenant-only, permisos, seeds.
- Cada capa tiene un metodo claro de validacion (URL, GraphQL query, Prisma Studio, test unitario).
- Un solo mod sirve a N clientes; las variantes viven en JSON, nunca en `if` del codigo.
- El aislamiento multi-tenant se defiende en dos lugares: config (que tenants ven el mod) y resolver (`tenantId` en el where).

---

Anterior: [05 — Del modelo a las vistas](05-del-modelo-a-las-vistas.md)
