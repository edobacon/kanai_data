---
id: BUG-layout-blockcalendar-visible-range-UPONE-1521
project: up1
type: bug
module: layout
---

CalendarLayout seedaba currentDateRange con la semana de HOY, mientras BlockCalendar clampeaba activeDate a [minDate,maxDate] sin avisar al padre. Si el Term no incluye hoy (caso normal en disponibilidad de secciones) el fetch/hydration corria contra una semana que la grilla nunca renderiza: bloques guardados aparecian vacios y un click creaba un duplicado. Fix: BlockCalendar emite week:change en el mount y en cada resize silencioso del rango visible; el bounds watcher de CalendarLayout se actualiza.

**sourceRef:** 4f6c8515 + src/components/organisms/data/BlockCalendar/BlockCalendar.vue + src/layouts/Calendar/CalendarLayout.vue.
