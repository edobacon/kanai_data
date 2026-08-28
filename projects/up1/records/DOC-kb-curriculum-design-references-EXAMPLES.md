---
id: DOC-kb-curriculum-design-references-EXAMPLES
project: up1
type: doc
---

# Examples

> **Origen**: documento entregado por el equipo funcional el 2026-04-27.
> Este archivo es **referencia verbatim** — no se modifica.

---

Dos snippets canonicos anotados. Usalos como plantilla: copialos,
renombralos y ajusta los campos.

## Ejemplo 1 - Objeto propio del mod

Archivo: `mods/candidate/objects/Enrollment.json`

Representa una matricula de un usuario a una oferta. Referencia dos
Base (`Offering`, `core_User`) y define campos propios.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Enrollment",
  "type": "object",
  "metadata": {
    "label": "Matricula",
    "labelPlural": "Matriculas",
    "gender": "femenino",
    "description": "Matricula de un usuario a una oferta academica",
    "defaultLayoutType": "RecordList"
  },
  "properties": {
    "offeringId": {
      "type": "string",
      "title": "Offering",
      "not_null": true,
      "description": "Oferta a la que se inscribe",
      "isForeignKey": true,
      "references": "Offering",
      "targetField": "id"
    },
    "userId": {
      "type": "integer",
      "title": "User",
      "not_null": true,
      "description": "Usuario inscrito",
      "isForeignKey": true,
      "references": "core_User",
      "targetField": "id"
    },
    "status": {
      "type": "string",
      "title": "Status",
      "not_null": true,
      "description": "Estado de la matricula",
      "enum": ["ACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"],
      "static_default": "ACTIVE"
    },
    "enrolledAt": {
      "type": "string",
      "format": "date-time",
      "title": "Enrolled At",
      "not_null": true,
      "description": "Fecha de matriculacion"
    }
  },
  "required": ["offeringId", "userId", "status", "enrolledAt"]
}
```

**Decisiones ilustradas**:

- `title` = nombre del archivo en PascalCase.
- `metadata.gender` usa `"femenino"` (no `"f"`).
- `metadata.defaultLayoutType` presente.
- Labels en espanol, property titles en ingles Title Case, descripciones
  en espanol.
- `userId` es `integer` + `references: "core_User"` (patron del core).
- `offeringId` es `string` + `references: "Offering"` (FK estandar).
- `status` es `enum` con valores UPPER_SNAKE_CASE y `static_default`
  como string.
- `enrolledAt` usa `type: "string"` + `format: "date-time"`.
- No hay `id`, `createdAt`, `updatedAt` - los inyecta `common.json`.

## Ejemplo 2 - Extension de un Base por cliente

Archivo: `object-manager/objects/business/Extended/ext__acme__offering.json`

Cliente "ACME" necesita dos campos adicionales en `Offering`
(un campo de facturacion y un flag de regulacion).

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ext__acme__offering",
  "type": "object",
  "allOf": [{ "$ref": "../Base/offering.json" }],
  "properties": {
    "billingCode": {
      "type": "string",
      "title": "Billing Code",
      "not_null": false,
      "description": "Codigo de facturacion interno del cliente",
      "unique": true,
      "transformations": [
        { "type": "uppercase", "description": "Normalizar a mayusculas" }
      ]
    },
    "requiresAccreditation": {
      "type": "boolean",
      "title": "Requires Accreditation",
      "not_null": false,
      "description": "Indica si la oferta requiere acreditacion regulatoria",
      "static_default": "false"
    }
  }
}
```

**Decisiones ilustradas**:

- `filename` = `ext__<cliente>__<baselowercase>.json`. El cliente es
  `acme`, el Base es `offering`.
- `title` coincide con el filename (sin `.json`).
- `allOf[0].$ref` apunta al Base real con path relativo. Debe
  coincidir con el filename; si divergen, bayley emite
  `ref-mismatch` (y el filename gana).
- Solo se agregan **campos nuevos** en `properties`. El objeto
  `Extended` **no redefine** los del Base (los hereda via `$ref`).
- `billingCode` tiene `transformations` (uppercase) y `unique`.
- `requiresAccreditation` es boolean con `static_default` como
  string `"false"`.
- No hay `required` porque los campos nuevos son opcionales
  (`not_null: false`). Si fueran obligatorios, se listan en
  `required`.
