---
id: DECISION-014
project: up1
type: decision
module: core
tags:
  - sync
  - mods
  - tooling
  - operational
---

# Mods activos en runtime NO se ponen en `ignoredMods` al ejecutar `npm run sync`

## Context and problem statement

Durante TICKET-013/014 (eslint config + typecheck del mod curriculum-design), la aceptacion incluia validar que `npm run sync` desde `up1` ejecuta sin error (REQ-PRESERVE-02/03).

Al correr el sync con curriculum-design activo (no en `ignoredMods`), se descubrio un **side effect**: el sync regenera `object-manager/prisma/*/schema.prisma` y los `typeDefs/*.js` GraphQL **desde cero solo con los mods activos**. Cualquier mod en `ignoredMods` pierde sus models/objects/typeDefs del estado sincronizado, aunque sus archivos en `mods/<name>/` sigan intactos.

Caso concreto observado:

- `hello-world-mod` estaba en `ignoredMods` (su rol original es de template).
- Sync con curriculum-design activo regenero `prisma/schema.prisma` SIN `HwAssessment`, `HwFactor`, `HwIntervention`.
- Runtime suite mostro "Error al cargar hwassessment" porque object-manager no conocia el modelo.

El comportamiento del sync esta documentado en `CLAUDE.md` de up1 ("Mods listed in `ignoredMods` are excluded from all sync scripts"), pero el efecto **runtime** (perdida de models/typedefs en object-manager) no es obvio a primera vista — `ignoredMods` se interpretaba como "no se sincronizan, pero su estado previo permanece", cuando en realidad el sync **regenera totalmente**.

## Decision drivers

- **Coexistencia obligatoria**: el dev necesita que `curriculum-design` y `hello-world-mod` (u otros) funcionen simultaneamente en runtime.
- **Operatividad del sync**: cualquier sync futuro va a regenerar schemas full — la regla debe ser preventiva, no reactiva.
- **Costo de descubrir el side effect**: el unico signal es runtime (vista falla con i18n key `unauthorized` o "Error al cargar X"). Sin diagnostico cuidadoso, parece no relacionado al sync.
- **Alternativas para "archive" de mods**: si un mod no se quiere en runtime, sacarlo del filesystem (`mods/<name>/`) o usar mecanismos del repo (rama distinta, branch dedicada), NO `ignoredMods`.

## Considered options

### Opcion A: Mods activos en runtime fuera de `ignoredMods` (elegida)

Antes de correr `npm run sync`, verificar que todos los mods cuyos models/objects/typeDefs deben quedar en runtime esten fuera de `ignoredMods` en `up1/package.json`. Para `hello-world-mod` (que es template + tiene HwAssessment usado en el tenant del dev), removerlo de `ignoredMods`.

**Ventaja**: cero cambios al sync. Comportamiento operacional claro: `ignoredMods` = "este mod no debe quedar en runtime", no "este mod existe pero no se sincroniza".

**Desventaja**: el dev debe acordarse de revisar `ignoredMods` antes de cualquier sync. Sin este chequeo, side effects.

### Opcion B: Sync que preserve state de mods en ignoredMods (rechazada — requiere cambio platform)

Modificar `scripts/sync.js` para que mantenga objects/typedefs/lang de mods en `ignoredMods` en vez de regenerar full. Plataforma decide.

**Rechazada**: requiere coordinacion con platform team, fuera de scope de TICKET-014.

### Opcion C: Marcar curriculum-design como "no sincronizable" (rechazada)

Poner `curriculum-design` en `ignoredMods` y NO sincronizarlo. Contradice la decision dev en memoria `feedback_curriculum_design_dev_pattern` ("itera en repo del mod, monorepo limpio") solo en parte: el monorepo SI se ensucia tras `npm run sync`, no antes. Si nunca se corre sync, queda limpio.

**Rechazada**: el dev acepta correr sync para validar acceptance checks. Y la suite real necesita los archivos sincronizados para que la vista de curriculum-design funcione.

### Opcion D: Descartar — el conocimiento ya esta en CLAUDE.md (rechazada)

El doc dice "Mods in ignoredMods are excluded from all sync scripts" pero NO especifica el efecto runtime de regeneracion. La decision aporta el matiz operacional.

## Decision outcome

**Elegida**: Opcion A. Mods que deben funcionar en runtime no van en `ignoredMods`.

**Aplicacion concreta**: `hello-world-mod` removido de `ignoredMods` en `up1/package.json` (working tree pendiente de commit, scope: monorepo, no del mod). Re-sync confirmo `HwAssessment` restaurado en `prisma/*/schema.prisma`.

**Regla derivada**: antes de cualquier `npm run sync` en up1, validar:

1. Listar mods activos en runtime (suite muestra sus vistas / object-manager expone sus models).
2. Verificar que ninguno este en `ignoredMods`.
3. Si alguno esta: removerlo (decision explicita) o aceptar que pierda state runtime.

## Consequences

**Gana**:
- Side effects del sync ya no rompen runtime de mods que el dev usa.
- Decision explicita: `ignoredMods` queda reservado para mods realmente desactivados (template puro sin tenant que lo use, mod en archive).

**Pierde**:
- Carga operacional: cada sync requiere validar `ignoredMods` antes.
- Si `hello-world-mod` se reactiva permanente en `ignoredMods: []`, su rol original como "template puro" se diluye. Si despues se quiere volver a tratar como template, se debe limpiar primero (drop tables HwAssessment etc.) antes de removerlo del runtime.

**Side effects pendientes** (no abordados aqui):
- B1 del TICKET-014: hydration mismatch potencial por `saveError: null → undefined` — independiente.

## Confirmation

- Verificacion empirica: tras remover `hello-world-mod` de `ignoredMods` y re-sync, `prisma/BASEMODEL/schema.prisma:682` declara `model HwAssessment { ... }` correctamente. Vista hello-world (segun reporte del dev tras smoke) carga sin error.
- Curriculum-design sigue funcionando: typecheck 0, vitest 399/399, lint 0 (post-sync).

## Related

- TICKET-014 (donde se descubrio el side effect)
- L1 raw del TICKET-014 (refinado a esta decision)
- Memoria `feedback_curriculum_design_dev_pattern` (sigue valida si nunca se corre sync; este DEC clarifica el caso cuando SI se corre)
- BUG-platform-XXX (potencial — preservacion de state del sync — no creado en este ticket, escala platform)
