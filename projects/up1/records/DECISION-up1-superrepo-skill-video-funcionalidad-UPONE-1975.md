---
id: DECISION-up1-superrepo-skill-video-funcionalidad-UPONE-1975
project: up1
type: decision
module: up1-superrepo
tags:
  - UPONE-1975
  - sp11
  - skills
  - video
---

La skill /video-funcionalidad <URL de Jira> produce un MP4 1080p (con y sin audio), subtitulos .srt y guion con tiempos para narrador. La pantalla es una recreacion animada, no una grabacion. guion.json es la fuente unica de rotulos, voz, subtitulos y guion. Regla de fidelidad: la ventana de la app solo muestra textos, botones, iconos y avisos que existen en UP1 (verificar-pantalla.mjs revisa los textos); las explicaciones usan el globo "tip nota", que no imita la interfaz. Regla de idioma: un solo idioma por video (es neutro, pt-BR o en), sin voseo ni mezcla. Antes de construir verifica en Jira y git que la funcionalidad este integrada, y no construye hasta que se aprueba el guion.

sourceRef: 4f5a33e, cc9f7e3, 2f2ef90 .claude/skills/video-funcionalidad/SKILL.md:21 (guion), :24 (idioma), :45 (fidelidad)
