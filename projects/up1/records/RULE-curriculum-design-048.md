---
id: RULE-curriculum-design-048
project: up1
type: rule
module: curriculum-design
tags:
  - layouts
  - roles
  - rbac
  - sync
---

# El `roles[]` de un layout declara el rol institucional real, nunca el id interno de un paquete de permisos

## What

El arreglo `roles[]` de un layout SHOULD listar el rol institucional que el tenant asigna a sus usuarios, no el id interno de un paquete de permisos (rol tecnico que agrupa capabilities pero que nadie tiene asignado directamente). `AcademicProgram_list_gestor.json` declaraba `["GestorCurricular"]` (rol interno) y quedo corregido a `["Coordinador"]` (rol institucional) en el commit `e47f793`.

## Why

El sync autocrea el homonimo del rol interno como registro de rol si no existe, pero no lo asigna a ningun usuario. El layout queda tecnicamente valido (referencia un rol que existe en BD) pero inalcanzable en la practica: nadie puede verlo, y no hay error visible que lo delate porque el gate de RBAC funciona correctamente, solo que el conjunto de usuarios con ese rol esta vacio.

## Where

- `config/layouts/AcademicProgram_list_gestor.json:7` (`"roles": ["Coordinador"]`, verificado en el archivo actual)

## When

Al declarar o revisar el `roles[]` de cualquier layout nuevo del mod: confirmar contra el catalogo de roles institucionales del tenant (los que se asignan a usuarios reales), no contra los ids de paquetes de permisos internos que agrupan capabilities.
