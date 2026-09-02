---
id: RULE-frontend-003
project: jormat-evolution
type: rule
module: frontend
level: should
tags:
  - frontend
  - react-hook-form
  - rhf
  - isDirty
  - radix
  - forms
---

# `isDirty=true` falso al montar un form de React Hook Form: rebaselinar con `reset(getValues())`, no parchear el emisor

## What

Cuando un form de React Hook Form (RHF) reporta `isDirty=true` apenas se monta, sin que el usuario haya tocado nada, la causa raiz es que RHF compara **las claves** de `_formValues` contra `_defaultValues` (no solo los valores) para computar `isDirty`. Si un control (`register` de texto con default `undefined` pero el DOM rinde `''`, o un `Controller`/Select que registra una clave ausente en los defaults) hace que el set de claves no calce, RHF marca dirty aunque los valores "logicos" sean iguales. Un emisor puntual (ej. Radix Select disparando un `change` sintetico al montar) es solo **una via** de llegar a este mismatch, no la causa raiz.

**Fix correcto**: usar un hook `useFormMountBaseline` que llama `reset(getValues())` una vez al montar, rebaselineando `_defaultValues` a los valores reales renderizados. Esto es robusto a defaults incompletos (a diferencia de completar cada default per-campo, que falla de nuevo al agregar un campo nuevo) y absorbe cualquier emisor puntual (Radix u otro) sin parchearlo directamente.

## Why

Completar defaults campo por campo es fragil: cada campo nuevo que se agregue al form puede reintroducir el mismatch. Rebaselinar una vez al montar con los valores reales es un unico punto de correccion que no depende de enumerar cada control. Ademas, mockear el Select en los tests oculta esta clase de bug — la regresion de este comportamiento debe usar el control real (Radix), no un mock.

## Where

- **Layers**: frontend (forms con React Hook Form + controles no-nativos como Radix Select).
- Ejemplo origen: `front/jormat-front` (JOR-063).

## When

- Al ver `isDirty=true` con `dirtyFields={}` vacio apenas se monta un form (sintoma caracteristico del mismatch de claves, no de un cambio real).
- Al agregar un `Controller`/Select/control no-nativo a un form existente: verificar que sus claves esten en `defaultValues` o aplicar `useFormMountBaseline`.

## Verification

- Sonda de diagnostico (`isDirty` + `dirtyFields` + diff `getValues()` vs `_defaultValues`) confirma el mismatch de claves antes del fix.
- Tras `useFormMountBaseline`, el form monta con `isDirty=false` incluso con Select/Controllers que antes disparaban el falso positivo.
- **Limite conocido**: jsdom no reproduce este bug de forma confiable (ni el emit de Radix ni el mismatch de claves); la verificacion definitiva requiere navegador real o Playwright end-to-end (DET-36).

## Source

- **Discovered in**: JOR-063, Session 2.
- **Evidence**: L3 (causa raiz: mismatch de claves via deepEqual de sets, no solo valores); L4 (fix: `reset(getValues())` en `useFormMountBaseline`).
