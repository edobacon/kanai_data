---
id: SPEC-mods-022
project: up1
type: doc
module: mods
tags:
  - self-check
  - verificacion
  - sync
  - codegen
  - troubleshooting
---

# Validacion y self-check

Flujos que un LLM debe ejecutar para verificar su propio trabajo.

## Flujo universal (despues de CUALQUIER cambio)

```
1. npm run sync
   → Si falla: ver Troubleshooting abajo
2. Segun tipo de cambio:
   objects/         → npm run codegen + npm run tenant:migrate + reiniciar OM
   logic/           → reiniciar Object Manager
   modsComponents/  → hot reload automatico
   config/layouts/  → recarga automatica
   lang/            → reiniciar Suite
   css/             → hard refresh browser
3. npm run check-mods
4. npm test --workspace=@uplanner/{mod}
5. Verificar en localhost:3000/{TENANT}
```

## Checklist por tipo de cambio

### Objeto nuevo/modificado
- [ ] JSON valido (no errores de sintaxis)
- [ ] `$schema`, `title` (PascalCase), `metadata` (label, labelPlural, gender) presentes
- [ ] `npm run codegen` sin errores
- [ ] `npm run tenant:migrate` sin errores
- [ ] `listInstances(objectName: "X")` retorna array (vacio o con datos)
- [ ] `getObjectFields(objectName: "X")` muestra todos los campos
- [ ] Si tiene FK: `createInstance` con FK invalida retorna error de constraint

### Resolver nuevo
- [ ] Export contiene "Query" o "Mutation" en el nombre
- [ ] Schema usa `extend type Query`/`Mutation` (no redefine)
- [ ] `withAuth(['capability'])` protege el resolver
- [ ] `tenantId: context.tenantId` en todo where
- [ ] Despues de sync + restart OM: query/mutation disponible en localhost:4000/graphql
- [ ] Sin token → error auth
- [ ] Con token sin capability → error permisos
- [ ] Con token con capability → datos correctos

### Layout nuevo
- [ ] JSON valido
- [ ] `name` es snake_case unico
- [ ] `objectName` coincide con objeto existente
- [ ] Despues de sync: layout aparece en la app
- [ ] Columnas/campos visibles y correctos
- [ ] Navegacion list→view→edit funciona (si aplica)
- [ ] Row actions visibles y funcionales (si aplica)
- [ ] Listas embebidas cargan datos filtrados (si aplica)

### Componente Vue
- [ ] `defineElement()` con name (Patron A) O `<script setup>` (Patron B)
- [ ] `ElementLayout` + slots passthrough (Patron A)
- [ ] `useTenantApolloClient()` para GraphQL
- [ ] `submits: false` si no es campo de formulario
- [ ] Story con `useMockData: true`
- [ ] Despues de sync: Storybook renderiza en localhost:6006
- [ ] App renderiza en localhost:3000

### Traducciones
- [ ] Archivos base + per-object creados
- [ ] Todos los locales requeridos cubiertos
- [ ] Sin claves raw visibles en UI (indica sync faltante)
- [ ] `$t('clave')` en templates, nunca texto hardcodeado

### RBAC
- [ ] capabilities.json con module, version, capabilities[]
- [ ] Convenciones de nombre correctas (mod/{mod}:accion)
- [ ] riskLevel correcto (low/medium/high)
- [ ] Resolver usa withAuth con la capability
- [ ] Layout usa requiredCapability o roles
- [ ] Usuario sin permiso bloqueado
- [ ] Usuario con permiso accede

## Troubleshooting comun

| Problema | Causa | Solucion |
|----------|-------|----------|
| Sync aborta: composable duplicado | Nombre colisiona con otro mod | Renombrar composable |
| Sync aborta: componente duplicado | Carpeta colisiona con otro mod | Renombrar carpeta |
| Sync aborta: i18n conflicto | Misma clave hoja, distinto valor, distintos mods | Prefixar claves por mod |
| Codegen falla | JSON de objeto con sintaxis invalida | Validar JSON con parser |
| Migrate falla | FK a tabla inexistente | Verificar que objeto target existe y no esta en ignoredMods |
| Resolver ignorado | Export no contiene "Query"/"Mutation" | Renombrar export |
| Componente no renderiza | Falta defineElement() o sync no ejecutado | Verificar patron + npm run sync |
| Traducciones muestran claves | Sync no ejecutado o archivo faltante | npm run sync + verificar archivos en lang/ |
| Datos de otro tenant visibles | Falta tenantId en where | Agregar tenantId: context.tenantId |
| Row action no visible | visibilityConditions no cumplidas | Verificar condiciones vs datos del registro |
| Layout no aparece en sidebar | app.json no tiene el objectName o roles no coinciden | Verificar app.json + roles del usuario |
| Flow no se sincroniza | n8n no corriendo o campos auto-generados en JSON | Iniciar n8n + limpiar id/createdAt/updatedAt |

## Comandos de referencia rapida

```bash
# Validar estructura
npm run check-mods

# Sync completo (9 fases)
npm run sync

# Codegen (objects → Prisma + GraphQL)
npm run codegen --workspace=@uplanner/object-management-backend

# Migrar BD (todos los tenants)
npm run tenant:migrate --workspace=@uplanner/object-management-backend

# Tests del mod
npm test --workspace=@uplanner/{mod}
npm run test:coverage --workspace=@uplanner/{mod}

# Servers
npm run dev --workspace=@uplanner/object-management-backend  # Backend :4000
npm run dev --workspace=@uplanner/suite                       # Frontend :3000
npm run storybook --workspace=@uplanner/layout-engine         # Storybook :6006

# Docker (servicios opcionales)
docker compose --profile worker up -d    # Redis + Worker
docker compose --profile flow up -d      # n8n :5678
```
