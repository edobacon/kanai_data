---
id: TICKET-152
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1770
tier: T2
module: curriculum-mapping
autopilot: manual
story_points:
  estimated: 3
  executed: 3
---

## Objetivo

Corregir el hueco de validacion del peso de la tributacion (`contributionPercentage`) introducido por TICKET-149 (UPONE-1770, commit 2f0d7d5), detectado durante TICKET-151. Decision del dev (2026-09-24): opcion A2, la misma regla para numeros y texto.

## Problema (verificado en el codigo)

- `validateContributionPercentageRow` (`logic/helpers/validateCompetencyAlignment.js:90`) arranca con `if (isBlank(contributionPercentage)) return [];` y `isBlank` (l.39, heredado de 1756 para ids) trata como vacio todo lo que no es string. Un peso NUMERICO (p.ej. `150`, `33.335`, o con tipo `Develops`) saltea las tres reglas y llega a Prisma, que lo rechaza con error interno generico (columna `String?`). Un booleano tambien se trata como vacio.
- Del lado del texto se acepta cualquier cosa que `Number()` lea: `"0x32"` (50), `"1e1"` (10), `" 50 "` (con espacios) y `"33.30"` se guardan tal cual. Rompe la deteccion de reparto automatico (compara texto con `String(numero)`, `modsComponents/CompetencyAlignmentGrid/weights.ts:175`) y el mensaje "porcentaje entre 0 y 100, con hasta 2 decimales" no es literalmente cierto.
- Vias afectadas: escritura de a una (`competencyAlignment.resolver.js`, create/update) y guardado en conjunto (`competencyAlignment-batch.resolver.js`, por fila). La via masiva no recibe peso. La pantalla siempre manda texto canonico. El MCP no escribe tributaciones (bloqueado).

## Reglas que el peso debe cumplir (vigentes, no cambian)

1. Vacio o null = sin peso (valido); en update, omitirlo = no tocarlo.
2. Rango [0, 100].
3. Hasta 2 decimales (comparacion escalada con epsilon, `hasWeightPrecision`).
4. Solo `Evaluates`/`Both` llevan peso (R-6).
5. Suma del grupo <= 100 mientras se edita: solo pantalla (sin cambio).
6. Suma del grupo = 100 al publicar: guard de TICKET-150 en curriculum-design (sin cambio; lee el texto guardado).

## Alcance (A2)

1. **Una sola normalizacion del peso en el backend** (en `validateCompetencyAlignment.js`), usada por las dos vias antes de validar y de escribir:
   - Entrada valida: numero finito o texto con formato decimal simple (digitos, opcionalmente punto y hasta 2 decimales; se admite trim de espacios). Vacio/null = sin peso.
   - Entrada invalida con mensaje de peso invalido: `NaN`, `Infinity`, booleanos, objetos, texto no decimal (`"0x32"`, `"1e1"`, `"abc"`, coma decimal si no se decide aceptarla), mas de 2 decimales, fuera de rango.
   - Se guarda como texto CANONICO con el mismo formato que escribe la pantalla: `String(Number(n.toFixed(2)))` (p.ej. `33.340000000000003` -> `"33.34"`, `"33.30"` -> `"33.3"`, `" 50 "` -> `"50"`).
   - Las reglas 2, 3 y 4 aplican igual a numero y texto.
2. **Guardado en conjunto**: normalizar ANTES de la clasificacion de filas sin cambios y del chequeo de permisos por operacion, de modo que `50` contra `"50"` guardado cuente como sin cambios (no se reescribe ni exige `competencyalignment:modify`, criterio del arreglo RBAC de 149).
3. **Tests** por regla con numero y con texto: validos, rango, decimales, redondeo del float, tipos invalidos, formatos no decimales, tipo `Develops`, canonicalizacion guardada, `50` vs `"50"` sin cambio y sin exigir modify, en create/update y en el conjunto; la pantalla sin cambios.
4. **Datos existentes**: antes de mergear, verificar con una consulta de solo lectura que no haya pesos guardados con formato no canonico; si los hay, reportarlos (sin migrar en este ticket).

## Fuera de alcance

- Cambiar el tipo de la columna.
- El guard de suma de TICKET-150 (sigue leyendo texto, ahora siempre canonico) y la pantalla (ya escribe canonico).
- Coma decimal: no se acepta salvo decision explicita (hoy la pantalla usa punto).

## Contexto

Rama `feat/UPONE-1770-tributacion-peso-del-eje-1` de curriculum-mapping (sin push), mismo PR que TICKET-149 y TICKET-151. Relacionados: TICKET-149 (origen), TICKET-150 (guard de suma), TICKET-151 (donde se detecto).

## Enmiendas post-cierre

### Enmienda post-cierre 1 - 2026-09-24 - Eduardo (dev)

**Origen**: revisión del PR (PR curriculum-mapping #41; kb/sp11/UPONE-1770-adendas-post-review-cm41.md)
**Motivo**: Correcciones de la revisión del PR curriculum-mapping #41 (veredicto iterar: un hallazgo alto y seis medios), aplicadas con los tickets ya cerrados.

**Cambios**:
- El borrador del editor compara el peso por su valor numérico (50.0 sobre 50 guardado no marca cambios)
- Vaciar el input de un peso cargado lo vuelve a sin peso

**Commits**: curriculum-mapping@10cd440
**Evidencia**: typecheck pass · lint pass · tests 3059/3059 en verde · 21 tests nuevos en la tanda (declarada)
**Misma revisión, también en**: TICKET-149, TICKET-151
