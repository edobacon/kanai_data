# Crear el mod `curricular-mapping`

> Guia de implementacion para el ticket. Describe todos los pasos para bootstrapear el mod
> `curricular-mapping` de uPlanner One tomando `mods/curriculum-design` como plantilla de referencia.
>
> **Estado del dominio en este doc**: los objetos, capabilities y seed concretos quedan como
> *placeholder* (plantilla a completar por quien tome el ticket). El foco aqui es el scaffolding
> del mod y el checklist por capa: que copiar, que adaptar y que registrar para que el mod
> levante, sincronice al core y aparezca en la suite.
>
> **Nota**: el repo `curricular-mapping` ya existe (clonado en `up1/mods/curricular-mapping/`, con
> solo `.gitignore` y commit inicial). Los pasos de "crear repo" ya estan hechos; empezar por el
> scaffolding de contenido (seccion 3.2).

---

## 0. Contexto y objetivo

El monorepo `up1` integra proyectos core (`object-manager`, `layout`, `flow`, `suite`) y **mods**
(features de dominio) que se propagan al core via un sync declarativo. Un mod NO toca el codigo del
core: aporta definiciones de objetos (JSON), layouts, i18n, capabilities, resolvers custom, seeds y
componentes Vueform, y el sync los inyecta.

`curriculum-design` es el mod mas completo y sirve de molde. Este ticket completa `curricular-mapping`
replicando su anatomia y su ciclo de vida (registro -> install -> sync -> codegen -> migrate -> levantar).

**Definicion de "listo" (DoD)** al final del doc (seccion 8).

---

## 1. Anatomia del mod de referencia (`curriculum-design`)

Estructura que debe replicar el mod nuevo (no todas las carpetas son obligatorias; ver "obligatorio"
vs "segun necesidad" en la seccion 4):

```
curriculum-design/
├── config/
│   ├── app.json                # Definicion de la app: name, label, icon, tenants, defaultObjects
│   └── layouts/                # Layouts por objeto y RecordType (create/edit/list/view)
├── objects/                    # Definiciones de objetos (JSON) + RecordTypes/
│   └── RecordTypes/            # Subtipos polimorficos (patron discriminator recordType)
├── capabilities.json           # Capabilities RBAC del mod (view/edit/... + object-level)
├── lang/                       # i18n: {es,en,pt}/<namespace>.i18n.json
├── logic/                      # Resolvers GraphQL custom + *.schema.graphql + helpers/
├── seed/                       # seed.js + _data-*.js por dataset + _cleanup.js
├── modsComponents/             # Custom Vueform elements (SFC .vue + helpers .ts + composable)
├── modsComposables/            # Composables Apollo reutilizables
├── css/                        # Theme + estilos por RT (solo tokens var(--up1-*))
├── tests/                      # vitest (integration/) + llm-e2e/ + stubs/
├── docs/                       # architecture / patterns / reference / guides (con INDEX.md)
├── .ai/                        # CONTEXT.md, PATTERNS.md, TASKS.md, TROUBLESHOOTING.md (para LLM)
├── .storybook/                 # Storybook (opcional, solo si hay componentes)
├── CLAUDE.md                   # Reglas del mod auto-cargadas por Claude Code
├── README.md                   # Quick start + domain model + features + capabilities
├── package.json                # @uplanner/<mod>, deps, scripts (test/lint/typecheck/storybook)
├── tsconfig.json
├── vitest.config.ts
├── vueform.config.ts
└── eslint.config.js
```

### Como se propaga al core (importante para entender que declara cada capa)

- Los mods se listan en `up1/package.json` bajo `uPlannerMods` (repos bitbucket, ej. `curricular-mapping.git`).
- Ademas se agregan al array `workspaces` de `up1/package.json` (ruta `mods/<mod>`).
- `npm run update-repos` clona/actualiza los mods desde bitbucket (rama `develop`).
- `npm run install-mods` instala dependencias de cada mod (los mods NO son npm workspaces para
  install; se instalan por separado, ver `scripts/actions.js:installModDependencies`).
- `npm run sync` corre el `sync` de `object-manager` (SyncManager), que descubre los mods y
  propaga objects, configs/layouts, lang, seeds, capabilities y schema al core, y ejecuta codegen +
  db push a las DB de tenant (ver `scripts/actions.js:syncMods`).

---

## 2. Decisiones previas (completar antes de scaffoldear)

| Decision | Valor para curriculum-design | Valor para curricular-mapping |
|----------|------------------------------|-------------------------------|
| Nombre del mod (kebab) | `curriculum-design` | `curricular-mapping` |
| Nombre npm | `@uplanner/curriculum-design` | `@uplanner/curricular-mapping` |
| `config/app.json` `name` | `curriculum-design` | `curricular-mapping` |
| `label` | `Curriculum Design` | (definir, ej. `Curricular Mapping`) |
| `icon` / `iconBg` | `bi-journal-text` / `#0EA5E9` | (elegir icono bootstrap-icons + color) |
| `order` | `10` | (elegir orden en el menu; no colisionar) |
| `tenants` | `{ "UPU": {} }` | (definir tenant(s) destino) |
| `defaultObjects` | Activity, Curriculum, ... | (definir tras modelar objetos) |
| Objetos del dominio | 8 objetos + 13 RecordTypes | **placeholder** (definir en la seccion 4.2) |
| Capabilities | view/edit/approve/publish + object-level | **placeholder** (definir en la seccion 4.5) |
| Prefijo de rama Jira | `UPONE-{numero}` | (definir epica/HU) |

> Regla de nombres de objetos: PascalCase para object titles y layouts (ver `docs/architecture/pascalcase-migration.md`
> del mod base). RecordTypes siguen el patron `rt__<Subtype>__<baselowercase>.json`.

---

## 3. Scaffolding del mod (crear el esqueleto)

### 3.1. Repositorio (ya hecho)

El repo `curricular-mapping` ya esta clonado en `up1/mods/curricular-mapping/` (rama base, commit
inicial, solo `.gitignore`). No hace falta crearlo. Continuar en 3.2.

### 3.2. Crear la estructura minima de carpetas

Obligatorias para que el mod sea valido y sincronice:

```
mods/curricular-mapping/
├── config/
│   ├── app.json
│   └── layouts/
├── objects/
│   └── RecordTypes/
├── lang/
│   ├── es/
│   ├── en/
│   └── pt/
├── capabilities.json
├── package.json
├── README.md
└── CLAUDE.md
```

Segun necesidad (agregar solo si el dominio lo requiere): `logic/`, `seed/`, `modsComponents/`,
`modsComposables/`, `css/`, `tests/`, `docs/`, `.ai/`, `.storybook/`.

### 3.3. Archivos raiz (copiar de curriculum-design y adaptar)

| Archivo | Que hacer |
|---------|-----------|
| `package.json` | Copiar, cambiar `name` a `@uplanner/curricular-mapping` y `description`. Mantener scripts (`test`, `lint`, `typecheck`, `storybook`). Quitar deps no usadas (ej. `sortablejs`, storybook) si el mod no tiene componentes. |
| `tsconfig.json` | Copiar tal cual (paths relativos a `../../node_modules/.bin`). |
| `vitest.config.ts` | Copiar. Ajustar solo si cambian rutas de tests/stubs. |
| `vueform.config.ts` | Copiar solo si hay custom Vueform elements. |
| `eslint.config.js` | Copiar tal cual. |
| `.gitignore` | Ya existe en el repo; comparar con el de curriculum-design y completar si falta algo. |
| `README.md` | Reescribir para el dominio del mod (quick start + domain model + capabilities + tests + verification). |
| `CLAUDE.md` | Reescribir: reglas del mod, decisiones, tickets Jira. Ver plantilla en 4.11. |

`config/app.json` inicial (adaptar):

```json
{
  "name": "curricular-mapping",
  "label": "Curricular Mapping",
  "icon": "bi-diagram-3",
  "iconBg": "#8B5CF6",
  "order": 11,
  "tenants": { "UPU": {} },
  "version": "0.1.0",
  "defaultObjects": [],
  "up1ModelVersion": 1
}
```

`capabilities.json` inicial (placeholder minimo):

```json
{
  "capabilities": [
    {
      "name": "mod/curricular-mapping:view",
      "description": "Ver el modulo Curricular Mapping",
      "riskLevel": "low"
    },
    {
      "name": "mod/curricular-mapping:edit",
      "description": "Crear y editar registros del modulo Curricular Mapping",
      "riskLevel": "medium"
    }
  ]
}
```

---

## 4. Guia por capa (que copiar / que adaptar)

Cada subseccion es un item de checklist. El orden sugerido va de datos hacia UI.

### 4.1. `config/app.json` (definicion de la app)
- [ ] `name` = `curricular-mapping` (debe matchear el nombre del mod).
- [ ] `label`, `icon` (bootstrap-icons), `iconBg`, `order` (no colisionar con otros mods).
- [ ] `tenants`: mapa de tenants donde se activa (ej. `{ "UPU": {} }`).
- [ ] `defaultObjects`: se completa al final, tras modelar objetos (lista de objetos que aparecen por defecto en la navegacion).
- [ ] `up1ModelVersion`: `1` (alinear con el mod base).

### 4.2. `objects/` (definiciones de objetos) - PLACEHOLDER de dominio
- [ ] Un JSON por objeto de negocio (PascalCase). Base: copiar un objeto simple de `curriculum-design/objects/` (ej. `AcademicProgram.json` para CRUD plano, o `Curriculum.json` para owner polimorfico + versionado) y adaptar campos.
- [ ] Definir campos, tipos, enums, relaciones (FK), unique/scoped-by, defaults.
- [ ] Decidir si algun objeto usa el patron base + RecordTypes (discriminator `recordType`).

### 4.3. `objects/RecordTypes/` (subtipos polimorficos) - segun necesidad
- [ ] Solo si un objeto base tiene subtipos 1:1. Nombre `rt__<Subtype>__<baselowercase>.json`.
- [ ] El base declara `recordType` como discriminator y `metadata.polymorphicChildren` si aplica (ver `Curriculum.json` / `Activity.json`).

### 4.4. `config/layouts/` (layouts por objeto y RT)
- [ ] Por cada objeto y RecordType: layouts `create`, `edit`, `list`, `view` segun se necesiten.
- [ ] Convencion de nombre: `default_<Object>_<mode>.json` y para RT `default_rt__<Subtype>__<base>_<mode>.json`.
- [ ] Copiar un set de `curriculum-design/config/layouts/` como base y reemplazar campos.
- [ ] Tests del mod validan coherencia layout <-> objeto (ver 4.9).

### 4.5. `capabilities.json` (RBAC) - PLACEHOLDER de dominio
- [ ] Capabilities de modulo con prefijo `mod/curricular-mapping:<accion>` (ej. `view`, `edit`, `approve`, `publish`).
- [ ] Capabilities object-level SIN prefijo `mod/` (ej. `<objeto>:view`, `<objeto>:create`, `<objeto>:modify`, `<objeto>:delete`) por RULE-mods-037.
- [ ] Asignar `riskLevel` graduado (low/medium/high) segun impacto institucional.
- [ ] Referenciar el ticket/HU que genera cada capability en su `description` (patron del mod base).

### 4.6. `lang/` (i18n)
- [ ] Un namespace por objeto/feature: `lang/<locale>/<namespace>.i18n.json`, en `es`, `en`, `pt`.
- [ ] `common.i18n.json` para strings compartidos (ej. namespaces de componentes custom).
- [ ] Keys de enums deben cubrir todos los valores declarados en los objetos (test `lang-enums`).

### 4.7. `logic/` (resolvers custom + schema GraphQL) - segun necesidad
- [ ] Solo si el dominio necesita validacion server-side no expresable por constraints de Prisma
      (partial-unique, FK polimorfica, reglas de transicion, sumas ponderadas, guards de borrado).
- [ ] Patron: `<feature>.resolver.js` + `<feature>.schema.graphql`, helpers puros en `logic/helpers/`.
- [ ] Regla del ecosistema: para escrituras gobernadas usar mutations `*Validated`, no CRUD generic
      (ver `curriculum-design/CLAUDE.md` seccion "Mutations validated vs CRUD generic").
- [ ] La integridad de dominio se enforza server-side (override `createInstance` / constraint DB),
      no en el front (MCP y CRUD generic bypassan el front). Ver `docs/architecture/server-side-integrity.md` del mod base.

### 4.8. `seed/` (datos de arranque) - PLACEHOLDER de dominio
- [ ] `seed.js` como entrypoint que despacha por tenant y ordena la carga.
- [ ] `_data-<dataset>.js` por dataset; `_cleanup.js` para reset idempotente.
- [ ] Idempotencia: upserts que dejen el estado final correcto tras N corridas.
- [ ] Documentar counts esperados post-seed (patron `seed/SMOKE-*.md` del mod base).

### 4.9. `tests/` - recomendado
- [ ] `tests/integration/` con vitest: coherencia layouts <-> objetos, RecordTypes declarados con layout+lang, keys i18n vs enums, seed counts, helpers puros.
- [ ] `tests/stubs/` para atoms/molecules del layout-library y `useApolloClient`.
- [ ] Copiar los tests estructurales del mod base (`recordtypes-declared`, `layouts-declared`, `lang-enums`, `seed-counts`) y adaptarlos: son baratos y atrapan drift.
- [ ] `tests/llm-e2e/` (opcional): scenarios markdown ejecutables via MCP para flujos UI.

### 4.10. `modsComponents/` + `modsComposables/` + `css/` - segun necesidad
- [ ] Solo si el mod aporta UI custom (custom Vueform elements). Patron: SFC `.vue` + helpers `.ts`
      puros y testeables + composable Apollo + `.stories.ts` (si hay Storybook).
- [ ] CSS: solo tokens `var(--up1-*)` declarados en `theme-tokens.css`, sin fallbacks hardcoded (RULE-layout-031).
- [ ] Atomic design: usar `Input`/`Textarea`/`Checkbox`/`Modal`/`Alert` del layout-library (RULE-mods-014).

### 4.11. `CLAUDE.md` + `.ai/` + `docs/` (contexto y documentacion)
- [ ] `CLAUDE.md`: reglas obligatorias/prohibidas del mod, decisiones activas, tickets Jira, limitaciones platform conocidas. Se auto-carga al trabajar bajo el path del mod.
- [ ] `.ai/`: `CONTEXT.md` (domain model + scope + decisiones), `PATTERNS.md`, `TASKS.md`, `TROUBLESHOOTING.md`.
- [ ] `docs/` con `INDEX.md` maestro y subcarpetas `architecture/`, `patterns/`, `reference/`, `guides/`
      (cada una con su `INDEX.md`). Documentar lo suficiente para entender, no exhaustivo.

---

## 5. Registrar el mod en el monorepo

Editar `up1/package.json`:

1. [ ] Agregar `curricular-mapping.git` al array `uPlannerMods`:

```json
"uPlannerMods": [
  "retention-wellbeing.git",
  "ai-agent.git",
  "academic-scheduling.git",
  "curriculum-design.git",
  "uEngagement-up1.git",
  "curricular-mapping.git"
]
```

2. [ ] Agregar la ruta del workspace al array `workspaces`:

```json
"workspaces": [
  "object-manager",
  "layout",
  "flow",
  "suite",
  "mods/uEngagement-up1",
  "mods/curriculum-design",
  "mods/academic-scheduling",
  "mods/curricular-mapping"
]
```

---

## 6. Sincronizar y levantar

Desde `up1/`:

```bash
npm run update-repos     # clona/actualiza el mod desde bitbucket (rama develop)
npm run install-mods     # instala dependencias del mod
npm run sync             # propaga objects, layouts, lang, seeds y capabilities al core
npm run codegen --workspace=@uplanner/object-management-backend
npm run tenant:migrate --workspace=@uplanner/object-management-backend
```

Levantar servicios:

```bash
./up1-start.sh --om --suite     # backend (4000) + frontend (3000)
```

> Nota flow operativo: el sync es "append-only" para destinations del core que ya existen (no
> propaga eliminaciones de fields). Si el mod ELIMINA un campo de un JSON de objeto, hay que borrar
> el destination del core y re-sincronizar. Ver `curriculum-design/CLAUDE.md` seccion "Flow operativo:
> drops del modelo".

---

## 7. Verificacion

Tras el sync y levantar servicios:

1. [ ] **Mod visible**: la app `curricular-mapping` aparece en la navegacion de la suite con su `label`/`icon`.
2. [ ] **Backend**: en `http://localhost:4000/graphql` (header `X-Tenant-ID: <tenant>`) los objetos del mod estan expuestos (query de list retorna vacio o el seed).
3. [ ] **Frontend**: `http://localhost:3000/<tenant>/<Object>/default_<Object>_list` renderiza el listado.
4. [ ] **Detail/edit**: abrir un registro muestra el layout view/edit correcto.
5. [ ] **Capabilities**: las capabilities del mod aparecen registradas (RBAC) y gatean las acciones.
6. [ ] **i18n**: labels en `es`/`en`/`pt` resuelven (sin keys crudas visibles).
7. [ ] **Tests**: `cd mods/curricular-mapping && npx vitest run` en verde.
8. [ ] **Dark mode**: toggle de theme sin contraste roto (si hay UI custom).

---

## 8. Definicion de listo (DoD)

- [ ] Estructura minima de carpetas y archivos raiz presentes (seccion 3).
- [ ] `config/app.json` y `capabilities.json` validos.
- [ ] Objetos, layouts, lang y (si aplica) resolvers/seed/componentes del dominio implementados.
- [ ] Mod registrado en `up1/package.json` (`uPlannerMods` + `workspaces`).
- [ ] `sync` + `codegen` + `tenant:migrate` corren sin error.
- [ ] Verificacion (seccion 7) completa: mod visible, CRUD basico funciona, capabilities registradas, tests en verde.
- [ ] `README.md`, `CLAUDE.md` y `.ai/` del mod escritos para el dominio real.

---

## Referencias

- Mod plantilla: `mods/curriculum-design/` (README, CLAUDE.md, docs/INDEX.md, .ai/).
- Registro y sync: `up1/package.json` (`uPlannerMods`, `workspaces`) y `up1/scripts/actions.js`
  (`updateMods`, `installModDependencies`, `syncMods`).
- Reglas transversales de mods citadas en `curriculum-design/capabilities.json` y `CLAUDE.md`
  (RULE-mods-014, RULE-mods-037, RULE-layout-031, patron `*Validated`).
