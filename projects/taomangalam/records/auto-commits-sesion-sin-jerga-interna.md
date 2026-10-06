---
id: auto-commits-sesion-sin-jerga-interna
project: taomangalam
type: rule
level: should
tags:
  - commits
  - auto-commit
  - higiene
  - gate
---

Los commits que genera el auto-commit del gate de Kanai no deben incluir jerga interna del proceso ("sesión N", "correcciones del gate", "fase N"): solo le dicen algo a quien tiene Kanai y ensucian el historial del repo. Deben usar el identificador externo del ticket (p. ej. GH-64, UPONE-1234) y un resumen del hecho en conventional-commit (p. ej. "GH-64 fix(menu): ..."), sin la etapa interna.
