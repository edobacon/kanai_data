---
id: DECISION-flow-notifications-consolidated-UPONE-1573
project: up1
type: decision
module: flow
tags:
  - UPONE-1573
  - sp9
  - flow
  - notifications
---

Se consolida la notificacion en Up1Notification (In-App + Email); se remueven Up1SendEmail y los canales WhatsApp/Telegram; fail-visible ante errores de envio.

sourceRef (verificado por diff): flow 900be924 packages/nodes-base/nodes/Up1Notification/Up1Notification.node.ts + GenericFunctions.ts (consolidate In-App+Email, fail visibly) y remocion de packages/nodes-base/nodes/Up1SendEmail/.
