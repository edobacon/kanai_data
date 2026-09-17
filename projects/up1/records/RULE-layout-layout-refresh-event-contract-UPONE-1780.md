---
id: RULE-layout-layout-refresh-event-contract-UPONE-1780
project: up1
type: rule
module: layout
---

El evento up1:layout-refresh (disparado por useRealTime en suite) admite dos keys en el payload: objectName (singular, historico) y el nuevo objectNames (array). RecordList se refresca si CUALQUIERA matchea su props.objectName; la logica vive en el helper puro layoutRefreshTargetsObject (recordListRealtimeRefresh.ts), no inline. Un productor que solo conoce objectName sigue funcionando.

**sourceRef:** cc7e75ce + src/layouts/RecordList/RecordList.vue L7924-7933 (handleLayoutRefresh) + src/layouts/RecordList/recordListRealtimeRefresh.ts.
