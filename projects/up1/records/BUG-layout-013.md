---
id: BUG-layout-013
project: up1
type: bug
module: layout
tags:
  - calendar
  - offeringcalendar
  - slotduration
  - props
  - latente
  - uengagement
---

# `OfferingCalendar` no propaga `slotDuration` al grid semanal

## Symptom

Configurar `slotDuration` distinto de 60 en un layout que usa `OfferingCalendar`
no cambia la granularidad del grid: los bloques se siguen dibujando en tramos de
60 minutos. El mismo `slotDuration` si funciona en los layouts que usan
`BlockCalendar`.

## Expected behavior

`OfferingCalendar` deberia propagar `slotDuration` al grid semanal
(`CalendarWeekDayGrid`), igual que `BlockCalendar` ya lo hace, para que la
granularidad configurada se refleje en el render. Este comportamiento hoy
sigue sin cumplirse: el defecto es latente.

## Root cause

File: `src/components/organisms/data/OfferingCalendar/OfferingCalendar.vue:162-183`

Cause: el binding de `<CalendarWeekDayGrid>` pasa `days`, `timeSlots`,
`startHour` y `endHour`, pero **no** pasa `:slot-duration="slotDuration"`.
`BlockCalendar.vue:124` si lo pasa, y por eso ahi el contrato funciona.
`CalendarWeekDayGrid.vue:337-430` calcula todo con `props.slotDuration ?? 60`,
asi que sin el prop cae siempre al default de 60.

## Fix

**Sin fix.** El defecto vive en core layout y sigue presente.

El mod uengagement lo absorbio fijando `slotDuration: 60` en los layouts que
pasan por `OfferingCalendar`, es decir alineando la configuracion con el
comportamiento real en vez de corregirlo:

- `config/layouts/engagement-offering-student-list.json:97`
- `config/layouts/engagement_Event_student_calendar.json:15`
- `config/layouts/engagement_Event_responsible_list.json:38`
- `config/layouts/engagement_Offering_admin_calendar.json:32`

Los layouts de `Availability_*` mantienen 30 porque pasan por `BlockCalendar`,
que si propaga el prop. Esa asimetria es consistente con el defecto.

## Impact

| Area | Antes | Despues |
|---|---|---|
| `slotDuration` en `OfferingCalendar` | Ignorado, siempre 60 | Sigue ignorado: el defecto es latente |
| Layouts del mod | Configuracion enganosa (declaraba un valor que no se aplicaba) | Declaran 60 explicito, coherente con el render real |
| `BlockCalendar` | Correcto | Correcto, sirve de referencia del binding que falta |

## Reproduction

### Steps
1. Configurar un layout que use `OfferingCalendar` con `slotDuration` distinto de 60 (ej. 30).
2. Renderizar el calendario semanal.
3. Verificar que el grid sigue dibujando bloques de 60 minutos, a diferencia de un layout equivalente que use `BlockCalendar` con el mismo `slotDuration`.

## Notas de verificacion

El recon referenciaba este defecto como UPONE-1601. **No hay rastro verificable
de ese ticket en los repos** (`layout`, `object-manager`, `suite`): la unica
mencion esta en `mods/uengagement-up1/.ai/PATTERNS.md:264`, que es documentacion
del propio mod y no evidencia del estado del ticket. Por eso el record va sin
`ticket` en vez de afirmar una referencia que no se pudo confirmar.
