#!/usr/bin/env node
/**
 * necesita-e2e.js - Decide si el cambio actual obliga a correr la suite E2E.
 *
 * Existe por BUG-019: DIS.19 cambió el markup de la casa de Ahorro, actualizó
 * los tests unitarios y no los E2E. Nadie se enteró porque E2E no era compuerta
 * de cada commit (tarda ~3,5 min), así que la suite pasó dos días en rojo y el
 * rojo lo encontró el cierre de otra tarea. La norma escrita no alcanzó: por eso
 * la decisión pasa a ser mecánica y no un juicio de quien commitea.
 *
 * ## Por qué la regla es por RUTA y no por contenido del diff
 *
 * El primer diseño buscaba señales de markup en las líneas cambiadas (`class=`,
 * `data-*=`, tags, `innerHTML`). Parecía más preciso y tenía tres agujeros que
 * lo vuelven inservible como compuerta:
 *
 * 1. **CSS.** `.lane__cta { display: none }` no trae ninguna señal de markup y
 *    rompe cualquier `toBeVisible()`.
 * 2. **Copy.** Cambiar "Vence hoy" por otra frase rompe `toHaveText()` sin tocar
 *    una clase ni un id. BUG-016 (voseo) es exactamente ese caso.
 * 3. **Falso positivo al revés.** `c.id === cuentaId` matcheaba como atributo.
 *
 * Un falso negativo en una compuerta es lo peor que puede pasar: deja pasar
 * justo lo que la compuerta existe para atrapar, y encima con la confianza de
 * haber corrido el chequeo. Así que la regla queda gruesa y sin agujeros: **si
 * el cambio toca lo que la app ejecuta, E2E es obligatoria.**
 *
 * Eso dispara en casi toda tarea de código. Es asumible por el sello: E2E se
 * corre una vez por lote de trabajo, no una vez por commit (ver `e2e-sello.js`).
 *
 * Uso:
 *   node scripts/necesita-e2e.js            compara todo lo no commiteado contra HEAD
 *   node scripts/necesita-e2e.js --desde X  compara contra el ref X
 *   node scripts/necesita-e2e.js --cached   compara solo lo que esta en el index
 *   node scripts/necesita-e2e.js --hash     imprime la huella del runtime en el index
 *
 * `--cached` es el modo del hook de pre-commit: ahí importa lo que se va a
 * commitear, no lo que quedó sucio en el disco.
 *
 * `--hash` es la huella con la que se compara el sello. Cubre las mismas rutas,
 * así que editar un documento no invalida un sello válido: si lo invalidara, el
 * sello estorbaría y se buscaría la forma de saltarlo.
 *
 * Salida: exit 0 si no hace falta, exit 1 si es obligatoria (con los archivos
 * que la disparan). El exit 1 no es un error del script: es su respuesta.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Lo que la app ejecuta en producción. Cualquier cambio acá puede mover un
 * selector, una clase, la visibilidad de un nodo o un texto que un test afirma.
 *
 * Es la misma lista que sella `e2e-sello.js`, a propósito: lo que obliga a
 * correr la suite y lo que la suite certifica tienen que ser lo mismo, o el
 * sello certificaría algo distinto de lo que se está evaluando.
 */
export const RUTAS_RUNTIME = ['index.html', 'modules', 'styles', 'service-worker.js'];

/**
 * Huella del contenido **en el index** de las rutas de runtime.
 *
 * Sale de `git ls-files -s`, que ya imprime el sha del blob de cada archivo tal
 * como está preparado para commitear. No hace falta `git write-tree`: eso además
 * escribiría objetos, y acá solo se está leyendo.
 */
export function huellaRuntime() {
  const salida = execFileSync('git', ['ls-files', '-s', '--', ...RUTAS_RUNTIME], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return createHash('sha256').update(salida).digest('hex');
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** Archivos tocados, según el modo de comparación pedido. */
function archivosTocados({ cached, desde }) {
  const args = cached
    ? ['diff', '--name-only', '--cached', '--', ...RUTAS_RUNTIME]
    : ['diff', '--name-only', desde, '--', ...RUTAS_RUNTIME];
  return git(args).split('\n').map(s => s.trim()).filter(Boolean);
}

function main() {
  if (process.argv.includes('--hash')) {
    console.log(huellaRuntime());
    process.exit(0);
  }

  const i = process.argv.indexOf('--desde');
  const cached = process.argv.includes('--cached');
  const desde = i !== -1 ? process.argv[i + 1] : 'HEAD';

  const tocados = archivosTocados({ cached, desde });

  if (tocados.length === 0) {
    console.log('E2E: no requerida. El cambio no toca lo que la app ejecuta.');
    console.log('  (rutas vigiladas: ' + RUTAS_RUNTIME.join(', ') + ')');
    process.exit(0);
  }

  const MOSTRAR = 10;
  console.log('E2E: OBLIGATORIA. El cambio toca ' + tocados.length + ' archivo(s) de runtime:\n');
  for (const f of tocados.slice(0, MOSTRAR)) console.log('  ' + f);
  if (tocados.length > MOSTRAR) console.log('  ... y ' + (tocados.length - MOSTRAR) + ' más');
  console.log('\nCorre:  pnpm run test:e2e');
  console.log('Motivo: los tests E2E dependen de clases, ids, data-action, visibilidad y textos (BUG-019).');
  process.exit(1);
}

/**
 * Solo corre como CLI. Sin este guard, `e2e-sello.js` importaba `huellaRuntime`
 * y el import ejecutaba `main()`, así que sellar imprimía el veredicto del
 * detector y salía 1: el sello nunca se escribía.
 */
function esEjecutadoDirecto() {
  const invocado = process.argv[1];
  if (!invocado) return false;
  try {
    return realpathSync(invocado) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (esEjecutadoDirecto()) main();
