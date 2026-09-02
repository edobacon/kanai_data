---
id: DOC-kb-sp10-UPONE-1756-followup-delta
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - UPONE-1756
  - followup
  - delta
---

# UPONE-1756 Follow-up delta (indicadores + versionado)

> **Referencia externa:** por asignar (delta del follow-up de UPONE-1756). **Tipo:** implement · **Epica:** UPONE-1452 · **Asignado:** por definir · **Story Points:** 10 (evaluar dividir en 2 de 5)
>
> Delta del follow-up base (`UPONE-1756-followup`). Aditivo: los campos ya estan definidos en `UPONE-1756-alcance-sp10-delta`.

## Objetivo
Los indicadores de cobertura con sus denominadores, y el versionado del plan.

## Alcance
**Dentro:**
1. **Indicadores** con sus dos denominadores: desarrollo tributado por **celda declarada**, competencias con evaluador (mas especializacion por nivel representativo), asignaturas sin tributar, filas fuera de diseno; en las dos lecturas (vista del plan y componente), declarando el denominador en cada una.
2. **Efecto de `developmentSchemeId`/`achievementBasis`** (ya definidos) y los tres ejes de agregacion en los indicadores.
3. **Filas fuera de diseno:** nivel no declarado y colgada de nodo que consolida, con su tratamiento (marcada, no se borra sola) y su indicador propio.
4. **Versionado del plan (R-8):** replicar la tributacion vs arrancar limpio. La replica es **codigo nuevo que engancha en el flujo de versionado existente de curriculum-design** (`asNewVersion`/`sourceId`, hook `inheritRecordTypeExtensionOnVersion` / `copyRecordTypeExtension`; hoy ese flujo copia extensiones de RecordType y no toca tributacion). Al replicar se **remapea el `planEntry` origen al equivalente y se conserva `developmentLevelId` tal cual** (versionar el plan **no** versiona la matriz; la "herencia de niveles" es un tema de migracion, ver `UPONE-1756-migracion-niveles`), reportando las filas sin destino. **No existe ningun `_cloneMap`.**

## Reparto de permisos del versionado (alternativa A, resuelto)
El flujo de versionado es de curriculum-design y **lee el permiso de curriculum-mapping** con el RBAC existente (capabilities object-level sin prefijo de mod; el hook ya recibe `context` con el usuario):
- **Versionar el plan:** `curriculum:version` (CD).
- **Ver** la tributacion: `competencyalignment:view` (CM).
- **Elegir** al versionar (replicar vs limpio): permiso de escritura de CM (`competencyalignment:modify`/`create`).
- **Sin permiso de CM:** se versiona el plan y **no se ve** la pestana; la tributacion **se replica por default** (default seguro del PO, parametro institucional configurable). El plan viejo conserva su tributacion. El evento global de versionado queda para notificar/auditar, no para decidir.

## Criterios de aceptacion (checkeables)
- [ ] Los indicadores cuentan por celda declarada (no por competencia) y declaran su denominador segun la vista.
- [ ] Con `achievementBasis = RepresentativeLevel`, "competencias con evaluador" se especializa al nivel representativo.
- [ ] Las filas fuera de diseno se muestran marcadas, no se borran solas.
- [ ] Al versionar, quien tiene permiso de escritura de CM elige replicar vs limpio; replicar remapea el `planEntry` origen al equivalente, conserva `developmentLevelId` y reporta las filas sin destino; **no** altera los niveles.
- [ ] El flujo de versionado (curriculum-design) lee la capability de escritura de curriculum-mapping para habilitar la eleccion; sin ella, el plan se versiona y la tributacion se replica por default.

## Definition of Done (checkeable)
Aplica el estandar DoR/DoD. Ademas:
- [ ] Indicadores verificados contra el listado equivalente filtrado a mano.
- [ ] Versionado verificado en runtime (replica y limpio); se confirma que `developmentLevelId` no cambia al replicar.
- [ ] Verificado que un usuario sin permiso de escritura de CM versiona el plan, no ve la pestana, y la tributacion se replica por default.
- [ ] **Conexion MCP a nivel de servicios:** logica en el resolver, no en el cliente.

## Frontera core/mod (Aduana)
`todo-mod-only`, sin Core Extension (alternativa A): el remapeo corre en el resolver de versionado de curriculum-design (que tiene contexto de usuario) y lee el permiso de curriculum-mapping por el RBAC existente. El registro de eventos global por `(objectType, operation)` queda para notificar/auditar.

## Estimacion (calibrada)
`Esfuerzo: Considerable + Considerable · Sensibilidad: Media`. Indicadores (~5) mas versionado (~5). **Total: 10 SP.** Si se planifica junto, evaluar dividir en dos tickets de 5 (indicadores | versionado). El versionado ya no carga un frente de plataforma (se resolvio por alternativa A): su costo es el remapeo de tributacion enganchado al flujo existente mas la lectura de capability por RBAC.

## Dependencias
- Sobre `UPONE-1756-followup` (base) y `UPONE-1756-alcance-sp10-delta` (campos ya definidos).
- Engancha en el flujo de versionado de curriculum-design (`asNewVersion`/`sourceId`, `inheritRecordTypeExtensionOnVersion`) y lee el permiso de escritura de curriculum-mapping por RBAC.

## Referencias
- Base: `UPONE-1756-followup`. Feature completo: `UPONE-1756-detalle-po`. Migracion de niveles: `UPONE-1756-migracion-niveles`.
- Codigo del versionado (curriculum-design): `logic/sectionValidation.resolver.js` (`inheritRecordTypeExtensionOnVersion`), `logic/helpers/recordTypeExtension.js` (`copyRecordTypeExtension`).
