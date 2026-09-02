---
id: BUG-workflow-teach-close-manual-hor013-001
project: horadric
type: bug
module: workflow
status: fixed
severity: medium
tags:
  - det-22
  - teach-close
  - dogfooding
  - retroactive
---

# HOR-013 cerro con teach-close producido manualmente, no por step automatico

## Symptom

Al cerrar HOR-013 (ticket meta del workflow extendido teach-intake/teach-close), `teach-close.md` se genero correctamente y `teachings.close: done` quedo en frontmatter. **El cierre parecia exitoso**.

Sin embargo, retroactivamente revisando: el step `prompts/steps/request-close.md` NO contenia ninguna instruccion de invocar el sub-step `teach-close`. La regla DET-22 estaba declarada en `deterministic-rules.md` y el workflow `request.md` la mencionaba como `sub_step` de `request-close`, pero el step ejecutor en si NO la implementaba.

El archivo `teach-close.md` de HOR-013 se produjo solo porque el dev y el LLM tuvieron atencion humana explicita en el cierre, recordando manualmente DET-22 y ejecutando teach-close standalone.

## Expected behavior

`request-close.md` debe contener instruccion explicita de invocar `prompts/steps/teach-close.md` como sub-step BLOQUEANTE antes de marcar `status: closed`. Sin esta instruccion, cualquier cierre desatendido salta teach-close silenciosamente y el ticket queda cerrado sin material educativo (DET-22 incumplida invisiblemente).

## Root cause

Patron sistemico H7.1: regla declarada en `deterministic-rules` + orquestada en `workflow` + AUSENTE en step ejecutor. HOR-013 introdujo DET-22 sin extender request-close.md con la implementacion del gate. Misma raiz que F-2 ext (DET-21 ausente en design-{tipo}).

## Impact

- HOR-013 cerro con artefacto educativo solo por accidente humano (atencion explicita).
- Cualquier cierre futuro de implement/fix/improvement/refactor/explore tickets sin atencion humana saltaria teach-close.
- DET-22 era invisible-fail: el ticket muestra `status: closed` correctamente pero falta el archivo educativo.

## Reproduction

Pre-fix HOR-014 S2.T1:
```
1. Crear ticket implement con work_type
2. Pasar por intake-explore → teach-intake → design-feature → execute → request-close
3. En request-close, observar que el LLM NO invoca teach-close automaticamente
4. Si el LLM no recuerda DET-22, marca status:closed sin teach-close
5. Ticket queda con teachings.close: pending pero status: closed (estado inconsistente)
```

## Workaround (pre-fix)

Atencion humana explicita en cada cierre — el dev o el LLM deben recordar invocar `/dkc-teach` o el step `teach-close.md` standalone antes de marcar status:closed.

## Solution (post-fix HOR-014 S2.T1)

`prompts/steps/request-close.md` extendido con:

1. **GATE inicial (Regla 22)** al inicio del archivo (`## ⚠️ GATES`):
   - Verifica work_type del ticket
   - Si full-path: invocar teach-close obligatoriamente
   - Si quick/query: skipped con justificacion inline

2. **Paso 5c (sub-step explicito)** entre paso 5b (Evaluar backlog) y paso 6 (Actualizar ticket):
   - Algoritmo numerado para invocar `prompts/steps/teach-close.md`
   - Verificar gate de salida del sub-step (archivo escrito, YAML valido, frontmatter actualizado)
   - Solo entonces continuar a paso 6 (status: closed)

3. **Gate final extendido** con item `teachings.close === 'done'` antes de cambiar status.

Validacion empirica del fix: ejecucion del cierre de HOR-014 (S6.T3) — el dogfooding final prueba que el flujo automatico funciona sin atencion humana.

## Related

- Rule promovida: `RULE-workflow-det-introduction-001` (patron H7.1 sistemico)
- Spec: `SPEC-workflow-dkc-followup-13` (REQ-IMPROVE-01)
- Audit finding: F-1
- Workaround historico: cierre manual de HOR-013 con `/dkc-teach` standalone
