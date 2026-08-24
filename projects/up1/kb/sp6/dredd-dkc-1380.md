# Dredd-DKC — review PR #17 (fix/lang-arq) + leccion del gate de frescura

> **Origen**: corrida de prueba de la skill `dredd-dkc` (juez de PRs) sobre el PR #17 de
> `uplanner/curriculum-design`, el 2026-07-10. El nombre `dredd-dkc-1380` refiere al contexto: el
> clone local estaba en la rama `feat/UPONE-1380-datalog-history`, y ese estado desactualizado fue
> lo que produjo un falso bloqueante — la leccion principal de este documento.
> **Naturaleza**: registro de review + learn de proceso (mejora de la skill). No es un fix de core.

---

## PR analizado

- **PR #17** — "Fix/lang arq" · `uplanner/curriculum-design` · autor nelson.cornejo ·
  `fix/lang-arq` → `develop` · 69 archivos · **sin ticket de Jira enlazado**.
- Es la parte **mod** de una migracion i18n en fases (`vue-i18n` → `i18next`): renombra 24
  catalogos `lang/es_CL@<Obj>.json` → `lang/{es,en,pt}/<Obj>.i18n.json`, reescribe interpolacion
  `{x}` → `{{x}}` (i18next), migra componentes a `i18next-vue`, actualiza tests/storybook/doc, y
  elimina `_source_module`.

## Veredicto FINAL (corregido): aprobable con observaciones

El primer pase declaro un 🔴 S0 "bloquea" (mas un 🟠 y dos 🟡). **La verificacion contra los
`origin/develop` reales lo dio vuelta**: casi todos esos hallazgos eran **falsos positivos por leer
un checkout local desactualizado**. Detalle abajo.

### Hallazgos que se CAYERON tras verificar contra `origin/<destino>`

| Hallazgo inicial | Por que se cae |
|---|---|
| 🔴 S0 — "el mod migra a i18next pero la plataforma sigue en vue-i18n (deps ausentes, sync no copia, loader no resuelve)" | `suite/origin/develop` (`cdebfd4`, **22 commits adelante** del checkout local `d37eb00`) **ya migro**: `i18next ^26.3.5` + `i18next-vue ^5.4.0` en `package.json`, `plugins/i18n.ts` en "Phase 6: vue-i18n removed" cargando de `/locales`, y `scripts/publish-i18n.js` + `scripts/i18n-parity-baseline.json` **existen**. La plataforma ya esta migrada; el mod se pone al dia. |
| 🟠 S1 — "falta migrar `core_DataLog`" | El `develop` de curriculum-design (`2b17c2d`) **no tiene** `es_CL@core_DataLog.json` — tiene `es_CL@ChangeLog.json`. El subagente leyo la rama local `feat/UPONE-1380-datalog-history` (donde si existe core_DataLog), no `develop`. El PR esta a **0 commits** de develop. |
| 🟡 S2 — "publish-i18n.js y validador de paridad no existen" | Existen en `suite/origin/develop` (`publish-i18n.js`, `i18n-parity-baseline.json`). La doc del PR describia el flujo real de plataforma. |

### Hallazgos que SOBREVIVEN (verificados, independientes de rama)

- 🔵 **Consulta** — el PR no enlaza ticket de Jira (ni titulo, ni rama, ni commits). Sin AC
  trazable. Los tickets de nombre cercano son de otros clientes (UCONT-65, USUITE-14800, OPS-1282).
- ⚪ **S3** — `objects/activity.json` cita `lang/es/activity.i18n.json` (minuscula) vs el real
  `Activity.i18n.json`; inocuo en macOS, rompe en CI Linux si algo lo consumiera.
- 🟡 **KB / doc viva** — `RULE-mods-015` (`must`) describe el formato viejo
  `lang/{locale}@{Object}.json`; con la migracion queda **stale**. Hay que reescribirla si i18next
  es la direccion oficial (decidir fuente de verdad).
- **Pendiente (no bloqueante)** — smoke en UPU que confirme que los catalogos nuevos del mod los
  levanta el `publish-i18n.js` de suite.

## Leccion principal (mejora de la skill) — gate de frescura

**El analisis leyo el working tree / rama local, que estaba desactualizado**, y por eso invento un
bloqueante inexistente:
- `suite/` local 22 commits atras de `origin/develop`.
- `curriculum-design` local en `feat/UPONE-1380-datalog-history`, no en `develop`.

**Fix aplicado a las skills `dredd` y `dredd-dkc`**: se agrego un **gate de frescura** en la
verificacion obligatoria — antes de afirmar cualquier hallazgo, `git fetch` y analizar contra
`origin/<rama-destino-del-PR>` de **cada repo involucrado** (incluidos los hermanos de los que
depende un cambio cross-repo), nunca el checkout local. Si el local difiere de `origin/<destino>`,
gana `origin`. Registrar el commit exacto contra el que se verifico.

**Meta-leccion**: el paso "verificar antes de postear" (parent) atrapo el falso bloqueante antes de
publicarlo. Sin ese paso se habria posteado un "critica — bloquea" equivocado en el PR.

## Fuentes de la verificacion

- Bitbucket API (`bb.sh`): meta/diff/diffstat de PR #17; `statuses` del commit fuente `6ca0bc10`
  → **sin CI** (repo sin pipeline o token sin scope `read:pipeline`).
- `suite` `origin/develop` `cdebfd4` (2026-07-10): `package.json` (i18next/i18next-vue),
  `plugins/i18n.ts`, `scripts/publish-i18n.js`, `scripts/i18n-parity-baseline.json`.
- `curriculum-design` `origin/develop` `2b17c2d` (2026-07-09): `lang/` en formato viejo `es_CL@`,
  con `es_CL@ChangeLog.json`, sin `core_DataLog`.
- KB up1: `grep -ri i18next` = 0; `RULE-mods-015` describe el formato de lang que el PR reemplaza.
