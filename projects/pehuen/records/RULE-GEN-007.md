---
id: RULE-GEN-007
project: pehuen
type: rule
module: general
level: must
tags:
  - migration
  - lenguaje
  - convencion
---

# Código en inglés, contenido (UI strings) en español

## What

Todo el código del proyecto (nombres de variables, funciones, clases, parámetros, propiedades de schema, constantes, nombres de archivos) está en inglés. Los strings visibles al usuario en la UI, mensajes de error retornados al cliente, labels de formulario y textos de notificación están en español.

## Why

Es la convención explícita del proyecto (heredada del legacy). Permite que devs con inglés técnico lean el código, mientras los usuarios finales (operadores forestales chilenos) ven la interfaz en español. Mezclar idiomas en el código genera inconsistencia difícil de mantener.

## Where

- **Files**: todo el proyecto
- **Layers**: frontend, backend, shared

## When

Siempre. En revisión de código: rechazar variable en español (`const nombreUsuario`), rechazar mensaje UI en inglés (`throw createError({ message: 'User not found' })`).

## Verification

- Revisión manual en PR: variables y funciones en inglés.
- Test: mensajes de error en respuestas API → en español (ej. `'El correo es obligatorio'`, `'Usuario inactivo'`).
- `grep -rn "const [a-záéíóúüñ]\|let [a-záéíóúüñ]\|function [a-záéíóúüñ]" server/ app/` → 0 matches de código en español.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `config.yaml` conventions.language: `code: english`, `content: spanish`. `pehuen_nuxt/CLAUDE.md`: "Código en inglés, contenido en español."
- **Related**: RULE-GEN-006
