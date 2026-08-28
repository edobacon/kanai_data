---
id: DECISION-033
project: up1
type: decision
module: mods
tags:
  - curriculum-mapping
  - catalogos
  - patron-de-diseno
---

# Catalogos gobernados con motor comun (`createCatalogEngine`) mas adaptador delgado en el front

## Contexto

El mod curriculum-mapping necesitaba dos catalogos cabecera+hijos (`LevelScheme` con sus `Level`, `CoverageScheme` con sus niveles de cobertura), ambos con el mismo tipo de escritura gobernada: renombre de codigos en dos fases, dirty-checking hijo por hijo, registro consolidado de auditoria, y cascada de `isActive` del padre a los hijos.

## Decision

Se construye un motor compartido `createCatalogEngine` (`mods/curriculum-mapping/logic/helpers/compositeCatalog.js`) que resuelve en un solo lugar: el renombre de codigos en dos fases, el dirty-checking hijo por hijo, el registro consolidado en `core_DataLog`, y `setChildrenActive` (`compositeCatalog.js:163-183`, agregada como fix cuando se detecto que inactivar un esquema no propagaba a sus niveles hijos). Cada catalogo especifico (`LevelScheme`, `CoverageScheme`) es un cliente delgado de ese motor: `logic/levelScheme-upsert.resolver.js` y `logic/coverageScheme-upsert.resolver.js` solo declaran su forma de datos y delegan la logica al motor. Del lado del front, `RecordCollectionEditor` es el componente generico de grilla, y `LevelSchemeEditor` es una especializacion delgada sobre el.

## Alternativas descartadas

- **Duplicar upsert y reconcile por objeto de catalogo**: es la alternativa obvia si cada catalogo se implementa de forma independiente. Se descarta porque el renombre de codigos en dos fases, el dirty-checking y la cascada de `isActive` son logica no trivial que ya mostro un bug real al implementarse una sola vez (la cascada de `isActive` faltante); duplicarla por catalogo multiplica la superficie de ese tipo de bug en vez de corregirla en un solo lugar.

## Impacto y reversibilidad

Establece un patron ("motor comun + adaptador delgado") que el propio mod ya repite tres veces en la misma ventana (2 catalogos + 1 editor de grilla generico), por lo que deja de ser una decision aislada de un ticket y pasa a ser el criterio por defecto para cualquier catalogo nuevo del mod. Afecta objeto nuevo (`CoverageScheme`), mutations nuevas (`upsertCoverageSchemeValidated`, `setCoverageSchemeActiveValidated`, delete), capabilities nuevas (`coveragescheme:*`, `levelscheme:*`). Reversible en el sentido de que un catalogo nuevo podria implementarse sin el motor, pero perderia la cobertura de bugs ya corregida ahi (cascada de `isActive`, dirty-tracking).
