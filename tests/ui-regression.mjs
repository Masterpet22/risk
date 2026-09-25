import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/theme.css',import.meta.url),'utf8');

assert.match(css,/\.connection,[\s\S]*?fill:\s*none\s*!important/,'Las rutas SVG deben carecer de relleno');
assert.match(css,/\.connection\.cross\s*\{[\s\S]*?stroke-dasharray:/,'Las fronteras regionales deben ser discontinuas');
assert.match(app,/l\.style\.setProperty\('--front-color',frontColor\)/,'El color de frontera debe depender de su estado');
assert.match(app,/data-dice="\$\{n\}"[\s\S]*?\$\{n\} \$\{n===1\?'soldado':'soldados'\}[\s\S]*?\$\{n\} \$\{n===1\?'dado':'dados'\}/,'Dados y soldados deben exponer la misma cantidad');
assert.match(app,/Math\.min\(3,state\.territories\[from\]\.troops-1\)/,'El ataque rápido debe recalcular su máximo');
assert.match(app,/Math\.max\(1,Math\.min\(max,parsed\)\)/,'El selector de maniobra debe limitar la cantidad');
assert.match(app,/\$\{origin\.troops\} → \$\{origin\.troops-selectedMove\}/,'La maniobra debe mostrar la vista previa de origen');
assert.match(app,/\$\{destination\.troops\} → \$\{destination\.troops\+selectedMove\}/,'La maniobra debe mostrar la vista previa de destino');
assert.match(html,/id="gameAnnouncements"[^>]*aria-live="polite"/,'Debe existir una región de anuncios accesibles');
assert.match(html,/id="telemetrySummary"/);assert.match(html,/id="exportTelemetryBtn"/);assert.match(html,/id="clearTelemetryBtn"/);
assert.match(css,/min-height:\s*44px/,'Los controles principales deben conservar objetivos táctiles de 44 px');
assert.match(css,/@media \(max-width: 1200px\)[\s\S]*?#orderCard[\s\S]*?position:fixed/,'El panel móvil debe ser una hoja inferior');
console.log('OK: invariantes DOM/CSS de rutas, combate, maniobra, modales y controles táctiles verificadas.');
