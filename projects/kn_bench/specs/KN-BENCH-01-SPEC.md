---
id: KN-BENCH-01-SPEC
project: kn_bench
ticket: KN-BENCH-01
status: approved
---

# Modulo de utilidades de duracion (parse/format) en TypeScript

## Requirements

#### REQ-01 `confirmed`
> Fuente: Request item 1 + Criterios de aceptacion (parseDuration("1h30m")===5400000, parseDuration("") y parseDuration("10x") lanzan Error)
parseDuration(input: string): number convierte una duracion humana a milisegundos, soportando las unidades d/h/m/s/ms combinables en cualquier orden, con espacios opcionales entre segmentos, y lanza Error con mensaje descriptivo ante entrada invalida (string vacio, unidad desconocida, numero sin unidad, unidad sin numero, valores negativos).

#### REQ-02 `confirmed`
> Fuente: Request item 2 + Criterios de aceptacion (formatDuration(5400000)==="1h30m", formatDuration(-1) lanza Error, 0 -> "0ms")
formatDuration(ms: number): string es la inversa de parseDuration: dado un numero de milisegundos no negativo y finito devuelve la forma humana canonica mas compacta (omitiendo unidades con valor cero, con 0 representado como "0ms"), y lanza Error ante numeros negativos o no finitos.

#### REQ-03 `confirmed`
> Fuente: Request item 3 (round-trip: parse seguido de format y viceversa)
parseDuration y formatDuration son inversas consistentes: formatDuration(parseDuration(x)) reproduce la forma canonica de x, y parseDuration(formatDuration(n)) reproduce n para todo ms no negativo y finito.

## Tasks

#### S1.T1 — Crear el modulo de duracion con constantes de unidades (d/h/m/s/ms en ms) y la funcion pura parseDuration: tokenizar segmentos numero+unidad ignorando espacios, validar entrada (vacio, unidad desconocida, numero sin unidad, unidad sin numero, negativos) lanzando Error descriptivo, y acumular a milisegundos.
Contrato: rollback: Eliminar el archivo del modulo de duracion (revertir el commit); no hay consumidores previos, cambio puramente aditivo.. Status: pending

#### S1.T2 — Implementar la funcion pura formatDuration en el mismo modulo: validar no-negativo y finito (lanzar Error si no), descomponer ms en d/h/m/s/ms de mayor a menor omitiendo unidades en cero, y devolver "0ms" cuando el total es cero.
Contrato: rollback: Revertir el bloque de formatDuration dejando el modulo solo con parseDuration; cambio aislado en un unico archivo.. Status: pending

#### S1.T3 — Escribir la suite de tests del modulo cubriendo la matriz de casos de REQ-01, REQ-02 y REQ-03 (cada unidad sola, combinaciones, espacios, ordenes no canonicos, boundaries de cero, round-trip en ambos sentidos y todos los casos de error), correr typecheck y la suite confirmando verde.
Contrato: rollback: Eliminar el archivo de tests; no afecta el codigo de produccion ni otras suites.. Status: pending
