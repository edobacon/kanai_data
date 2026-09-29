# Modelo de datos afectado — PEH-032

> Alcance del documento: modelo de datos que interviene en los 3 puntos vigentes tras la **Adenda 2** (ajuste MR en `fillRumaDataMap`, eje m3sec en stats, fixes de stats en legacy). Cubre legacy (`pehuen-server`, MongoDB) y target (`pehuen_nuxt`, misma base).
>
> **Conclusión anticipada: este ticket NO introduce cambios de esquema persistido.** No hay colecciones nuevas, ni campos nuevos en la base, ni migraciones, ni backfill (REQ-01, REQ-07). Lo único **NUEVO** son campos de objetos **en memoria** (DTOs de stats). Lo demás es cambio de **uso/lectura** sobre campos que ya existen.

## Convenciones de marcado

| Marca | Significado |
|---|---|
| `[EXISTENTE]` | Ya existe en la base o en el código, no se toca |
| `[EXISTENTE · USO NUEVO]` | El campo ya existe y ya se persiste, pero pasa a leerse/consumirse donde antes no se hacía |
| `[NUEVO · EN MEMORIA]` | Campo de un objeto calculado al vuelo, nunca persistido |
| `[inferido]` | Nombre/tipo no confirmado en el request ni en los REQs; verificar contra el esquema real antes de implementar |

---

## 1. Entidades persistidas (MongoDB)

### 1.1 `rumas` `[EXISTENTE]`

Colección de rumas. **RULE-RUMA-005: los volúmenes NO se persisten aquí**, se calculan al vuelo en `fillRumaData` / `fillRumaDataMap`.

| Campo | Tipo | Oblig. | FK / Enum | Default | Estado |
|---|---|---|---|---|---|
| `_id` | ObjectId | Sí | PK | auto | `[EXISTENTE]` |
| `numero` `[inferido]` | Number | Sí | — | — | `[EXISTENTE]` (ej. `5248`) |
| `canchaId` `[inferido]` | ObjectId | Sí | FK → `canchas._id` | — | `[EXISTENTE]` |
| `especieId` `[inferido]` | ObjectId | No | FK → `especies._id` | — | `[EXISTENTE]` |
| `estado` `[inferido]` | String | Sí | enum: activa / cerrada | activa | `[EXISTENTE]` |
| `fechaCreacion` `[inferido]` | Date | Sí | — | now | `[EXISTENTE]` (insumo del bucket de antigüedad, REQ-05) |

**No existen (y no se crean) campos `volMR`, `volM3`, `volCalculado` en esta colección.** Ver sección 2.1.

### 1.2 `ajustes` de ruma `[EXISTENTE]`

Núcleo del REQ-01 / REQ-02. **Los tres campos de valor ya existen y ya se persisten**; el bug es que `valorAjusteMR` se captura y se valida pero nunca se consume.

| Campo | Tipo | Oblig. | FK / Enum | Default | Estado |
|---|---|---|---|---|---|
| `_id` | ObjectId | Sí | PK | auto | `[EXISTENTE]` |
| `rumaId` `[inferido]` | ObjectId | Sí | FK → `rumas._id` | — | `[EXISTENTE]` |
| `tipoAjuste` `[inferido]` | String | Sí | enum: `ADD` \| `REDUCE` | — | `[EXISTENTE]` |
| `valorAjuste` | Number | Sí | validado `> 0` | — | `[EXISTENTE]` — deja de aplicarse al `volMR` |
| `valorAjusteM3` | Number | Sí | validado `> 0` | — | `[EXISTENTE]` — sigue aplicándose al `volM3`; pasa además a usarse en stats (REQ-03/04) |
| `valorAjusteMR` | Number | Sí | validado `> 0` | — | `[EXISTENTE · USO NUEVO]` — pasa a aplicarse al `volMR` |
| `fecha` `[inferido]` | Date | Sí | — | now | `[EXISTENTE]` |

**Semántica de aplicación (REQ-01, REQ-02):**

| Volumen calculado | Campo de ajuste antes | Campo de ajuste después | Signo |
|---|---|---|---|
| `volMR` | `valorAjuste` ❌ | `valorAjusteMR` ✅ | `ADD` suma, `REDUCE` resta |
| `volM3` | `valorAjusteM3` | `valorAjusteM3` (sin cambio) | `ADD` suma, `REDUCE` resta |
| `volCalculado` | sin ajuste | sin ajuste | — |

**Dato de producción relevante (no es cambio de modelo):** 23 de 267 ajustes tienen `valorAjuste != valorAjusteMR`. Al ser cálculo al vuelo, el fix de código corrige esos 23 casos sin tocar la base.

### 1.3 `guias` `[EXISTENTE]`

Movimientos de entrada (recepción) y salida (despacho). Es la entidad cuyo **eje de graficado cambia** (REQ-03/04).

| Campo | Tipo | Oblig. | FK / Enum | Default | Estado |
|---|---|---|---|---|---|
| `_id` | ObjectId | Sí | PK | auto | `[EXISTENTE]` |
| `numeroGuia` `[inferido]` | String / Number | Sí | clave de join con MII | — | `[EXISTENTE]` |
| `tipo` `[inferido]` | String | Sí | enum: entrada \| despacho | — | `[EXISTENTE]` |
| `rumaId` `[inferido]` | ObjectId | Sí | FK → `rumas._id` | — | `[EXISTENTE]` |
| `canchaOrigen` `[inferido]` | ObjectId | Cond. | FK → `canchas._id` | — | `[EXISTENTE]` — pasa a validarse en la rama "item nuevo" (REQ-06) |
| `canchaDestino` `[inferido]` | ObjectId | Cond. | FK → `canchas._id` | — | `[EXISTENTE]` |
| `especieId` `[inferido]` | ObjectId | No | FK → `especies._id` | — | `[EXISTENTE]` |
| `volumenRecepcion` | Number | No | — | — | `[EXISTENTE]` — **deja de ser el valor graficado** |
| `volumenDespacho` | Number | No | — | — | `[EXISTENTE]` — **deja de ser el valor graficado**; sigue restando en `volCalculado` |
| `fecha` `[inferido]` | Date | Sí | — | — | `[EXISTENTE]` — insumo del bucket de antigüedad (REQ-05) |

Los campos crudos **no se eliminan ni se modifican**: siguen persistiéndose y siguen alimentando `volCalculado`. Solo cambia qué valor se grafica.

### 1.4 `mii` (períodos MII) `[EXISTENTE]`

Fuente del m3sec. El join lo hace `fillGuiaDataWithMii`, que **ya existe** y se reutiliza (REQ-03/04).

| Campo | Tipo | Oblig. | FK / Enum | Default | Estado |
|---|---|---|---|---|---|
| `_id` | ObjectId | Sí | PK | auto | `[EXISTENTE]` |
| `periodo` `[inferido]` | String | Sí | formato `MM-YYYY` | — | `[EXISTENTE]` |
| `data` | Array\<MiiRow\> | Sí | subdocumento embebido | `[]` | `[EXISTENTE]` |

**`MiiRow` (subdocumento de `mii.data`) `[EXISTENTE]`**

| Campo | Tipo | Oblig. | Estado |
|---|---|---|---|
| `NUM_GUIA` `[inferido]` | String / Number | Sí | `[EXISTENTE]` — clave de join contra `guias.numeroGuia` |
| `VOLUMEN_M3_RECEPCION` | Number | No | `[EXISTENTE · USO NUEVO]` — pasa a ser el valor graficado en stats |

**Cardinalidad del join:** una guía puede tener **N filas** en `mii.data`. El m3sec de la guía es la **suma por movimiento** de `VOLUMEN_M3_RECEPCION`, no una fila única. Por eso el join usa `$unwind` sobre `mii.data` seguido de agrupación por guía.

**Cobertura (dato, no esquema):** `VOLUMEN_M3_RECEPCION` solo existe para el 22.1% de las guías de rumas activas (entradas 17.3%, despachos 91.9%) por un hueco de MII 2025. Los gráficos quedan **consistentes** con la vista de rumas y heredan ese hueco. Completar MII 2025 está **fuera de alcance**.

### 1.5 `GuiaExtraData` (legacy) / `GuiaVolumen` (nuxt) `[EXISTENTE · SIN CAMBIOS]`

Registro por guía y tipo de movimiento, del que dependen los descuentos de `volMR`/`volM3` en `fillRumaDataMap`.

| Campo | Tipo | Oblig. | FK / Enum | Estado |
|---|---|---|---|---|
| `guiaId` / `numeroGuia` `[inferido]` | ObjectId / String | Sí | FK → `guias` | `[EXISTENTE]` |
| `tipo` `[inferido]` | String | Sí | enum: `ENTRADA` \| `SALIDA` | `[EXISTENTE]` |
| `volMR` `[inferido]` | Number | No | — | `[EXISTENTE]` |
| `volM3` `[inferido]` | Number | No | — | `[EXISTENTE]` |

**Se documenta solo porque `fillRumaDataMap` la lee** (es parte del contexto del método que se modifica en REQ-01/02). **Todo lo relativo a su generación, materialización, cobertura o backfill queda FUERA DE ALCANCE por Adenda 2.** No se toca ni su esquema, ni su flujo de escritura, ni se clasifican las guías sin `SALIDA`.

### 1.6 Referenciales `[EXISTENTE · SIN CAMBIOS]`

`canchas`, `especies`, `productos`: participan solo como destino de FK y como dimensión de agrupación en los endpoints de stats. Sin cambios de campos ni de índices.

---

## 2. Objetos en memoria (no persistidos)

Aquí está **todo lo nuevo** del ticket.

### 2.1 Salida de `fillRumaData` / `fillRumaDataMap` `[EXISTENTE · CONTRATO PRESERVADO]`

REQ-07: mismos campos, mismos tipos, ninguna escritura nueva.

| Campo | Tipo | Cambia | Nota |
|---|---|---|---|
| `volCalculado` | Number | No | Sigue restando `volumenDespacho` directo |
| `volMR` | Number | **Valor sí, contrato no** | Pasa a ajustarse con `valorAjusteMR` |
| `volM3` | Number | No | Sigue con `valorAjusteM3` |
| `producto` (legacy) | según impl. | No | Se preserva |
| `productQty` (legacy) | Number | No | Se preserva |

Ejemplo de corrección esperada (Ruma #5248): `volMR` pasa de `8.81` a `187.74` con `valorAjusteMR = 179.03`. **Sin escribir nada en la base.**

### 2.2 `GuiaLike` de stats (salida de `mapAjustesToGuiasLike` y de los reducers) `[MODIFICADO]`

Objeto intermedio que los reducers consumen. Es donde entra el m3sec.

| Campo | Tipo | Oblig. | Estado |
|---|---|---|---|
| `volumenRecepcion` | Number | No | `[EXISTENTE]` — se conserva, deja de ser el valor graficado |
| `volumenDespacho` | Number | No | `[EXISTENTE]` — ídem |
| `volumenMSSC` | Number | No | `[NUEVO · EN MEMORIA]` — m3sec: suma de `mii.data[].VOLUMEN_M3_RECEPCION` por movimiento; **valor graficado** |
| campo de ajuste mapeado | Number | No | `[MODIFICADO]` — `mapAjustesToGuiasLike` pasa a mapear `valorAjusteM3` |

`volumenMSSC` **es opcional por diseño**: dado el hueco de MII, muchas guías no lo tendrán. Definir el tratamiento del faltante (ausente vs `0`) y aplicarlo **idéntico en legacy y nuxt**, porque REQ-04 exige paridad de resultado y un criterio distinto rompe la comparación entre stacks.

### 2.3 Shape de respuesta de los 5 endpoints de stats `[EXISTENTE · SIN CAMBIOS]`

REQ-03 / REQ-04: **el shape no cambia**, solo el valor numérico graficado. Ningún campo nuevo, renombrado ni eliminado en la respuesta HTTP. El consumidor (cliente legacy y nuxt) no requiere cambios de contrato.

### 2.4 Bucket de antigüedad `[EXISTENTE · SEMÁNTICA CORREGIDA]`

Estructura acumuladora del gráfico de stock por antigüedad (REQ-05).

| Elemento | Estado | Nota |
|---|---|---|
| Buckets por rango de días (incluye el de más de ~120 días) | `[EXISTENTE]` | Sin cambio de estructura |
| Signo del aporte de un despacho | `[MODIFICADO]` | `+=` pasa a `-=`; el legacy debe igualar a `applyDayBucket` de nuxt (valor firmado) |
| Condición duplicada inalcanzable | `[ELIMINADO]` | Código muerto en `stats.helper.ts` ~172-180 y su espejo en la rama de item nuevo |

### 2.5 Acumulador de `calcularVolumenEnCanchaPorEspecie` `[EXISTENTE · SIN CAMBIO DE FORMA]`

REQ-06 no cambia campos: corrige la **condición de guarda** de la rama "item nuevo", que hoy resta el despacho sin validar que `canchaOrigen` sea la cancha evaluada. La parentización debe quedar idéntica a la de la rama "encontrado".

---

## 3. Relaciones

```
canchas 1 ──< N rumas
especies 1 ──< N rumas
rumas   1 ──< N ajustes            (ajustes.rumaId)
rumas   1 ──< N guias              (guias.rumaId)
canchas 1 ──< N guias              (canchaOrigen / canchaDestino)
guias   1 ──< N mii.data[]         (numeroGuia = NUM_GUIA, join por valor, sin FK formal)
guias   1 ──o 1 GuiaExtraData/GuiaVolumen  (por tipo de movimiento; opcional, fuera de alcance)
```

Notas:

- El join `guias ↔ mii.data` es **por valor, no referencial**: no hay FK declarada ni integridad garantizada. Una guía sin fila en MII simplemente no tiene m3sec.
- La relación es **1:N** (una guía puede aparecer en varias filas del período). Tratarla como 1:1 subcontaría el m3sec.

---

## 4. Índices

**Ninguno de estos índices es un cambio de este ticket por sí mismo.** Se listan porque el join con MII cambia el patrón de acceso.

### 4.1 Existentes que se asumen presentes `[EXISTENTE]`

| Colección | Índice | Uso |
|---|---|---|
| `ajustes` | `{ rumaId: 1 }` | Carga de ajustes por ruma en `fillRumaDataMap` |
| `guias` | `{ rumaId: 1 }` | Guías de la ruma |
| `rumas` | `{ canchaId: 1, estado: 1 }` `[inferido]` | Filtro de rumas activas por cancha en stats |

### 4.2 A verificar por el join con MII

| Colección | Índice | Estado | Motivo |
|---|---|---|---|
| `mii` | `{ periodo: 1 }` | `[EXISTENTE]` `[inferido]` | Acotar el período antes del `$unwind` |
| `mii` | `{ "data.NUM_GUIA": 1 }` | **A verificar** | Sin él, resolver el m3sec por guía obliga a barrer períodos completos |

**Criterio operativo (REQ-03):** el join debe hacerse **acotado al conjunto de guías de las rumas/cancha ya filtradas**, no sobre la colección `mii` completa. El `$unwind` sobre `mii.data` va **después** del filtro, nunca antes. Este es un requisito de forma del pipeline, no una métrica: **la Adenda 2 deja fuera de alcance umbrales, p95 y mediciones antes/después.**

---

## 5. Notas de migración

| Ítem | Estado |
|---|---|
| Migración de esquema | **Ninguna.** No se agregan, renombran ni eliminan campos persistidos |
| Backfill / recálculo de rumas | **No aplica** (Adenda 2, REQ-01). Los volúmenes se calculan al vuelo: el fix de código corrige el histórico automáticamente en la próxima lectura |
| Escrituras nuevas en la base | **Ninguna** (REQ-07). Los 3 puntos son de lectura y cálculo |
| Proceso por lotes / gate de aprobación de escritura | **Fuera de alcance** (Adenda 2) |
| Índice `mii.data.NUM_GUIA` | Verificar existencia. Si falta, crearlo es una tarea de infraestructura de lectura, sin impacto en datos |
| Datos MII 2025 incompletos | **Fuera de alcance.** Afecta la *completitud* del punto 3, no su *consistencia* con la vista de rumas |
| Reversibilidad | Total. Al no persistirse nada, revertir el código revierte por completo el comportamiento |

---

## 6. Riesgos de datos a considerar en implementación

1. **Paridad legacy ↔ nuxt en el faltante de m3sec.** Si un stack trata `volumenMSSC` ausente como `0` y el otro lo omite del promedio o del conteo, los totales divergen y REQ-04 no se cumple. Fijar el criterio una vez.
2. **Doble conteo en el `$unwind`.** Si tras el `$unwind` no se agrupa por guía antes de sumar, una guía con N filas MII se cuenta N veces en los reducers.
3. **Ajustes con los tres valores divergentes.** Un mismo ajuste alimenta `volMR` (con `valorAjusteMR`), `volM3` (con `valorAjusteM3`) y stats (con `valorAjusteM3`). Los tres caminos deben leer su propio campo: reutilizar un solo valor "genérico" reintroduce exactamente el bug del REQ-01.
4. **`valorAjusteMR` validado `> 0` pero potencialmente ausente en documentos antiguos.** La validación aplica en captura, no retroactivamente. Definir el fallback para un ajuste histórico sin el campo (documentarlo; no escribir la base para completarlo).