---
id: RULE-mods-full-replace-write-needs-read-tool-UPONE-1899
project: up1
type: rule
module: mods
level: should
tags:
  - UPONE-1899
  - ai-pack
  - mcp
  - full-replace
  - read-tool
  - data-loss
---

# Una tool del asistente que escribe por reemplazo total se publica junto con una lectura que devuelve todo lo que la escritura conserva

## What

Si una ficha del pack de IA de un mod escribe por reemplazo total (lo que no se envia se borra o vuelve a su valor por defecto), el mismo PR debe publicar una ficha de lectura gobernada que devuelva el estado completo con los mismos campos que la escritura conserva. Si esa lectura todavia no existe, la escritura se limita a la creacion inicial o no se expone.

Pedirle al modelo "lee primero" en la descripcion de la ficha no alcanza: si la unica lectura disponible es parcial, el modelo reconstruye un estado incompleto y el guardado lo aplica con exito.

## Why

En UPONE-1899 (PR curriculum-mapping #42) se expuso `cm_upsert_competency_tree`, que reemplaza el arbol completo, sin ninguna ficha que lo lea. La unica via de lectura es el CRUD generico por tipo base, que no trae `rollupWeight` ni `isHolistic` (viven en el satelite del RecordType). Ademas `stampNode` aplica los valores por defecto (`rollupWeight: '0'`, `isHolistic: true`) antes del payload tambien en nodos existentes, asi que guardar el arbol reconstruido resetea todos los pesos a 0 y borra las competencias omitidas sin tributaciones, con respuesta de exito. El propio mod lo declara en `.ai/CONTEXT.md` como "el hueco conocido mas serio". Tres revisiones lo clasificaron como S1, S2 y Consulta: saber del riesgo no lo mitiga.

## Where

`ai/tools.js` de cualquier mod con pack de IA; en particular las fichas cuyo `input` representa un agregado entero (arbol, grilla, lista ordenada).

## When

Al agregar o cambiar una ficha de escritura de un mod, o al revisar un PR que publique una.

## Verification

- Por cada ficha de reemplazo total existe una ficha de lectura del mismo agregado, y un test del pack verifica que la lectura devuelve cada campo que la escritura recibe.
- Un test de ida y vuelta: leer, guardar sin cambios y comprobar que el estado no cambio (pesos incluidos).

## Source

- **Discovered in**: UPONE-1899, revisiones del PR curriculum-mapping #42, 2026-09-24; reseteo a '0' confirmado por verificador adversarial (stampNode + RT_DECLARED_DEFAULTS + writeSatellite).
- **Related**: [[RULE-mcp-012]] (preview y commit en toda escritura), [[RULE-mcp-015]] (capability nueva reflejada en el MCP), [[RULE-server-side-logic-mcp-ready]].
