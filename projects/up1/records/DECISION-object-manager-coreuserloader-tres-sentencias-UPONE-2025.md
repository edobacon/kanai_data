---
id: DECISION-object-manager-coreuserloader-tres-sentencias-UPONE-2025
project: up1
type: decision
module: object-manager/auth
tags:
  - UPONE-2025
  - UPONE-2058
  - perf
---

coreUserLoader reemplaza el include anidado de Prisma por tres statements paralelos y respeta columnas con @map (UPONE-2058). Cae al include de Prisma si hay soft-delete en esas tablas, modelo no mapeable, campo sin columna o tipo sin forma JSON lossless. De los errores de statement solo los de esquema (códigos 42703, 42P01, 42804, 0A000) reconstruyen y caen al fallback; cualquier otro (por ejemplo un timeout de pool) se relanza para no saturar más el pool. Los tipos de columna se leen de information_schema una vez por cliente Prisma.

Fuente: 7b6244aa src/services/auth/coreUserLoader.js:25-35,89,282-315.
