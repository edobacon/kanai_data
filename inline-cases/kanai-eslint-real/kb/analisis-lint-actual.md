# Analisis: estado del lint en kanai-app y opciones de integracion

Medido el 2026-10-01 sobre la rama `setup` (commit 7e5c555), con Node 24.

## Diagnostico

- `eslint.config.mjs` es la "config minima de Fase 0": solo trae `ignores`. ESLint responde "File ignored because no matching configuration was supplied" para todos los `.ts/.mts/.vue`.
- Consecuencia: `pnpm lint` (`eslint .`), que corre en el job "Calidad" de `.github/workflows/ci.yml`, no revisa ningun archivo. Hay 917 archivos sin revisar en `app`, `server`, `shared`, `scripts` y `tests`.
- El propio archivo anticipa: "En una fase posterior se integra @nuxt/eslint".
- Dependencias actuales: `eslint ^9.17.0` (resuelve 9.39.5). No hay `typescript-eslint`, `eslint-plugin-vue` ni `@nuxt/eslint`.

## Como se midio (reproducible, sin tocar el repo)

Se instalo en una carpeta aparte (scratchpad) `eslint@9`, `typescript-eslint`, `eslint-plugin-vue`, `vue-eslint-parser` y `@nuxt/eslint-config`, y se corrio desde la raiz de kanai-app con `eslint -c <config externa> -f json app server shared scripts tests`.

Config minima medida:

```js
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default [
  ...pluginVue.configs['flat/base'],
  { ignores: ['.nuxt', '.output', 'dist', 'node_modules', '.data', 'coverage', 'docs/api'] },
  {
    files: ['**/*.{ts,mts,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, ecmaVersion: 'latest', sourceType: 'module', extraFileExtensions: ['.vue'] },
    },
    plugins: { '@typescript-eslint': tseslint.plugin, vue: pluginVue },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'vue/no-v-html': 'error',
      'vue/comment-directive': 'error',
    },
  },
]
```

Preset de Nuxt medido: `createConfigForNuxt({ features: { typescript: true, stylistic: false } })` de `@nuxt/eslint-config/flat`, con `no-explicit-any` en `error`.

## Hallazgo clave: los eslint-disable de v-html necesitan `vue/comment-directive`

Hay 32 comentarios `<!-- eslint-disable-next-line vue/no-v-html -->` en los templates. Solo funcionan si esta activa la regla `vue/comment-directive` (la trae `pluginVue.configs['flat/base']`). Sin ella, ESLint reporta 52 v-html en vez de 20.

## Resultados

| Regla | Config minima | Preset Nuxt |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | 0 | 0 |
| `@typescript-eslint/no-unused-vars` | 42 | 42 |
| `vue/no-v-html` sin anotar | 20 | 20 |
| eslint-disable sin efecto (aviso) | 44 | 43 |
| Otras reglas del preset | 0 | 124 |
| **Total** | **106 en 47 archivos** | **232 en 106 archivos** (90 autocorregibles) |

Las "otras" del preset son: `no-useless-assignment` 42, `import/no-duplicates` 28, `import/first` 24, `@typescript-eslint/no-dynamic-delete` 12, y 18 sueltas (`vue/html-self-closing`, `vue/attributes-order`, `unified-signatures`, `consistent-type-imports`, `prefer-const`, `no-useless-escape`, etc.).

### no-unused-vars (42)

Casi todos son imports sin uso. Por carpeta: `server/dispatch` 15, `tests` 14, `scripts` 6, `app` 5, resto de `server` 2. Ejemplos: `server/dispatch/gateAutofix.ts:2` (`spawn`), `server/dispatch/gateOutcome.ts:3` (`and`, `desc`), `app/pages/chat.vue:336` (`CLOSE_PATH`), `app/pages/tickets/[id].vue:402` (`artifactIsCode`). Hay que revisar cada uno: una variable asignada y nunca leida puede ocultar un bug, no solo ser basura.

### v-html sin anotar (20)

| Archivo | Casos | Funcion que produce el HTML |
|---|---|---|
| `app/pages/chat.vue` | 11 | `renderMarkdown`, `formatExec`, `highlightLine` |
| `app/pages/codigo.vue` | 4 | `hlCell`, `highlightLine` |
| `app/pages/ide.vue` | 2 | `line.html`, `markdownHtml` |
| `app/pages/tickets/[id].vue` | 2 | (revisar) |
| `app/components/DataModelFlow.vue` | 1 | `md` |

Antes de anotarlos con `eslint-disable` hay que verificar que cada funcion escapa o sanitiza (DOMPurify) el contenido. Es revision de seguridad (XSS), no tarea mecanica: conviene un commit propio.

### eslint-disable sin efecto (44)

ESLint 9 reporta por defecto (`reportUnusedDisableDirectives: warn`) los `eslint-disable` de reglas que no estan activas. Aqui son de `no-console` (scripts y server) y `no-control-regex` (`server/mcp/confirmNotifier.ts:19`). Si se activara `no-console` aparecerian 204 violaciones mas (134 en `scripts`, 68 en `server`).

## Decision 1: via de integracion

1. **Modulo `@nuxt/eslint`.** Se agrega a `modules` en `nuxt.config.ts`; `nuxt prepare` genera `.nuxt/eslint.config.mjs` y `eslint.config.mjs` queda como `withNuxt({...})`.
   - Pros: via oficial, la que anticipaba el comentario; conoce Vue, TS y la estructura de Nuxt; inspector en devtools.
   - Contras: el lint depende de `nuxt prepare` (en CI ya lo corre el `postinstall`; en local falla si `.nuxt` no existe o esta viejo); trae el preset completo (232 avisos) salvo que se apaguen reglas; dependencia mas pesada (import-x, jsdoc, unicorn, regexp).
2. **Config flat propia** con `typescript-eslint`, `eslint-plugin-vue` y `vue-eslint-parser`.
   - Pros: solo las reglas declaradas (106 avisos); no depende de `.nuxt`; la mas liviana.
   - Contras: mantenimiento manual; hay que actualizar el comentario del archivo.
3. **`@nuxt/eslint-config` sin el modulo** (`createConfigForNuxt`).
   - Pros: preset de Nuxt sin depender de `nuxt prepare`.
   - Contras: mismo volumen de reglas y dependencias que la via 1.

Impacto comun: `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs` (y `nuxt.config.ts` en la via 1). El job "Calidad" pasa de no revisar nada a fallar ante cualquier violacion. Reversible por completo con un revert del commit de config; no toca codigo de runtime.

## Decision 2: tratamiento de lo existente

- **A. Arreglar todo.** Quitar los 42 sin uso, revisar y anotar los 20 v-html, y resolver los 44 eslint-disable sin efecto.
  - Pros: CI en verde y limpio, sin deuda guardada.
  - Contras: mas esfuerzo; mezcla limpieza con revision de seguridad.
- **B. Baseline.** ESLint 9.24+ trae supresiones masivas: `eslint --suppress-all` genera `eslint-suppressions.json`. Mejor que `warn` con `--max-warnings`, porque es por archivo y regla.
  - Pros: se integra de inmediato y cualquier violacion nueva rompe CI.
  - Contras: deuda versionada en un JSON; los v-html quedarian silenciados sin revisar (no recomendado para una regla de seguridad).
- **C. Incremental por carpeta.** Primero `app/` (25 avisos) y `shared/` (0); despues `server/`, `scripts/` y `tests/`.
  - Pros: tandas chicas y revisables.
  - Contras: config mixta durante la transicion; `server` y `tests` siguen sin revisar mientras tanto.

## Decision 3: eslint-disable sin efecto

- **a.** Borrarlos (`eslint --fix` los quita).
- **b.** Activar `no-console` y `no-control-regex` (+205 violaciones).
- **c.** Apagar el aviso (`linterOptions.reportUnusedDisableDirectives: 'off'`).

## Recomendacion del analisis (la decision es del dev)

Via 2 con A: con 106 avisos, arreglar todo es manejable y evita deuda guardada. La revision de los 20 v-html va en un commit separado de la limpieza de imports. Si se prefiere el preset de Nuxt, la combinacion razonable es via 1 con B.
