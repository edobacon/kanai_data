---
id: SPEC-mods-009
project: up1
type: doc
module: mods
tags:
  - debug
  - errores
  - logs
  - diagnostico
  - troubleshooting
  - devtools
  - prisma-studio
  - graphql
  - network
---

# Debugging y diagnostico

Como identificar qué está pasando cuando algo no funciona en uP1.

---

## Donde mirar (fuentes de informacion)

```text
                     ┌──────────────────────┐
                     │   Algo no funciona   │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │ Donde esta el        │
                     │ problema?            │
                     └──┬───┬───┬───┬───┬──┘
                        │   │   │   │   │   │
          Objeto/   Vista/  UI/ BD/ Evento/ Worker/ Redis/
          API/BD   comp/   rend- datos flow  queue  PubSub
                   i18n    ering
            │        │      │     │     │      │       │
            ▼        ▼      ▼     ▼     ▼      ▼       ▼
        Terminal Terminal Browser Prisma  n8n  docker  redis-cli
        Object   Suite    DevTools Studio Editor compose PSUBSCRIBE
        Manager  local-   F12→    local- local- logs   '*'
        local-   host:    Console host:  host:  worker
        host:    3000     +Net    5555   5678→
        4000                            Executions
```

### Tabla de fuentes

| Fuente | Donde | Que muestra | Cuando usar |
|--------|-------|-------------|-------------|
| **Terminal Object Manager** | Terminal donde corre `npm run dev` del backend | Queries GraphQL, errores Prisma, codegen, migrations | Errores de API, objetos, resolvers |
| **Terminal Suite** | Terminal donde corre `npm run dev` del frontend | Build Nuxt, errores de componentes, i18n | Errores de rendering, traducciones |
| **Browser Console** | F12 → Console | Errores JS, Vue warnings, network failures | Componentes rotos, errores de frontend |
| **Browser Network** | F12 → Network | HTTP requests, GraphQL req/res, headers | Verificar X-Tenant-ID, responses de API |
| **Prisma Studio** | `npm run tenant:studio` → `:5555` | Tablas, registros, relaciones | Verificar datos en BD, debugging de queries |
| **GraphQL Playground** | `localhost:4000/graphql` | Schema, ejecutar queries/mutations | Probar API aislada del frontend |
| **n8n Editor** | `localhost:5678` → Executions | Historial de workflows, datos de nodos | Eventos no procesan, flows fallan |
| **Docker logs** | `docker compose logs -f {service}` | Redis, Worker, n8n background | Servicios Docker no responden |
| **up1-start.sh logs** | `./up1-start.sh --logs [service]` | Logs de la sesión actual | Revisar startup failures |
| **Storybook** | `:6006` | Componentes en aislamiento | Componente no renderiza en app |

---

## Flujos de diagnostico por sintoma

### DIAG-01: "Objeto no aparece en GraphQL"

```text
┌─────────────────────┐
│   Objeto no aparece │
└──────────┬──────────┘
           ▼
┌──────────────────────────┐
│ JSON tiene error de      │
│ sintaxis?                │
└────┬──────────────────┬──┘
    Si                  No
     │                  │
     ▼                  ▼
Corregir JSON  ┌──────────────────────────┐
(usar valid.)  │ Corriste npm run sync?   │
               └────┬──────────────────┬──┘
                   No                  Si
                    │                  │
                    ▼                  ▼
             npm run sync   ┌──────────────────────────┐
                            │ Corriste npm run codegen? │
                            └────┬──────────────────┬───┘
                                No                  Si
                                 │                  │
                                 ▼                  ▼
                         npm run codegen  ┌──────────────────────┐
                                          │ Codegen mostro       │
                                          │ errores?             │
                                          └────┬──────────────┬──┘
                                              Si              No
                                               │              │
                                               ▼              ▼
                                     Leer error de   ┌──────────────────┐
                                     codegen:        │ Corriste         │
                                     — campo inv.?   │ tenant:migrate?  │
                                     — FK inexist.?  └───┬──────────┬───┘
                                     — tipo no sup.?    No          Si
                                                         │          │
                                                         ▼          ▼
                                                  npm run   ┌────────────────────┐
                                                  tenant:   │ Reiniciaste Object │
                                                  migrate   │ Manager?           │
                                                            └───┬────────────┬───┘
                                                               No            Si
                                                                │            │
                                                                ▼            ▼
                                                         Reiniciar OM  Verificar en
                                                                       terminal OM
                                                                       si hay error
                                                                       al cargar schema
```

**Comando de verificacion:**
```bash
# Verificar que el objeto existe en GraphQL
curl -s http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: UPU" \
  -d '{"query":"{ listInstances(name: \"MiObjeto\") { totalCount items { id data } } }"}' | python3 -m json.tool
```

---

### DIAG-02: "Resolver no aparece o no funciona"

```text
┌────────────────────────────┐
│ Query/mutation no disponible│
└─────────────┬──────────────┘
              ▼
┌─────────────────────────────────┐
│ Export contiene 'Query' o       │
│ 'Mutation' en el nombre?        │
└──────┬──────────────────────┬───┘
      No                      Si
       │                      │
       ▼                      ▼
Renombrar export:    ┌──────────────────────────┐
miFeatureResolvers   │ Schema usa 'extend type'?│
→ miFeatureQuery     └──────┬──────────────────┬┘
                           No                  Si
                            │                  │
                            ▼                  ▼
                  Cambiar         ┌──────────────────────────┐
                  'type Query'    │ npm run sync ejecutado?  │
                  → 'extend       └──────┬──────────────────┬┘
                   type Query'          No                  Si
                                         │                  │
                                         ▼                  ▼
                                  npm run sync   ┌──────────────────────┐
                                                 │ Object Manager       │
                                                 │ reiniciado?          │
                                                 └──────┬────────────┬──┘
                                                       No            Si
                                                        │            │
                                                        ▼            ▼
                                                 Reiniciar OM  ┌──────────────────┐
                                                               │ Errores en       │
                                                               │ terminal OM?     │
                                                               └──────┬────────┬──┘
                                                                     Si        No
                                                                      │        │
                                                                      ▼        ▼
                                                             Leer error:  Verificar en
                                                             — import     localhost:4000
                                                               path?      /graphql que
                                                             — sintaxis   el query
                                                               JS rota?   aparece
                                                             — schema
                                                               duplicado?
```

**Self-check rapido:**
```bash
# Verificar que el archivo resolver existe en destino post-sync
ls object-manager/src/graphql/resolvers/mods/{mod}/

# Verificar que el export tiene el nombre correcto
grep "export const" mods/{mod}/logic/*.resolver.js
# Debe contener "Query" o "Mutation" en el nombre
```

---

### DIAG-03: "Componente no renderiza"

```text
┌──────────────────────────────┐
│ Componente en blanco o error │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ npm run sync ejecutado?      │
└──────┬──────────────────────┬┘
      No                      Si
       │                      │
       ▼                      ▼
npm run sync    ┌─────────────────────────────────┐
                │ Archivo existe en               │
                │ suite/modsComponents/?          │
                └──────┬─────────────────────────┬┘
                      No                         Si
                       │                         │
                       ▼                         ▼
             Sync no copio —       ┌──────────────────────────┐
             verificar nombre      │ Usa defineElement()?     │
             carpeta               └──────┬──────────────────┬┘
             modsComponents/             No                  Si
                                          │                  │
                                          ▼                  ▼
                                Patron A necesita  ┌──────────────────────┐
                                defineElement().   │ Tiene name en        │
                                Si standalone (B), │ defineElement?       │
                                verificar invoc.   └──────┬────────────┬──┘
                                desde layout JSON        No            Si
                                                          │            │
                                                          ▼            ▼
                                                   Agregar name: ┌──────────────────┐
                                                   'MiWidget-    │ Errores en       │
                                                    Element'     │ browser Console? │
                                                                 └──────┬────────┬──┘
                                                                       Si        No
                                                                        │        │
                                                                        ▼        ▼
                                                              Leer error:  ┌──────────────────┐
                                                              — import     │ Funciona en      │
                                                                faltante?  │ Storybook?       │
                                                              — prop       └──────┬────────┬──┘
                                                                undefined?        Si       No
                                                              — Apollo            │        │
                                                                error?            ▼        ▼
                                                                           Problema   Problema
                                                                           de contexto en el
                                                                           en app     componente
                                                                           (layout,   mismo
                                                                           Apollo,
                                                                           tenant)
```

**Debug tools:**
```bash
# Verificar que el componente se registro en Vueform
# Buscar en browser Console:
# → Si hay error "Unknown element type: mi-widget" = componente no registrado
# → Verificar nombre en defineElement({name: 'MiWidgetElement'})
# → PascalCase se convierte a kebab: MiWidgetElement → mi-widget

# Probar en Storybook primero (aislado de app)
npm run storybook --workspace=@uplanner/layout-engine
# → localhost:6006 → Custom Components > From Mods > {mod}
```

---

### DIAG-04: "Traducciones muestran claves"

```
Sintoma: UI muestra "column.nombre" en vez de "Nombre"
```

**Checklist:**
1. Archivo existe? → `ls mods/{mod}/lang/es_CL.json`
2. Clave existe en el archivo? → `grep "column" mods/{mod}/lang/es_CL.json`
3. Sync ejecutado? → `npm run sync`
4. Suite reiniciado? → Reiniciar Suite dev server
5. Archivo per-object correcto? → `es_CL@MiObjeto.json` (PascalCase exacto del title del objeto)
6. Sin colision entre mods? → Verificar que sync no aborto por conflicto i18n

**Debug rapido:**
```bash
# Verificar que el archivo llego a suite/lang/
ls suite/lang/ | grep -i "miobjeto"

# Verificar contenido
cat suite/lang/es_CL@MiObjeto.json | python3 -m json.tool
```

---

### DIAG-05: "Datos de otro tenant visibles"

```
Sintoma: registros creados en tenant UPU aparecen en tenant TEST
Criticidad: ALTA — fallo de seguridad
```

**Diagnostico:**
```bash
# Buscar resolvers sin tenantId en where
grep -rn "findMany\|findUnique\|findFirst" mods/{mod}/logic/*.resolver.js | grep -v "tenantId"
# Toda linea sin "tenantId" es sospechosa

# Verificar CRUD generico (listInstances ya filtra por tenantId automaticamente)
# El problema esta siempre en resolvers custom
```

**Fix:** agregar `tenantId: context.tenantId` en **todo** where de Prisma en resolvers custom.

---

### DIAG-06: "Evento no llega a n8n"

```text
┌────────────────────────┐
│ Evento no se ejecuta   │
└──────────┬─────────────┘
           ▼
┌──────────────────────────┐
│ Worker corriendo?        │
└──────┬──────────────────┬┘
      No                  Si
       │                  │
       ▼                  ▼
docker compose    ┌──────────────────────────┐
--profile worker  │ n8n corriendo?           │
up -d             └──────┬──────────────────┬┘
                        No                  Si
                         │                  │
                         ▼                  ▼
               docker compose    ┌──────────────────────────────┐
               --profile flow    │ Workflow activo en n8n?      │
               up -d             │ (toggle ON)                  │
                                 └──────┬──────────────────────┬┘
                                       No                      Si
                                        │                      │
                                        ▼                      ▼
                              Activar toggle    ┌──────────────────────────┐
                              en n8n editor     │ Redis corriendo?         │
                                                └──────┬──────────────────┬┘
                                                      No                  Si
                                                       │                  │
                                                       ▼                  ▼
                                              docker compose    ┌──────────────────────┐
                                              up redis          │ Evento JSON          │
                                                                │ tiene match?         │
                                                                └──────┬────────────┬──┘
                                                                      No            Si
                                                                       │            │
                                                                       ▼            ▼
                                                             Verificar       Monitorear Redis:
                                                             objectType,     redis-cli
                                                             operation,      PSUBSCRIBE '*'
                                                             condition en    y ejecutar
                                                             events/*.json   la operacion
```

**Debug con Redis:**
```bash
# Monitorear todos los canales Redis en tiempo real
redis-cli PSUBSCRIBE '*'
# Luego ejecutar la operacion en uP1 (crear/editar registro)
# Si el mensaje aparece en Redis → el evento se publica ok
# Si no aparece → el evento JSON no matchea la operacion
```

---

### DIAG-07: "Sync falla"

| Error de sync | Causa | Fix |
|---|---|---|
| `Duplicate composable name: useX` | Dos mods tienen composable con mismo nombre | Renombrar en uno de los mods |
| `Duplicate component: MiWidget` | Dos mods tienen carpeta con mismo nombre | Renombrar carpeta |
| `i18n key conflict: column.nombre` | Misma clave, distinto valor, distintos mods | Prefixar clave por mod |
| `JSON parse error in flows/` | JSON de workflow con sintaxis invalida | Validar JSON |
| `Phase 4-8 skipped` | BD no conectada | Verificar PostgreSQL + .env |
| `Phase 9 skipped` | n8n no corriendo | `docker compose --profile flow up -d` |

---

### DIAG-08: "Layout no aparece en sidebar"

**Checklist:**
1. `config/app.json` existe? → `cat mods/{mod}/config/app.json`
2. `roles` incluye el rol del usuario actual?
3. `tenants` incluye el tenant actual (o `"*"`)?
4. `npm run sync` ejecutado? (fase 6 inserta en BD)
5. El `name` en app.json es unico? (no colisiona con otro mod)

---

### DIAG-09: "RBAC no bloquea / bloquea mal"

**Debug:**
```bash
# Verificar capabilities registradas en BD
# En GraphQL Playground (localhost:4000/graphql):
query {
  listInstances(name: "Capability", filters: [
    { field: "name", operator: "CONTAINS", value: "mi-mod" }
  ]) {
    instances
    totalCount
  }
}

# Verificar que el resolver usa withAuth correctamente
grep -n "withAuth" mods/{mod}/logic/*.resolver.js
```

**Problemas comunes:**
- `withAuth` no importado → resolver no esta protegido
- Capability name no coincide entre capabilities.json y resolver
- Service token activo → bypasea RBAC completamente (verificar que no se este usando token de servicio)

---

### DIAG-10: "Migration falla"

```bash
# Ver estado de migraciones
cd ~/Workspace/uplanner/up1
npm run prisma -- migrate status --workspace=@uplanner/object-management-backend

# Si falla por constraint:
# → Campo not_null agregado a tabla con datos existentes sin default
# → FK apunta a tabla inexistente
# → Nombre de tabla/campo duplicado

# Reset de emergencia (DESTRUYE DATOS — solo en dev):
# npm run prisma -- migrate reset --workspace=@uplanner/object-management-backend
```

---

## Herramientas de inspeccion

### Prisma Studio (BD visual)

```bash
npm run tenant:studio --workspace=@uplanner/object-management-backend
# → http://localhost:5555
```

Permite:
- Ver todas las tablas del tenant
- Filtrar, ordenar, buscar registros
- Editar registros directamente (cuidado en produccion)
- Ver relaciones FK

### GraphQL Playground (API)

Abrir `http://localhost:4000/graphql` en browser.

**Headers obligatorios** (agregar en "HTTP Headers" panel):
```json
{
  "X-Tenant-ID": "UPU"
}
```

**Queries utiles para debug:**
```graphql
# Listar todos los objetos disponibles
query { getObjectDefinitions { name source tableName } }

# Ver campos de un objeto
query { getObjectFields(objectName: "MiObjeto") { name fieldType label isBaseField } }

# Verificar que un objeto tiene datos
query { listInstances(name: "MiObjeto") { totalCount items { id data } } }

# Verificar capabilities
query { listInstances(name: "Capability", filters: [
  { field: "name", operator: "CONTAINS", value: "mi-mod" }
]) { totalCount items { id data } } }
```

### Browser DevTools (Network tab)

Para inspeccionar requests GraphQL del frontend:

1. F12 → Network → Filter: "graphql"
2. Click en una request
3. **Headers**: verificar `X-Tenant-ID` presente
4. **Request**: ver query y variables enviadas
5. **Response**: ver datos retornados o errores

**Errores comunes en Network:**
- `401 Unauthorized` → token expirado o faltante
- `403 Forbidden` → capability faltante (RBAC)
- `400 Bad Request` → query malformada
- `500 Internal Server Error` → error en resolver (ver terminal OM)

### n8n Executions (workflows)

1. Abrir `localhost:5678`
2. Click en workflow
3. Click en "Executions" (tab superior)
4. Ver historial: Success (verde) / Error (rojo)
5. Click en una ejecucion → ver datos de cada nodo

---

## Checklist de debug rapido

Cuando algo no funciona, seguir este orden:

```
1. ¿npm run sync se ejecuto? (causa #1 de problemas)
2. ¿Hay errores en la terminal del servicio afectado?
3. ¿Hay errores en browser Console (F12)?
4. ¿Los headers X-Tenant-ID estan presentes? (Network tab)
5. ¿Los datos existen en BD? (Prisma Studio)
6. ¿El schema GraphQL tiene el query/mutation? (Playground)
7. ¿Docker services estan corriendo? (docker compose ps)
```

Si despues de este checklist no se identifica el problema, revisar los flujos DIAG-01 a DIAG-10 segun el sintoma.
