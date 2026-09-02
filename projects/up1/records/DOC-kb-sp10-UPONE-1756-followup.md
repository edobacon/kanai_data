---
id: DOC-kb-sp10-UPONE-1756-followup
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - follow-up
  - UPONE-1756
  - tributacion
  - sin-numero
---

# UPONE-1756 Follow-up (tributacion avanzada: lo diferido del alcance sp10)

> **Referencia externa:** por asignar (ticket a crear en Jira por el PO). **Follow-up de UPONE-1756.** · **Tipo:** implement · **Epica:** UPONE-1452 (Curriculum Mapping) · **Asignado:** por definir · **Story Points:** 13 (Mayor; base del follow-up, ver Estimacion)
>
> Este ticket implementa **todo lo que quedo fuera** del corte de sprint de UPONE-1756 (que entrego el CRUD de tributacion por competencia en grilla). Se construye **sobre** ese CRUD. Fuente completa: `UPONE-1756-detalle`, `UPONE-1756-detalle-po`; corte ya entregado: `UPONE-1756-alcance-sp10`; vistas: `UPONE-1756-maqueta-slice`.

## Fuente canonica (PO)

Misma que UPONE-1756 (Tributacion; enlace a la maqueta de sp10). Este ticket toma las capacidades del feature que el corte de sprint dejo diferidas.

## Historia de usuario

Como responsable curricular, quiero completar la tributacion con pesos, la asignacion desde la malla y en lote, los indicadores de cobertura, y el manejo seguro de retiro y versionado, para medir el logro de competencias sobre el plan y operar la tributacion a escala.

## Objetivo

Completar el feature de tributacion sobre el CRUD por competencia ya entregado (UPONE-1756 slice): agregar el peso del eje 1, el guardado transaccional de conjunto, la segunda forma de asignacion y la via masiva, los indicadores con sus denominadores, el retiro con aviso de dependientes, el versionado del plan, y `outcomeAlignment`.

## Alcance

**Dentro (base del follow-up, 13 SP):**

1. **Escritura de conjunto mas guardado global:** upsert de conjunto por (plan, matriz) transaccional (el guardado envia el mapa completo), en vez de escritura por operacion.
2. **Peso del eje 1:** `contributionPercentage` (ya definido en `UPONE-1756-alcance-sp10-delta`) mas reparto automatico/manual con la accion "repartir en partes iguales"; validacion de suma 100 por grupo **al publicar** el plan. El estado **automatico/manual del grupo se deriva, no se persiste** (un grupo es automatico si todos sus pesos son iguales dentro de la tolerancia); no se crea campo ni objeto "grupo".
3. **Segunda forma (malla por periodo) mas via masiva ("Varias"):** **reutilizar y ampliar el componente de malla ya existente** (intencion explicita del PO en el planning sp10), no construir uno nuevo.

**Tickets de la familia follow-up (cada uno con su detalle):**

- `UPONE-1756-followup-delta` (10 SP): indicadores con sus dos denominadores mas el efecto de `achievementBasis` y los tres ejes mas filas fuera de diseno mas versionado del plan (R-8).
- `UPONE-1756-followup-delta-2` (8 SP): `outcomeAlignment` (F6) mas retiro con aviso R-7 (depende de F6).
- `UPONE-1756-migracion-niveles` (5 SP, **fast-follow del sprint**): poblar `CompetencyNodeDevelopmentLevel` en las matrices existentes (cada competencia hereda **todos** sus niveles). Habilita el CRUD del sprint sobre datos ya cargados; conviene priorizarlo pegado al sprint. Detalle completo en su propio doc.

**Fuera:** el CRUD base por competencia (lo entrega `UPONE-1756-alcance-sp10`); el cableado del modelo y el rename destructivo (van en `UPONE-1756-alcance-sp10-delta`).

## Criterios de aceptacion (checkeables)

- [ ] El guardado de una matriz en un plan es un upsert de conjunto (no altas/bajas individuales) y es transaccional.
- [ ] En una celda con varias asignaturas que evaluan, se ve y edita el peso por asignatura; la suma del grupo se valida al publicar.
- [ ] El estado automatico/manual del grupo se **deriva** de los pesos, no se lee de un campo persistido.
- [ ] Se puede asignar tambien desde la malla por periodo y en lote por la via masiva.
- [ ] Los indicadores cuentan por celda declarada (no por competencia) y declaran su denominador segun la vista.
- [ ] Con `achievementBasis = RepresentativeLevel`, el logro y el indicador de "competencias con evaluador" se especializan al nivel representativo.
- [ ] Retirar una tributacion que sostiene RA nombra los dependientes y pide confirmacion (R-7).
- [ ] Al versionar el plan, quien tiene permiso de CM elige replicar vs limpio; replicar remapea al `planEntry` equivalente, conserva `developmentLevelId` y reporta las filas descartadas (R-8). Sin permiso de CM se replica por default (parametro institucional).
- [ ] Las filas fuera de diseno se muestran marcadas, no se borran solas.

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo. Ademas:

- [ ] Escritura gobernada de conjunto sin que ninguna via salte las reglas; validaciones de peso por grupo y su eje.
- [ ] Indicadores verificados contra el listado equivalente filtrado a mano.
- [ ] Retiro con R-7 verificado; versionado verificado en runtime (replica y limpio).
- [ ] i18n es/en/pt con paridad; tenant isolation; RBAC efectivo.
- [ ] Migracion de datos sin drift; rename `CoverageScheme -> DevelopmentScheme` coordinado con 1753.
- [ ] **Conexion con MCP a nivel de servicios (criterio transversal del sprint, planning sp10):** la logica de negocio vive en el resolver server-side, no exclusivamente en el cliente.

## Frontera core/mod (Aduana)

**`todo-mod-only`** (heredado de `UPONE-1756-detalle`). El versionado (R-8) cruza Design hacia Mapping, **resuelto sin Core Extension (alternativa A):** curriculum-design lee el permiso de curriculum-mapping por el RBAC existente. El registro de eventos global por `(objectType, operation)` queda para notificar/auditar, no para decidir. Sin Core Extension.

## Dependencias

- **Depende de UPONE-1756 (slice):** construye sobre el CRUD por competencia ya entregado.
- **Depende de UPONE-1755** (modelo de medicion y los tres ejes) y **UPONE-1753** (nombres nuevos).
- Cross-mod hacia curriculum-design: el versionado engancha en el flujo existente (`asNewVersion`/`sourceId`, `inheritRecordTypeExtensionOnVersion`) y lee el permiso de Mapping por RBAC; no requiere API de plataforma nueva.

## Estimacion (calibrada)

`Esfuerzo: Mayor (13) · Sensibilidad: Media`. Puramente **aditivo** (el modelo quedo cableado en `UPONE-1756-alcance-sp10-delta`): no toca schema. Ticket base de 13; el resto en los tickets de la familia.

| Componente (base) | Esfuerzo | SP |
|---|---|---|
| Pesos del eje 1 mas escritura de conjunto transaccional | Mayor | 8 |
| Segunda forma (malla, ampliando el componente existente) mas via masiva | Considerable | 5 |

**Total base: 13 SP.** Familia follow-up: `followup-delta` (10), `followup-delta-2` (8), `migracion-niveles` (5). **Feature completo: 13 (alcance-sp10) + 8 (alcance-sp10-delta) + 13 (este) + 10 + 8 + 5 = 57 SP en 6 tickets**, ninguno sobre el techo (13).

## Decisiones resueltas (reconciliacion con la revision de planning)

- **Corte del feature (cerrado):** 6 tickets, los del cuadro de arriba. F6 (`outcomeAlignment`) y el versionado quedan como tickets propios; la migracion de niveles es su propio ticket fast-follow (`UPONE-1756-migracion-niveles`).
- **Estado automatico/manual del grupo de peso: derivar, no persistir.** Un grupo es automatico si todos sus pesos son iguales dentro de la tolerancia (falso positivo inocuo). No se crea objeto "grupo". Concuerda con el detalle del PO (seccion 7).
- **Versionado cross-mod: alternativa A.** curriculum-design es dueno del flujo y del evento, y lee el permiso de curriculum-mapping por el RBAC existente. Permisos: versionar = `curriculum:version` (CD); ver = `competencyalignment:view` (CM); elegir replicar/limpio = escritura de CM. Sin permiso de CM: se versiona el plan, no se ve la pestana, y la tributacion **se replica por default** (parametro institucional). El plan viejo queda intacto. El evento global queda para notificar/auditar.
- **Herencia de niveles al versionar: el versionado NO hereda niveles** (remapea `planEntry`, conserva `developmentLevelId`). La regla "hereda todos los niveles" es de **migracion** de matrices existentes, ahora un ticket propio (`UPONE-1756-migracion-niveles`). El versionado engancha en el flujo existente (`asNewVersion`/`sourceId`, `inheritRecordTypeExtensionOnVersion`); no existe ningun `_cloneMap`.

## Decisiones abiertas

Ninguna a nivel de corte del feature: el reparto en 6 tickets quedo definido. Las decisiones abiertas remanentes viven en los tickets que las tienen (ej. `isRepresentative` en la migracion).

## Referencias

- Feature completo: `UPONE-1756-detalle` y `UPONE-1756-detalle-po`. Corte ya entregado: `UPONE-1756-alcance-sp10`.
- Tickets de la familia: `UPONE-1756-followup-delta`, `UPONE-1756-followup-delta-2`, `UPONE-1756-migracion-niveles`.
- Codigo del versionado (curriculum-design): `logic/sectionValidation.resolver.js` (`inheritRecordTypeExtensionOnVersion`), `logic/helpers/recordTypeExtension.js` (`copyRecordTypeExtension`).
- Working copy: `curriculum-mapping@584499e`, `curriculum-design@8a151e7`.
