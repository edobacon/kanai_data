---
id: RULE-sidecar-002
project: bayley
type: rule
module: sidecar
level: should
tags:
  - sidecar
  - auth
  - dev-tokens
  - local-dev
  - storybook-token
---

# Dev tokens del object-manager reconocidos por el sidecar

## What

El object-manager acepta 3 tokens/mecanismos especiales para dev local que
autentican sin llamar a Auth0:

| Mecanismo | Valor/ENV | User autenticado | Rol |
|-----------|-----------|------------------|-----|
| `UP1_FLOW_SERVICE_TOKEN` | env del backend | `admin@uplanner.dev` | Admin + todas las caps |
| `STORYBOOK_STATIC_TOKEN` | `storybook-dev-token-12345` | `admin@uplanner.dev` | Admin + todas las caps |
| `ENABLE_TEST_MODE=true` | env del backend | `profile.manager@uplanner.cl` | rol profile-manager |

Para configurar el sidecar de bayley en dev local, la via mas rapida es:

```env
AUTH_TOKEN=Bearer storybook-dev-token-12345
```

El sidecar pasa este valor tal cual en el header `Authorization` a cada
request GraphQL, y `userExtractor.js` del object-manager lo intercepta.

## Why

Evita al dev tener que:
1. Loguearse en UP1 con un user real
2. Copiar la cookie `Auth0` del browser
3. Renovarla cada vez que expira

Los 3 tokens son **solo dev** — validados via env vars configurables por
entorno. En prod estas vars no se setean y cualquier request con estos
valores falla en Auth0.

## Where

- **Extractor backend**: `object-manager/src/middlewares/userExtractor.js:87-107`
  (orden de chequeo: UP1_FLOW_SERVICE_TOKEN → STORYBOOK_STATIC_TOKEN → ENABLE_TEST_MODE)
- **Config sidecar**: `bayley/sidecar/.env.local` → `AUTH_TOKEN`
- **Doc**: `bayley/sidecar/README.md` (actualizar con estos 3 tokens)

## When

Siempre que:

1. Se levante el sidecar por primera vez en una maquina dev
2. El AUTH_TOKEN actual expire (si era cookie Auth0)
3. Se reporte "el sidecar da 401 contra object-manager"

## Verification

```bash
# Verificar que el backend tiene alguno de los tokens habilitados
grep -E "UP1_FLOW_SERVICE_TOKEN|STORYBOOK_STATIC_TOKEN|ENABLE_TEST_MODE" \
     /path/to/object-manager/.env
```

Si ninguno esta configurado en el backend, la via dev no funciona — solo
cookies Auth0 reales.

```bash
# Confirmar autenticacion correcta
curl -sS http://localhost:5174/health | jq
curl -sS http://localhost:5174/api/apps | jq '.ok, .count'
```

`.ok=true` con `count>0` indica que el token autentico correctamente y
vio apps.

## Source

- **Discovered in**: BLY-016, Session 3 (2026-04-21), learn L2
- **Evidence**: Inspeccion de `userExtractor.js:87-107` confirmo los 3
  mecanismos. POC de bayley levantado con `STORYBOOK_STATIC_TOKEN`.
- **Related**: RULE-sidecar-001 (role filter — despues de autenticar)
- **Dep**: object-manager middleware de auth
