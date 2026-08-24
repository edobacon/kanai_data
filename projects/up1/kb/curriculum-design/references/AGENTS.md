# Agente: diseno de modelo de datos up1

> **Origen**: documento entregado por el equipo funcional el 2026-04-27.
> Este archivo es **referencia verbatim** — no se modifica. Si llegan revisiones, se agregan como version posterior (`AGENTS-vN.md`) y se actualiza esta nota.

---

Esta carpeta es un sandbox para que un LLM genere un modelo de datos
candidato en el formato up1. Esta guia asume **cero contexto previo**
de up1: todo lo que necesitas esta aqui o en los archivos del ZIP.

**Fuente de verdad**: los archivos reales en
`object-manager/objects/business/Base/`. Si esta guia contradice un
Base, **gana el Base**. Ante cualquier duda de patron, abrir
`Base/offering.json` y `Base/hwassessment.json` como referencia.

Ver tambien `EXAMPLES.md` para dos snippets canonicos anotados (un
objeto propio de mod y una extension de cliente).

## Que es up1

up1 es una plataforma educativa configurable por institucion (colegio,
universidad, instituto). Todo el comportamiento se modela con objetos
de datos declarados como JSON Schema draft-07 extendido. Esos objetos
se organizan en capas:

- **core**: objetos comunes a toda la plataforma (`Offering`,
  `Institution`, `Service`, `Event`, etc.). Viven en `Base/`.
- **mod**: un modulo que agrega capacidades especificas (ej. Learning
  Assurance, Risk Assessment). Los objetos propios del modulo viven en
  `mods/<nombre>/objects/`.
- **Extended**: extension de un Base para un cliente especifico
  (agrega campos sin tocar el core). Vive en `Extended/`.

Tu trabajo como LLM es disenar los objetos de **un mod** y opcionalmente
extender Base existentes. **Nunca modificas el core**.

## Glosario

| Termino | Significado |
|---------|------------|
| **Base** | Objeto del core. Reutilizable por cualquier mod/cliente. No se modifica. |
| **Extended** | Objeto derivado de un Base para un cliente. Agrega campos via `allOf` + `$ref`. |
| **Mod** | Conjunto de objetos propios de un modulo funcional. Pueden hacer FK a Base. |
| **Tenant / Cliente** | Institucion que usa up1. Cada tenant puede tener sus propios Extended. |
| **Scope** | Ambito de un objeto: `core-base`, `core-extended`, `tenant-base`, `mod`. |
| **FK** | Foreign Key: campo que referencia a otro objeto via `isForeignKey` + `references`. |
| **MADS** | Template inheritance (herencia de secciones/campos). Concepto avanzado, no siempre aplica. |

## Arbol de decision: extender vs crear en mod

Antes de escribir un objeto nuevo, decidir:

1. **El concepto ya existe en `Base/`?**
   Ejemplo: "oferta academica" ya existe como `Offering`.
   - NO crear otro objeto. Usar FK `"references": "Offering"` desde
     los objetos del mod.

2. **El concepto existe en Base pero necesito campos adicionales para
   un cliente especifico?**
   - Crear un Extended en `Extended/ext__<cliente>__<base>.json` con
     `allOf` + `$ref` al Base.

3. **Es un concepto nuevo que no existe en Base?**
   - Crearlo en `mods/candidate/objects/<MiObjeto>.json`.

4. **Necesito relacionar mi objeto con un Base?**
   - FK directa: `"references": "<BaseTitle>"`. Nunca duplicar el Base.

## Flujo de trabajo del LLM

1. **Leer el requerimiento del dominio** (que se pide modelar).
2. **Inventariar los Base disponibles**: listar los archivos de
   `object-manager/objects/business/Base/` y revisar cuales se pueden
   reutilizar como FK.
3. **Aplicar el arbol de decision** a cada concepto del requerimiento:
   reutilizar Base / extender Base / crear en mod.
4. **Escribir los JSONs** respetando formato y convenciones (ver abajo).
5. **Validar en bayley** (selector workspace -> sandbox -> Re-scan) y
   revisar la seccion de anomalies. Iterar hasta dejarla limpia.

## Objetivo concreto

Produci archivos `.json` dentro de `mods/candidate/objects/` (objetos
propios del mod) y opcionalmente `object-manager/objects/business/Extended/`
(extensiones de objetos del core) siguiendo el formato up1.

## Estructura de carpetas

```
candidate-model/
|-- object-manager/
|   `-- objects/
|       `-- business/
|           |-- common.json                  (campos automaticos: id, createdAt, updatedAt)
|           |-- Base/                        (objetos base del core - NO modificar)
|           |   |-- offering.json
|           |   |-- institution.json
|           |   `-- ...
|           `-- Extended/                    (extensiones por cliente - el LLM escribe aqui)
|               `-- ext__<clientCode>__<nombreBaseLowercase>.json
`-- mods/
    `-- candidate/
        `-- objects/                         (objetos propios del mod - el LLM escribe aqui)
            |-- MiObjeto.json
            `-- ...
```

## Formato de un objeto (JSON Schema draft-07 up1)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MiObjeto",
  "type": "object",
  "metadata": {
    "label": "Mi objeto",
    "labelPlural": "Mis objetos",
    "gender": "masculino",
    "description": "Descripcion corta del objeto.",
    "defaultLayoutType": "RecordList"
  },
  "properties": {
    "name": {
      "type": "string",
      "title": "Name",
      "not_null": true,
      "description": "Nombre del objeto",
      "transformations": [
        { "type": "trim", "description": "Eliminar espacios" }
      ]
    },
    "code": {
      "type": "string",
      "title": "Code",
      "not_null": false,
      "description": "Codigo unico",
      "unique": true,
      "transformations": [
        { "type": "uppercase", "description": "Normalizar a mayusculas" }
      ]
    },
    "facultyId": {
      "type": "string",
      "title": "Faculty",
      "not_null": true,
      "description": "Facultad a la que pertenece",
      "isForeignKey": true,
      "references": "Faculty",
      "targetField": "id"
    }
  },
  "required": ["name", "facultyId"]
}
```

## Reglas (no negociables)

1. **No repitas `id`, `createdAt`, `updatedAt`** - los inyecta el
   framework (ver `common.json`).
2. **`title`** igual al nombre del archivo en **PascalCase**. Ej.
   `Faculty.json` tiene `"title": "Faculty"`.
3. **Filename**: PascalCase para objetos del mod y Base. Para Extended,
   `ext__<clientCode>__<nombreBaseLowercase>.json`.
4. **`required`**: array de nombres de campo requeridos en la capa de API.

## Convenciones del core (patrones reales de los Base)

### Metadata del objeto

- **`label` / `labelPlural`**: en **espanol**. Ej. `"Oferta"` /
  `"Ofertas"`.
- **`gender`**: `"masculino"` o `"femenino"` (NO `"m"`/`"f"`).
  Obligatorio.
- **`description`**: en espanol, una frase.
- **`defaultLayoutType`**: `"RecordList"` por defecto. Incluir siempre.

### Properties (campos)

- **`title` del campo**: **ingles Title Case**. Ej. `"Max Capacity"`,
  `"Risk Level"`.
- **`description` del campo**: en espanol. Una frase breve.
- **Naming de campos**: camelCase. FKs terminan en `Id`
  (ej. `offeringId`, `institutionId`).

### Tipos soportados

| Tipo | Uso |
|------|-----|
| `string` | Texto, ids (PKs y FKs), enums, codes, urls |
| `integer` | Numeros enteros. Tambien para FK a `core_User` (ver abajo) |
| `number` | Decimales, porcentajes, puntuaciones |
| `boolean` | Flags (`is*`, `has*`). Default siempre como string `"true"`/`"false"` |
| `object` | JSON embebido. Default `static_default: "{}"` |
| `formula` | Campo calculado. Ver `hwassessment.json` - usa `properties.formula` |

Para fechas: agregar `"format": "date"`, `"format": "date-time"` o
`"format": "time"` sobre un `string`. Ej.:
```json
"startDate": { "type": "string", "format": "date", "title": "Start Date" }
```

### Flags por property

- **`not_null`**: fuerza NOT NULL en DB.
- **`unique`**: constraint UNIQUE. Tipico en `code`.
- **`static_default`**: valor por defecto. **Siempre como string**,
  incluso para booleans (`"true"`) y objects (`"{}"`).
- **`transformations`**: pipeline aplicado antes de guardar. Patrones
  tipicos:
  - `{ "type": "trim" }` en `name`
  - `{ "type": "uppercase" }` en `code`
- **`enum`**: array de valores permitidos. Ej. `"enum": ["LOW", "MEDIUM", "HIGH"]`.
  Convencion en el core: UPPER_SNAKE_CASE para valores enum.

### Foreign keys (FK)

- **Regla general**: `"type": "string"` + `"isForeignKey": true` +
  `"references": "<Title>"` (PascalCase del target) + opcional
  `"targetField"` (default `"id"`).
- **FK a usuarios**: patron especial del core.
  ```json
  "userId": {
    "type": "integer",
    "isForeignKey": true,
    "references": "core_User",
    "targetField": "id"
  }
  ```
  `core_User` es un objeto virtual del core - no hay archivo
  `core_User.json` en `Base/` pero se referencia asi.
- **Self-reference** (ej. `parentId`): simplemente apuntar al mismo
  objeto. **NO usar `relation: "self"`** (los Base reales no lo usan).
  ```json
  "parentId": {
    "type": "string",
    "isForeignKey": true,
    "references": "Category",
    "targetField": "id"
  }
  ```
- **FK polimorfica** (un campo que apunta a distintos objetos segun un
  discriminador): patron par `<nombre>Type` + `<nombre>Id`. El `*Type`
  es un `enum` con los tipos posibles; el `*Id` es `"type": "string"`
  **sin** `isForeignKey` (no se puede declarar destino). Documentar en
  `description` que el destino depende de `*Type`.
  ```json
  "ownerType": {
    "type": "string",
    "enum": ["Activity", "Offering"],
    "title": "Owner Type"
  },
  "ownerId": {
    "type": "string",
    "title": "Owner",
    "description": "ID del dueno segun ownerType. Sin FK directa (polimorfico)."
  }
  ```

## Extensiones por cliente (Extended)

Para extender un objeto Base del core con campos adicionales especificos
de un cliente:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ext__<clientCode>__<baseName>",
  "type": "object",
  "allOf": [{ "$ref": "../Base/<BaseName>.json" }],
  "properties": {
    "nuevoCampo": { "type": "string" }
  }
}
```

- Filename: `ext__<clientCode>__<nombreBaseLowercase>.json`.
- `title`: igual al filename sin `.json`.
- `allOf[0].$ref`: path relativo al Base. Debe coincidir con el filename.
- `<clientCode>`: slug del cliente (ej. `acme`, `uplanner`).

Bayley valida coherencia filename vs `$ref` y emite anomaly `ref-mismatch`
si divergen. El filename gana como fuente de verdad.

## Anomalies y como resolverlas

Bayley emite anomalies cuando detecta inconsistencias. La vista
DataModel las lista por severidad. Tabla de referencia:

| Kind | Que significa | Como arreglar |
|------|---------------|---------------|
| `invalid-json` | JSON malformado | Corregir sintaxis |
| `broken-ref` | `references` apunta a un Title que no existe | Verificar que el target este en Base, Extended o mod (con el mismo `title` exacto) |
| `duplicate-title` | Dos archivos con el mismo `title` | Renombrar uno. Un title es unico globalmente |
| `orphan-object` | Objeto sin relaciones entrantes ni salientes | A veces es intencional; revisar si falta una FK |
| `cross-mod-direct-fk` | Un mod hace FK directa a otro mod | Desacoplar: o promover el objeto al core, o usar FK solo por id sin `references` (denormalized) |
| `unknown-type` | Propiedad con `type` no soportado | Usar solo: string, integer, number, boolean, object, formula |
| `unpaired-denorm` | Referencia denormalizada sin campo `Id` correspondiente | Agregar el campo par |
| `missing-common` | Falta `common.json` en el workspace | Viene en el ZIP; no borrar |
| `ref-mismatch` | Filename Extended no coincide con `allOf[0].$ref` | Alinear uno al otro; **el filename gana como fuente de verdad** |
| `missing-ref` | FK declarada (`isForeignKey: true`) sin `references` | Agregar `references: "<Title>"` |

## Como iterar

1. Disena los objetos del mod en `mods/candidate/objects/`.
2. Si queres extender objetos del core, crea archivos `ext__*.json` en
   `Extended/`.
3. Refresca en bayley: selector de workspace -> sandbox -> Re-scan.
4. Revisa anomalies en la vista. Ajusta hasta que queden limpias.

## No toques

- `object-manager/objects/business/Base/` - son los objetos del core
  real de up1. Se copiaron aqui como referencia para que puedas extenderlos.
- `common.json` - campos automaticos del framework.
- `package.json` - marcador estructural para que bayley valide la carpeta.
