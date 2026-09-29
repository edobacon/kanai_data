---
id: MAQ-frontend-5e3d338c-html
project: jormat-evolution
type: doc
module: frontend
tags:
  - maqueta
---

<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Crear factura cliente</title>
<style>
:root{--primary:hsl(142 76% 36%);--bg:hsl(210 20% 98%);--fg:hsl(222 47% 11%);--card:#fff;--muted-fg:hsl(220 9% 46%);--border:hsl(220 13% 91%);--input:hsl(220 13% 91%);--secondary:hsl(220 14% 96%);--secondary-fg:hsl(217 19% 27%);--accent:hsl(138 64% 96%);--accent-fg:hsl(142 72% 29%);--success-bg:hsl(141 79% 93%);--success-fg:hsl(142 72% 29%);--warning-bg:hsl(48 96% 89%);--warning-fg:hsl(26 90% 37%);--info-bg:hsl(214 95% 93%);--info-fg:hsl(224 76% 48%);--destructive:hsl(0 72% 51%);--r-lg:12px;--r-md:10px;--r-sm:8px;--sh:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.08)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif;font-size:14px;padding:24px}.wrap{max-width:1180px;margin:0 auto}.mono{font-variant-numeric:tabular-nums}
.phead{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}.phead h1{font-size:26px;font-weight:700;margin:0 0 2px}.phead p{margin:0;color:var(--muted-fg);font-size:13px}.actions{display:flex;gap:10px}
.btn{height:40px;padding:0 16px;border-radius:var(--r-md);font-weight:500;display:inline-flex;align-items:center;gap:8px;cursor:pointer;border:1px solid transparent}.btn-primary{background:var(--primary);color:#fff}.btn-outline{background:#fff;border-color:var(--input);color:var(--fg)}.btn-ghost{background:transparent;color:var(--secondary-fg)}.btn-sm{height:34px;padding:0 12px;font-size:13px}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--sh)}.card-h{padding:14px 16px;border-bottom:1px solid var(--border);font-weight:600;display:flex;align-items:center;gap:8px}.card-b{padding:16px}.sec{width:22px;height:22px;border-radius:9999px;background:var(--accent);color:var(--accent-fg);font-size:12px;font-weight:600;display:inline-flex;align-items:center;justify-content:center}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.field{display:flex;flex-direction:column;gap:6px}.field label{font-size:12px;font-weight:500;color:var(--muted-fg)}.req{color:var(--destructive)}.inp{height:40px;padding:0 12px;border:1px solid var(--input);border-radius:var(--r-md);background:#fff;width:100%}.sel{height:40px;padding:0 30px 0 12px;border:1px solid var(--input);border-radius:var(--r-md);background:#fff;appearance:none;width:100%}
.two{display:grid;grid-template-columns:1.5fr 1fr;gap:16px;margin-top:16px;align-items:start}
table{width:100%;border-collapse:separate;border-spacing:0}thead th{font-size:12px;font-weight:500;color:var(--muted-fg);text-align:left;padding:10px 12px;border-bottom:1px solid var(--border)}thead th.num{text-align:right}tbody td{padding:11px 12px;border-bottom:1px solid var(--border)}tbody tr:last-child td{border-bottom:none}td.num{text-align:right;font-variant-numeric:tabular-nums}.id{color:var(--muted-fg);font-variant-numeric:tabular-nums}
.step{display:inline-flex;align-items:center;border:1px solid var(--input);border-radius:var(--r-sm);height:32px}.step button{width:28px;height:32px;border:none;background:#fff;color:var(--muted-fg);cursor:pointer}.step input{width:44px;height:32px;border:none;border-left:1px solid var(--input);border-right:1px solid var(--input);text-align:center;font-variant-numeric:tabular-nums}
.money{display:inline-flex;align-items:center;border:1px solid var(--input);border-radius:var(--r-sm);height:32px}.money span{padding:0 4px 0 8px;color:var(--muted-fg)}.money input{width:64px;height:30px;border:none;text-align:right;font-variant-numeric:tabular-nums;padding-right:8px}
.srow{display:flex;gap:8px;margin-bottom:12px}.srow .inp{flex:1}.warn{display:flex;align-items:center;gap:8px;background:var(--warning-bg);color:var(--warning-fg);border-radius:var(--r-md);padding:9px 12px;font-size:13px;font-weight:500;margin-bottom:12px}.plus{width:28px;height:28px;border-radius:var(--r-sm);border:1px solid var(--input);background:#fff;color:var(--primary);cursor:pointer}.vermas{width:100%;margin-top:10px;justify-content:center}
.bottom{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px}.sr{display:flex;justify-content:space-between;padding:7px 0}.sr.tot{border-top:1px solid var(--border);margin-top:6px;padding-top:12px;font-weight:700;font-size:16px}.sr .l{color:var(--muted-fg)}.sr .v{font-variant-numeric:tabular-nums}
.sw{width:38px;height:22px;border-radius:9999px;background:var(--primary);position:relative;display:inline-block}.sw::after{content:"";position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:9999px;background:#fff}.cl{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}.cl .k{color:var(--muted-fg)}
.pop-cap{font-size:12px;color:var(--muted-fg);margin:20px 0 8px}.pop-cap b{color:var(--fg)}.modal{width:380px;max-width:92vw;background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:0 10px 20px -8px rgba(16,24,40,.18);overflow:hidden;margin:0 auto}.modal-h{padding:16px;border-bottom:1px solid var(--border);font-size:15px;font-weight:600;display:flex;justify-content:space-between}.modal-h .mx{background:transparent;border:none;color:var(--muted-fg);cursor:pointer}.modal-b{padding:8px 16px}.mrow{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border)}.mrow:last-child{border-bottom:none}.mrow .ml{color:var(--secondary-fg);font-weight:500}.badge{display:inline-flex;font-size:12px;font-weight:600;border-radius:9999px;padding:3px 10px}.b-ok{background:var(--success-bg);color:var(--success-fg)}.b-info{background:var(--info-bg);color:var(--info-fg)}.b-neutral{background:var(--secondary);color:var(--secondary-fg)}.modal-f{padding:14px 16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px}
</style></head><body><div class="wrap">
<div class="phead"><div><h1>Crear factura cliente</h1><p>Comercial Andes Ltda. &middot; 76.543.210-9</p></div><div class="actions"><button class="btn btn-ghost">Cancelar</button><button class="btn btn-outline">Guardar borrador</button><button class="btn btn-primary">Facturar</button></div></div>
<div class="card"><div class="card-h"><span class="sec">1</span> Datos del documento</div><div class="card-b"><div class="grid">
<div class="field"><label>RUT / Razon social <span class="req">*</span></label><input class="inp" value="Comercial Andes Ltda."></div>
<div class="field"><label>Fecha <span class="req">*</span></label><input class="inp mono" value="12/09/2026"></div>
<div class="field"><label>Tipo de documento <span class="req">*</span></label><select class="sel"><option>Factura afecta</option></select></div>
<div class="field"><label>Nota de pedido / recepcion</label><input class="inp" placeholder="Buscar documento (opcional)"></div>
<div class="field"><label>O.C.</label><input class="inp" placeholder="Asociar orden de compra (opcional)"></div>
<div class="field"><label>Origen <span class="req">*</span></label><select class="sel"><option>Sucursal Providencia</option></select></div>
<div class="field"><label>Bodega <span class="req">*</span></label><select class="sel"><option>Bodega Central</option></select></div>
</div></div></div>
<div class="two">
<div class="card"><div class="card-h"><span class="sec">2</span> Items del documento</div><div class="card-b" style="padding:0"><table><thead><tr><th>ID</th><th>Descripcion</th><th class="num">Precio</th><th>Cantidad</th><th>Descuento</th><th class="num">Total</th><th></th></tr></thead><tbody>
<tr><td class="id">10432</td><td>Filtro de aceite XZ-40</td><td class="num">$ 12.000</td><td><span class="step"><button>&minus;</button><input value="4"><button>+</button></span></td><td><span class="money"><span>$</span><input value="5.000"></span></td><td class="num">$ 43.000</td><td style="text-align:right">&#9998; &#128465;</td></tr>
<tr><td class="id">10876</td><td>Pastilla de freno delantera</td><td class="num">$ 28.500</td><td><span class="step"><button>&minus;</button><input value="2"><button>+</button></span></td><td><span class="money"><span>$</span><input value="0"></span></td><td class="num">$ 57.000</td><td style="text-align:right">&#9998; &#128465;</td></tr>
<tr><td class="id">11902</td><td>Correa de distribucion</td><td class="num">$ 45.000</td><td><span class="step"><button>&minus;</button><input value="1"><button>+</button></span></td><td><span class="money"><span>$</span><input value="4.500"></span></td><td class="num">$ 40.500</td><td style="text-align:right">&#9998; &#128465;</td></tr>
</tbody></table></div></div>
<div class="card"><div class="card-h"><span class="sec">+</span> Buscar items</div><div class="card-b">
<div class="srow"><input class="inp" placeholder="Descripcion, referencia o marca"><button class="btn btn-outline btn-sm">Filtros</button></div>
<div class="warn">Su sucursal no cuenta con stock suficiente para el item 10876. Disponible: 1</div>
<table><thead><tr><th></th><th>ID</th><th>Descripcion</th><th>Ref.</th><th class="num">Precio</th></tr></thead><tbody>
<tr><td><button class="plus">+</button></td><td class="id">10432</td><td>Filtro aceite XZ-40</td><td class="id">FA-40</td><td class="num">$ 12.000</td></tr>
<tr><td><button class="plus">+</button></td><td class="id">12040</td><td>Bujia iridio</td><td class="id">BI-7</td><td class="num">$ 6.900</td></tr>
</tbody></table><button class="btn btn-ghost btn-sm vermas">Ver mas items</button>
</div></div></div>
<div class="bottom">
<div class="card"><div class="card-h">Resumen del documento</div><div class="card-b">
<div class="sr"><span class="l">Subtotal</span><span class="v">$ 140.500</span></div><div class="sr"><span class="l">Descuento</span><span class="v">&minus; $ 10.000</span></div><div class="sr"><span class="l">Neto</span><span class="v">$ 130.500</span></div><div class="sr"><span class="l">IVA (19%)</span><span class="v">$ 24.795</span></div><div class="sr tot"><span>Total</span><span class="v">$ 155.295</span></div>
</div></div>
<div class="card"><div class="card-h">Forma de pago</div><div class="card-b">
<div class="field" style="margin-bottom:14px"><label>Medio de pago <span class="req">*</span></label><select class="sel"><option>Credito 30 dias</option></select></div>
<div style="display:inline-flex;align-items:center;gap:8px"><span class="sw"></span> <span style="font-weight:500">Despacho</span></div>
<div class="field" style="margin-top:14px"><label>Receptor</label><input class="inp" placeholder="RUT + nombre receptor"></div>
<div class="field" style="margin-top:12px"><label>Observacion</label><input class="inp" placeholder="Observacion de la factura"></div>
</div></div>
<div class="card"><div class="card-h">Datos del cliente</div><div class="card-b">
<div class="cl"><span class="k">RUT</span><span class="mono">76.543.210-9</span></div><div class="cl"><span class="k">Telefono</span><span>+56 2 2345 6789</span></div><div class="cl"><span class="k">Ciudad</span><span>Santiago</span></div><div class="cl"><span class="k">Direccion</span><span>Av. Providencia 1234</span></div>
<button class="btn btn-outline btn-sm" style="margin-top:12px;width:100%;justify-content:center">Actualizar receptor</button>
</div></div>
</div>
<div class="pop-cap"><b>Popup del cliente</b> &mdash; aparece al seleccionar un cliente; se puede cerrar para continuar.</div>
<div class="modal"><div class="modal-h">Informacion adicional / Documentos pendientes <button class="mx">&#10005;</button></div><div class="modal-b">
<div class="mrow"><span class="ml">Credito</span><span class="badge b-ok">Si</span></div>
<div class="mrow"><span class="ml">Facturas</span><span class="badge b-info">2 pendientes</span></div>
<div class="mrow"><span class="ml">Notas</span><span class="badge b-neutral">0</span></div>
<div class="mrow"><span class="ml">Cheques</span><span class="badge b-neutral">0</span></div>
</div><div class="modal-f"><button class="btn btn-ghost btn-sm">Cerrar</button><button class="btn btn-primary btn-sm">Continuar</button></div></div>
</div></body></html>
