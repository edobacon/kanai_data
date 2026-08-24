---
id: SPEC-mods-017
project: up1
type: spec
module: mods
tags: [resolver, query, mutation, withAuth, transaction, schema.graphql]
---
# Resolvers GraphQL

## Preparacion

```bash
# Crear carpeta si no existe
mkdir -p mods/{mod}/logic
```

## Despues de CADA receta

```bash
npm run sync
# Reiniciar Object Manager (resolvers no tienen hot reload)
```

## Reglas criticas

- **Export DEBE contener "Query" o "Mutation"** en el nombre (case-insensitive). Si no, el resolver se ignora silenciosamente sin error.
- **SIEMPRE** `extend type Query` / `extend type Mutation` en el schema. Nunca `type Query` (conflicto con core).
- **SIEMPRE** `withAuth(['capability'])` para proteger cualquier resolver expuesto.
- **SIEMPRE** `tenantId: context.tenantId` en todo `where` de Prisma.
- **Context disponible**: `context.prisma`, `context.tenantId`, `context.user`, `context.userId`.
- **Import de withAuth**: ruta relativa `../../services/auth/withAuth.js` (el resolver queda en `object-manager/src/graphql/resolvers/mods/{mod}/` post-sync — son 4 niveles desde ese destino, pero la ruta se escribe relativa al destino, no al fuente).

---

### RES-01: Query custom con withAuth

**Pre:** mod con carpeta `logic/`, capability definida en `capabilities.json`
**In:** nombre del query, nombre del objeto Prisma, capability requerida

**Pasos:**

1. Crear `logic/miFeature.schema.graphql`:
```graphql
type MiResultado {
  id: String!
  nombre: String!
  estado: String!
}

extend type Query {
  listMiResultados(filtro: String): [MiResultado!]!
  getMiResultado(id: String!): MiResultado
}
```

2. Crear `logic/miFeature.resolver.js`:
```javascript
import { withAuth } from '../../services/auth/withAuth.js';

export const miFeatureQueryResolvers = {
  listMiResultados: withAuth(
    ['mod/mi-mod:view_data'],
    async (parent, { filtro }, context) => {
      return context.prisma.miObjeto.findMany({
        where: {
          tenantId: context.tenantId,
          ...(filtro && { nombre: { contains: filtro } }),
        },
      });
    }
  ),

  getMiResultado: withAuth(
    ['mod/mi-mod:view_data'],
    async (parent, { id }, context) => {
      return context.prisma.miObjeto.findUnique({
        where: { id, tenantId: context.tenantId },
      });
    }
  ),
};
```

3. `npm run sync` + reiniciar Object Manager.

**Validar:** query disponible en `localhost:4000/graphql`; sin token retorna error de auth; con token sin capability retorna 403.
**Doc:** `specs/up1/mods/reference.md §6`, `specs/up1/features/rbac.md §6`

---

### RES-02: Mutation custom con withAuth

**Pre:** schema GraphQL creado (puede estar en el mismo `.schema.graphql` del query)
**In:** nombre de la mutation, input type, capability de escritura

**Pasos:**

1. Agregar al `.schema.graphql`:
```graphql
input MiObjetoInput {
  nombre: String!
  estado: String!
  categoriaId: String
}

extend type Mutation {
  crearMiObjeto(input: MiObjetoInput!): MiResultado
  actualizarMiObjeto(id: String!, input: MiObjetoInput!): MiResultado
  eliminarMiObjeto(id: String!): MiResultado
}
```

2. Agregar al `.resolver.js`:
```javascript
export const miFeatureMutationResolvers = {
  crearMiObjeto: withAuth(
    ['mod/mi-mod:manage_data'],
    async (parent, { input }, context) => {
      return context.prisma.miObjeto.create({
        data: { ...input, tenantId: context.tenantId },
      });
    }
  ),

  actualizarMiObjeto: withAuth(
    ['mod/mi-mod:manage_data'],
    async (parent, { id, input }, context) => {
      return context.prisma.miObjeto.update({
        where: { id, tenantId: context.tenantId },
        data: input,
      });
    }
  ),

  eliminarMiObjeto: withAuth(
    ['mod/mi-mod:delete_data'],
    async (parent, { id }, context) => {
      return context.prisma.miObjeto.delete({
        where: { id, tenantId: context.tenantId },
      });
    }
  ),
};
```

3. `npm run sync` + reiniciar Object Manager.

**Validar:** mutation ejecutable en GraphQL playground; usuario sin capability recibe 403; dato creado incluye `tenantId` correcto.
**Doc:** `specs/up1/mods/reference.md §6`, `specs/up1/mods/creation-guide.md §5.2`

---

### RES-03: Mutation transaccional

**Pre:** RES-02 completo; necesidad de atomicidad entre 2+ operaciones Prisma
**In:** operaciones a ejecutar en la misma transaccion

**Pasos:**

1. Usar `context.prisma.$transaction` dentro del resolver:
```javascript
export const miFeatureMutationResolvers = {
  cambiarEstado: withAuth(
    ['mod/mi-mod:manage_data'],
    async (parent, { id, nuevoEstado }, context) => {
      return context.prisma.$transaction(async (tx) => {
        // 1. Actualizar registro principal
        const registro = await tx.miObjeto.update({
          where: { id, tenantId: context.tenantId },
          data: { estado: nuevoEstado },
        });

        // 2. Crear log de auditoria en la misma transaccion
        await tx.auditLog.create({
          data: {
            action: 'estado_cambiado',
            recordId: id,
            nuevoValor: nuevoEstado,
            tenantId: context.tenantId,
          },
        });

        // Si cualquier operacion falla, ambas hacen rollback
        return registro;
      });
    }
  ),
};
```

**Validar:** forzar fallo en la segunda operacion (dato invalido) y verificar que la primera tambien revierte.
**Doc:** `specs/up1/mods/reference.md §6`

---

### RES-04: Resolver con checkFieldPermissions (field-level RBAC)

**Pre:** capabilities de campo definidas en `capabilities.json` (ej: `miobjeto.campoSensible:modify`)
**In:** campos sensibles a proteger, objeto Prisma

**Pasos:**

1. Definir capabilities de campo en `capabilities.json`:
```json
{
  "capabilities": [
    { "name": "miobjeto.campoSensible:view", "riskLevel": "low" },
    { "name": "miobjeto.campoSensible:modify", "riskLevel": "medium" }
  ]
}
```

2. En el resolver, usar `checkFieldPermissions` antes del update:
```javascript
import { withAuth } from '../../services/auth/withAuth.js';
import { checkFieldPermissions } from '../../services/auth/authChecker.js';

export const miFeatureMutationResolvers = {
  actualizarConCampos: withAuth(
    ['miobjeto:modify'],
    async (parent, { id, input }, context) => {
      // Verifica permisos por cada campo del input que se quiere modificar
      await checkFieldPermissions(
        context.user,
        'MiObjeto',
        Object.keys(input), // ej: ["nombre", "campoSensible"]
        'modify'
      );
      // Si algún campo no tiene permiso, lanza error antes de llegar aqui
      return context.prisma.miObjeto.update({
        where: { id, tenantId: context.tenantId },
        data: input,
      });
    }
  ),
};
```

**Validar:** usuario con `miobjeto:modify` pero sin `miobjeto.campoSensible:modify` recibe error al intentar modificar ese campo; usuario con ambas caps actualiza correctamente.
**Doc:** `specs/up1/features/rbac.md §8`, `specs/up1/features/rbac-examples.md §6`

---

### RES-05: Resolver con hasCapability soft (filtrar datos sin bloquear)

**Pre:** capability de campo de lectura definida en `capabilities.json`
**In:** campo a ocultar condicionalmente

**Pasos:**

1. Usar `hasCapability` (no lanza error, retorna boolean):
```javascript
import { withAuth } from '../../services/auth/withAuth.js';
import { hasCapability } from '../../services/auth/authChecker.js';

export const miFeatureQueryResolvers = {
  listMiObjetos: withAuth(
    ['mod/mi-mod:view_data'],
    async (parent, args, context) => {
      const registros = await context.prisma.miObjeto.findMany({
        where: { tenantId: context.tenantId },
      });

      // Verificacion suave: ocultar campo sensible si no tiene permiso
      const puedeVerCampoSensible = await hasCapability(
        context,
        ['miobjeto.campoSensible:view']
      );

      return registros.map((r) => ({
        ...r,
        campoSensible: puedeVerCampoSensible ? r.campoSensible : null,
      }));
    }
  ),
};
```

**Validar:** usuario sin capability recibe `campoSensible: null`; usuario con capability recibe el valor real.
**Doc:** `specs/up1/features/rbac.md §6`, `specs/up1/features/rbac-examples.md §2`

---

### RES-06: Resolver con capabilities OR (basta con una)

**Pre:** dos o mas capabilities alternativas que dan acceso al mismo recurso
**In:** array de capabilities, resolver

**Pasos:**

1. Pasar array con multiples capabilities a `withAuth` — la logica es OR (basta con tener UNA):
```javascript
export const miFeatureQueryResolvers = {
  getDatos: withAuth(
    // El usuario necesita AL MENOS UNA de estas
    ['mod/mi-mod:view_dashboard', 'mod/mi-mod:manage_data'],
    async (parent, args, context) => {
      return context.prisma.miObjeto.findMany({
        where: { tenantId: context.tenantId },
      });
    }
  ),
};
```

**Validar:** usuario con solo `view_dashboard` puede acceder; usuario con solo `manage_data` puede acceder; usuario sin ninguna recibe 403.
**Doc:** `specs/up1/features/rbac.md §6`, `specs/up1/features/rbac-examples.md §2`

---

### RES-07: Definir tipo GraphQL custom en schema

**Pre:** necesidad de retornar forma diferente a los objetos auto-generados del CRUD
**In:** nombre del tipo, campos con sus tipos GraphQL

**Pasos:**

1. Definir el tipo en el `.schema.graphql` del mod:
```graphql
# Tipo personalizado para este resolver
type ResumenMetricas {
  totalRegistros: Int!
  porEstado: [ItemConteo!]!
  promedioPuntuacion: Float
}

type ItemConteo {
  estado: String!
  cantidad: Int!
}

extend type Query {
  getResumenMetricas: ResumenMetricas!
}
```

2. El resolver retorna un objeto que coincide con la forma del tipo:
```javascript
export const miFeatureQueryResolvers = {
  getResumenMetricas: withAuth(
    ['mod/mi-mod:view_dashboard'],
    async (parent, args, context) => {
      const registros = await context.prisma.miObjeto.findMany({
        where: { tenantId: context.tenantId },
      });
      const porEstado = Object.entries(
        registros.reduce((acc, r) => {
          acc[r.estado] = (acc[r.estado] || 0) + 1;
          return acc;
        }, {})
      ).map(([estado, cantidad]) => ({ estado, cantidad }));

      return {
        totalRegistros: registros.length,
        porEstado,
        promedioPuntuacion:
          registros.reduce((s, r) => s + (r.puntuacion || 0), 0) / registros.length || null,
      };
    }
  ),
};
```

**Validar:** query retorna shape correcta; campos opcionales retornan `null` correctamente.
**Doc:** `specs/up1/mods/reference.md §6`

---

### RES-08: Definir input type en schema

**Pre:** mutation que recibe multiples campos agrupados
**In:** nombre del input, campos requeridos y opcionales

**Pasos:**

1. Definir el input type en el `.schema.graphql`:
```graphql
# Input types usan sufijo "Input" por convencion
input CrearMiObjetoInput {
  nombre: String!          # Requerido (!)
  descripcion: String      # Opcional
  estado: String!
  categoriaId: String      # FK opcional
  puntuacion: Float
}

input ActualizarMiObjetoInput {
  nombre: String           # Todos opcionales en update
  descripcion: String
  estado: String
  puntuacion: Float
}

extend type Mutation {
  crearMiObjeto(input: CrearMiObjetoInput!): MiResultado
  actualizarMiObjeto(id: String!, input: ActualizarMiObjetoInput!): MiResultado
}
```

**Validar:** GraphQL playground muestra autocompletado del input con campos correctos; campos `!` son requeridos por el schema.
**Doc:** `specs/up1/mods/reference.md §6`

---

### RES-09: Fix — resolver ignorado por mal naming de export

**Pre:** resolver creado y synced pero la query/mutation no aparece en `localhost:4000/graphql`
**In:** nombre del export actual

**Pasos:**

1. Verificar el nombre del export en el `.resolver.js`:
```javascript
// MAL — no contiene "Query" ni "Mutation"
export const miFeature = { getDatos: ... };

// MAL — minusculas no hacen diferencia, pero falta el sufijo
export const miFeatureResolvers = { getDatos: ... };

// BIEN — contiene "Query" (case-insensitive)
export const miFeatureQueryResolvers = { getDatos: ... };

// BIEN — tambien valido
export const miFeatureMutation = { crearDato: ... };

// BIEN — puede tener queries y mutations en el mismo export
export const miFeatureQuery = {
  getDatos: withAuth(...),
};
export const miFeatureMutation = {
  crearDato: withAuth(...),
};
```

2. Corregir el nombre del export.
3. `npm run sync` + reiniciar Object Manager.

**Validar:** query/mutation aparece en el schema de GraphQL playground.
**Doc:** `specs/up1/mods/reference.md §6`, `specs/up1/mods/llm-guide.md §5`
