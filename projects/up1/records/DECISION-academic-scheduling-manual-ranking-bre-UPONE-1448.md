---
id: DECISION-academic-scheduling-manual-ranking-bre-UPONE-1448
project: up1
type: decision
module: academic-scheduling
---

Los paneles de asignacion manual (sala, docente, bloque) delegan el ranking al motor de reglas externo (POST {BRE_URL}/filter_options) cuando BRE_URL esta configurado; sin BRE_URL, o si el motor falla o excede BRE_TIMEOUT_MS (default 5000ms), los resolvers mantienen su ranking nativo. El contrato GraphQL con la UI no cambia. "suggested" = ninguna regla del catalogo incumplida segun el motor; matching por id de opcion, orden por posicion del motor. Verificado en UPU.

**sourceRef:** 0f0cf25 + logic/schedule/breRanker.js (client POST filter_options); f00bae0 (correccion de objetos del catalogo).
