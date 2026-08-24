# Guia — Que debe contener un mod (y como se hizo en curriculum-design)

> Referencia GENERICA para crear mods nuevos en up1. Verificada contra el codigo en `uplanner/up1`
> (2026-07-21). Fuentes: `scripts/create-mod.js`, `mods/hello-world-mod/` (template),
> `mods/curriculum-design/` (mod maduro de referencia).
>
> **Para el mod de [UPONE-1453](https://u-planner.atlassian.net/browse/UPONE-1453) especificamente**
> (nombre canonico **`curricular-mapping`**), el plan autoritativo es el que publico el dev:
> [CREATE-curricular-mapping.md](CREATE-curricular-mapping.md). Esta guia es el trasfondo generico.

---

## 0. Dos niveles

| Nivel | Que es | Trae |
|---|---|---|
| **Scaffold minimo** | `npm run create-mod` | Carpetas de contenido + `capabilities.json` vacio + `config/app.json` base + `package.json` con 3 scripts |
| **Mod maduro (cd)** | Scaffold + tooling productivo | Lo anterior + vitest/tsconfig/eslint/storybook/husky/vueform + tests por capa + docs + `.ai/` |

`hello-world-mod` es el punto intermedio ideal para copiar (trae todas las carpetas de contenido +
config/settings + events + flows + tests + `.ai/` + README). Para paridad de calidad, copiar ademas el
tooling de `curriculum-design`.

---

## 1. Estructura completa

### 1.1 Contenido (se SINCRONIZA al core via `npm run sync`)

| Carpeta / archivo | Que contiene | Como se hizo en cd | Sync destino |
|---|---|---|---|
| `objects/*.json` | Definiciones de objetos (source of truth de DB + API) | 16 objetos (Activity, Curriculum, CurricularSection, planEntry, requirement, ...) con bloque `metadata` (label, gender, `enableDataLog`, `polymorphicChildren`, `directChildren`, `uniqueConstraints`, `prefillFrom`, `versioning`) | object-manager/objects |
| `objects/RecordTypes/rt__<RT>__<base>.json` | Proyecciones tipadas 1:1 (campos del subtipo) | `rt__Plan__curriculum`, `rt__Bibliography__curricularsection`, `rt__Group__requirement`, ... | object-manager/objects |
| `logic/<name>.resolver.js` + `<name>.schema.graphql` | Resolvers custom + su typeDef, **en pares** | `curriculum-create`, `curriculum-update`, `activity`, `workflow*`, `syllabus-offering`, ... + `helpers/` + `errors.js` | object-manager/resolvers + typeDefs |
| `config/app.json` | Manifiesto del mod (nav + tenants) | ver §2 | tenant DBs |
| `config/layouts/*.json` | Layouts JSON | 58 layouts: `default_<Obj>_{list,view,edit,create}` + `default_rt__<RT>__<base>_*` | tenant DBs (`up1_layen_layout`) |
| `config/reports/`, `config/settings.json` | Reportes + settings del mod | (settings en hello-world) | tenant DBs |
| `capabilities.json` | RBAC del mod | 45 caps `mod/curriculum-design:<action>` + `riskLevel` | DB |
| `modsComponents/<Comp>/` | Componentes Vue (1 carpeta c/u: `.vue` + `.stories.ts` + `.spec.ts` + Element wrapper) | ColorPicker, IconPicker, CurriculumMesh, CompositeSectionTree, RichTextRenderer, ActivityStatusBadge | layout/ + suite/modsComponents |
| `modsComposables/*.ts` | Composables Vue | (2) | suite |
| `lang/{en,es,pt}/*.i18n.json` | i18n, un archivo por objeto + `common.i18n.json` | es: 24 archivos (por objeto) | suite/lang |
| `css/{1-theme..5-contextId}/` | Estilos por capa de cascada | (estructura creada, vacia) | suite/css |
| `events/*.json` | Definiciones de eventos BullMQ | (hello-world: hw-*.json) | object-manager |
| `flows/*.json` | Workflows n8n | (hello-world: event-handler) | n8n |
| `seed/*.js` | Datos semilla + cleanup + smoke | `_data-*.js` (curriculum, academicprogram, graduation-profile), `_cleanup.js`, `SMOKE-UPU.md`, `README.md` | tenant DBs |

### 1.2 Tooling / meta (NO se sincroniza — vive en el repo del mod)

| Archivo / carpeta | Rol | Como se hizo en cd |
|---|---|---|
| `package.json` | Nombre `@uplanner/<mod>`, scripts | test/watch/coverage, lint, lint:fix, typecheck, storybook, build-storybook, prepare(husky) |
| `vitest.config.ts` | Config de test | 2 entornos (node/jsdom) + aliases (vue single-copy, `@om`, stubs) — ver §3 |
| `tsconfig.json` | TS | target ES2020, strict, moduleResolution bundler, `noEmit`, include modsComponents/tests/types |
| `eslint.config.js` | Lint | **heredado de `layout/eslint.config.js`** con overrides del mod (no ignora modsComponents, Vueform `el$`, etc.) |
| `.storybook/` | Storybook | `main.ts` (stories en modsComponents/**), `preview.ts`, `mock-apollo.ts`, `useApolloClient.stub.ts`; `docgen:false` (workaround) |
| `.husky/` | Git hooks | `pre-push` |
| `vueform.config.ts` | Config Vueform | — |
| `types/*.d.ts` | Tipos del mod | (2) |
| `scripts/migrations/` | Migraciones puntuales del mod | (1) |
| `docs/` | Documentacion | architecture/ guides/ patterns/ reference/ user-guide/ |
| `.ai/` | Contexto AI-optimizado | `CONTEXT.md`, `PATTERNS.md`, `TASKS.md`, `TROUBLESHOOTING.md` |
| `README.md`, `CLAUDE.md` | Doc humana + instrucciones para Claude | — |

---

## 2. `config/app.json` — el manifiesto

Campos (cd):

```json
{
  "name": "curriculum-design",
  "label": "Curriculum Design",
  "icon": "bi-journal-text",
  "iconBg": "#0EA5E9",
  "order": 10,
  "tenants": { "UPU": {} },
  "version": "0.1.0",
  "defaultObjects": ["Activity", "BibliographyReference", "AcademicProgram", "Offering", "Curriculum", "core_DataLog"],
  "up1ModelVersion": 1
}
```

- **`tenants` — gotcha:** el scaffold genera **array** `["TEST"]`, pero cd usa **objeto** `{ "UPU": {} }`
  (config por tenant). Usar la forma objeto con `UPU` para el entorno de prueba.
- **`defaultObjects`**: objetos top-level del nav del app. (Para 1451, quitar `BibliographyReference` de aca).
- **`up1ModelVersion`**: se lee de `object-manager/objects/model.json`.

---

## 3. Testing (convencion de cd)

- **`vitest.config.ts` con dos entornos:**
  - `node` — logica pura: `tests/unit/`, `tests/integration/`, `modsComponents/**/*.spec.ts`.
  - `jsdom` — componentes Vue: `tests/component/*.component.spec.ts` (declaran `@vitest-environment jsdom`
    en el docblock; el plugin `vue()` esta activo global).
- **Aliases criticos para correr DENTRO del monorepo up1:**
  - `vue` → una sola copia del root (dos copias rompen reactividad: "Missing ref owner context").
  - `@om` → `object-manager/src`, `@om-scripts` → `object-manager/scripts`.
  - Stubs locales: `tests/stubs/{atoms,molecules,useApolloClient,i18next-vue}.ts` para aislar
    componentes/composables que post-sync resolverian en `layout/`/`suite/`.
- **Capas de test:**

  | Capa | Que prueba | Entorno |
  |---|---|---|
  | `tests/unit/` | Logica pura, prisma mockeado | node |
  | `tests/integration/` | Reglas de negocio (resolvers via `_internals`, payloads, validaciones, a11y) | node |
  | `tests/component/` | Componentes Vue + a11y (axe-core) | jsdom |
  | `tests/llm-e2e/` | Escenarios MCP/agente (`fixtures/`, `scenarios/`, `runner-instructions.md`) | — |
  | `tests/stubs/` | Dobles de atoms/molecules/apollo/i18n | — |

- **Scripts:** `test` (`vitest run`), `test:watch`, `test:coverage`, `lint`, `lint:fix`,
  `typecheck` (`vue-tsc --noEmit`), `storybook` (puerto propio — cd usa 6010), `build-storybook`.
- **Regla dura (learn [UPONE-1382](https://u-planner.atlassian.net/browse/UPONE-1382)):** para codigo de
  datos (deep-clone, proyecciones RT/ext, enums, casing de FK) el **prisma mockeado consagra bugs de
  runtime** — exigir **integration contra BD real**. Resolver nombres de modelo/FK por introspeccion.

---

## 4. Convenciones por pieza

- **objects/**: PascalCase; RecordTypes con naming `rt__<RtName>__<baseObject>`; los campos del subtipo
  viven en la proyeccion 1:1; el bloque `metadata` declara children (`polymorphicChildren` via
  ownerType/ownerId, `directChildren` via FK), `versioning`, `prefillFrom`, `enableDataLog`, etc.
- **logic/**: cada custom endpoint es un **par** `<name>.resolver.js` + `<name>.schema.graphql`. Patron
  recomendado: **adapter delgado "build + delegate"** — el resolver del mod arma el input y DELEGA en el
  `createInstance`/`updateInstance` **generico de core** (dynamic import dual-path), sin reimplementar
  el split base/RT. Errores centralizados en `logic/errors.js`; helpers en `logic/helpers/`.
- **capabilities.json**: `{ "name": ..., "description", "riskLevel": "low|medium|high" }`. Dos niveles:
  **de modulo** con prefijo `mod/<mod>:<action>` (o `mod/<mod>/<domain>:<action>`), y **object-level SIN
  prefijo `mod/`** — `<objeto>:view|create|modify|delete` (RULE-mods-037). NO usar legacy
  (`objectdefinition:view`). Referenciar el ticket/HU en la `description`.
- **modsComponents/**: una carpeta por componente con el `.vue`, su `Element.vue` wrapper (para el
  layout engine), `.stories.ts` (Storybook) y `.spec.ts` (test). Atoms/molecules se reusan de `layout/`
  (no Bootstrap directo).
- **lang/**: un `*.i18n.json` por objeto + `common.i18n.json`, por locale (en/es/pt).
- **seed/**: `_data-<entidad>.js` idempotentes + `_cleanup.js` + `SMOKE-*.md` (checklist de humo) + README.

---

## 5. Registro y sync

1. Mod = **repo standalone** (rama `develop`), clonado en `mods/<mod>/`.
2. **Registro DOBLE en `up1/package.json`:** agregar a **`uPlannerMods`** (`<mod>.git`) **y** al array
   **`workspaces`** (`mods/<mod>`). *(Ambos — no solo uPlannerMods.)*
3. **Los mods NO son npm workspaces para install** — se instalan aparte con `npm run install-mods`
   (`scripts/actions.js:installModDependencies`).
4. **Secuencia de boot:** `npm run update-repos` (clona/actualiza desde bitbucket) → `npm run
   install-mods` → `npm run sync` → `npm run codegen --workspace=@uplanner/object-management-backend` →
   `npm run tenant:migrate ...` → `./up1-start.sh --om --suite`.
5. **`npm run sync`** propaga en 10 fases (mirror, merge, prisma schema, capabilities, logic,
   apps&layouts, default layouts, seed, flows, drift check). **Correr tras cada cambio.**
6. **Sync es append-only** para destinations del core existentes: NO propaga eliminaciones de fields. Si
   el mod elimina un campo de un objeto, hay que **borrar el destination del core y re-sincronizar**.
7. NO editar los archivos sincronizados en los core workspaces (`suite/modsComponents/`, `suite/lang/`,
   etc.) — se regeneran.

---

## 6. Checklist para crear `curricular-mapping` (1453)

> Plan especifico publicado por el dev: [CREATE-curricular-mapping.md](CREATE-curricular-mapping.md).
> El repo `curricular-mapping` **ya existe** (clonado, solo `.gitignore`) → arrancar por el contenido.

- [ ] Scaffolding de contenido (o copiar base de `hello-world-mod`) en `mods/curricular-mapping/`.
- [ ] Copiar tooling de cd: `vitest.config.ts`, `tsconfig.json`, `eslint.config.js`, `.storybook/`,
      `.husky/`, `vueform.config.ts`, `types/`, estructura `tests/{unit,integration,component,llm-e2e,stubs}`.
- [ ] `config/app.json`: `name: "curricular-mapping"`, `tenants: { "UPU": {} }`, `icon: "bi-diagram-3"`,
      `iconBg: "#8B5CF6"`, `order: 11`, `defaultObjects: []`.
- [ ] `capabilities.json`: `mod/curricular-mapping:view|edit` (+ riskLevel).
- [ ] `.ai/` (CONTEXT/PATTERNS/TASKS/TROUBLESHOOTING) + README + CLAUDE.md.
- [ ] **Registrar en `up1/package.json`:** `uPlannerMods` (`curricular-mapping.git`) **+** `workspaces`
      (`mods/curricular-mapping`).
- [ ] Boot: `update-repos` → `install-mods` → `sync` → `codegen` → `tenant:migrate` → `up1-start.sh`.
- [ ] Verificar (mod visible en suite, CRUD, capabilities, i18n, tests verdes) — seccion 7 de la guia del dev.

---

## 7. Gotchas verificados

1. **`tenants` shape:** objeto `{ "UPU": {} }` (cd), no array `["TEST"]` (scaffold).
2. **Vue single-copy** en `vitest.config` (alias `vue` → root) o los tests de componente rompen.
3. **Storybook `docgen:false`** en cd (workaround de un bug del parser docgen; la doc va inline en las
   stories).
4. **eslint se hereda de `layout/`** con overrides — no se escribe de cero.
5. **Seguridad — `create-mod` ≠ generador desde maqueta.** `create-mod` (esta guia) es el scaffold
   oficial y seguro. La preocupacion de Francisco ([1453](https://u-planner.atlassian.net/browse/UPONE-1453))
   es sobre un **generador de mod-a-partir-de-la-maqueta HTML** (otro flujo, de JP/Laud) cuyo output hay
   que auditar antes de productivizar. Para 1453 usar el scaffold oficial, no ese generador.
