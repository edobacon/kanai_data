---
id: SPEC-mods-013
project: up1
type: doc
module: mods
tags:
  - mod
  - setup
  - estructura
  - app.json
  - sidebar
---

# Setup y estructura del mod

---

### MOD-01: Crear estructura mínima
**Pre:** Monorepo uP1 clonado, `npm run setup` completado.  
**In:** Nombre del mod en kebab-case (ej: `mi-mod`).  
**Pasos:**
1. Crear directorio del mod:
   ```bash
   mkdir -p mods/mi-mod
   ```
2. Crear `mods/mi-mod/package.json`:
   ```json
   {
     "name": "@uplanner/mi-mod",
     "version": "1.0.0",
     "description": "Descripcion del mod",
     "type": "module",
     "private": true,
     "scripts": {
       "test": "vitest run",
       "test:watch": "vitest",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```
3. Crear `mods/mi-mod/capabilities.json` (vacío si no hay permisos custom):
   ```json
   []
   ```

**Validar:** `npm run check-mods` — debe listar el mod sin errores. Si el mod no aparece, verificar que `name` en package.json use el prefijo `@uplanner/`.  
**Doc:** `specs/up1/mods/creation-guide.md` §4

---

### MOD-02: Crear mod local sin Bitbucket
**Pre:** MOD-01 completado. No se requiere acceso SSH a Bitbucket.  
**In:** Nombre del mod.  
**Pasos:**
1. Inicializar git dentro del directorio del mod:
   ```bash
   cd mods/mi-mod && git init
   ```
2. Agregar el mod a la lista `uPlannerMods` en el `package.json` raíz del monorepo. A diferencia de los mods remotos (que terminan en `.git`), los locales se agregan por nombre de carpeta:
   ```json
   {
     "uPlannerMods": [
       "ai-agent.git",
       "hello-world-mod.git",
       "up1-manager.git",
       "academic-scheduling.git",
       "curriculum-design.git",
       "uengagement-up1.git",
       "mi-mod"
     ]
   }
   ```
3. Ejecutar sync para que el monorepo lo detecte:
   ```bash
   npm run sync
   ```

**Validar:** La salida de `npm run sync` menciona `mi-mod` en la fase "Mirror Sync" (fase 1) sin errores. El mod aparece en `up1/mi-mod/` (destino del mirror).  
**Doc:** `specs/up1/mods/creation-guide.md` §7

---

### MOD-03: Registrar app en sidebar
**Pre:** MOD-01 completado. Stack uP1 corriendo (localhost:3000).  
**In:** Nombre visible, ícono Bootstrap, posición, roles autorizados, tenants.  
**Pasos:**
1. Crear directorio `config/` dentro del mod:
   ```bash
   mkdir -p mods/mi-mod/config
   ```
2. Crear `mods/mi-mod/config/app.json`:
   ```json
   {
     "name": "mi-mod",
     "label": "Mi Módulo",
     "icon": "bi-box",
     "order": 10,
     "roles": ["Admin", "Coordinador"],
     "tenants": ["*"],
     "version": "1.0.0",
     "defaultObjects": []
   }
   ```
   Campos clave:
   - `name`: kebab-case, identificador interno — debe coincidir con el nombre del mod.
   - `label`: texto visible en el sidebar.
   - `icon`: clase Bootstrap Icons (ej: `bi-mortarboard`, `bi-box`, `bi-database`) o SVG inline.
   - `order`: entero; menor número = más arriba en el sidebar.
   - `roles`: array de strings con los roles que pueden ver la app.
   - `tenants`: `["*"]` para todos los tenants, o array de códigos específicos (ej: `["UPU", "TEST"]`).
   - `version`: semver del mod.
   - `defaultObjects`: array de objetos que aparecen como tabs — dejar vacío por ahora.
3. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** Ingresar a `localhost:3000/{TENANT}` con un usuario del rol configurado. La app debe aparecer en el sidebar con el label y el ícono correctos. Si no aparece, verificar que el tenant del usuario esté en `tenants` y el rol en `roles`.  
**Doc:** `specs/up1/mods/reference.md` §9, `specs/up1/mods/creation-guide.md` §5.3

---

### MOD-04: Agregar defaultObjects a app.json
**Pre:** MOD-03 completado. Los objetos a listar ya existen (via JSON en `objects/` + codegen, o son objetos core).  
**In:** Lista de nombres de objetos (PascalCase) que deben aparecer como tabs de navegación principal.  
**Pasos:**
1. Editar `mods/mi-mod/config/app.json` y completar `defaultObjects`:
   ```json
   {
     "name": "mi-mod",
     "label": "Mi Módulo",
     "icon": "bi-box",
     "order": 10,
     "roles": ["Admin", "Coordinador"],
     "tenants": ["*"],
     "version": "1.0.0",
     "defaultObjects": ["MiObjeto", "OtroObjeto", "Person"]
   }
   ```
   Cada nombre en `defaultObjects` genera un tab en la app. El tab usa el layout de tipo `RecordList` asociado a ese objeto (si existe), o el CRUD genérico.
2. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** En `localhost:3000/{TENANT}`, abrir la app. Deben aparecer tabs con los nombres de objeto en plural (usando `labelPlural` del metadata del objeto). Si un tab no aparece, verificar que el objeto existe en la API con `getObjectDefinitions` en `localhost:4000/graphql`.  
**Doc:** `specs/up1/mods/reference.md` §9

---

### MOD-05: Crear estructura de carpetas opcionales
**Pre:** MOD-01 completado.  
**In:** Lista de capacidades que el mod necesitará.  
**Pasos:**
1. Crear solo las carpetas necesarias según lo que el mod implementará:
   ```bash
   # Objetos de negocio (tablas + GraphQL CRUD)
   mkdir -p mods/mi-mod/objects

   # Resolvers GraphQL custom (lógica de negocio)
   mkdir -p mods/mi-mod/logic

   # Layouts JSON (vistas RecordList y RecordDetail)
   mkdir -p mods/mi-mod/config/layouts

   # Componentes Vue custom
   mkdir -p mods/mi-mod/modsComponents

   # Composables compartidos entre componentes
   mkdir -p mods/mi-mod/modsComposables

   # Traducciones i18n
   mkdir -p mods/mi-mod/lang

   # Estilos CSS en capas
   mkdir -p mods/mi-mod/css/1-theme
   mkdir -p mods/mi-mod/css/2-objectName

   # Eventos BullMQ
   mkdir -p mods/mi-mod/events

   # Workflows n8n
   mkdir -p mods/mi-mod/flows

   # Datos semilla
   mkdir -p mods/mi-mod/seed

   # Tests (no se sincroniza)
   mkdir -p mods/mi-mod/tests
   ```
   **Regla:** crear solo lo necesario. Las carpetas vacías no causan errores pero generan ruido.

2. Ejecutar sync y verificar estructura:
   ```bash
   npm run sync
   npm run check-mods
   ```

**Validar:** `npm run check-mods` no reporta errores de estructura. Las carpetas que se sincronizan (objects, logic, config/layouts, modsComponents, lang, css, events, flows, seed) deben estar dentro del directorio del mod, no en destinos del sync.  
**Doc:** `specs/up1/mods/creation-guide.md` §3, §5

---

### MOD-06: Excluir mod del sync
**Pre:** El mod existe en `uPlannerMods` del `package.json` raíz. Se desea que el sync lo omita sin eliminarlo del listado.  
**In:** Nombre del mod a ignorar (sin extensión `.git`).  
**Pasos:**
1. Editar el `package.json` raíz del monorepo y agregar la clave `ignoredMods`:
   ```json
   {
     "uPlannerMods": [
       "ai-agent.git",
       "hello-world-mod.git",
       "up1-manager.git",
       "academic-scheduling.git",
       "curriculum-design.git",
       "uengagement-up1.git",
       "mi-mod"
     ],
     "ignoredMods": ["hello-world-mod", "mi-mod"]
   }
   ```
   El campo `ignoredMods` recibe un array de nombres de mod (sin `.git`). Cualquier mod en esta lista es omitido por todas las fases del sync.

   **Advertencia:** si otro mod tiene FK a objetos del mod ignorado, el sync fallará o las FKs apuntarán a tablas inexistentes. Verificar dependencias antes de ignorar.

2. Ejecutar sync para confirmar que el mod no se procesa:
   ```bash
   npm run sync
   ```

**Validar:** La salida del sync no menciona el mod ignorado en ninguna fase. En la BD, los objetos del mod ignorado no son insertados ni actualizados. El mod sigue existiendo en el filesystem — solo se excluye del pipeline.  
**Doc:** `specs/up1/mods/reference.md` §2, `specs/up1/mods/objects-map.md` §9
