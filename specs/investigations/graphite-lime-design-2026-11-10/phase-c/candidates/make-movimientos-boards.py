from pathlib import Path
base=Path(__file__).resolve().parent
style='''
* { box-sizing:border-box; }
body { margin:0; background:#0b0f10; color:#f4f1ea; font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
.board { padding:28px 30px 34px; }
.head { display:flex; align-items:flex-end; justify-content:space-between; gap:28px; margin-bottom:18px; }
.eyebrow { margin:0 0 7px; color:#c8e88b; font-size:10px; font-weight:750; letter-spacing:1.7px; text-transform:uppercase; }
h1 { margin:0 0 6px; font-size:32px; font-weight:700; letter-spacing:-1.2px; line-height:1.05; }
.sub { margin:0; color:#cbc5ba; font-size:12.5px; }
.note { max-width:560px; margin:0; color:#939e9b; font-size:10.5px; line-height:1.55; text-align:right; }
.grid3 { display:grid; grid-template-columns:repeat(3,1440px); gap:16px; align-items:start; }
figure { margin:0; overflow:hidden; border:1px solid #354340; border-radius:14px; background:#131b1a; box-shadow:0 20px 44px rgba(0,0,0,.28); }
figcaption { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 14px; border-bottom:1px solid rgba(200,210,205,.17); background:rgba(7,12,10,.5); }
figcaption strong { color:#f4f1ea; font-size:12.5px; font-weight:650; }
.pill { display:inline-flex; align-items:center; min-height:20px; padding:2px 8px; border:1px solid rgba(200,232,139,.34); border-radius:999px; color:#c8e88b; font-size:9px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; white-space:nowrap; }
.pill--amber { border-color:rgba(242,193,78,.34); color:#f2c14e; }
.pill--blue { border-color:rgba(154,134,220,.4); color:#c7b8ff; }
img { display:block; width:100%; height:auto; }
.theme-copy { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:16px; }
.theme-card { padding:14px 16px 15px; border:1px solid #354340; border-radius:12px; background:#131b1a; }
.theme-card .kicker { margin:0 0 5px; color:#c8e88b; font-size:9px; font-weight:750; letter-spacing:1.4px; text-transform:uppercase; }
.theme-card .kicker--amber { color:#f2c14e; }
.theme-card .kicker--blue { color:#c7b8ff; }
.theme-card h2 { margin:0 0 5px; font-size:17px; font-weight:650; letter-spacing:-.3px; }
.theme-card p { margin:0; color:#b7c0bc; font-size:11px; line-height:1.55; }
.theme-card p + p { margin-top:6px; }
.matrix { width:100%; margin-top:18px; overflow:hidden; border:1px solid #354340; border-radius:12px; border-collapse:collapse; background:#131b1a; }
.matrix th, .matrix td { padding:11px 14px; border-bottom:1px solid rgba(200,210,205,.13); text-align:left; font-size:10.5px; color:#c6cec9; }
.matrix th { color:#8f9b97; font-size:9px; font-weight:750; letter-spacing:1.3px; text-transform:uppercase; }
.matrix tr:last-child td { border-bottom:0; }
.matrix td:first-child { color:#f4f1ea; font-weight:650; }
.matrix .good { color:#c8e88b; }
.matrix .warn { color:#f2c14e; }
.reading { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:0; margin-top:18px; overflow:hidden; border:1px solid #354340; border-radius:12px; background:#131b1a; }
.reading div { padding:14px 16px; border-left:1px solid rgba(200,210,205,.15); }
.reading div:first-child { border-left:0; }
.reading h2 { margin:0 0 4px; color:#f4f1ea; font-size:11.5px; }
.reading p { margin:0; color:#aeb8b4; font-size:10px; line-height:1.55; }
.foot { margin:16px 0 0; color:#89938f; font-size:10px; line-height:1.5; }
.foot b { color:#c8e88b; font-weight:650; }
.responsive { display:flex; flex-wrap:wrap; gap:14px; align-items:flex-start; }
.responsive .tablet { width:820px; }
.responsive .phone { width:390px; }
.responsive figure { border-radius:12px; }
.responsive .reading { flex:1 1 100%; }
.six-grid { display:grid; grid-template-columns:repeat(3,1440px); gap:16px; align-items:start; }
.six-grid .group { grid-column:span 3; display:flex; align-items:center; gap:10px; margin:6px 0 -4px; color:#8f9b97; font-size:10px; font-weight:750; letter-spacing:1.4px; text-transform:uppercase; }
.six-grid .group::after { content:""; flex:1; height:1px; background:rgba(200,210,205,.15); }
.six-caption { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 13px; border-bottom:1px solid rgba(200,210,205,.17); background:rgba(7,12,10,.5); }
.six-caption strong { color:#f4f1ea; font-size:11.5px; }
.states-grid2 { display:grid; grid-template-columns:1440px 390px; gap:14px; align-items:start; }
.states-grid2 .reading { grid-column:1 / -1; }
@media (max-width:1000px) { .head{display:block} .note{margin-top:10px;text-align:left} .grid3,.theme-copy,.reading,.six-grid,.responsive,.states-grid2{grid-template-columns:1fr} .six-grid .group{grid-column:1} }
'''
def fig(src,label,pill,cls=""):
    return f'<figure><figcaption><strong>{label}</strong><span class="pill {cls}">{pill}</span></figcaption><img src="{src}" alt="{label}"></figure>'

def figResp(src,label,pill,size="phone"):
    return f'<figure class="{size}"><figcaption><strong>{label}</strong><span class="pill">{pill}</span></figcaption><img src="{src}" alt="{label}"></figure>'

# 1 desktop
items=[
 ("shots-movimientos/graphite-lime-1440-fold.png","Graphite Lime","Candidato 4",""),
 ("shots-movimientos/color-finance-1440-fold.png","Color Finance","Candidato 5","pill--blue"),
 ("shots-movimientos/pastel-editorial-1440-fold.png","Pastel Editorial","Candidato 6","pill--amber"),
]
cards='''
<article class="theme-card"><p class="kicker">Prioridad principal</p><h2>Graphite Lime</h2><p>Filtros carbón, tabla de cabecera casi negra, selección lima y detalle profundo. La acción, la selección y la información usan lima; los importes positivos y los estados correctos usan menta.</p><p><strong>Inspiración:</strong> Qiespend · fintech oscuro con lima.</p><p><strong>Riesgo:</strong> conservar la disciplina semántica al añadir más estados.</p></article>
<article class="theme-card"><p class="kicker kicker--blue">Alternativa diurna</p><h2>Color Finance</h2><p>Filtros y tabla neutros con cabecera lavanda, selección violeta y detalle lavanda. El color se concentra en los bordes, la selección y los estados; la tabla no se vuelve un arcoíris.</p><p><strong>Inspiración:</strong> Nixtio · papel cálido y color estructurado.</p><p><strong>Riesgo:</strong> que el violeta compita con los estados de aviso.</p></article>
<article class="theme-card"><p class="kicker kicker--amber">Exploración secundaria</p><h2>Pastel Editorial</h2><p>Tabla con reglas de tinta, selección lavanda y detalle editorial. El serif se reserva para los titulares; las cifras y los campos siguen en Inter.</p><p><strong>Inspiración:</strong> Eilo · editorial pastel y tinta.</p><p><strong>Riesgo:</strong> el borde negro y la asimetría pesan más en pantallas densas.</p></article>
'''
html=f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><title>MyFinanzas · Movimientos candidatos</title><style>{style}</style></head><body><main class="board">
<header class="head"><div><p class="eyebrow">MyFinanzas · Fase 2 · Movimientos 1440</p><h1>Tres formas de trabajar la misma tabla</h1><p class="sub">Filtros, tabla poblada, selección y detalle contextual con los mismos datos sintéticos.</p></div><p class="note">Capturas 1440 × 1000. Prototipos aislados; no integrados ni desplegados. Dark, Light y Hybrid se conservan como referencia.</p></header>
<div class="grid3">{''.join(fig(*x) for x in items)}</div>
<section class="theme-copy">{cards}</section>
<table class="matrix"><thead><tr><th>Tema</th><th>Filtros</th><th>Tabla</th><th>Detalle</th><th>Móvil</th><th>Estados</th><th>Recomendación</th></tr></thead><tbody>
<tr><td>Graphite Lime</td><td class="good">Compactos, foco lima</td><td class="good">Cabecera fina, fila activa clara</td><td class="good">Carbón, borde lima, importe semántico</td><td class="good">Validado 390 + hoja</td><td class="good">Formulario y 10 estados</td><td class="good">Continuar</td></tr>
<tr><td>Color Finance</td><td class="good">Neutros con carril lavanda</td><td class="good">Cabecera lavanda, selección violeta</td><td class="good">Lavanda, borde violeta</td><td class="good">Validado 390 + hoja</td><td class="good">Comparte galería</td><td class="good">Continuar</td></tr>
<tr><td>Pastel Editorial</td><td class="warn">Tinta y reglas editoriales</td><td class="good">Reglas negras, lectura clara</td><td class="good">Lavanda, serif en titulares</td><td class="warn">Solo escritorio validado</td><td class="warn">Pendiente de adaptar</td><td class="warn">Explorar</td></tr>
</tbody></table>
<section class="reading"><div><h2>La tabla manda</h2><p>Los tres mantienen la jerarquía Fecha → Tipo → Concepto → Saldo → Importe. La partida y la referencia viven en el detalle; no se añaden columnas nuevas.</p></div><div><h2>El detalle contextual</h2><p>Graphite usa un bloque carbón con borde lima; Color un panel lavanda; Pastel un panel editorial claro. En móvil se convierten en hoja inferior.</p></div><div><h2>Color con semántica</h2><p>Graphite separa lima (marca/acción/info), menta (positivo/completo), ámbar (parcial) y coral (negativo/error). No usa lima para importes positivos ni para “Vigente”.</p></div></section>
<p class="foot"><b>Lectura de diseño, no auditoría WCAG completa.</b> Inspiración estética: Qiespend, Nixtio y Eilo; no se copian interfaces. Datos sintéticos. Pastel no tiene móvil ni estados finales; Graphite y Color sí se han probado a 390.</p>
</main></body></html>'''
(base/'comparativa-movimientos-desktop.html').write_text(html)

# 2 responsive
resp=[
 ("shots-movimientos/graphite-lime-820-fold.png","Graphite · tablet 820","TABLET","tablet"),
 ("shots-movimientos/graphite-lime-390-fold.png","Graphite · móvil 390","MÓVIL","phone"),
 ("shots-movimientos/graphite-lime-390-detail.png","Graphite · detalle móvil","HOJA","phone"),
 ("shots-movimientos/graphite-lime-390-filters-fold.png","Graphite · filtros abiertos","MÓVIL","phone"),
 ("shots-movimientos/color-finance-390-fold.png","Color · móvil 390","MÓVIL","phone"),
 ("shots-movimientos/color-finance-390-detail.png","Color · detalle móvil","HOJA","phone"),
]
html=f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><title>MyFinanzas · Movimientos responsive</title><style>{style}</style></head><body><main class="board">
<header class="head"><div><p class="eyebrow">MyFinanzas · Fase 2 · Movimientos responsive</p><h1>La tabla se convierte en tarjetas y el detalle en hoja</h1><p class="sub">Graphite y Color en tableta y móvil; la misma estructura C, filtros y selección.</p></div><p class="note">Capturas a 820 y 390. Pastel Editorial se limita a escritorio en esta entrega, según el alcance acordado.</p></header>
<div class="responsive">
{''.join(figResp(*x) for x in resp)}
<section class="reading"><div><h2>Graphite · tablet</h2><p>La sidebar se reduce a iconos, los filtros pasan a dos filas y la tabla conserva las columnas. El ciclo secundario se consulta en el detalle para no truncar filas.</p></div><div><h2>Graphite · móvil</h2><p>La tabla se sustituye por tarjetas; la tarjeta seleccionada usa borde lima y la hoja de detalle mantiene el contraste. Los filtros abiertos caben en una columna.</p></div><div><h2>Color · móvil</h2><p>La tarjeta seleccionada usa lavanda y el detalle se abre en hoja clara. El violeta se reserva para selección y enlaces; los importes mantienen verde/rojo semánticos.</p></div></section>
</div>
<p class="foot"><b>Tablet y móvil comprobados sin overflow.</b> Los controles móviles visibles cumplen 44 px. Datos sintéticos; no hay integración.</p>
</main></body></html>'''
(base/'comparativa-movimientos-responsive.html').write_text(html)

# 3 family
six=[
 ("../final/shots/dark-inicio.png","Dark-s · Inicio","Referencia",""),
 ("../final/shots/after-inicio-light-1440-fold.png","Light-s final · Inicio","Actual",""),
 ("../final/shots/after-inicio-hybrid-1440-fold.png","Hybrid-s final · Inicio","Actual",""),
 ("shots-movimientos/graphite-lime-1440-fold.png","Graphite Lime · Movimientos","Candidato 4","pill--blue"),
 ("shots-movimientos/color-finance-1440-fold.png","Color Finance · Movimientos","Candidato 5","pill--blue"),
 ("shots-movimientos/pastel-editorial-1440-fold.png","Pastel Editorial · Movimientos","Candidato 6","pill--amber"),
]
# For the family board, use Movimientos for existing themes, not Inicio.
six=[
 ("../shots/movimientos-dark-s-1440-fold.png","Dark-s · Movimientos","Referencia",""),
 ("../final/shots/after-movimientos-light-1440-fold.png","Light-s final · Movimientos","Actual",""),
 ("../final/shots/after-movimientos-hybrid-1440-fold.png","Hybrid-s final · Movimientos","Actual",""),
 ("shots-movimientos/graphite-lime-1440-fold.png","Graphite Lime · Movimientos","Candidato 4","pill--blue"),
 ("shots-movimientos/color-finance-1440-fold.png","Color Finance · Movimientos","Candidato 5","pill--blue"),
 ("shots-movimientos/pastel-editorial-1440-fold.png","Pastel Editorial · Movimientos","Candidato 6","pill--amber"),
]
def sixfig(x):
    src,label,pill,cls=x
    return f'<figure><div class="six-caption"><strong>{label}</strong><span class="pill {cls}">{pill}</span></div><img src="{src}" alt="{label}"></figure>'
html=f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><title>MyFinanzas · Movimientos en la colección</title><style>{style}</style></head><body><main class="board">
<header class="head"><div><p class="eyebrow">MyFinanzas · Colección visual</p><h1>Movimientos en los seis temas</h1><p class="sub">La misma pantalla operativa, tres referencias vigentes y tres candidatos.</p></div><p class="note">Dark-s no se ha modificado. Light y Hybrid finales incluyen el detalle claro corregido. Los candidatos son prototipos aislados.</p></header>
<div class="six-grid">
<div class="group">Temas actuales</div>
{''.join(sixfig(x) for x in six[:3])}
<div class="group">Candidatos visuales</div>
{''.join(sixfig(x) for x in six[3:])}
</div>
<section class="reading"><div><h2>Diferenciación</h2><p>Dark es tecnológico; Light, papel editorial; Hybrid, navegación oscura con workspace cálido. Graphite es grafito/lima; Color Finance es lavanda/amarillo/salvia; Pastel es tinta y editorial.</p></div><div><h2>Operación</h2><p>Los seis comparten filtros, tabla, selección, detalle y paginación. No se han añadido métricas ni acciones nuevas.</p></div><div><h2>Límite</h2><p>Graphite y Color tienen móvil; Pastel solo escritorio. No hay integración, merge ni despliegue.</p></div></section>
<p class="foot"><b>Comparativa de dirección visual.</b> No es una auditoría WCAG completa. Datos sintéticos.</p>
</main></body></html>'''
(base/'comparativa-movimientos-familia.html').write_text(html)

# 4 states
html=f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><title>MyFinanzas · Estados Graphite Lime</title><style>{style}</style></head><body><main class="board">
<header class="head"><div><p class="eyebrow">MyFinanzas · Graphite Lime · Estados</p><h1>Formularios, validación y guardado</h1><p class="sub">La galería de estados y el formulario completo sobre los componentes compartidos.</p></div><p class="note">Incluye carga, vacío, sin resultados, error, parcial, selección, validación, deshabilitado, formulario completo y guardado. Capturas a 1440 y 390.</p></header>
<div class="states-grid2">
{fig("shots-estados/graphite-lime-1440.png","Graphite · estados y formulario · 1440","ESCRITORIO")}
{fig("shots-estados/graphite-lime-390-fold.png","Graphite · estados · 390","MÓVIL")}
<section class="reading"><div><h2>Formulario</h2><p>Campos de fecha, tipo, concepto, importe, saldo, partida, referencia, estado y nota; acciones primaria y secundaria. El foco y los errores usan el lima y el coral semánticos.</p></div><div><h2>Estados</h2><p>Cargando, vacío verificado, sin coincidencias, error de carga, datos parciales, selección, validación, deshabilitado, guardado. El color no es el único canal: hay texto, icono y forma.</p></div><div><h2>Semántica</h2><p>Lima = marca/acción/información. Menta = positivo/completo/guardado. Ámbar = parcial/pendiente. Coral = negativo/error. Gris = anulado/no disponible.</p></div></section>
</div>
<p class="foot"><b>Prototipo aislado.</b> No hay lógica financiera ni datos reales. Los formularios y acciones son demostrativos.</p>
</main></body></html>'''
(base/'comparativa-estados-graphite.html').write_text(html)
print('movimientos boards html written')
