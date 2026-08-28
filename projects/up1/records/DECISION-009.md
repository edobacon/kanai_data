---
id: DECISION-009
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - multi-tenant
  - tenants
  - infraestructura
  - superseded
---

# DECISION-009: Usar tenants existentes `TEST` y `UPU` para development; NO crear `UNIVALLE`/`AIEP` en SP1

> ⚠️ **SUPERSEDED por [DECISION-011](DECISION-011-final-use-test-upu.md)** (2026-04-28, mismo dia).
>
> Cadena de reconsideraciones: DECISION-009 (esta, ~10:00) → DECISION-010 (~14:00, revierte a UNIVALLE/AIEP) → DECISION-011 (~17:00, vuelve a TEST/UPU como decision **final**).
>
> El razonamiento de DECISION-009 era correcto a nivel de overhead, pero le faltaba el analisis tecnico de coexistencia que DECISION-011 incorpora (4 capas de aislamiento: tablas distintas, sidebar separado, listados filtrados, 1 sola tabla compartida resoluble con upsert).
>
> Esta decision se mantiene como registro historico y referencia del razonamiento de la reunion 2026-04-28.

## Contexto

[DECISION-003](DECISION-003-tenant-ids.md) (2026-04-27) propuso crear nuevos tenants `UNIVALLE` y `AIEP` como pre-requisito de TICKET-006, ejecutando `npm run tenant:create` para cada uno antes de iniciar el desarrollo del mod `curriculum-design`.

En la reunion 2026-04-28, Juan Diego Galdames (plataforma UP1) sugirio una alternativa mas pragmatica: usar los tenants existentes `TEST` y `UPU` para las pruebas de SP1, sin crear tenants dedicados. El razonamiento: la infraestructura UP1 actualmente tiene un solo ambiente compartido (el dominio donde se hizo la demo), y crear tenants dedicados solo para development no aporta valor inmediato.

## Drivers

1. **Infraestructura limitada**: el unico ambiente UP1 disponible para pruebas es el de demo/QA. No hay multi-ambiente.
2. **Tenants existentes ya configurados**: `TEST` y `UPU` estan operativos y listos para usar.
3. **Reduce overhead**: evita ejecutar `tenant:create` (~7 pasos: config, DB, schema, migracion, prisma client, seed, capabilities) y mantenerlos limpios.
4. **Mismo objetivo**: probar variabilidad entre tenants (TICKET-009) se cumple con CUALQUIER par de tenants distintos — no requiere que sean `UNIVALLE`/`AIEP` literalmente.
5. **Naming en datos NO depende de TENANT_ID**: el seed de Univalle/AIEP usa los datos legacy v2.2, pero pueden cargarse en tenants `TEST` y `UPU` usando los nombres reales de los cursos como instancias.

## Alternativas evaluadas

| Opcion | Pro | Contra |
|--------|-----|--------|
| **A. Usar `TEST` + `UPU` existentes** (elegida) | Cero overhead infra. Tenants ya operativos. Cumple objetivo de TICKET-009 (probar variabilidad). | Los TENANT_IDs no son semanticos — no se identifican como "Univalle" o "AIEP" en la UI/logs. Requiere mapeo mental. |
| B. Crear `UNIVALLE` + `AIEP` (DECISION-003 original) | Semantica clara. Coherente con datos legacy. Listo para piloto si se decidiera convertir el ambiente en uno cliente-real. | Overhead de crear/mantener tenants dedicados. No hay piloto previsto en SP1. Probabilidad de tener que recrear si la infraestructura cambia. |
| C. Mixto (UPU para Univalle simbolico, crear AIEP) | Aprovecha UPU. Mantiene 1 ID semantico. | Asimetrico. Confunde mas que ayuda. |

## Decision

**Adoptar opcion A**: usar tenants existentes `TEST` y `UPU` para development de SP1.

**Mapeo simbolico** (solo para identificar el origen de datos, no afecta TENANT_ID):
- Datos seed Univalle (`aa-uv-1124`, etc.) se cargan en tenant `TEST`.
- Datos seed AIEP (`aa-aiep-14757`, etc.) se cargan en tenant `UPU`.

(O al reves — el orden lo decide quien implemente. Lo importante es la separacion entre tenants.)

**NO ejecutar**:
- ~~`npm run tenant:create UNIVALLE`~~
- ~~`npm run tenant:create AIEP`~~

**Activar mod en `app.json`**:
```json
{
  "name": "curriculum-design",
  "tenants": ["TEST", "UPU"],
  ...
}
```

**Si la decision se revierte**: la migracion de TEST/UPU → UNIVALLE/AIEP es trivial (re-ejecutar tenant:create + reseed). Esto NO bloquea convertir mas adelante si se decide tener tenants dedicados.

## Cita verbatim de la reunion 2026-04-28

> Juan Diego Galdames: _"podriamos hacer un, podriamos hacer, bueno, tenemos ya dos tenans como que usamos siempre de base que esta UPU y test. Podriamos probar agregando cosas primero en test y despues en UPU."_
>
> _"el tema de los ambientes ahi la verdad que es por temas que nos tienen menos votados de infraestructura, pero no tenemos nuestro el dominio que tenemos arriba donde hicimos las demo ha sido es nuestro ambiente de momento de desarrollo QA. (...) producion, pero es la forma que tenemos de momento."_
>
> _"si no es probar local, el unico ambiente que tenemos como en la nube para probar cosas es esa. Es ese. Si, pero podriamos probar con los tenants que ya existen o crear tenants dedicados. La verdad que ahi podriamos dejar cosas en upu y en test para hacer distinciones entre tenant y probar que distintos modelos de datos."_

## Consecuencias positivas

- Cero overhead de infra.
- Tenants ya operativos — desarrollo arranca inmediato.
- Mantiene flexibilidad: si en el futuro hay piloto real, se crean los tenants reales en ese momento.
- Cumple el objetivo de TICKET-009 (probar variabilidad entre tenants).

## Consecuencias negativas

- Los TENANT_IDs no reflejan al cliente real — requiere mapeo mental ("TEST tiene datos Univalle").
- Si el equipo de Esteban (modelado) usa el ambiente, vera `TEST`/`UPU` en lugar de `UNIVALLE`/`AIEP` — puede confundir.
- Si en algun momento se decide hacer piloto real, requiere migrar datos (re-seed) a tenants nuevos.

## Multi-tenancy: que cambia respecto a DECISION-003

| Aspecto | DECISION-003 | DECISION-009 (este) |
|---------|--------------|---------------------|
| TENANT_IDs | `UNIVALLE`, `AIEP` (a crear) | `TEST`, `UPU` (existentes) |
| Pre-requisito infra | `npm run tenant:create UNIVALLE/AIEP` | (ninguno) |
| `tenants[]` en app.json | `["UNIVALLE", "AIEP"]` | `["TEST", "UPU"]` |
| Estructura `objects/tenants/<TENANT>/` | A crear | Ya existe |
| Mapeo legacy → tenant | Univalle → UNIVALLE, AIEP → AIEP | Univalle → TEST, AIEP → UPU (o al reves) |

## Que cubre y NO cubre

### Cubre
- Sustituye DECISION-003 para SP1.
- Establece que NO se crean tenants nuevos.
- Define el mapeo simbolico de datos legacy a tenants existentes.

### NO cubre
- Decision sobre tenants productivos reales (postergada — depende de cuando haya piloto).
- Configuracion del ambiente UP1 multi-environment (postergada — depende del equipo infra).
- T3, T4, T5 (Tenant Questions): pendientes — el cambio de IDs no altera la postura general (RTs globales por DECISION-007, seed dividido por tenant, Extensions futuras).

## Acciones necesarias en TICKET-006

- ❌ ~~Pre-requisito ejecutar `npm run tenant:create UNIVALLE/AIEP`~~ — ya NO aplica.
- ✅ Validar que `TEST` y `UPU` estan operativos antes de iniciar.
- ✅ Configurar `tenants: ["TEST", "UPU"]` en `app.json` del mod.
- ✅ Decidir mapeo legacy → tenant antes de cargar seed.

## Referencias

- [DECISION-003](DECISION-003-tenant-ids.md) — superseded por esta decision
- [Open Questions T1](../specs/curriculum-design/open-questions.md#tenant-questions-t1t5)
- [DECISION-007 RTs globales](DECISION-007-recordtypes-global.md) — sigue aplicando
- Reunion 2026-04-28 (Juan Diego, Esteban, Eduardo)
