# Tests baseline rotos en `develop` — origen UPONE-1379 (graduation-profile)

> **Fecha:** 2026-07-09 · **Repo:** `curriculum-design` (mod) · **Rama:** `develop` (`ec157c1` — "Merged in UPONE-1379 (pull request #14)"). Reporte directo del estado de la suite de tests en `develop`.

## Resumen ejecutivo

- En `develop` fallan **5 tests**, en 4 archivos, todos del mod `curriculum-design`.
- **Todos se originan en UPONE-1379** (commit `77dfb3c` "UPONE-1379 se agrega RecordType GraduationProfile", mergeado en el PR #14 `ec157c1`).
- **Causa común:** UPONE-1379 agregó artefactos (RecordType, layouts, valor de enum, paso de seed) **sin actualizar los tests baseline ni los datos que esos tests verifican**.

**Estado de la suite en develop (4 archivos afectados):** `Test Files 4 failed (4)` · `Tests 5 failed | 132 passed (137)`.

## Detalle de los 5 tests

### 1 · `tests/integration/recordtypes-declared.test.ts` — "contiene exactamente los 12 RTs esperados"

- **Assertion:** `expected [ …(13) ] to deeply equal [ …(12) ]`
- **RT de más:** `rt__GraduationProfile__curricularsection.json`
- **Causa:** el test hardcodea 12 RecordTypes esperados. UPONE-1379 agregó un 13º (GraduationProfile) sin actualizar la lista esperada del test.
- **Fix:** agregar `rt__GraduationProfile__curricularsection.json` al array esperado y subir el conteo a 13.

### 2 · `tests/integration/recordtypes-declared.test.ts` — "RT GraduationProfile NO existe en el mod"

- **Assertion:** `expected true to be false`
- **Causa:** el test enforza DECISION-008 ("RTs draft no se declaran") incluyendo `GraduationProfile` en la lista `DRAFT_RTS_NOT_DECLARED`. UPONE-1379 declaró ese RT → contradice la decisión que el test aún verifica.
- **Fix:** sacar `GraduationProfile` de `DRAFT_RTS_NOT_DECLARED` (la decisión cambió: ahora sí se declara) o revisar la vigencia de DECISION-008.

### 3 · `tests/integration/layouts-declared.test.ts` — "contiene exactamente 54 layouts"

- **Assertion:** `expected 57 to be 54`
- **Causa:** UPONE-1379 agregó 3 layouts de GraduationProfile (`default_rt__GraduationProfile__curricularsection_{create,edit,view}.json`); el test hardcodea 54 (`expect(files.length).toBe(54)`).
- **Fix:** actualizar el conteo a 57 y su comentario.

### 4 · `tests/integration/lang-enums.test.ts` — "lang 'CurricularSection' cubre todos los valores enum de 'ownerType'"

- **Assertion:** `CurricularSection.ownerType: valores enum sin mapeo en lang: expected [ 'Curriculum' ] to deeply equal []`
- **Causa:** UPONE-1379 agregó el valor `Curriculum` al enum `ownerType` de `objects/CurricularSection.json` (el JSON lo documenta: *"Curriculum agregado por GraduationProfile v1 (UPONE-1267)"*) pero no agregó la key de traducción de ese valor en el lang. El test exige cobertura i18n completa de cada valor de enum.
- **Fix:** agregar la key `Curriculum` en el lang de `CurricularSection.ownerType`.

### 5 · `tests/integration/seed-entry.test.ts` — "tenantId=UPU → carga workflow + Univalle + AIEP en orden"

- **Error:** `TypeError: Cannot read properties of undefined (reading 'findFirst')` en `seed/_data-graduation-profile.js:45` (`prisma.institution.findFirst`)
- **Causa:** UPONE-1379 agregó el paso `loadGraduationProfile(prisma, tenantId)` en `seed/seed.js` (línea 124), que llama `prisma.institution.findFirst(...)`. El mock de prisma que usa el test de seed no tiene `.institution` (ese seed no existía cuando se escribió el mock).
- **Fix:** extender el mock de prisma del test con `institution.findFirst` (y lo que consuma `_data-graduation-profile.js`).

## Tabla de clasificación

| # | Archivo | Assertion / error | Artefacto UPONE-1379 que lo rompe |
|---|---------|-------------------|-----------------------------------|
| 1 | recordtypes-declared | `[13] ≠ [12]` | `rt__GraduationProfile__curricularsection.json` |
| 2 | recordtypes-declared | `true ≠ false` | RT GraduationProfile declarado (vs DECISION-008) |
| 3 | layouts-declared | `57 ≠ 54` | 3 layouts de GraduationProfile |
| 4 | lang-enums | `['Curriculum'] ≠ []` | valor `Curriculum` en `CurricularSection.ownerType` sin lang |
| 5 | seed-entry | `findFirst` sobre undefined | `loadGraduationProfile` en `seed.js` + mock sin `.institution` |

## Cómo correr los tests

**Prerequisitos:** Node 22.x, dependencias instaladas (`npm install` en la raíz del monorepo). Estos 4 archivos **no necesitan BD** — leen JSON/filesystem del mod y usan un mock de prisma; corren aislados.

**Ubicación del mod:** `uplanner/up1/mods/curriculum-design/` · **Rama:** `develop`

### Correr solo los 4 archivos afectados

```bash
cd uplanner/up1/mods/curriculum-design
git checkout develop
npx vitest run \
  tests/integration/recordtypes-declared.test.ts \
  tests/integration/layouts-declared.test.ts \
  tests/integration/lang-enums.test.ts \
  tests/integration/seed-entry.test.ts
```

Resultado esperado: `Test Files 4 failed (4)` · `Tests 5 failed | 132 passed (137)`.

### Correr la suite completa del mod

```bash
cd uplanner/up1/mods/curriculum-design
git checkout develop
npm test          # vitest run (toda la suite)
```

## Conclusión y responsabilidad

- Los 5 fallos son **deuda de calidad de UPONE-1379**: la feature de graduation-profile se mergeó a `develop` con sus tests baseline desactualizados y una key de lang + mock de seed faltantes.
- **Acción sugerida:** el owner de UPONE-1379 actualiza los 4 tests baseline + la key de lang + el mock del seed para dejar la suite del mod verde en `develop`.
