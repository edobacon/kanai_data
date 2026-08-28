---
id: DECISION-024
project: up1
type: decision
module: mods
tags:
  - up1-manager
  - service-account
  - capability
  - rbac
  - ux
---

# DECISION-024: `CapabilityPatternEditor` como componente reusable para campos de capabilities

## Contexto

El campo `allowedOps` de service accounts (up1-manager) era un input de texto libre donde el usuario tipeaba patrones tipo `core_User:create` a mano, sin validación contra las capabilities reales de la plataforma. Feature sin ticket Jira (commits `4813373`, `dca4d21`, `ad4b7f3`, 2026-07-14/15).

## Decisión

Se construye `CapabilityPatternEditor` (`up1-manager/components/CapabilityPatternEditor/*`), un componente que busca `core_Capability` en vivo y arma patrones wildcard objeto+acción desde definiciones reales de objeto, reemplazando el input de texto libre. Diseñado como patrón reusable para cualquier campo de la plataforma que necesite capturar capabilities (no exclusivo de service accounts).

## Alternativas descartadas

- **Mejorar el input de texto libre con validación client-side**: descartada porque seguiría permitiendo patrones sintácticamente válidos pero semánticamente inexistentes (objeto o acción que no existe), sin aprovechar el catálogo real de `core_Capability`.
- **Select simple de capabilities exactas (sin wildcard)**: descartada porque service accounts necesitan expresar patrones amplios (ej. todas las acciones sobre un objeto), no solo capabilities puntuales.

## Impacto / reversibilidad

Afecta `up1-manager` (layouts `serviceaccount-{create,list,view}.json`). En el mismo desarrollo se corrigió un bug de contrato relacionado: el backend había eliminado `allowedTenants` (`b09498a3`) pero los layouts seguían referenciándolo, rompiendo la mutation de creación (corregido en `ad4b7f3`). Reversibilidad: alta, es un componente de UI aislado; volver al input de texto libre no requiere migración de datos (los patrones persistidos son strings en ambos casos).
