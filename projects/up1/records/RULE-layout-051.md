---
id: RULE-layout-051
project: up1
type: rule
module: layout
tags:
  - layout
  - Calendar
  - BlockCalendar
  - blockCreation
  - fechas
  - timezone
  - parseConfigDate
---

# Contrato de calendario `blockCreation`: `availableViews`, `fieldMapping.weekField`, `minDate`/`maxDate`

## What

`layoutConfig.blockCreation` de un layout de tipo Calendar acepta:

- `availableViews`: lista de vistas habilitadas (default `['week']`, preserva el comportamiento previo). Permite exponer la vista `'day'` como toggle manual, antes solo alcanzable via el switch automatico a mobile.
- `fieldMapping.weekField`: cuando `weeklyDistribution: false`, este campo escribe/lee la semana ISO desde una fecha real en vez de un patron semanal generico.
- `minDate` / `maxDate`: limites de navegacion del calendario, propagados a `CalendarNavBar`, `CalendarDatePicker`, `BlockCalendar` y `CalendarLayout`.

Las fechas de esta config se parsean con `parseConfigDate`, que construye la fecha en **local** a partir de `YYYY-MM-DD`. Nunca usar `new Date(value)` (interpretado como UTC medianoche) leido despues con getters locales (`getFullYear`/`getMonth`/`getDate`): en offsets UTC negativos, el limite se desplaza un dia hacia atras.

## Why

El bug que origino el fix: `parseConfigDate` construia la fecha con `new Date(value)`, resultando en UTC medianoche, pero el resto del codigo la leia con getters locales. En un offset negativo (ej. America/Santiago) eso desplazaba `minDate`/`maxDate` un dia respecto al valor declarado en el JSON. El fix extrae el string `YYYY-MM-DD` y construye la fecha en local, no en UTC.

## Where

- `layout/src/components/organisms/data/BlockCalendar/BlockCalendar.vue:300-327` (props `minDate`, `maxDate`, `availableViews`), `:787-827` (bounds de navegacion, `startOfDay`/`endOfDay`)
- `layout/src/components/molecules/CalendarDatePicker/CalendarDatePicker.vue:91-98` (props `minDate`/`maxDate`), `:188-192` (comparacion a granularidad de dia)
- `layout/src/layouts/Calendar/CalendarLayout.vue:93` (`blockCreationConfig?.availableViews`), `:99-100` (`calendarConfig.minDate`/`maxDate`), `:878-879` (`parseConfigDate(resolveContextPlaceholders(cfg.minDate))`), `:1253-1254` y `:1488-1489` (`mapping.weekField`, solo aplica cuando `!isWeekly` y hay una fecha real)
- `layout/src/utils/calendarFieldResolver.ts:257` (doc de `fieldMapping.weekField`), `:282-303` (`parseConfigDate`, parseo en local desde `YYYY-MM-DD`)

## When

Al declarar un calendario de tipo `blockCreation`: usar `availableViews` para habilitar `'day'` si el mod lo necesita, `fieldMapping.weekField` solo si `weeklyDistribution: false` y hay una fecha real que respaldar, y `minDate`/`maxDate` para acotar la navegacion. Al tocar cualquier parseo de fecha de config en layout, verificar que se construya en local desde el string `YYYY-MM-DD`, nunca con `new Date(value)` leido por getters locales.

## Source

- **Discovered in**: UPONE-1604, UPONE-1521
