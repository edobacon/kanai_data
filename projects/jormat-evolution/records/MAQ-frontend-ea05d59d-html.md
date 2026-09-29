---
id: MAQ-frontend-ea05d59d-html
project: jormat-evolution
type: doc
module: frontend
tags:
  - maqueta
---

<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Facturas clientes - listado</title>
<style>
:root{--primary:hsl(142 76% 36%);--bg:hsl(210 20% 98%);--fg:hsl(222 47% 11%);--card:#fff;--muted-fg:hsl(220 9% 46%);--border:hsl(220 13% 91%);--input:hsl(220 13% 91%);--secondary:hsl(220 14% 96%);--secondary-fg:hsl(217 19% 27%);--accent:hsl(138 64% 96%);--accent-fg:hsl(142 72% 29%);--success-bg:hsl(141 79% 93%);--success-fg:hsl(142 72% 29%);--warning-bg:hsl(48 96% 89%);--warning-fg:hsl(26 90% 37%);--destructive-bg:hsl(0 86% 97%);--destructive-fg:hsl(0 72% 42%);--draft-bg:hsl(252 100% 96%);--draft-fg:hsl(262 83% 58%);--r-lg:12px;--r-md:10px;--r-sm:8px;--sh:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.08)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif;font-size:14px;padding:24px}.wrap{max-width:1120px;margin:0 auto}.mono{font-variant-numeric:tabular-nums}
.phead{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}.phead h1{font-size:26px;font-weight:700;margin:0 0 2px}.phead p{margin:0;color:var(--muted-fg);font-size:13px}.actions{display:flex;gap:10px}
.btn{height:40px;padding:0 16px;border-radius:var(--r-md);font-weight:500;display:inline-flex;align-items:center;gap:8px;cursor:pointer;border:1px solid transparent}.btn-primary{background:var(--primary);color:#fff}.btn-outline{background:#fff;border-color:var(--input);color:var(--fg)}.btn-ghost{background:transparent;color:var(--secondary-fg)}.btn-sm{height:36px;padding:0 12px}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--sh)}.fbar{padding:16px;margin-bottom:14px}.frow{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}
.field{display:flex;flex-direction:column;gap:6px}.field label{font-size:12px;font-weight:500;color:var(--muted-fg)}.inp{height:40px;padding:0 12px;border:1px solid var(--input);border-radius:var(--r-md);background:#fff;min-width:150px}.inp.search{min-width:260px}.inp.date.active{border-color:var(--primary);box-shadow:0 0 0 3px var(--accent)}.sel{height:40px;padding:0 30px 0 12px;border:1px solid var(--input);border-radius:var(--r-md);background:#fff;appearance:none;min-width:150px}
.chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}.chip{font-size:12px;font-weight:500;background:var(--secondary);color:var(--secondary-fg);border-radius:9999px;padding:4px 10px}.clear{font-size:12px;font-weight:500;color:var(--primary);background:none;border:none;cursor:pointer}
.vtabs{display:flex;gap:6px;margin-bottom:12px}.vtab{height:34px;padding:0 14px;border-radius:9999px;border:1px solid var(--border);background:#fff;font-size:13px;font-weight:500;color:var(--secondary-fg);cursor:pointer;display:inline-flex;align-items:center;gap:6px}.vtab.on{background:var(--primary);color:#fff;border-color:var(--primary)}.vtab .n{background:rgba(0,0,0,.12);border-radius:9999px;padding:0 6px;font-size:11px}.vtab.on .n{background:rgba(255,255,255,.25)}
table{width:100%;border-collapse:separate;border-spacing:0}thead th{font-size:12px;font-weight:500;color:var(--muted-fg);text-align:left;padding:12px 14px;border-bottom:1px solid var(--border);white-space:nowrap}thead th.num{text-align:right}
tbody td{padding:13px 14px;border-bottom:1px solid var(--border)}tbody tr:last-child td{border-bottom:none}td.num{text-align:right;font-variant-numeric:tabular-nums}.folio{font-weight:600;color:var(--primary)}.folio.draft{color:var(--muted-fg);font-style:italic}.cli{font-weight:500}.row-draft{background:hsl(252 100% 99%)}
.badge{display:inline-flex;font-size:12px;font-weight:600;border-radius:9999px;padding:3px 10px}.b-ok{background:var(--success-bg);color:var(--success-fg)}.b-pend{background:var(--warning-bg);color:var(--warning-fg)}.b-venc{background:var(--destructive-bg);color:var(--destructive-fg)}.b-draft{background:var(--draft-bg);color:var(--draft-fg)}.kebab{width:30px;height:30px;border-radius:var(--r-sm);border:none;background:transparent;color:var(--muted-fg);cursor:pointer}
.pag{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-top:1px solid var(--border);color:var(--muted-fg);font-size:13px}.pag .r{display:flex;gap:8px;align-items:center}.pgb{height:32px;min-width:32px;padding:0 8px;border:1px solid var(--input);border-radius:var(--r-sm);background:#fff;cursor:pointer}.pgb.on{background:var(--primary);color:#fff;border-color:var(--primary)}
.sectitle{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted-fg);margin:22px 0 8px}.capt{font-size:12px;color:var(--muted-fg);margin-bottom:6px}.capt b{color:var(--fg)}
.print{padding:24px}.print-h{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid var(--fg);padding-bottom:10px;margin-bottom:12px}.print-h h2{margin:0;font-size:18px;font-weight:700}.print-h .meta{font-size:12px;color:var(--muted-fg);text-align:right}.print thead th{border-bottom:1px solid var(--fg);color:var(--fg);font-weight:600}.print tbody td{padding:8px 10px}
.empty{padding:44px 16px;text-align:center}.empty .ic{width:44px;height:44px;border-radius:9999px;background:var(--secondary);display:inline-flex;align-items:center;justify-content:center;color:var(--muted-fg);margin-bottom:12px}.empty h3{margin:0 0 4px;font-size:15px;font-weight:600}.empty p{margin:0;color:var(--muted-fg);font-size:13px}
</style></head><body><div class="wrap">
<div class="phead"><div><h1>Facturas clientes</h1><p>Consulta, filtra e imprime las facturas de venta.</p></div><div class="actions"><button class="btn btn-outline">Imprimir</button><button class="btn btn-primary">Crear factura</button></div></div>
<div class="card fbar"><div class="frow">
<div class="field" style="flex:1;min-width:260px"><label>Buscar</label><input class="inp search" placeholder="Buscar facturas por nombre del cliente"></div>
<div class="field"><label>Tipo de documento</label><select class="sel"><option>Todos</option></select></div>
<div class="field"><label>Estado</label><select class="sel"><option>Todos</option></select></div>
<div class="field"><label>Fecha inicio</label><input class="inp date active" value="01/09/2026"></div>
<div class="field"><label>Fecha fin</label><input class="inp date" value="12/09/2026"></div>
<button class="btn btn-primary btn-sm">Aplicar</button><button class="btn btn-ghost btn-sm">Limpiar</button>
</div><div class="chips"><span class="chip">Desde 01/09/2026</span><span class="chip">Hasta 12/09/2026</span><button class="clear">Limpiar todo</button></div></div>
<div class="vtabs"><button class="vtab on">Todas <span class="n">47</span></button><button class="vtab">Borradores <span class="n">2</span></button></div>
<div class="card"><table><thead><tr><th>Factura</th><th>Cliente</th><th>RUT</th><th class="num">Total</th><th>Origen</th><th>Orden</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
<tr class="row-draft"><td><span class="folio draft">(sin folio)</span></td><td class="cli">Servicios Ltda.</td><td class="mono">77.500.300-1</td><td class="num">$ 512.000</td><td>Bodega Central</td><td class="mono" style="color:var(--muted-fg)">&mdash;</td><td class="mono">12/09/2026</td><td><span class="badge b-draft">Borrador</span></td><td><button class="kebab">&#8943;</button></td></tr>
<tr><td><span class="folio">F-001245</span></td><td class="cli">Comercial Andes Ltda.</td><td class="mono">76.543.210-9</td><td class="num">$ 1.284.900</td><td>Bodega Central</td><td class="mono">OC-8821</td><td class="mono">12/09/2026</td><td><span class="badge b-ok">Pagado</span></td><td><button class="kebab">&#8943;</button></td></tr>
<tr><td><span class="folio">F-001244</span></td><td class="cli">Ferreteria El Roble SpA</td><td class="mono">77.129.800-4</td><td class="num">$ 342.150</td><td>Sucursal Norte</td><td class="mono">OC-8817</td><td class="mono">11/09/2026</td><td><span class="badge b-pend">Pendiente</span></td><td><button class="kebab">&#8943;</button></td></tr>
<tr><td><span class="folio">F-001243</span></td><td class="cli">Distribuidora Sur Ltda.</td><td class="mono">78.900.111-2</td><td class="num">$ 2.010.500</td><td>Bodega Central</td><td class="mono" style="color:var(--muted-fg)">&mdash;</td><td class="mono">10/09/2026</td><td><span class="badge b-venc">Vencida</span></td><td><button class="kebab">&#8943;</button></td></tr>
</tbody></table>
<div class="pag"><span>Mostrando <b class="mono" style="color:var(--fg)">1</b> a <b class="mono" style="color:var(--fg)">4</b> de <b class="mono" style="color:var(--fg)">47</b></span><div class="r"><span>Filas por pagina</span><select class="sel" style="min-width:auto;height:32px"><option>10</option></select><button class="pgb">&#8249;</button><button class="pgb on">1</button><button class="pgb">2</button><button class="pgb">&#8250;</button></div></div>
</div>
<div class="sectitle">Vista de impresion (CA-04) &mdash; resumen por columnas, sin controles ni Acciones</div>
<div class="capt"><b>Imprimir listado:</b> incluye TODOS los registros del filtro (todas las paginas), no solo la pagina visible; columnas de datos + el rango aplicado.</div>
<div class="card print"><div class="print-h"><h2>Facturas clientes</h2><div class="meta">Periodo: 01/09/2026 &ndash; 12/09/2026<br>47 registros (todas las paginas) &middot; impreso 12/09/2026</div></div>
<table><thead><tr><th>Factura</th><th>Cliente</th><th>RUT</th><th class="num">Total</th><th>Origen</th><th>Orden</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>
<tr><td>F-001245</td><td>Comercial Andes Ltda.</td><td class="mono">76.543.210-9</td><td class="num">$ 1.284.900</td><td>Bodega Central</td><td class="mono">OC-8821</td><td class="mono">12/09/2026</td><td>Pagado</td></tr>
<tr><td>F-001244</td><td>Ferreteria El Roble SpA</td><td class="mono">77.129.800-4</td><td class="num">$ 342.150</td><td>Sucursal Norte</td><td class="mono">OC-8817</td><td class="mono">11/09/2026</td><td>Pendiente</td></tr>
<tr><td>F-001243</td><td>Distribuidora Sur Ltda.</td><td class="mono">78.900.111-2</td><td class="num">$ 2.010.500</td><td>Bodega Central</td><td class="mono">&mdash;</td><td class="mono">10/09/2026</td><td>Vencida</td></tr>
<tr><td>F-001242</td><td>Constructora Maipo SpA</td><td class="mono">76.010.442-K</td><td class="num">$ 780.000</td><td>Sucursal Sur</td><td class="mono">OC-8802</td><td class="mono">09/09/2026</td><td>Pagado</td></tr>
<tr><td>F-001241</td><td>Agricola Los Maitenes</td><td class="mono">77.884.210-1</td><td class="num">$ 456.780</td><td>Bodega Central</td><td class="mono">OC-8790</td><td class="mono">08/09/2026</td><td>Pendiente</td></tr>
<tr><td colspan="8" style="text-align:center;color:var(--muted-fg);font-style:italic;padding:10px">&hellip; 42 registros mas (todas las paginas del filtro) &hellip;</td></tr>
</tbody><tfoot><tr><td colspan="3" style="font-weight:600;border-top:2px solid var(--fg);padding-top:8px">Total 47 registros</td><td class="num" style="font-weight:600;border-top:2px solid var(--fg);padding-top:8px">$ 41.280.540</td><td colspan="4" style="border-top:2px solid var(--fg)"></td></tr></tfoot></table></div>
<div class="sectitle">Estado sin resultados</div>
<div class="card empty"><div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18M3 12h18M3 17h18"/></svg></div><h3>Sin resultados</h3><p>No hay facturas que coincidan con los filtros. Ajusta la busqueda o el rango de fechas.</p></div>
</div></body></html>
