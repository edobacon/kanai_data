---
id: METASPEC-flutter-feature-screen
project: drunappgor
type: doc
module: app_shell
tags:
  - flutter
  - ui
  - responsive
  - riverpod
  - go-router
---

# Flutter Feature Screens

## Artifact Definition

```yaml
name: flutter-feature-screen
plural: Flutter Screens
description: "Pantalla o flujo visible de la app Flutter con soporte mobile/tablet"
location: "lib/src/features/{feature}/ y lib/src/app/"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| route | text | si | Ruta go_router |
| feature | reference: module | si | Feature propietaria |
| layoutMode | enum: mobile-stack, tablet-master-detail, adaptive | si | Comportamiento responsive |
| stateProvider | text | no | Provider Riverpod principal |
| dataSources | reference: generated-asset[] | no | Assets/repos consumidos |
| loadingState | text | si | Estado de carga esperado |
| emptyState | text | si | Estado cuando no hay datos |
| errorState | text | si | Estado cuando falla carga/parse |
| interactions | table: action, result, validation | no | Acciones del usuario |
| voiceControls | enum: none, read-button, persistent-player | no | Integracion con lectura por voz |

## Spec Section Template

```markdown
## Flutter Screens

| Route | Feature | Layout | State provider | Data sources | Notas |
|-------|---------|--------|----------------|--------------|-------|
| {route} | {feature} | {layoutMode} | {provider} | {assets} | {notas} |
```

## Requirements

### REQ-01: First screen is useful

- **Aplica cuando**: Pantalla inicial o shell principal.
- **Esperado**: La primera pantalla muestra experiencia util de app, no landing page.
- **Verificacion**: Screenshot mobile/tablet.

### REQ-02: Mobile and tablet layouts are explicit

- **Aplica cuando**: Toda pantalla visible.
- **Esperado**: Definir comportamiento mobile y tablet; no depender solo de overflow.
- **Verificacion**: Tests/screenshot en phone y tablet.

### REQ-03: Text does not overflow

- **Aplica cuando**: UI con contenido largo de reglas, narrativa o puertas.
- **Esperado**: Texto scrolleable/ajustable y sin overflow.
- **Verificacion**: Flutter golden/manual responsive.

### REQ-04: Loading, empty and error states exist

- **Aplica cuando**: Pantalla consume datos locales o chat.
- **Esperado**: Estados definidos y visibles.
- **Verificacion**: Widget tests o fixtures.

### REQ-05: Source references are reachable

- **Aplica cuando**: Pantalla muestra contenido de corpus.
- **Esperado**: El usuario puede ver o acceder a referencia local relevante.
- **Verificacion**: UI muestra/cita sourceRefs.

## Defaults

```yaml
defaults:
  layoutMode: adaptive
  state_management: riverpod
  routing: go_router
  loadingState: "skeleton or progress indicator suitable for mobile"
  emptyState: "short actionable message"
  errorState: "message with source/generator context when possible"
  voiceControls: none
```

## Relations

```yaml
relations:
  - artifact: generated-asset
    type: suggests
    description: "Pantallas de contenido suelen consumir assets normalizados"
  - artifact: source-reference
    type: suggests
    description: "Pantallas de corpus deben exponer trazabilidad"
  - artifact: voice-readable-content
    type: suggests
    description: "Pantallas con textos largos pueden agregar lectura por voz"
```
