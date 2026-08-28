---
id: RULE-mods-014
project: up1
type: rule
module: mods
---

# modsComponents usan atoms del layout-library — no HTML crudo

## What

Los archivos `.vue` en `modsComponents/{Component}/` NO deben usar elementos HTML nativos (`<button>`, `<input>`, `<select>`, `<textarea>`, `<label>`, spinners DIY, `<p>` para mensajes de error/status). Deben usar atoms del layout-library: `<Button>`, `<Input>`, `<Select>`, `<Textarea>`, `<FormLabel>`, `<Spinner>`, `<Alert>`, etc. Excepciones justificadas: contenedores estructurales (`<div>`, `<section>`, `<ul>`, `<li>`, `<span>`) y slots para custom rendering dentro de atoms.

## Why

Los atoms encapsulan Bootstrap, tokens de theming, accesibilidad, estados (loading/disabled/error), i18n automática y eventos estandarizados. Saltear atoms fragmenta el sistema de diseño, pierde theming multi-tenant, introduce inconsistencia visual y duplica lógica. Es extensión natural de RULE-layout-001 aplicada al dominio de mods.

## Where

En todos los archivos `modsComponents/**/*.vue` de cualquier mod. Aplica tanto al template principal como a modales, formularios inline y UI custom.

## When

Al crear o editar cualquier componente de mod. Durante code review de PRs de mods.

## Verification

Grep en `modsComponents/**/*.vue` por `<button`, `<input`, `<select`, `<textarea` — no debe haber matches fuera de atoms. Lint rule pre-sync candidato.

## Source

- **Discovered in**: TICKET-005
