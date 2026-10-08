---
id: RULE-suite-sync-user-clerk-test-solo-dev-email-verificado-UPONE-1933
project: up1
type: rule
module: suite
level: must
tags:
  - UPONE-1933
  - auth
  - clerk
---

El endpoint /api/auth/sync-user quita el alias +clerk_test antes del @ únicamente en una instancia de desarrollo de Clerk (clave pk_test_), y en pk_live_ el alias no se altera. Además exige que el email primario esté verified, igual que el self-heal de userExtractor.js en OM, y responde 403 sin llamar a OM en caso contrario. OM rechaza syncUser sin X-Internal-Service-Key, que por eso pasa a ser obligatoria en .env.example, y el endpoint es su único llamador.

Fuente: f21c40a server/api/auth/sync-user.post.ts:61; docs/guides/authentication.md; .env.example.
