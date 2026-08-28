---
id: SPEC-mods-019
project: up1
type: doc
module: mods
tags:
  - vitest
  - mock
  - Prisma
  - auth
  - config-validation
  - coverage
---

# Testing

## Preparacion

```bash
# Crear estructura de tests
mkdir -p mods/{mod}/tests/unit/resolvers
mkdir -p mods/{mod}/tests/unit/composables
mkdir -p mods/{mod}/tests/unit/config
mkdir -p mods/{mod}/tests/mocks
mkdir -p mods/{mod}/tests/fixtures
```

Crear `mods/{mod}/vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{js,ts}'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@om': path.resolve(__dirname, '../../object-manager/src'),
      '@om-scripts': path.resolve(__dirname, '../../object-manager/scripts'),
    },
  },
});
```

## Ejecutar tests

```bash
npm test --workspace=@uplanner/{mod}
npm run test:watch --workspace=@uplanner/{mod}
npm run test:coverage --workspace=@uplanner/{mod}
```

Config base: `vitest.config.js` con `environment: node`, aliases `@om` → `object-manager/src`, `@om-scripts` → `object-manager/scripts`.

---

### TEST-01: Test de resolver con mock Prisma
**Pre:** Resolver creado en `logic/`. `vitest` instalado en el workspace del mod.  
**In:** Nombre del resolver, queries/mutations a testear, datos mock a retornar.  
**Pasos:**
1. Crear `mods/mi-mod/tests/resolvers/miDominio.test.js`:
   ```javascript
   import { describe, it, expect, vi } from 'vitest';
   import { miModQuery, miModMutation } from '../../logic/miDominio.resolver.js';

   // Mock del cliente Prisma
   function createPrismaMock(overrides = {}) {
     return {
       miObjeto: {
         findMany: vi.fn().mockResolvedValue([]),
         findUnique: vi.fn().mockResolvedValue(null),
         create: vi.fn().mockResolvedValue({ id: 'test-id', nombre: 'Test', tenantId: 'UPU' }),
         update: vi.fn().mockResolvedValue({ id: 'test-id', nombre: 'Updated', tenantId: 'UPU' }),
         delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
       },
       ...overrides
     };
   }

   // Mock del contexto de autenticación
   function createAuthContext({ capabilities = [], tenantId = 'UPU' } = {}) {
     return {
       tenantId,
       user: {
         id: 1,
         email: 'test@uplanner.cl',
         roleAssignments: [{
           role: {
             roleCapabilities: capabilities.map(name => ({
               capability: { name },
               defaultValue: 'allow'
             }))
           },
           contextPath: `/system/${tenantId}`
         }]
       },
       prisma: createPrismaMock()
     };
   }

   describe('miModQuery', () => {
     it('getDashboard retorna registros del tenant correcto', async () => {
       const mockData = [{ id: '1', nombre: 'Registro', tenantId: 'UPU' }];
       const context = createAuthContext({ capabilities: ['mod/mi-mod:view_dashboard'] });
       context.prisma.miObjeto.findMany.mockResolvedValue(mockData);

       const result = await miModQuery.getDashboard(null, {}, context);

       expect(result).toEqual(mockData);
       // Verificar que el where incluye tenantId
       expect(context.prisma.miObjeto.findMany).toHaveBeenCalledWith(
         expect.objectContaining({ where: expect.objectContaining({ tenantId: 'UPU' }) })
       );
     });

     it('getDashboard lanza error sin capability', async () => {
       const context = createAuthContext({ capabilities: [] });

       await expect(miModQuery.getDashboard(null, {}, context))
         .rejects.toThrow();
     });
   });
   ```
2. Ejecutar los tests:
   ```bash
   npm test --workspace=@uplanner/mi-mod
   ```

**Validar:** Suite verde. El test verifica explícitamente que `tenantId: context.tenantId` está presente en el `where` de Prisma. Si el resolver omite `tenantId` en el where, el test debe fallar.  
**Doc:** `specs/up1/mods/creation-guide.md` §tests

---

### TEST-02: Test de validación de config
**Pre:** Archivos de config del mod creados: `app.json`, objetos JSON, `capabilities.json`, layouts.  
**In:** Rutas a los archivos de config, schema esperado.  
**Pasos:**
1. Crear `mods/mi-mod/tests/config/config.test.js`:
   ```javascript
   import { describe, it, expect } from 'vitest';
   import { readFileSync } from 'fs';
   import { resolve } from 'path';

   const MOD_DIR = resolve(process.cwd(), 'mods/mi-mod');

   function loadJson(relativePath) {
     return JSON.parse(readFileSync(resolve(MOD_DIR, relativePath), 'utf-8'));
   }

   describe('app.json', () => {
     const app = loadJson('config/app.json');

     it('tiene campos obligatorios', () => {
       expect(app.name).toBeDefined();
       expect(app.label).toBeDefined();
       expect(typeof app.name).toBe('string');
     });

     it('name usa kebab-case', () => {
       expect(app.name).toMatch(/^[a-z][a-z0-9-]*$/);
     });
   });

   describe('capabilities.json', () => {
     const caps = loadJson('capabilities.json');

     it('tiene estructura de objeto con module y capabilities', () => {
       expect(caps.module).toBeDefined();
       expect(Array.isArray(caps.capabilities)).toBe(true);
     });

     it('todas las capabilities tienen name y riskLevel', () => {
       caps.capabilities.forEach(cap => {
         expect(cap.name, `capability sin name: ${JSON.stringify(cap)}`).toBeDefined();
         expect(['low', 'medium', 'high']).toContain(cap.riskLevel);
       });
     });

     it('nombres de capability siguen la convencion', () => {
       caps.capabilities.forEach(cap => {
         expect(cap.name).toMatch(/^(mod\/|system:|[a-z])/);
       });
     });
   });

   describe('layouts', () => {
     const list = loadJson('config/layouts/mi-objeto-list.json');

     it('tiene campos obligatorios', () => {
       expect(list.name).toBeDefined();
       expect(list.objectName).toBeDefined();
       expect(list.layoutType).toBeDefined();
     });

     it('layoutType es RecordList o RecordDetail', () => {
       expect(['RecordList', 'RecordDetail']).toContain(list.layoutType);
     });
   });
   ```
2. Ejecutar:
   ```bash
   npm test --workspace=@uplanner/mi-mod
   ```

**Validar:** Suite verde con los archivos de config en su estado actual. Si un campo obligatorio falta → test falla con mensaje descriptivo. Útil para detectar errores antes del sync.  
**Doc:** `specs/up1/mods/reference.md`

---

### TEST-03: Test de edge cases (permisos insuficientes, datos faltantes, tenant inexistente)
**Pre:** TEST-01 completado. Mock de Prisma disponible.  
**In:** Escenarios de error a cubrir: sin capability, datos faltantes, tenant inválido.  
**Pasos:**
1. Agregar casos de error al test del resolver:
   ```javascript
   describe('edge cases', () => {
     it('lanza error cuando el usuario no tiene la capability requerida', async () => {
       const context = createAuthContext({ capabilities: [] }); // sin permisos
       await expect(miModQuery.getDashboard(null, {}, context))
         .rejects.toThrow(/unauthorized|forbidden|capability/i);
     });

     it('lanza error cuando se intenta crear sin campos obligatorios', async () => {
       const context = createAuthContext({ capabilities: ['mod/mi-mod:manage_records'] });
       context.prisma.miObjeto.create.mockRejectedValue(
         new Error('NOT NULL constraint failed: nombre')
       );

       await expect(miModMutation.createRecord(null, { input: {} }, context))
         .rejects.toThrow();
     });

     it('no retorna datos de otro tenant', async () => {
       const context = createAuthContext({ tenantId: 'UPU', capabilities: ['mod/mi-mod:view_dashboard'] });
       context.prisma.miObjeto.findMany.mockResolvedValue([]);

       await miModQuery.getDashboard(null, {}, context);

       const callArgs = context.prisma.miObjeto.findMany.mock.calls[0][0];
       // El where NUNCA debe estar vacío — siempre debe incluir tenantId
       expect(callArgs.where.tenantId).toBe('UPU');
       expect(callArgs.where.tenantId).not.toBeUndefined();
     });

     it('retorna array vacío cuando no hay registros (no null)', async () => {
       const context = createAuthContext({ capabilities: ['mod/mi-mod:view_dashboard'] });
       context.prisma.miObjeto.findMany.mockResolvedValue([]);

       const result = await miModQuery.getDashboard(null, {}, context);
       expect(Array.isArray(result)).toBe(true);
       expect(result).toHaveLength(0);
     });
   });
   ```

**Validar:** Cada caso de error falla por la razón correcta (el test pasa cuando el código se comporta mal por el motivo correcto). El test del tenant verifica explícitamente que `tenantId` no sea `undefined` en el `where`.  
**Doc:** `specs/up1/features/rbac.md` §6

---

### TEST-04: Ejecutar tests con coverage
**Pre:** Tests escritos. `@vitest/coverage-v8` instalado en el workspace.  
**In:** Umbrales de cobertura deseados (líneas, funciones, ramas).  
**Pasos:**
1. Agregar script en `mods/mi-mod/package.json` (ya incluido en MOD-01):
   ```json
   {
     "scripts": {
       "test:coverage": "vitest run --coverage"
     }
   }
   ```
2. Opcional: agregar umbrales en `vitest.config.js` del mod:
   ```javascript
   // mods/mi-mod/vitest.config.js
   import { defineConfig } from 'vitest/config';
   import { resolve } from 'path';

   export default defineConfig({
     test: {
       environment: 'node',
       coverage: {
         provider: 'v8',
         reporter: ['text', 'html'],
         thresholds: {
           lines: 80,
           functions: 80,
           branches: 70
         },
         include: ['logic/**/*.js'],
         exclude: ['tests/**', 'seed/**']
       }
     },
     resolve: {
       alias: {
         '@om': resolve(process.cwd(), 'object-manager/src'),
         '@om-scripts': resolve(process.cwd(), 'object-manager/scripts')
       }
     }
   });
   ```
3. Ejecutar:
   ```bash
   npm run test:coverage --workspace=@uplanner/mi-mod
   ```

**Validar:** Reporte muestra porcentaje de cobertura por archivo en `logic/`. Si los umbrales no se alcanzan → proceso sale con código de error. Reporte HTML en `coverage/index.html` para inspección detallada.  
**Doc:** `specs/up1/mods/creation-guide.md`
