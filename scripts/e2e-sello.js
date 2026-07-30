#!/usr/bin/env node
/**
 * e2e-sello.js - Anota que la suite E2E pasó contra el runtime que hay ahora.
 *
 * Lo corre `pnpm run test:e2e` **después** de que Playwright sale en verde, así
 * que el sello solo existe si la suite realmente pasó.
 *
 * Por qué hay un sello y no un hook que corra E2E directo: la suite tarda ~3,5
 * minutos. Un pre-commit que bloquee ese rato en cada cambio de markup se acaba
 * saltando con `--no-verify`, y una compuerta que se saltea es peor que ninguna
 * porque da falsa confianza. Con el sello, el hook es instantáneo: solo compara
 * dos huellas y, si no cuadran, manda a correr la suite.
 *
 * El sello NO se versiona (va en .gitignore): es un hecho de esta máquina y de
 * este momento, no del proyecto. Un clon nuevo arranca sin sello, que es lo
 * correcto: nadie corrió E2E ahí todavía.
 */

import { writeFileSync } from 'node:fs';
import { huellaRuntime, RUTAS_RUNTIME } from './necesita-e2e.js';

const ARCHIVO = '.e2e-sello.json';

const sello = {
  huella: huellaRuntime(),
  fecha:  new Date().toISOString(),
  rutas:  RUTAS_RUNTIME,
  nota:   'Escrito por pnpm run test:e2e al salir verde. Lo lee .githooks/pre-commit.',
};

writeFileSync(ARCHIVO, JSON.stringify(sello, null, 2) + '\n', 'utf8');
console.log(`E2E verde sellado en ${ARCHIVO} (huella ${sello.huella.slice(0, 12)}).`);
