---
id: TICKET-152-SPEC
project: up1
ticket: TICKET-152
status: approved
---

# Peso de la tributación: una sola normalización para número y texto en las dos vías de escritura

## Resumen ejecutivo

Se corrige el hueco de validación de `contributionPercentage`: hoy `isBlank` trata como vacío todo lo que no es string, así que un peso numérico (150, 33.335, con tipo Develops) saltea las tres reglas y muere en Prisma con error genérico; y del lado texto se acepta '0x32', '1e1', ' 50 ' o '33.30' tal cual, rompiendo la detección de reparto automático. Se agrega UNA normalización en `validateCompetencyAlignment.js`, usada por la vía de a una y por la de conjunto antes de validar, clasificar sin cambios y escribir, que devuelve texto canónico `String(Number(n.toFixed(2)))` o error de peso inválido. NO se toca el tipo de la columna, el guard de suma de TICKET-150 ni la pantalla (ya escribe canónico). Se verifica con tests por regla en número y texto (create/update y por fila del conjunto) y con una consulta de solo lectura que confirme que no hay pesos guardados no canónicos. ADVERTENCIA (fuera del alcance pedido): `curriculum-design/logic/helpers/curriculumAlignmentWeights.js` tiene su propio `isBlank`/`validateContributionPercentageRow` con el mismo patrón; el request lo deja explícitamente fuera (el guard sigue leyendo texto) y no se modifica aquí. ADVERTENCIA 2: si la consulta de datos existentes encuentra pesos no canónicos, se reporta, no se migra.

## Requirements

### REQ-01 `confirmed`
> Fuente: curriculum-mapping/logic/helpers/validateCompetencyAlignment.js:39 (isBlank), :90 (validateContributionPercentageRow)

Una única función de normalización de peso en `validateCompetencyAlignment.js` acepta número finito o texto decimal simple (dígitos, opcionalmente punto y hasta 2 decimales, con trim), trata vacío/null como sin peso, y devuelve el valor como texto canónico `String(Number(n.toFixed(2)))`; cualquier otra entrada produce el error de peso inválido existente en vez de llegar a Prisma.

### REQ-02 `confirmed`
> Fuente: curriculum-mapping/logic/competencyAlignment.resolver.js:67, :148

La escritura de a una (create y update en `competencyAlignment.resolver.js`) normaliza el peso antes de validar y de persistir, de modo que el valor guardado siempre es canónico y las reglas 2, 3 y 4 aplican igual para número y texto; en update, omitir el peso sigue significando no tocarlo.

### REQ-03 `confirmed`
> Fuente: curriculum-mapping/logic/competencyAlignment-batch.resolver.js:35, :118, :315

El guardado en conjunto (`competencyAlignment-batch.resolver.js`) normaliza el peso de cada fila ANTES de la clasificación de filas sin cambios y del chequeo de permisos por operación, de modo que una fila que manda 50 contra '50' guardado cuenta como sin cambios: no se reescribe ni exige `competencyalignment:modify`.

### REQ-04 `confirmed` `enforcement`
> Fuente: curriculum-mapping/logic/helpers/validateCompetencyAlignment.js:90; consumidores: competencyAlignment.resolver.js:67,:148 y competencyAlignment-batch.resolver.js:35,:118,:315

La normalización vive en el helper compartido y las dos vías la consumen: no se duplica la lógica de parseo/formato en los resolvers ni se altera la firma pública de `validateContributionPercentageRow` de forma que rompa a sus consumidores actuales.

### REQ-05 `confirmed` `enforcement`
> Fuente: KB RULE-mods-003 (sync obligatorio tras cambios en mods) y RULE-mods-001 (nunca modificar archivos synced en core)

Tras el cambio en mods, se ejecuta `npm run sync` para que los artefactos del mod se reflejen en los core workspaces, sin editar archivos synced en core.

### REQ-06 `confirmed`
> Fuente: request TICKET-152 alcance punto 4; columna String? en CompetencyAlignment (curriculum-mapping/docs/reference/competencyalignment-object.md:37,:44)

Antes de mergear se ejecuta una consulta de SOLO LECTURA sobre los pesos guardados de CompetencyAlignment y se reporta si existe algún valor con formato no canónico (espacios, ceros de más, notación no decimal); no se migra nada en este ticket.
## Tasks

#### S1.T1 — Agregar en `logic/helpers/validateCompetencyAlignment.js` la normalización única del peso (número finito o texto decimal simple con hasta 2 decimales y trim; vacío/null = sin peso; salida canónica `String(Number(n.toFixed(2)))`; todo lo demás = error de peso inválido) y hacer que `validateContributionPercentageRow` deje de usar el `isBlank` heredado (l.39) para el peso, conservando los mensajes y el contrato de error actuales. No se toca `isBlank` para ids ni el helper homónimo de curriculum-design.
Contrato: rollback: git revert del cambio en validateCompetencyAlignment.js; el helper vuelve al comportamiento de isBlank + Number().. Status: done

#### S1.T2 — Consumir la normalización en la vía de a una (`competencyAlignment.resolver.js:67` create y `:148` update): normalizar antes de validar y persistir el texto canónico; mantener que omitir el peso en update no lo toca y que null lo deja sin peso.
Contrato: rollback: git revert del cambio en competencyAlignment.resolver.js; los resolvers vuelven a pasar el valor crudo a la validación y a Prisma.. Status: done

#### S1.T3 — Consumir la normalización en el guardado en conjunto (`competencyAlignment-batch.resolver.js:35,:118,:315`): normalizar cada fila ANTES de la clasificación de filas sin cambios y del chequeo de permisos por operación, comparar el canónico contra lo guardado, y reportar peso inválido por fila con el contrato de errores por fila vigente.
Contrato: rollback: git revert del cambio en competencyAlignment-batch.resolver.js; vuelve la clasificación/permisos sobre el valor crudo.. Status: done

#### S1.T4 — Correr `npm run sync` y verificar que los artefactos del mod se propagan a los core workspaces sin editar nada synced en core (RULE-mods-001 / RULE-mods-003).
Contrato: rollback: Revertir los archivos regenerados en core al HEAD y re-sync desde el mod.. Status: done

#### S1.T5 — Ejecutar una consulta de SOLO LECTURA sobre los pesos guardados de CompetencyAlignment para detectar valores con formato no canónico y reportar el resultado (conteo y valores distintos) en el cierre del ticket. Sin UPDATE ni script de migración.
Contrato: rollback: No aplica: es lectura. Si se dejó un archivo de consulta temporal, eliminarlo (debe vivir fuera del diff del PR).. Status: done

#### S1.T6 — Suite completa de tests del peso por regla, con número y con texto, en create, update y por fila del conjunto: válidos, rango [0,100] con bordes, más de 2 decimales, redondeo del float (33.340000000000003 -> '33.34'), tipos inválidos (booleanos, objetos, NaN, Infinity), formatos no decimales ('0x32', '1e1', 'abc', coma decimal), tipo Develops, canonicalización guardada ('33.30' -> '33.3', ' 50 ' -> '50'), y 50 vs '50' sin cambio y sin exigir modify. Verificar además que los tests de la pantalla y los del guard de curriculum-design (curriculum-publish-weights-guard.test.js) siguen pasando sin cambios.
Contrato: rollback: git checkout de los archivos de test; el código de producción queda intacto.. Status: done
## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por Peso de la tributación: una sola normalización para número y texto en las dos vías de escritura
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5
- [x] S1.T6

**Gate (auto)**: La suite del mod pasa con los casos nuevos: peso numérico 150 / 33.335 / true / Develops devuelve error de peso (no de Prisma), '0x32' y '1e1' se rechazan, '33.30' y ' 50 ' se guardan canónicos, y en el guardado en conjunto 50 contra '50' no se reescribe ni exige `competencyalignment:modify`. Además queda el reporte de la consulta de solo lectura sobre los pesos ya guardados.
