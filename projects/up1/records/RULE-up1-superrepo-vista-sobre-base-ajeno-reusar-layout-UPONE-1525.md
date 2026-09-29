---
id: RULE-up1-superrepo-vista-sobre-base-ajeno-reusar-layout-UPONE-1525
project: up1
type: rule
module: up1-superrepo
level: must
tags:
  - UPONE-1525
  - sp11
  - objetos-base
  - aduana
---

Regla 4.E de mods/.ai/COMMANDMENTS.md: como un objeto Base es de toda la plataforma, un mod puede necesitar su propia vista de un objeto que no es suyo. Antes de construirla revisa si el mod dueno ya trae un layout usable y lo reusa o embebe (p.ej. con los associated layouts de LayoutOrchestrator). Solo construye una vista reducida propia si ese layout no esta disponible para el tenant (el mod dueno no esta instalado) o no sirve. En Aduana, una vista asi no amerita Core Extension salvo que lo que falte sea el propio mecanismo de reuso.

sourceRef: 0d888c9 mods/.ai/COMMANDMENTS.md:25, .claude/skills/aduana/SKILL.md
