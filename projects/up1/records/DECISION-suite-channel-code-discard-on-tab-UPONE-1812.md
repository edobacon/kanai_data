---
id: DECISION-suite-channel-code-discard-on-tab-UPONE-1812
project: up1
type: decision
module: suite
---

useChannelLink.ts concentra la logica del modal de vinculacion/desvinculacion: cambiar de tab (WhatsApp/Telegram) descarta el codigo a proposito (un codigo de WhatsApp no verifica en Telegram, y dejarlo invita a mandarlo al canal equivocado). La logica vive en el composable y no en el componente porque suite no tiene infraestructura para montar componentes en tests.

**sourceRef:** 9ae86f3 + composables/useChannelLink.ts:1-236.
