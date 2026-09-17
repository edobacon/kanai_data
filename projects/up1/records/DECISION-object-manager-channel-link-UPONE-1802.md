---
id: DECISION-object-manager-channel-link-UPONE-1802
project: up1
type: decision
module: object-manager
---

Se agregan core_ChannelVerification y core_ChannelLink (2654c239) mas las mutations/queries: generate y verify code (059bb7c2, UPONE-1803, con rechazo explicito de service accounts en la generacion en fbafd9bf), list y revoke own links (ac93afbe, UPONE-1804), resolveChannelIdentity query (94221ce1, UPONE-1806). docs/migrations.md documenta el diseño.

**sourceRef:** 2654c239 + objects/core/core_ChannelLink.json + core_ChannelVerification.json (nuevos); src/services/codegen/generatePrismaSchema.js.
