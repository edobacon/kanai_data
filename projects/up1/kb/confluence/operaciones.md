---
id: SPEC-confluence-008
project: up1
type: spec
module: confluence
tags: []
---

# Operaciones

Seccion: Operaciones
Link: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983971340
Tags: `deploy` `aws` `ecs` `docker` `troubleshooting`

Deploy en produccion y troubleshooting. Infraestructura de pipelines en construccion.

---

## Deploy en AWS

- **ID**: 1983053845
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983053845
- **Tags**: `deploy` `aws` `ecs` `docker` `ecr` `rds` `migraciones`

UP1 corre en **AWS ECS**. Flujo: build Docker → push ECR → force deploy ECS.

### Prerequisitos
- AWS CLI con permisos sobre ECR y ECS
- Docker Desktop
- Acceso al repositorio ECR: `073107684401.dkr.ecr.sa-east-1.amazonaws.com`

### Auth con ECR
```shell
aws ecr get-login-password --region sa-east-1 | \
  docker login --username AWS --password-stdin \
  073107684401.dkr.ecr.sa-east-1.amazonaws.com
```

### Servicios

| Servicio | Dockerfile | ECS Service |
|----------|-----------|-------------|
| Object Manager | `aws/Dockerfile.object-manager.aws` | `up1-om-task-service-ld9wu5qz` |
| Suite | `aws/Dockerfile.suite.aws` | `up1-suite-task-service-e6f2fohs` |
| Worker | `aws/Dockerfile.worker.aws` | `up1-worker-service` |

Cada uno sigue el mismo patron:
```shell
docker build -f ./aws/Dockerfile.{service}.aws -t up1/{service}:latest . --no-cache
docker tag up1/{service}:latest 073107684401.dkr.ecr.sa-east-1.amazonaws.com/up1/{service}:latest
docker push 073107684401.dkr.ecr.sa-east-1.amazonaws.com/up1/{service}:latest
aws ecs update-service --cluster ecs-up1 --service {ecs-service-name} \
  --force-new-deployment --region sa-east-1
```

### Migraciones en produccion
```shell
aws ecs run-task --cluster ecs-up1 --task-definition up1-migration-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0df00ec06624aecea,subnet-0f9e57615f18a3b1e],securityGroups=[sg-0f0d2a71b3b2926e4],assignPublicIp=DISABLED}" \
  --region sa-east-1
```

### Logs
```shell
aws logs tail /ecs/up1-object-manager --follow --region sa-east-1
```

### Acceso RDS (bastion)
```shell
ssh -i <key> -L 15432:up1-rds.czi2oqsea8qx.sa-east-1.rds.amazonaws.com:5432 \
  ec2-user@54.233.34.205
```
Conectar a `localhost:15432`.

---

## Troubleshooting

- **ID**: 1983709211
- **Link**: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1983709211
- **Tags**: `troubleshooting` `debug` `codegen` `prisma` `docker`

### Problemas frecuentes

| Problema | Solucion |
|----------|---------|
| Objetos no aparecen en GraphQL | Verificar JSON → `npm run codegen` → reiniciar OM |
| Campos custom no se sincronizan | Verificar naming `ext__<CLIENT>__<obj>.json` → codegen → migrate |
| Traducciones muestran claves | `npm run sync` → verificar archivo en `suite/lang/` → reiniciar Suite |
| Estilos no se aplican | `npm run sync` → verificar capas CSS → hard refresh (Ctrl+Shift+R) |
| Componentes de mods no renderizan | `npm run sync` → verificar en `suite/modsComponents/` → reiniciar Suite |
| Tenant isolation roto | Verificar `tenantId` en `where` de cada query |
| Error conexion BD (Docker) | Usar `host.docker.internal` en vez de `localhost` |
| Conflicto de puertos | `lsof -i :4000` → cambiar en `.env` |
| Variables env no se propagan | Editar solo `.env` raiz → re-correr `npm run setup` |
