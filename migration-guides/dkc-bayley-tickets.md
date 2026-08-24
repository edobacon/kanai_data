# Plan DKC -> Kanai por ticket - bayley
 
Fuente DKC: commit e15fa24377cf1a0768cc10ad567c110b3ac2042e. Tickets canónicos: 40. Sidecars Markdown: 0.
 
Cada fila sigue: hash -> parseo -> relaciones -> schema/FK -> smoke -> resultado. Los estados provisionales requieren revisión antes de aceptar la migración.
 
| ID | Archivo | Título | Estado DKC | Estado Kanai | Work type | External | Sidecars | Disposición |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BLY-001 | projects/bayley/tickets/BLY-001.md | Vista Layouts — grafo de flujos UI entre layouts core y de mods | closed | closed | implement | — | — | direct |
| BLY-002 | projects/bayley/tickets/BLY-002.md | Validaciones cross-layer — detectar referencias rotas entre layouts, objects, capabilities, i18n | archived | closed | implement | — | — | quarantine/confirm terminal semantics |
| BLY-003 | projects/bayley/tickets/BLY-003.md | Matriz por tenant — pivot de apps, layouts, objects, capabilities por cliente | archived | closed | implement | — | — | quarantine/confirm terminal semantics |
| BLY-004 | projects/bayley/tickets/BLY-004.md | Vista Eventos y Flows — grafo de eventos de objects y workflows n8n que los consumen | archived | closed | implement | — | — | quarantine/confirm terminal semantics |
| BLY-005 | projects/bayley/tickets/BLY-005.md | Inventario de componentes custom — cross-ref con layouts, composables, queries GraphQL | archived | closed | implement | — | — | quarantine/confirm terminal semantics |
| BLY-006 | projects/bayley/tickets/BLY-006.md | Deep-link de flujo completo — URL compartible que preserva un recorrido entre vistas | archived | closed | implement | — | — | quarantine/confirm terminal semantics |
| BLY-007 | projects/bayley/tickets/BLY-007.md | Navegabilidad real de layouts via app.json | closed | closed | fix | — | — | direct |
| BLY-008 | projects/bayley/tickets/BLY-008.md | Puente UP1 ↔ Bayley: pegar URL de UP1 y ver el layout en el grafo | closed | closed | improvement | — | — | direct |
| BLY-009 | projects/bayley/tickets/BLY-009.md | Arbol estructural del layout + cross-links vivos al Datamodel | closed | closed | refactor | — | — | direct |
| BLY-010 | projects/bayley/tickets/BLY-010.md | Vista jerarquica de apps — App → Object → Layouts | closed | closed | implement | — | — | direct |
| BLY-011 | projects/bayley/tickets/BLY-011.md | Sidecar Node para traer layouts runtime desde object-manager | closed | closed | implement | — | — | direct |
| BLY-012 | projects/bayley/tickets/BLY-012.md | Mapa de app — vista espacial App → Objects → Layouts con aristas | obsolete | closed | implement | — | — | quarantine/confirm terminal semantics |
| BLY-013 | projects/bayley/tickets/BLY-013.md | Sidecar FS adapter — leer UP1 local via endpoints para testing automatizado | closed | closed | implement | — | — | direct |
| BLY-014 | projects/bayley/tickets/BLY-014.md | Mostrar object/tipo target en rowActions, tabs y record-list embebidos | closed | closed | improvement | — | — | direct |
| BLY-015 | projects/bayley/tickets/BLY-015.md | Flow Explorer — vista de flujo centrada en un layout + sidebar retractil | closed | closed | implement | — | — | direct |
| BLY-016 | projects/bayley/tickets/BLY-016.md | Vista Apps: grafo de navegacion y acciones del usuario partiendo de una app | closed | closed | implement | null | — | direct |
| BLY-020 | projects/bayley/tickets/BLY-020.md | DataModel: modo focus (parientes directos) y modo compacto (solo titulos) | closed | closed | improvement | null | — | direct |
| BLY-021 | projects/bayley/tickets/BLY-021.md | Workspace embedded: arrancar bayley sin up1 + ocultar vistas inviables | closed | closed | improvement | null | — | direct |
| BLY-022 | projects/bayley/tickets/BLY-022.md | Workspace snapshot: cachear el ultimo up1 visto en IndexedDB para modo offline | closed | closed | improvement | null | — | direct |
| BLY-023 | projects/bayley/tickets/BLY-023.md | Eliminar vista Layouts y dependencias huerfanas — preservando AppsView | closed | closed | refactor | null | — | direct |
| BLY-024 | projects/bayley/tickets/BLY-024.md | Vista Sandbox: overlay de un mod candidato sobre el workspace activo | closed | closed | implement | null | — | direct |
| BLY-025 | projects/bayley/tickets/BLY-025.md | Catalogo visual de tipos de referencias en DataModelView con guia rapida y modo focus | closed | closed | implement | null | — | direct |
| BLY-027 | projects/bayley/tickets/BLY-027.md | Empaquetar bayley como app auto-ejecutable para macOS y Windows manteniendo modos dev y servidor Node | closed | closed | implement | null | — | direct |
| BLY-028 | projects/bayley/tickets/BLY-028.md | Auditoria de calidad de bayley + plan ordenado de tickets (remocion desktop, lint, modularidad, tests, e2e, llm-e2e, docs) | closed | closed | explore | null | — | direct |
| BLY-029 | projects/bayley/tickets/BLY-029.md | Cero config — sidecar arranca sin creds y se autoconfigura desde `.env` de UP1 via FSA | closed | closed | implement | null | — | direct |
| BLY-030 | projects/bayley/tickets/BLY-030.md | Remocion de packaging-as-app — borrar electron/, deps electron*, install scripts y bloque packaging del README | closed | closed | refactor | null | — | direct |
| BLY-031 | projects/bayley/tickets/BLY-031.md | Setup eslint + prettier (lint baseline desde cero) | closed | closed | improvement | null | — | direct |
| BLY-032 | projects/bayley/tickets/BLY-032.md | Split de archivos > 400 lineas — refactor zero-behavior-change | closed | closed | refactor | null | — | direct |
| BLY-033 | projects/bayley/tickets/BLY-033.md | Cobertura unit en stores, views y components — de 0% a >0% en cada modulo | closed | closed | improvement | null | — | direct |
| BLY-034 | projects/bayley/tickets/BLY-034.md | Code splitting del bundle — chunk principal < 500 KB | closed | closed | improvement | null | — | direct |
| BLY-035 | projects/bayley/tickets/BLY-035.md | E2E infra con Playwright — 3 suites criticas | closed | closed | implement | null | — | direct |
| BLY-036 | projects/bayley/tickets/BLY-036.md | LLM-E2E review automatizado — patron y tool por definir en research | closed | closed | implement | null | — | direct |
| BLY-037 | projects/bayley/tickets/BLY-037.md | Sync specs ↔ codigo + reconciliar roadmap | closed | closed | improvement | null | — | direct |
| BLY-038 | projects/bayley/tickets/BLY-038.md | Auto-unregister Service Worker stale al startup — fix de Vite HMR roto en ventana normal | closed | closed | fix | null | — | direct |
| BLY-040 | projects/bayley/tickets/BLY-040.md | Fix general — 22 errores TypeScript en `npm run build` (DOM lib + types) | closed | closed | fix | null | — | direct |
| BLY-041 | projects/bayley/tickets/BLY-041.md | Explore impacto en bayley de novedades en up1 develop | closed | closed | explore | null | — | direct |
| BLY-042 | projects/bayley/tickets/BLY-042.md | Parser flows + events en mods + FlowsView (T-A del explore BLY-041) | closed | closed | implement | null | BLY-042.draft | direct |
| BLY-043 | projects/bayley/tickets/BLY-043.md | Soporte RecordType con `baseObject` en parser datamodel (T-B del explore BLY-041) | closed | closed | implement | null | BLY-043.draft | direct |
| BLY-044 | projects/bayley/tickets/BLY-044.md | Verificacion empirica de up1/develop en bayley + UI polish (T-C del explore BLY-041) | closed | closed | implement | null | BLY-044.draft | direct |
| BLY-045 | projects/bayley/tickets/BLY-045.md | Component-registry parser para tipos custom Vueform (T-D opcional del explore BLY-041) | closed | closed | implement | null | — | direct |
 
## Sidecars fuera de matriz
- Ninguno.
 
## Aceptación
- No se descartan tickets por estados legacy.
- Todos los sidecars tienen destino explícito.
- Todos los hashes y relaciones quedan en el manifiesto.
 
