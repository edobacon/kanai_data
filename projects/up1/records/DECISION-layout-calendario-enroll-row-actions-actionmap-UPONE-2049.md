---
id: DECISION-layout-calendario-enroll-row-actions-actionmap-UPONE-2049
project: up1
type: decision
module: layout/record-list
tags:
  - UPONE-2049
  - calendar
  - row-actions
---

Sin actionMap el botón de enroll usa la mutación genérica del calendario y el unenroll borra sin confirmar. Con actionMap ambos botones se comportan como los de la card: primera acción cuyo visibilityConditions acepte el registro padre, confirmCascade y pre-chequeo de conflicto. El evento viaja como context y un modal lo mapea con context.event.<campo> en initialDataMapping; RecordDetail lo lee con {{initialData.<campo>}} en cualquier modo. enrollmentEventField limita el estado inscrito a un solo evento del padre.

Fuente: 5bd4f317 docs/features/recordlist.md (sección 'Calendar enrollment through row actions'); src/layouts/RecordDetail/recordDetailInitialData.ts; src/shared/types/calendar.ts.
