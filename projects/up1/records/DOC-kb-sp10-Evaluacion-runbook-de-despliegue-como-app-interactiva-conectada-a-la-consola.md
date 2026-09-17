---
id: DOC-kb-sp10-Evaluacion-runbook-de-despliegue-como-app-interactiva-conectada-a-la-consola
project: up1
type: doc
module: infra-deploy
tags:
  - deploy
  - tooling
  - evaluacion
  - devops
  - cli
  - mcp
  - argocd
---

# Evaluación: runbook de despliegue como app interactiva conectada a la consola

> Documento de evaluación (no plan de implementación). Analiza la viabilidad y el valor de convertir el runbook de despliegue estático en una herramienta interactiva conectada a la consola que recopile estado real, ofrezca opciones y autocompletado, y arme comandos para que el operador los ejecute. Base: runbook operativo de despliegues (Suite / Faculty / Rosario) y el informe de costo "Qué cuesta hoy desplegar un cambio". Secciones 9 (alcance acordado) y 10 (hallazgos de descubrimiento) fijan lo verificado con el equipo y contra las fuentes reales.

## 1. Qué se pide

Pasar del runbook estático (HTML/MD que la persona lee y ejecuta a mano) a una **app interactiva** que:

1. **Recopile información** del entorno real (namespaces, deployments, pods, tags de ECR, estado de rollout).
2. **Dé opciones y autocompletado** para no tipear a mano namespaces, tags ni scripts.
3. **Arme los comandos propios de la consola**, que ejecuta el operador, con validaciones.

Es decir, una capa que orquesta lo que hoy son cinco herramientas separadas (planilla, terminal del bastión, runbook, navegador del cliente, notas).

## 2. Por qué tiene sentido (valor esperado)

El informe de costo ya cuantifica el problema que esta app atacaría directamente:

- **Cambios de contexto:** ~120 en una propagación a 20 clientes. Una app que orquesta bastión + kubectl + ECR los colapsa a una sola superficie.
- **Fallas silenciosas:** 7 de 9 formas de equivocarse no dan error. La app puede convertir cada una en un **guardrail** informativo.
- **Autocompletado desde la fuente real:** elimina el error de copiar un hash mal, el modo de falla típico.
- **Inventario de versiones:** para entornos Argo ya existe en `platform-gitops`; para los manuales no, y ahí la app puede empezar a dejar traza.

## 3. Enfoques posibles

| Opción | Qué es | Pros | Contras |
|---|---|---|---|
| **A. CLI / TUI asistente** | Binario local que consulta gitops/sesión y arma comandos con guardrails | Bajo costo, portable, cabe en el flujo actual, sin infra nueva | Corre con las credenciales del operador; no resuelve gobierno de prod |
| **B. Agente conversacional (MCP/LLM)** | "Consola con IA": tools contra kubectl/ECR/SSM y gitops | Máxima interacción, encaja con el ecosistema Kanai/MCP | Requiere guardrails duros; no determinista si no se restringe a plantillas |
| **C. Backend web con RBAC** | Servicio que ejecuta jobs con login, permisos y auditoría | Resuelve aprobación + traza | Casi reconstruir GitOps; alto costo; compite con ArgoCD |
| **D. No construir la app** | Priorizar terminar la migración de prod a ArgoCD | Ataca la raíz | Sin valor inmediato mientras la migración siga pendiente |

## 4. Viabilidad técnica (general)

- **Recopilar información.** Salida estructurada: `kubectl get ... -o json`, `kubectl rollout status`, y sobre todo el repo `platform-gitops` (ver sección 10).
- **Autocompletar.** Namespaces, deployments y digests desde gitops y desde la sesión del cluster.
- **Fuente de verdad.** Los scripts del bastión (`/home/uplanner/patches/*`) siguen siendo la fuente de verdad del despliegue manual; la app arma comandos que los invocan, no los reimplementa.

## 5. Riesgos y contras

- **No arregla el acoplamiento estructural** (~13 init containers en `suite-api`).
- **Riesgo de cementar el flujo manual:** la app debe ser **puente**, no destino; el norte sigue siendo ArgoCD.
- **Mantenimiento y paridad** con los scripts del bastión.

## 6. Recomendación

Arrancar por la **Fase 1**: asistente que informa, autocompleta y arma comandos (ejecuta el operador), sobre la conexión actual y sin pedir nuevos accesos. La ejecución directa y el gobierno de prod quedan como fases posteriores o se resuelven vía ArgoCD.

## 7. Veredicto

**Viable y con alto valor en su Fase 1.** El descubrimiento (sección 10) muestra que la mayor parte del "dato" ya existe en `platform-gitops` y se lee sin AWS. Los límites reales están en el acceso directo a ECR y a la API de EKS con el perfil actual, que obligan a apoyarse en gitops y en la sesión del bastión.

---

## 9. Alcance acordado (revisión sp10)

### 9.1 Modelo de acceso: la conexión actual

Se usa el login de AWS existente (SSO por perfil) y el acceso por SSM al bastión, tal como el runbook actual. No se pide a Plataforma nuevo mapeo IAM ni acceso EKS directo.

### 9.2 Alcance funcional: informar y armar, el operador ejecuta

La consola **no ejecuta** en la consola real. Informa, arma y ofrece el comando exacto; el operador lo ejecuta. Piezas:

- **Constructor de comandos por caso** (C1..C8), mostrando la estructura con placeholders tipados: `<ns>`, `<branch>`, `<tag>`, `<digest/sha>`, bastión/instance-id, script.
- **Autocompletado por selección:** seleccionar un placeholder (o un texto) y elegir su valor desde datos reales o listas conocidas: bastión (dev/qa/prod → instance-id), namespace (lista del cluster / gitops), sha/digest (gitops o ECR por consola).
- **Caso de múltiples incorporaciones:** cuando un despliegue toca varios contenedores con su propio tag/digest (`backPatch -i a=.. -i b=..` o edición de varias imágenes), el constructor llena cada digest por separado y arma la línea completa.
- **Guardrails informativos:** avisa si el entorno está en ArgoCD (mejor PR), recuerda pinear tras `backPatch`, marca overrides conocidos, recuerda `analytics-api`/`data-api` fijos. Son advertencias, no bloqueos.

### 9.3 Qué necesitamos para la Fase 1 (con la conexión actual)

1. Login SSO actual (lo tenemos, verificado).
2. Fuente de digests/tags: `platform-gitops` para entornos Argo; consola shared-services o rol de lectura de ECR para el resto.
3. Camino para leer estado del cluster: la sesión SSM al bastión.
4. Fuentes canónicas: bastiones/instance-ids (runbook), planilla de ambientes y mapa ArgoCD (resueltos vía `platform-gitops`, sección 10).
5. Plantillas de comando por caso (ya en el runbook), formalizadas con placeholders.

---

## 10. Hallazgos de descubrimiento (2026-09-03)

Verificado en la máquina del operador, perfil `Development/db-access`, y contra el repo `platform-gitops` clonado en `~/Workspace/uplanner/platform-gitops`.

### 10.1 Acceso AWS con el perfil actual

- **SSO activo.** Rol `db-access` en la cuenta `455037549836`.
- **ECR: `AccessDeniedException`.** El rol `db-access` no tiene `ecr:*`. Además, las imágenes viven en **otra cuenta**, shared-services `119071858493` (visto en los `newName` de los kustomization). Conclusión: **la app no puede leer ECR por CLI con el perfil actual.**
- **EKS API: `AccessDeniedException`** (`eks:ListClusters`). No hay `kubectl` local por IAM con este perfil. **El estado del cluster solo se lee vía la sesión SSM al bastión** (el `kubectl` corre en el bastión, cuyo rol de nodo sí tiene acceso). Confirma el camino por bastión, no por IAM directo.

### 10.2 `platform-gitops` como fuente de datos (sin AWS)

El repo resuelve la mayor parte del "dato" de forma local:

- **Planilla de ambientes:** las carpetas bajo `infrastructure/deployments/eks-legacy-<env>/` son los namespaces. Development: 6 (`suite-dev`, `suite-api-dev`, `improve-test`, `planning-dev`, `engagement-test`, `engagement-test2`). Staging/QA: ~60 clientes (`uc-qa`, `uandes...`, `upc-e2g-post-qa`, etc.). Production: solo demos (`demo-ux`, `assessment-demo`, `engagement-demo`, ...).
- **Mapa ArgoCD:** un entorno está gobernado por Argo si y solo si tiene carpeta ahí. Los que no, son manuales por bastión.
- **Inventario de versiones (entornos Argo):** cada `kustomization.yaml` de cliente declara `namespace` y el bloque `images:` con el **digest por contenedor** (`suite-api`, `improve-api-suite-api`, `core-api-cron-api`, etc.). El inventario que el informe marca como ausente **existe en git para los entornos Argo**.

### 10.3 Confirmación del gap de producción

La carpeta `eks-legacy-production` solo contiene entornos demo, no las producciones reales de clientes. Esas se despliegan manual por bastión y **no tienen inventario en gitops**, exactamente el gap que describe el informe de costo.

### 10.4 Bloqueantes revisados

| Dato | Estado | Cómo resolverlo |
|---|---|---|
| Planilla de ambientes | Resuelto | Carpetas de `platform-gitops` (local) |
| Mapa ArgoCD | Resuelto | Presencia/ausencia de carpeta en `platform-gitops` |
| Inventario de versiones (Argo) | Resuelto | Bloque `images:` de cada `kustomization.yaml` |
| Digests/tags para autocompletar | Parcial | Gitops para Argo; consola shared-services (SSO web) o pedir rol de lectura de ECR para el resto |
| Estado del cluster en vivo | Solo por bastión | La app conduce/parsea la sesión SSM; no hay kubectl local por IAM |
| Inventario de prod manual | No existe | La app puede empezar a registrarlo al armar comandos; o migrar prod a ArgoCD |
