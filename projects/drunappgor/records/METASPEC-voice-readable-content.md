---
id: METASPEC-voice-readable-content
project: drunappgor
type: doc
module: voice_reader
tags:
  - voice
  - tts
  - accessibility
  - cache
---

# Voice Readable Content

## Artifact Definition

```yaml
name: voice-readable-content
plural: Voice Readable Content
description: "Texto narrativo o de reglas que puede leerse con voz humana/TTS"
location: "features voice_reader plus source models/screens"
```

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| contentType | enum: chapter, door, interaction, rule, keyword, status | si | Tipo de contenido leible |
| sourceId | reference: canonical-model | si | Entidad origen |
| textSelector | text | si | Campo(s) de texto que se leen |
| voiceMode | enum: system_tts, cloud_tts, provider_abstracted | si | Modo/proveedor |
| controls | table: control, required, behavior | si | Play/pause/stop/speed/voice |
| cachePolicy | enum: none, memory, disk, provider_allowed | si | Politica de cache |
| sourceRefs | reference: source-reference[] | si | Trazabilidad de texto leido |
| accessibility | table: concern, requirement | no | Requisitos de accesibilidad |

## Spec Section Template

```markdown
## Voice Readable Content

| Content | Text selector | Voice mode | Controls | Cache | Notas |
|---------|---------------|------------|----------|-------|-------|
| {contentType} | {fields} | {voiceMode} | {controls} | {cachePolicy} | {notas} |
```

## Requirements

### REQ-01: Provider abstraction

- **Aplica cuando**: Servicio de voz.
- **Esperado**: La UI no depende de un proveedor concreto; usa una abstraccion.
- **Verificacion**: Interfaces/adapters separados.

### REQ-02: Basic playback controls

- **Aplica cuando**: Toda lectura visible.
- **Esperado**: Play, pause, stop y velocidad disponibles donde aplique.
- **Verificacion**: Widget/manual test.

### REQ-03: Voice selection is supported

- **Aplica cuando**: El proveedor expone voces.
- **Esperado**: Usuario puede seleccionar voz o usar default estable.
- **Verificacion**: Estado/preferencia persistida.

### REQ-04: Cache respects provider/license

- **Aplica cuando**: Audio generado o descargado.
- **Esperado**: Cache solo si proveedor/licencia lo permite; politica documentada.
- **Verificacion**: Decision/spec indica cachePolicy.

### REQ-05: Long text remains readable

- **Aplica cuando**: Capitulo, puerta, interaccion o regla larga.
- **Esperado**: Texto visible y audio no se pisan; estado de reproduccion claro.
- **Verificacion**: Screenshot mobile/tablet y test manual.

## Defaults

```yaml
defaults:
  voiceMode: provider_abstracted
  controls:
    - play
    - pause
    - stop
    - speed
  cachePolicy: provider_allowed
  readable_types:
    - chapter
    - door
    - interaction
    - rule
    - keyword
    - status
```

## Relations

```yaml
relations:
  - artifact: canonical-model
    type: requires
    description: "El texto leible viene de entidades canonicas"
  - artifact: source-reference
    type: requires
    description: "La lectura debe poder mostrar/citar origen"
  - artifact: flutter-feature-screen
    type: suggests
    description: "Pantallas con textos largos integran controles de voz"
```
