from pathlib import Path

base = Path(__file__).resolve().parent
style = '''
* { box-sizing:border-box; }
body { margin:0; background:#0b0f10; color:#f4f1ea; font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
.board { padding:28px 30px 34px; }
.head { display:flex; align-items:flex-end; justify-content:space-between; gap:28px; margin-bottom:18px; }
.eyebrow { margin:0 0 7px; color:#c8e88b; font-size:10px; font-weight:750; letter-spacing:1.7px; text-transform:uppercase; }
h1 { margin:0 0 6px; font-size:32px; font-weight:700; letter-spacing:-1.2px; line-height:1.05; }
.sub { margin:0; color:#cbc5ba; font-size:12.5px; }
.note { max-width:560px; margin:0; color:#939e9b; font-size:10.5px; line-height:1.55; text-align:right; }
.grid3 { display:grid; grid-template-columns:repeat(3,1440px); gap:16px; align-items:start; }
.grid3 + .grid3 { margin-top:20px; }
figure { margin:0; overflow:hidden; border:1px solid #354340; border-radius:14px; background:#131b1a; box-shadow:0 20px 44px rgba(0,0,0,.28); }
figcaption { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 14px; border-bottom:1px solid rgba(200,210,205,.17); background:rgba(7,12,10,.5); }
figcaption strong { color:#f4f1ea; font-size:12.5px; font-weight:650; }
figcaption span { color:#aab6b1; font-size:10px; }
img { display:block; width:100%; height:auto; }
.pill { display:inline-flex; align-items:center; min-height:20px; padding:2px 8px; border:1px solid rgba(200,232,139,.34); border-radius:999px; color:#c8e88b; font-size:9px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; white-space:nowrap; }
.pill--amber { border-color:rgba(242,193,78,.34); color:#f2c14e; }
.pill--blue { border-color:rgba(154,134,220,.4); color:#c7b8ff; }
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
.matrix .recommend { white-space:nowrap; }
.reading { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:0; margin-top:18px; overflow:hidden; border:1px solid #354340; border-radius:12px; background:#131b1a; }
.reading div { padding:14px 16px; border-left:1px solid rgba(200,210,205,.15); }
.reading div:first-child { border-left:0; }
.reading h2 { margin:0 0 4px; color:#f4f1ea; font-size:11.5px; }
.reading p { margin:0; color:#aeb8b4; font-size:10px; line-height:1.55; }
.foot { margin:16px 0 0; color:#89938f; font-size:10px; line-height:1.5; }
.foot b { color:#c8e88b; font-weight:650; }
.six-grid { display:grid; grid-template-columns:repeat(3,1440px); gap:16px; align-items:start; }
.six-grid .group { grid-column:span 3; display:flex; align-items:center; gap:10px; margin:6px 0 -4px; color:#8f9b97; font-size:10px; font-weight:750; letter-spacing:1.4px; text-transform:uppercase; }
.six-grid .group::after { content:""; flex:1; height:1px; background:rgba(200,210,205,.15); }
.six-caption { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 13px; border-bottom:1px solid rgba(200,210,205,.17); background:rgba(7,12,10,.5); }
.six-caption strong { color:#f4f1ea; font-size:11.5px; }
.six-caption span { color:#aab6b1; font-size:9.5px; }
@media (max-width:1000px) { .head{display:block} .note{margin-top:10px;text-align:left} .grid3,.theme-copy,.reading,.six-grid{grid-template-columns:1fr} .six-grid .group{grid-column:1} }
'''

def figure(src, label, pill, extra=""):
    return f'<figure><figcaption><strong>{label}</strong><span class="pill">{pill}</span></figcaption><img src="{src}" alt="{label}"></figure>'

candidates = [
    ("shots/graphite-lime-1440-fold.png", "Tema 4 · Graphite Lime", "Minimal Fintech", "green",
     "Grafito, carbón y lima eléctrico. Superficies compactas, bordes finos y una sola fuente de luz.",
     "Sobria, técnica y de alta densidad. Se separa de Dark por el acento lima y la ausencia de ondas.",
     "Alta: el héroe y la retícula contienen la iluminación. El lima no inunda los paneles secundarios.",
     "Continuar"),
    ("shots/color-finance-1440-fold.png", "Tema 5 · Color Finance", "Colorful Premium", "blue",
     "Papel cálido con lavanda, amarillo y salvia; tarjetas KPI de distinta jerarquía y gráfico expresivo.",
     "Creativa y luminosa. Se separa de Light por la paleta y por el uso del color como estructura, no como acento.",
     "Media-alta: la variedad cromática exige disciplina en tablas, badges y estados.",
     "Continuar"),
    ("shots/pastel-editorial-1440-fold.png", "Tema 6 · Pastel Editorial", "Creative Finance", "amber",
     "Lavanda, rosa y limón sobre crema; hero collage, serif editorial y bordes de tinta.",
     "La más experimental. Se separa de todos los temas por tipografía, asimetría y lenguaje de impresión.",
     "Media: el borde negro y el serif son muy identitarios; hay que vigilar tablas, formularios y densidad.",
     "Explorar"),
]

html = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><title>MyFinanzas · Candidatos de Inicio</title><style>{style}</style></head><body><main class="board">
<header class="head"><div><p class="eyebrow">MyFinanzas · Fase 2 · Inicio 1440</p><h1>Tres direcciones para la misma estructura</h1><p class="sub">Misma composición C, mismos componentes, mismos KPI y datos sintéticos equivalentes.</p></div><p class="note">Capturas 1440 × 1000. Los tres son prototipos visuales aislados: no están integrados en la aplicación ni sustituyen los tokens de producción.</p></header>
<div class="grid3">
{''.join(figure(c[0], c[1], c[2]) for c in candidates)}
</div>
<section class="theme-copy">
{''.join(f'<article class="theme-card"><p class="kicker {("kicker--"+c[3]) if c[3]!="green" else ""}">{c[2]}</p><h2>{c[1].split("· ")[1]}</h2><p>{c[4]}</p><p>{c[5]}</p></article>' for c in candidates)}
</section>
<table class="matrix"><thead><tr><th>Tema</th><th>Personalidad</th><th>Profundidad</th><th>Jerarquía</th><th>Legibilidad</th><th>Diferenciación</th><th>Recomendación</th></tr></thead><tbody>
<tr><td>Graphite Lime</td><td class="good">Alta · fintech sobria</td><td class="good">Alta · luz contenida</td><td class="good">Alta · héroe y tablas</td><td class="good">Excelente · 6,0:1 mínimo</td><td class="good">Alta vs Dark</td><td class="recommend"><span class="pill">Continuar</span></td></tr>
<tr><td>Color Finance</td><td class="good">Alta · cálida y creativa</td><td class="good">Media-alta · capas de color</td><td class="good">Alta · KPI y paneles</td><td class="good">Alta · 4,93:1 mínimo</td><td class="good">Alta vs Light</td><td class="recommend"><span class="pill">Continuar</span></td></tr>
<tr><td>Pastel Editorial</td><td class="good">Muy alta · editorial</td><td class="good">Alta · collage y tinta</td><td class="good">Alta · serif y bordes</td><td class="good">Alta · 5,3:1 mínimo</td><td class="good">Muy alta vs todos</td><td class="recommend"><span class="pill pill--amber">Explorar</span></td></tr>
</tbody></table>
<section class="reading">
<div><h2>Qué funciona</h2><p>Los tres mantienen la lectura financiera: héroe, KPI, ciclo, atención, movimientos, presupuesto y posición. El color no sustituye la jerarquía ni la cobertura.</p></div>
<div><h2>Qué vigilar</h2><p>Graphite puede acercarse a Dark si el verde lima se generaliza. Color Finance necesita disciplina en tablas y estados. Pastel Editorial exige adaptar formularios y tablas sin perder densidad.</p></div>
<div><h2>Siguiente paso</h2><p>Validar la dirección visual. Si se aprueba, extender solo las elegidas a Movimientos y responsive. No integrar en la aplicación todavía.</p></div>
</section>
<p class="foot"><b>Lectura de diseño, no auditoría WCAG completa.</b> Datos sintéticos. Dark-s no se ha modificado. Light y Hybrid finales se incluyen como referencia en <code>comparativa-familia-6.png</code>.</p>
</main></body></html>'''
(base / 'comparativa-candidatos.html').write_text(html)
print('comparativa-candidatos.html')

# Six-theme board
six = [
    ("../final/shots/dark-inicio.png", "Dark-s", "Actual · referencia", ""),
    ("../final/shots/after-inicio-light-1440-fold.png", "Light-s final", "Actual · corregido", ""),
    ("../final/shots/after-inicio-hybrid-1440-fold.png", "Hybrid-s final", "Actual · corregido", ""),
    ("shots/graphite-lime-1440-fold.png", "Graphite Lime", "Candidato 4", "pill--blue"),
    ("shots/color-finance-1440-fold.png", "Color Finance", "Candidato 5", "pill--blue"),
    ("shots/pastel-editorial-1440-fold.png", "Pastel Editorial", "Candidato 6", "pill--amber"),
]
def sixfig(item):
    src,label,pill,cls=item
    pillcls = "pill " + (cls or "")
    return f'<figure><div class="six-caption"><strong>{label}</strong><span class="{pillcls}">{pill}</span></div><img src="{src}" alt="{label}"></figure>'
html6 = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><title>MyFinanzas · Seis identidades</title><style>{style}</style></head><body><main class="board">
<header class="head"><div><p class="eyebrow">MyFinanzas · Colección visual</p><h1>Seis identidades, un solo producto</h1><p class="sub">Dark, Light y Hybrid finales conviven con tres candidatos que comparten arquitectura, componentes y datos.</p></div><p class="note">Las seis capturas usan la misma composición C y el mismo contenido sintético. Los candidatos son exploraciones aisladas; las tres primeras son la referencia vigente.</p></header>
<div class="six-grid">
<div class="group">Temas actuales</div>
{''.join(sixfig(x) for x in six[:3])}
<div class="group">Candidatos visuales</div>
{''.join(sixfig(x) for x in six[3:])}
</div>
<section class="reading">
<div><h2>Una familia, no seis apps</h2><p>Mismos KPI, misma navegación, mismos componentes y misma semántica. Cambian superficies, color y tipografía, no la estructura funcional.</p></div>
<div><h2>Diferenciación</h2><p>Dark es tecnología; Light es papel editorial; Hybrid es navegación oscura con workspace cálido. Graphite es grafito/lima; Color Finance es color estructurado; Pastel es impresión creativa.</p></div>
<div><h2>Límite actual</h2><p>Solo Inicio a 1440. Los candidatos no tienen Movimientos, móvil, tablet ni estados finales. No se han integrado ni modificado tokens de producción.</p></div>
</section>
<p class="foot"><b>Dark-s intacto.</b> Light y Hybrid finales incluyen las correcciones aprobadas de Atención y detalle de Movimientos. Los candidatos no son temas de producción.</p>
</main></body></html>'''
(base / 'comparativa-familia-6.html').write_text(html6)
print('comparativa-familia-6.html')
