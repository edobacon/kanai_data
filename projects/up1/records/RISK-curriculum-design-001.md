---
id: RISK-curriculum-design-001
project: up1
type: doc
module: curriculum-design
status: identified
severity: medium
tags:
  - risk
  - layouts
  - record-types
  - infraestructura
  - curriculum-design
---

# RISK-001: Layouts por RecordType sin precedente en mods

## Descripcion

[UPONE-941](https://u-planner.atlassian.net/browse/UPONE-941) y [UPONE-944](https://u-planner.atlassian.net/browse/UPONE-944) (ambos **Finalizada**) entregaron la **infraestructura de plataforma** para resolver layouts por RecordType. Sin embargo, ningun mod activo (`hello-world-mod`, `retention-wellbeing`, etc.) la usa todavia.

UPONE-1035 (TICKET-009) sera el **primer caso real** que aplica esta infraestructura a un dominio de produccion.

## Evidencia tecnica

Verificacion en codebase up1 (sesion 2026-04-27):

| Hallazgo | Implicacion |
|----------|-------------|
| Resolver `resolveDefaultLayout` ([up1/layout/logic/layout.resolver.js](../../../../up1/layout/logic/layout.resolver.js), funcion ~lineas 375-527) busca por `objectName + layoutType + mode`. **No tiene parametro `recordType`** | Para que un layout aplique a un RecordType, el `objectName` del layout debe ser el nombre completo `rt__<RecordType>__<baseObjectLower>` |
| Tabla `up1_layen_layout` no tiene campo `recordType` | La asociacion pasa por convencion de nombres, no por columna indexada |
| Composable `useRecordTypeResolver.ts` genera `rt__{recordTypeValue}__{baseObjectName.toLowerCase()}` | Confirmado el naming pattern |
| Documentacion `up1/layout/docs/reference/default-layouts.md` solo documenta `default_{ObjectName}_{mode}` | NO menciona RecordType en naming — es una zona gris |
| Ningun mod activo usa este pattern | No hay ejemplo de referencia para implementar |

## Impacto potencial

1. **Descubrir gaps en la implementacion** de UPONE-941/944 al usarla por primera vez en un caso real (objeto polimorfico con 8+ RecordTypes).
2. **Possible necesidad de extender la plataforma** si el patron actual no soporta lo que el modelo de Confluence describe (multiples campos especificos por RT con validacion).
3. **Naming convention no documentado oficialmente** — riesgo de implementar algo que despues haya que renombrar.

## Plan de mitigacion

Al iniciar TICKET-009 (UPONE-1035):

1. **Antes de declarar layouts**: leer en detalle el resolver `resolveDefaultLayout` y los tests de UPONE-944 para confirmar el naming convention exacto.
2. **POC pequeño**: declarar UN solo layout para UN RecordType (el mas simple, ej: `Modality`) y verificar que la plataforma lo resuelve correctamente.
3. **Si hay gap**: documentarlo como bug/issue en up1 y escalar a quien implemento UPONE-941/944.
4. **Documentar el patron descubierto** como rule en `rules/curriculum-design/` para futuros mods.

## Senales que indican que el riesgo se materializo

- El layout declarado con naming `default_rt__<RT>__<base>_<mode>.json` no se aplica al renderear el RecordType.
- El RecordDetail muestra el layout del objeto base ignorando el RecordType.
- Hay errores en el resolver al buscar layouts.

## Plan de contingencia

Si el patron no funciona out-of-the-box:

| Opcion | Costo | Cuando aplicar |
|--------|-------|----------------|
| Crear bug en up1 y esperar fix | Bloquea SP2 | Solo si el gap es fundamental |
| Workaround: usar layout del objeto base con renderer Vue custom (modsComponents/) que discrimine por `recordType` runtime | Mediano (~1-2 dias dev) | Si el gap es chico y se puede aislar |
| Declarar layouts con naming alternativo (ej: agregar campo custom en `layoutConfig`) | Alto, fuera de plataforma | Ultimo recurso |

## Referencias

- [UPONE-941](https://u-planner.atlassian.net/browse/UPONE-941): "Como administrador tecnico, quiero asignar un layout por defecto a cada RecordType"
- [UPONE-944](https://u-planner.atlassian.net/browse/UPONE-944): "Como usuario, quiero que al abrir un registro, el RecordDetail use el layout del RecordType correspondiente"
- Resolver: [up1/layout/logic/layout.resolver.js](../../../../up1/layout/logic/layout.resolver.js)
- Composable: [up1/layout/src/composables/useRecordTypeResolver.ts](../../../../up1/layout/src/composables/useRecordTypeResolver.ts)
- Docs: [up1/layout/docs/reference/default-layouts.md](../../../../up1/layout/docs/reference/default-layouts.md)
- TICKET-009 (a crear): UPONE-1035
