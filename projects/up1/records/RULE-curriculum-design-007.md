---
id: RULE-curriculum-design-007
project: up1
type: rule
module: curriculum-design
tags:
  - seed
  - org-spine
  - cross-mod
  - seed-order
  - engagement-canonical
---

# curriculum-design es el seeder de facto del org-spine; el orden de seeds cross-mod no es determinístico

## What

engagement (uengagement-up1) es canonico del org-spine pero NO siembra Organization/Institution ni las OrgUnit Faculty (usa organization.findFirst()). curriculum-design es el seeder de facto: crea Organization + Institution + las OrgUnit recordType=Faculty (con extension rt__Faculty__OrgUnit), y su seed alimenta lo que engagement espera leer. El orden de ejecucion de seeds cross-mod NO es deterministico (object-manager dbSync.js usa fs.readdir sin deps declaradas); hoy funciona solo por orden alfabetico (curriculum-design < uengagement-up1).

## Why

Si se asume que engagement siembra el org-spine, el seed de cd falla por dependencias faltantes (no hay Organization/Institution). Y el orden alfabetico es FRAGIL: renombrar un mod, o agregar uno que ordene antes de curriculum-design, romperia el seed sin que ningun test de codigo lo marque. DEC-016 fija que cd sigue siendo el seeder (no se le pide a engagement que siembre).

## Where

mods/curriculum-design/seed/* (creador de Organization/Institution/OrgUnit Faculty); object-manager dbSync.js (fs.readdir, orden no declarado); seed de engagement usa findFirst (lector).

## When

Al tocar el orden o las dependencias de seeds cross-mod, al agregar un mod nuevo que siembre org-spine, o al diagnosticar fallos de seed por datos de org-spine faltantes.

## Verification

Revisar dbSync.js (orden fs.readdir sin sort/deps explicitas); confirmar que cd crea Organization/Institution y engagement solo los lee (findFirst). Ver DEC-016.

## Source

- **Discovered in**: TICKET-076
