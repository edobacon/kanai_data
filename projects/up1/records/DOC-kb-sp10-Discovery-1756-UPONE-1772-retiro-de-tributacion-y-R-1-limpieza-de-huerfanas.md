---
id: DOC-kb-sp10-Discovery-1756-UPONE-1772-retiro-de-tributacion-y-R-1-limpieza-de-huerfanas
project: up1
type: doc
module: curriculum-mapping
tags:
  - UPONE-1772
  - UPONE-1756
  - tributacion
  - CompetencyAlignment
  - retiro
  - R-1
  - discovery
  - intake-futuro
---

# Discovery 1756 → UPONE-1772: retiro de tributación y R-1 (limpieza de huérfanas)

Material de intake para UPONE-1772 (Tributación: outcomeAlignment + retiro con aviso R-7). Discovery surgido durante la ejecución de UPONE-1756 (TICKET-143), sesión 1, resolver gobernado de CompetencyAlignment.

## El discovery

Al implementar R-1..R-5/R-10, el retiro (`deleteCompetencyAlignment`) quedó bajo la duda de si debe exigir R-1 (adopción vigente). El spec de 1756 dice que sí (REQ-10 / TC-REQ-10-5: "retirar sin adopción vigente se rechaza por R-1 antes de borrar"), y R-1 aplica a "toda escritura (asignar, editar, mover, retirar)". Pero exigir adopción vigente para retirar tiene un efecto no deseado: cuando la adopción de la matriz por el plan se **cierra o vence**, quedan tributaciones **huérfanas que ya no se pueden limpiar** (el borrado se rechazaría por R-1).

## Decisión tomada en 1756

- **1756 exige R-1 en el retiro**, alineado con REQ-10/TC-5 (1756 opera sobre "una matriz ya adoptada"; el CRUD de tributaciones nuevas asume adopción vigente). Testeable ahora.
- En `mods/curriculum-mapping/logic/competencyAlignment.resolver.js`, dentro de `deleteCompetencyAlignment`, quedó un **seam marcado** ("FOLLOW-UP UPONE-1772: permitir retirar sin adopción vigente para limpiar huérfanas") donde relajar el gate.
- El **fortalecimiento se delega a 1772**, que es el ticket que rework-ea el retiro (aviso R-7 de dependientes). Ningún otro follow-up toca el retiro (1770 = pesos/masiva, 1771 = indicadores/versionado, 1773 = migración de niveles).

## Qué cubrir en 1772

Al reworkear el retiro (junto con el aviso R-7), **relajar R-1 para permitir la limpieza de tributaciones huérfanas** cuando la adopción del plan para esa matriz ya no está vigente. Definir la condición exacta y el comportamiento:

1. **Condición del retiro sin adopción vigente**: decidir el criterio. Opciones a evaluar:
   - Permitir retirar si EXISTE una adopción del plan para esa matriz aunque esté cerrada/exenta/vencida (no exigir vigencia), pero seguir rechazando en planes sin ninguna relación con la matriz.
   - O permitir el retiro con solo la capability `:delete` (sin R-1), tratando el borrado como pura higiene de datos.
2. **Coordinación con R-7** (aviso de dependientes): si la tributación sostiene alineaciones de resultados (outcomeAlignment, que 1772 introduce), el retiro debe nombrar los dependientes antes de borrar, independientemente del estado de la adopción.

## Casos de prueba a incorporar en 1772

- Retirar una tributación cuyo plan tiene la adopción de la matriz **cerrada** (effectiveTo pasado) → **se permite** (limpieza de huérfana), no se rechaza por R-1. (Hoy en 1756 se rechaza.)
- Retirar cuando la adopción está **exenta** (status Exempt) → definir (probablemente permitido, es higiene).
- Retirar en un plan **sin ninguna adopción** de esa matriz → definir (probablemente permitido si es huérfana, o rechazado si nunca hubo relación).
- Retirar con adopción **vigente** → sigue permitido (regresión, ya cubierto en 1756).
- Retirar una tributación que sostiene un outcomeAlignment → aviso R-7 (nombra dependientes) antes de borrar, con o sin adopción vigente.

## Traza
- Decisión registrada como learn en TICKET-143 (1756).
- Seam en el código: `deleteCompetencyAlignment` (curriculum-mapping), rama `feat/UPONE-1756-curriculum-mapping-tributacion-crud-por`.
