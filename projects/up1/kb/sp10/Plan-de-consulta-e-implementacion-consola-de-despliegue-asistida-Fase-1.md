---
id: DOC-kb-sp10-Plan-de-consulta-e-implementacion-consola-de-despliegue-asistida-Fase-1
project: up1
type: doc
module: infra-deploy
tags:
  - deploy
  - tooling
  - plan
  - devops
  - ecr
  - argocd
  - fase-1
---

# Plan de consulta e implementación: consola de despliegue asistida (Fase 1)

> Plan de implementación de la Fase 1 (asistente que informa y arma comandos, ejecuta el operador), en dos carriles: lo que se puede construir ya con la conexión actual, y lo que queda a la espera del permiso de lectura de ECR. Complementa la [Evaluación: runbook de despliegue como app interactiva conectada a la consola] y sus hallazgos de descubrimiento.

## 0. Estado de partida (verificado 2026-09-03)

- Alcance: asistente que **informa y arma comandos**; el operador ejecuta. No ejecuta en la consola real.
- Acceso: la conexión actual (SSO `db-access` + SSM al bastión). Sin nuevos accesos para arrancar.
- Confirmado: `db-access` **no** puede leer ECR ni la API de EKS. El estado del cluster solo se lee vía bastión. La planilla de ambientes, el mapa ArgoCD y el inventario de versiones de entornos Argo **ya existen en `platform-gitops`** (local).
- Único bloqueante externo: **lectura de ECR** para autocompletar digests/tags de entornos NO Argo. Todo lo demás avanza sin esperar.

## 1. La consulta (qué hay que resolver con terceros)

### 1.1 Solicitud a Plataforma (vía crítica del permiso)

Pedir un **rol/policy de solo lectura de ECR** en la cuenta shared-services `119071858493`, región `us-east-1`, adjunto al perfil SSO existente o a un perfil nuevo dedicado. Acciones mínimas:

```
ecr:GetAuthorizationToken
ecr:DescribeRepositories
ecr:DescribeImages
ecr:ListImages
ecr:BatchGetImage
```

- **Justificación:** autocompletar tags/digests en la consola de despliegue asistida. Es read-only, no otorga push ni deploy.
- **Alcance:** los repos de `119071858493` (suite-api/sandbox-api, improve-api, core-api, api-gateway, etc.).

### 1.2 Preguntas abiertas de la consulta

1. ¿Se otorga el rol de lectura de ECR y a qué perfil (el `db-access` actual o uno nuevo)?
2. ¿Está habilitado `SSM SendCommand` (`AWS-RunShellScript`) en los bastiones, para leer el cluster de forma no interactiva? Define el mecanismo de la Fase 2 (SendCommand vs conducir la sesión interactiva).
3. Prioridad de esta app frente a terminar la migración de producción a ArgoCD. La app es puente, no reemplazo.
4. Alcance de productos: Suite y Faculty (k8s, misma forma); Rosario (Docker) requiere adaptador aparte, ¿entra en Fase 1?

## 2. Los dos carriles

| Carril | Depende de | Qué incluye |
|---|---|---|
| **A. Desbloqueado** | Nada (conexión actual + gitops local) | Fases 0, 1, 2 y 4 |
| **B. A la espera del permiso** | Rol de lectura de ECR (1.1) | Fase 3 (autocompletar digests de entornos NO Argo por ECR) |

La idea es **no esperar**: se construye todo el Carril A, y la Fase 3 queda con un fallback (consola web / gitops) hasta que llegue el permiso, momento en que se enchufa la fuente ECR sin rehacer nada.

## 3. Plan de implementación (fases atómicas)

Cada fase deja algo usable y define su validación. Orden por dependencias.

### Fase 0 — Cimientos de datos (Carril A)

- [ ] **Parser de `platform-gitops`:** dado un cliente/namespace, resolver: entorno (dev/qa/prod), si está en ArgoCD (presencia de carpeta), y el `kustomization.yaml` (namespace + `images:` con digest por contenedor).
- [ ] **Índice de ambientes:** construir la planilla namespace ↔ cliente ↔ entorno desde las carpetas `eks-legacy-<env>/`.
- [ ] **Catálogo estático:** bastiones/instance-ids, scripts por bastión (incluye el swap `applyFrontFaculty`/`applyFacultyFront`), overrides conocidos (`unabcol` `chore-test_cors`, sandbox-api de app-call), init containers fijos (`analytics-api`/`data-api`).
- [ ] **Plantillas de comando C1..C8** con placeholders tipados (`<ns>`, `<branch>`, `<tag>`, `<digest>`, bastión, script), tomadas del runbook.
- **Validación:** para `uc-qa` devuelve namespace + "en Argo" + N digests; para un cliente de prod manual lo marca "manual, sin inventario en gitops".

### Fase 1 — Constructor de comandos (Carril A)

- [ ] Selección de caso → plantilla con placeholders.
- [ ] **Autocompletado por selección:** seleccionar un placeholder y elegir valor desde gitops (namespaces, digests Argo) o catálogo (bastión → instance-id).
- [ ] **Múltiples incorporaciones:** llenar varios `-i name=digest` en una sola línea (ej. actualizar `improve-api` + `core-api`), tomando cada digest de su fuente.
- [ ] **Guardrails informativos:** avisar "entorno en Argo → usá PR", "pinear tras backPatch", overrides y init fijos. Advertencias, no bloqueos.
- **Validación:** arma un `backPatch -i` con 2 digests correctos para un cliente manual; y para un cliente Argo avisa que corresponde PR en vez de bastión.

### Fase 2 — Lectura del estado del cluster vía bastión (Carril A)

- [ ] Definir mecanismo: `SSM SendCommand` (si está habilitado, no interactivo) o wrapper de `start-session` / modo "pegá la salida".
- [ ] Lecturas read-only: `get ns`, `get deploy`, `get pods`, `rollout status`, imagen actual por contenedor.
- **Validación:** dado un namespace, muestra los deployments y el estado de pods parseado, y contrasta la imagen viva contra la esperada (gitops para Argo).

### Fase 3 — Autocompletar digests de entornos NO Argo (Carril B, espera permiso)

- [ ] **Con el rol de ECR:** `aws ecr describe-images` para listar los últimos N tags/digests por repo, con fecha de push.
- [ ] **Fallback mientras no esté el permiso:** el operador pega el digest desde la consola web de shared-services, o se usa el de gitops cuando aplique.
- **Validación:** dado un repo, lista los últimos digests con fecha; el mismo flujo funciona con fallback manual sin el permiso.

### Fase 4 — Traza / inventario de despliegues manuales (Carril A)

- [ ] Registrar cada comando armado (quién, qué cliente, qué contenedor/digest, cuándo) para los entornos manuales, que hoy no tienen inventario.
- **Validación:** tras armar N comandos, se puede reconstruir qué se cambió en cada cliente y cuándo.

## 4. Decisión de forma (a confirmar)

- **Núcleo reutilizable** (parser gitops + plantillas + guardrails) como librería/CLI determinista.
- Envoltura: CLI/TUI para uso directo, y opcionalmente una **tool MCP** encima del mismo núcleo, para integrarlo al flujo Kanai/agente. Recomendado: empezar por el núcleo + CLI, y exponer MCP después sin reescribir lógica.

## 5. Riesgos

- **Paridad con los scripts del bastión:** si cambian flags o nombres, el catálogo (Fase 0) hay que mantenerlo. Mitigación: derivar del runbook y revisar al cambiar patches.
- **Cementar el flujo manual:** la app es puente; no debe frenar la migración a ArgoCD. Mitigación: la Fase 4 (inventario) y los guardrails empujan hacia PR donde aplica.
- **Fallback de digests:** mientras no esté el permiso ECR, la Fase 3 depende de que el operador pegue el digest; es más lento pero no bloquea el resto.

## 6. Secuencia y dependencias

1. Fase 0 → 1 → 2 → 4 se pueden hacer sin esperar el permiso (Carril A).
2. Fase 3 arranca con fallback y se completa cuando llega el rol de ECR (Carril B).
3. Punto de sync con el equipo: al cerrar la Fase 1 (constructor funcionando con datos de gitops), validar la UX de autocompletado antes de invertir en Fase 2.
