---
id: SPEC-mcp-003
project: up1
type: spec
module: mcp
category: mcp
tags: [up1, mcp, desarrollo-local, oauth, clerk, clerk-test, up1-start, dev-loop, mod-packs, ai-pack, curriculum-design, curriculum-mapping, sync, troubleshooting]
fecha: 2026-08-27
repos: [uplanner/mcp (up1-mcp, gitlink del monorepo up1), uplanner/up1 (object-manager, mods)]
sources:
  - mcp/README.md
  - mcp/.env.example
  - mcp/scripts/sync-mods.js
  - mcp/src/mods/types.js
  - mcp/src/mods/academic-scheduling/index.js
  - up1-start.sh
  - object-manager/src/services/auth/userExtractor.js
---
# MCP de uP1 — Desarrollo local y uso

Como levantar el MCP en local, conectarlo a un cliente, autenticar, y como agregar un mod pack. Complementa [overview.md](overview.md) y [services.md](services.md).

## Indice
1. [Loop de dev local](#1-loop-de-dev-local)
2. [Conectar un cliente (Claude Code)](#2-conectar-un-cliente-claude-code)
3. [Autenticacion: el gotcha de la identidad](#3-autenticacion-el-gotcha-de-la-identidad)
4. [Agregar un mod pack](#4-agregar-un-mod-pack)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Loop de dev local

El MCP corre como un servicio HTTP mas de la plataforma:

- **Via `up1-start.sh`** (recomendado): flag `--mcp` (incluido en `--all`). Arranca en `:4100`, corre `npm run sync` antes (regenera `src/mods/`) y espera a que escuche. Ver `operations/local-environment.md`.
- **Directo**: `cd uplanner/up1/mcp && npm run dev` (`node --watch`, hot-reload al editar `src/`).

Requisitos:
- **`.env`** (gitignored). Base en `mcp/.env.example`. Claves minimas: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (reusar las de la suite), `UP1_GRAPHQL_URL=http://localhost:4000/graphql`, `PORT=4100`, y en dev `UP1_DEV_FALLBACK_TENANT=<TENANT>`.
- **object-manager corriendo** en `:4000`, y con `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` en SU `.env` (ver [seccion 3](#3-autenticacion-el-gotcha-de-la-identidad)).
- **`npm run sync`** despues de clonar y cada vez que cambien las fichas `ai/` de un mod: genera `mcp/src/mods/<mod>/` desde `mods/<mod>/ai/` (no versionado). Verificacion: `GET :4100/health` → `{ ok: true }`; `GET :4100/health/deep` → `{ ok, objectManager: "up" }`.

## 2. Conectar un cliente (Claude Code)

Es un MCP **HTTP** (no stdio). Registro como servidor http apuntando a `http://localhost:4100/mcp`:

```bash
claude mcp add --transport http up1-mcp http://localhost:4100/mcp -s user
```

La primera conexion dispara el **OAuth de Clerk** en el browser. Tras autorizar, el token queda guardado y las tools `mcp__up1-mcp__*` aparecen conectadas. Cambios en el registro toman efecto al **reiniciar** el cliente (no un simple reconnect).

## 3. Autenticacion: el gotcha de la identidad

Dos condiciones que rompen la conexion de datos si faltan (ambas confirmadas en dev):

1. **El object-manager necesita la Clerk publishable key.** Verifica los OAuth access tokens con `authenticateRequest`, que exige **pubkey + secret**. Su `.env` suele tener solo `NUXT_CLERK_SECRET_KEY`; hay que agregar **`NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** (misma instancia que la suite). Sin ella: todo request del MCP falla con `AUTH_TOKEN_INVALID` / 401 aunque el token sea valido (`object-manager/src/services/auth/userExtractor.js`, `verifyClerkOAuthToken`).

2. **La cuenta del OAuth debe mapear a un `core_User` del tenant.** El token OAuth trae solo el `sub` (clerkId), sin email, asi que el object-manager matchea **directo por `clerkUserId`** — el auto-link por email (`allowLink`, que si salva a la suite) NO aplica. En dev suele haber dos cuentas Clerk para el mismo dev:
   - la **real** (`persona@dominio`), y
   - la de **test** (`persona+clerk_test@dominio`, OTP `424242`) que es la que usa la suite en dev y la que esta linkeada al `core_User`.

   El OAuth del MCP debe autenticarse con **la misma cuenta que mapea al `core_User`** (normalmente la `+clerk_test`). Si autenticas con la otra, da `USER_NOT_FOUND` / "cuenta no habilitada en esta institucion". Para forzar la cuenta correcta en el OAuth, autenticar en **ventana incognito** (la sesion de Clerk del browser queda pegada a la ultima cuenta). **No** cambiar el `clerkUserId` del `core_User` a la otra cuenta: rompe el login de la suite en dev.

## 4. Agregar un mod pack

Para que un dominio (ej. curriculum-design, curriculum-mapping) sea **identificable y responda con datos basicos**, alcanza con un pack de identificacion — **no** hace falta escribir tools ni resolvers, porque las lecturas salen por las tools genericas (ver [services.md](services.md#5-curriculum-design--mapping-que-sabe-hoy)).

Lo minimo: un archivo `mods/<mod>/ai/index.js` que exporte un `ModPack` (forma en `mcp/src/mods/types.js`):

```js
export const pack = {
  id: "<app-name>",          // DEBE ser igual al name del app (getAppsFiltered), ej. "curriculum-design"
  label: "Curriculum Design",
  routingHints: ["programa academico", "curriculo", "plan de estudios", "malla", "asignatura", ...],
  tools: [],                 // vacio: lecturas via tools genericas; sin fichas
  about() { return "Curriculum design: academic programs, study plans, courses and offerings..."; },
  domainDoc: {               // para el 'que puedes hacer' en lenguaje de negocio
    whatIsIt: "Programas academicos, planes de estudio, asignaturas y ofertas.",
    whatYouCanDo: ["Consultar programas, planes, asignaturas y ofertas."],
    limits: ["Versionar/clonar, prerequisitos, perfil de egreso: no expuesto aun."],
  },
};
```

Campos: `id`, `label`, `routingHints` y `tools` (aunque vacio) son lo minimo que el motor exige; `about()` alimenta la tool `about`; `domainDoc` da el texto de negocio. `objects` es **solo documental** (no lo consume el engine); `contracts` solo lo usa `get_create_guide`. Un pack completo (con fichas, contratos y `registerExtra`) es `mods/academic-scheduling/ai/index.js`.

Pasos: crear el `ai/index.js` → `npm run sync` (solo mirror-copy si `tools: []`) → reiniciar el MCP → reconectar. Resultado: `about` describe el dominio, el ruteo manda sus preguntas ahi, y los datos basicos salen por las genericas.

> **Los dos gates** (ver [overview](overview.md#6-activacion-de-mods-los-dos-gates)): el `id` del pack debe coincidir con el `name` del app (`up1_suite_app`), y el app debe estar activo para el rol. Verificado en un tenant demo: los apps `curriculum-design` y `curriculum-mapping` estan activos; solo falta su pack.

## 5. Troubleshooting

| Sintoma | Causa probable | Fix |
|---|---|---|
| Todo request 401 `AUTH_TOKEN_INVALID` | object-manager sin pubkey de Clerk | Agregar `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` a `object-manager/.env` y reiniciar el OM |
| `USER_NOT_FOUND` / "cuenta no habilitada" | El OAuth autentico con una cuenta Clerk sin `core_User` en el tenant | Reautenticar con la cuenta correcta (`+clerk_test`), en incognito |
| El OAuth solo ofrece Allow/Deny de otra cuenta | Sesion de Clerk pegada en el browser | Autenticar en ventana incognito, o cerrar sesion de Clerk primero |
| Un mod activo no aparece como tools | Falta su pack `ai/` (gate 2) | Crear `mods/<mod>/ai/index.js` + `npm run sync` |
| `/health/deep` → object-manager down | OM no corriendo en `:4000` | Levantar el object-manager |
| Tools de mod no aparecen tras editar `ai/` | No se corrio sync | `npm run sync` en el workspace mcp + reiniciar |
