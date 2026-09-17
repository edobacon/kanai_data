---
id: BUG-academic-scheduling-suggested-flag-soft-rule-UPONE-1768
project: up1
type: bug
module: academic-scheduling
---

Causa raiz: salas y docentes se marcaban "suggested" solo con el veredicto estricto del motor (is_valid = ninguna regla incumplida). En tenants multi-campus la regla soft "sala en la misma unidad organizacional" (SSA-R004) falla para TODAS las salas, asi que is_valid daba false en todos y ningun chip de sugerido aparecia, mientras el grid mantenia sus estrellas porque rankea por factibilidad. Fix: suggestedFlagger(), si ningun candidato tiene is_valid true, degrada al mejor costo factible del lote (empates incluidos). Aplica a salas y docentes. Pendiente: tuning de SSA-R004 por tenant cuando las reglas migren al modelo BusinessRule.

**sourceRef:** 82f4e7c + logic/schedule/breRanker.js:331 (suggestedFlagger).
