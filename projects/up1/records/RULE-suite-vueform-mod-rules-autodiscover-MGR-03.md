---
id: RULE-suite-vueform-mod-rules-autodiscover-MGR-03
project: up1
type: rule
module: suite
---

vueform.config.ts agrega un import.meta.glob('../layout/src/modsComponents/*/vueformRules.js', {eager:true}) que junta el export `rules` de cada mod (primera: 'formula', el gate de parseo del editor de reglas de up1-manager) y lo pasa como rules: modRules a defineConfig, mismo mecanismo de auto-registro que ya existia para elements. Tambien se agrega el locale 'pt' (faltaba: con idioma pt los mensajes nativos de Vueform quedaban sin traducir).

**sourceRef:** 4fe92ad + vueform.config.ts:5,21-30.
