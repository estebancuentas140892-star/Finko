#!/usr/bin/env node
/**
 * necesita-e2e.js - Decide si el cambio actual obliga a correr la suite E2E.
 *
 * Existe por BUG-019: DIS.19 cambió el markup de la casa de Ahorro, actualizó
 * los tests unitarios y no los E2E. Nadie se enteró porque E2E no es compuerta
 * de cada commit (tarda ~3,5 min), así que la suite pasó dos días en rojo y el
 * rojo lo encontró el cierre de otra tarea. La norma escrita no alcanzó: por eso
 * la decisión pasa a ser mecánica y no un juicio de quien commitea.
 *
 * Qué obliga a correr E2E: que el diff toque **markup**, porque los tests E2E
 * navegan por clases, ids y `data-action`. Un cambio en `logic.js` no puede
 * romper un selector; uno en un `view.js` sí.
 *
 * La detección es por CONTENIDO del diff, no por una lista de rutas. Una lista
 * hay que mantenerla y siempre se queda corta: el markup de Finko sale de
 * `index.html`, de los `view.js`, de `ui/*.js` y también de sitios menos obvios
 * como `infra/svg.js` o `infra/cuenta-helper.js`. Mirar las líneas que cambiaron
 * cubre los tres casos sin enumerar ninguno.
 *
 * Uso:
 *   node scripts/necesita-e2e.js            compara todo lo no commiteado contra HEAD
 *   node scripts/necesita-e2e.js --desde X  compara contra el ref X
 *
 * Salida: exit 0 si no hace falta, exit 1 si es obligatoria (con los archivos
 * que la disparan). El exit 1 no es un error del script: es su respuesta.
 */

import { execFileSync } from 'node:child_process';

/**
 * Señales de markup en una línea de diff. Si una línea agregada o borrada trae
 * cualquiera de estas, el cambio puede mover un selector que un test E2E usa.
 */
const SENALES_MARKUP = [
  // Los atributos exigen una comilla, backtick o `${` después del `=`. Sin eso,
  // `\bid\s*=` matchea `c.id === cuentaId`, que es una comparación de JS y no
  // un atributo: el primer borrador de este script marcaba `inversiones/index.js`
  // por esa línea.
  /\bclass\s*=\s*["'`{$]/,
  /\bid\s*=\s*["'`{$]/,
  /\bdata-[a-z-]+\s*=\s*["'`{$]/,
  /\bhref\s*=\s*["'`{$]/,
  /\baria-[a-z-]+\s*=\s*["'`{$]/,
  // Selectores: un `[data-x=...]` o `.clase` en CSS o en un querySelector es el
  // otro lado del mismo contrato que el test E2E usa para navegar.
  /\[data-[a-z-]+[\]=]/,
  /\binnerHTML\b/,
  /\binsertAdjacentHTML\b/,
  /\bouterHTML\b/,
  /<\/?(?:div|span|button|section|article|header|form|input|select|option|label|table|thead|tbody|tr|td|th|ul|ol|li|nav|a|p|h[1-6]|svg|use|path|dialog|details|summary)\b/,
];

/** Rutas cuyo cambio nunca puede romper un selector E2E. */
const IRRELEVANTES = [
  /^docs\//,
  /^scripts\//,
  /^tests\/unit\//,
  /^tests\/integration\//,
  /^coverage\//,
  /^test-results\//,
  /\.md$/,
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function main() {
  const i = process.argv.indexOf('--desde');
  const desde = i !== -1 ? process.argv[i + 1] : 'HEAD';

  // -U0: solo las líneas que cambiaron, sin contexto. El contexto daría falsos
  // positivos (markup que estaba ahí antes y sigue igual).
  const diff = git(['diff', '-U0', desde]);

  const culpables = new Map(); // archivo -> primera línea de markup que lo delata
  let archivo = null;

  for (const linea of diff.split('\n')) {
    if (linea.startsWith('+++ b/')) {
      archivo = linea.slice(6);
      continue;
    }
    if (!archivo || archivo === 'dev/null') continue;
    if (IRRELEVANTES.some(r => r.test(archivo))) continue;

    // Solo contenido agregado o borrado, no las cabeceras del diff.
    const esContenido = (linea.startsWith('+') && !linea.startsWith('+++'))
                     || (linea.startsWith('-') && !linea.startsWith('---'));
    if (!esContenido) continue;

    const cuerpo = linea.slice(1);
    if (culpables.has(archivo)) continue;
    if (SENALES_MARKUP.some(r => r.test(cuerpo))) {
      culpables.set(archivo, cuerpo.trim().slice(0, 100));
    }
  }

  if (culpables.size === 0) {
    console.log('E2E: no requerida. El diff no toca markup (ni clases, ni ids, ni data-*).');
    process.exit(0);
  }

  console.log('E2E: OBLIGATORIA. El diff toca markup en ' + culpables.size + ' archivo(s):\n');
  for (const [f, muestra] of culpables) {
    console.log('  ' + f);
    console.log('    ' + muestra);
  }
  console.log('\nCorre:  pnpm run test:e2e');
  console.log('Motivo: los tests E2E navegan por clases, ids y data-action (BUG-019).');
  process.exit(1);
}

main();
