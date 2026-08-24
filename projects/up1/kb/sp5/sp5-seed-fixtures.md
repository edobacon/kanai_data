# SP5 — Seed fixtures (datos de ejemplo listos para sembrar)

> Datos de ejemplo concretos para los objetos nuevos, listos para transcribir al `seed/` del mod durante la ejecución (MC-02/MC-03). Valores derivados de la maqueta (`mockup_v10.html`) y del handoff (§2.5/§2.6).
> 🧭 Glosario y visión general: `README.md`. Estructura de tickets: `sp5-execution-order` (en `deckard/projects/up1/`).

---

## 1. `requirementCategory` — líneas de formación (de la maqueta)

Sobre un `Curriculum(Plan)` de ejemplo. Colores = tokens de tema up1 (o hex); íconos = bootstrap-icons (`bi-*`).

| key | name | minCredits | maxCredits | color | icon (sugerido) | position |
|---|---|---:|---:|---|---|---:|
| nucleo | Núcleo (Fundamentos y Métodos) | 72 | null | `var(--up1-color-primary)` | `bi-mortarboard-fill` | 1 |
| fg | Habilidades Profesionales | 12 | null | `var(--up1-color-info-500)` | `bi-people` | 2 |
| elec | Electivos de Profundización | 36 | null | `var(--up1-color-warning-500)` | `bi-stars` | 3 |
| integ | Proyecto de Grado | 30 | null | `#6b21a8` | `bi-flag` | 4 |

> Los `color` salen tal cual de la maqueta; el `icon` no estaba poblado por categoría en la maqueta → valores sugeridos (ajustables).

## 2. `requirement` — árbol de prerrequisitos EST200 (handoff §2.5)

Regla: *"Para cursar EST200: aprobar (MAT110 Y MAT120) Ó (MAT210), y ≥ 60 créditos del plan. Recomendado: PROG101."*
Todos: `ownerType: "activity"`, `ownerId: <act_EST200>`, `effect: "EligibilityToEnroll"`.

```jsonc
[
  { "id":"req_root",   "parentId":null,       "recordType":"Group",
    "combinator":"AND", "label":"Requisitos para cursar EST200", "isHardRule":true, "negate":false, "position":1 },

  { "id":"req_vias",   "parentId":"req_root", "recordType":"Group",
    "combinator":"OR",  "label":"Vía de cálculo (una de dos)", "isHardRule":true, "negate":false, "position":1 },

  { "id":"req_via1",   "parentId":"req_vias", "recordType":"Group",
    "combinator":"AND", "label":"Vía 1 · Cálculo I + II", "isHardRule":true, "negate":false, "position":1 },

  { "id":"req_mat110", "parentId":"req_via1", "recordType":"RecordState",
    "targetType":"activity", "targetId":"act_MAT110", "mustBe":"Approved", "timing":"Before",
    "label":"Aprobar Cálculo I (MAT110)", "isHardRule":true, "negate":false, "position":1 },

  { "id":"req_mat120", "parentId":"req_via1", "recordType":"RecordState",
    "targetType":"activity", "targetId":"act_MAT120", "mustBe":"Approved", "timing":"Before",
    "label":"Aprobar Cálculo II (MAT120)", "isHardRule":true, "negate":false, "position":2 },

  { "id":"req_mat210", "parentId":"req_vias", "recordType":"RecordState",
    "targetType":"activity", "targetId":"act_MAT210", "mustBe":"Approved", "timing":"Before",
    "label":"Aprobar Cálculo Avanzado (MAT210)", "isHardRule":true, "negate":false, "position":2 },

  { "id":"req_cred",   "parentId":"req_root", "recordType":"MetricThreshold",
    "metric":"Credits", "scope":"plan", "operator":">=", "value":60,
    "label":"≥ 60 créditos aprobados del plan", "isHardRule":true, "negate":false, "position":2 },

  { "id":"req_prog101","parentId":"req_root", "recordType":"RecordState",
    "targetType":"activity", "targetId":"act_PROG101", "mustBe":"Taken", "timing":"Either",
    "label":"Recomendado: Programación (PROG101)", "isHardRule":false, "negate":false, "position":3 }
]
```

## 3. Bloque electivo (handoff §2.6)

```jsonc
// Bloque "Electivo de Especialización: elegir 4, ≥ 24 créditos" (requirement Group sobre el plan)
{ "id":"blk_esp", "ownerType":"curriculum", "ownerId":"<plan_2026>",
  "parentId":null, "recordType":"Group", "combinator":"OR",
  "minToSatisfy":4, "creditsRequired":24, "effect":"Completion",
  "label":"Electivo de Especialización", "isHardRule":true, "position":10 }
```

## 4. `planEntry` — ejemplos de la malla

```jsonc
// Obligatoria (sin blockId) — categoría Núcleo, período 1
{ "id":"pe_1", "planId":"<plan_2026>", "activityId":"act_MAT110", "categoryId":"cat_nucleo",
  "kind":"Course", "period":1, "position":1 }   // credits hereda de Activity

// Electiva (con blockId) — miembro del bloque, categoría Electivos, período 8
{ "id":"pe_a", "planId":"<plan_2026>", "activityId":"act_IN5A1", "blockId":"blk_esp",
  "categoryId":"cat_elec", "kind":"Course", "period":8, "position":1 }
```

> **Notas de siembra:**
> - Los `act_*`/`cat_*`/`plan_*` son placeholders → resolver a ids reales del seed del tenant.
> - `period` requerido (secuencial). `kind` solo `Course` en SP5 (Internship/Thesis reservados).
> - Electividad se deriva de `blockId` (no hay flag).
> - El seed se autora en `mods/curriculum-design/seed/` y corre durante sync (no se commitea el artefacto generado).
