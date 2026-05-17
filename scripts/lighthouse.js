/**
 * lighthouse.js — Corre una auditoría Lighthouse sobre la app en local.
 *
 * Uso:
 *   node scripts/lighthouse.js [port]
 *
 * Requiere que el servidor ya esté corriendo:
 *   python -m http.server 8080   (en otra terminal)
 *
 * Genera:
 *   coverage/lighthouse-report.html  — reporte completo interactivo
 *   coverage/lighthouse-scores.json  — scores en JSON (para CI)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';

const __dir = dirname(fileURLToPath(import.meta.url));
const PORT  = process.argv[2] ?? 8080;
const URL   = `http://localhost:${PORT}/`;
const OUT   = join(__dir, '..', 'coverage');

const CATEGORIAS_OBJETIVO = {
  performance:       90,
  accessibility:     95,
  'best-practices':  90,
  seo:               80,
};

async function run() {
  console.log(`\nLighthouse -> ${URL}\n`);

  // Usar el Chromium de Playwright con CDP expuesto en puerto 9222
  const browser = await chromium.launch({
    headless: true,
    args: ['--remote-debugging-port=9222'],
  });

  try {
    // Pequeña pausa para que el puerto CDP esté listo
    await new Promise((r) => setTimeout(r, 1500));

    const runnerResult = await lighthouse(URL, {
      port: 9222,
      output: ['html', 'json'],
      logLevel: 'error',
      formFactor: 'desktop',
      throttling: { rttMs: 0, throughputKbps: 0, cpuSlowdownMultiplier: 1 },
      screenEmulation: { disabled: true },
    });

    const lhr    = runnerResult.lhr;
    const [htmlReport, jsonReport] = runnerResult.report;

    // Guardar reportes
    mkdirSync(OUT, { recursive: true });
    const htmlPath = join(OUT, 'lighthouse-report.html');
    const jsonPath = join(OUT, 'lighthouse-scores.json');
    writeFileSync(htmlPath, htmlReport);

    // Extraer scores
    const scores = {};
    let pasaron = 0;
    let fallaron = 0;

    console.log('  Scores:\n');
    for (const [cat, objetivo] of Object.entries(CATEGORIAS_OBJETIVO)) {
      const score = Math.round((lhr.categories[cat]?.score ?? 0) * 100);
      const ok = score >= objetivo;
      scores[cat] = { score, objetivo, ok };
      const estado = ok ? 'OK  ' : 'BAJO';
      console.log(
        `    [${estado}] ${cat.padEnd(22)} ${String(score).padStart(3)}  (objetivo >= ${objetivo})`
      );
      if (ok) pasaron++; else fallaron++;
    }

    // Mostrar audits de accesibilidad que fallaron
    const a11yFails = Object.values(lhr.audits)
      .filter((a) => a.score !== null && a.score < 1 && a.details?.type !== undefined)
      .filter((a) => lhr.categories.accessibility.auditRefs.some((r) => r.id === a.id));

    if (a11yFails.length > 0) {
      console.log('\n  Audits de accesibilidad con score < 1:\n');
      a11yFails.forEach((a) => {
        console.log(`    [${Math.round((a.score ?? 0) * 100)}] ${a.id}`);
        console.log(`         ${a.description}`);
        if (a.details?.items?.length) {
          a.details.items.slice(0, 3).forEach((item) => {
            const snippet = item.node?.snippet ?? item.selector ?? '';
            if (snippet) console.log(`         → ${snippet.slice(0, 100)}`);
          });
        }
      });
    }

    writeFileSync(
      jsonPath,
      JSON.stringify(
        { url: URL, timestamp: new Date().toISOString(), scores, a11yFails: a11yFails.map(a => ({ id: a.id, score: a.score, description: a.description })) },
        null,
        2
      )
    );

    console.log(`\n  Reporte HTML -> ${htmlPath}`);
    console.log(`  Scores JSON  -> ${jsonPath}`);
    console.log(
      `\n  Resultado: ${pasaron}/${pasaron + fallaron} objetivos cumplidos.\n`
    );

    // No fallar el proceso — Lighthouse es orientativo, no bloquea CI.
    // Si queres bloquear en CI: process.exitCode = fallaron > 0 ? 1 : 0;

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Error en Lighthouse:', err.message ?? err);
  process.exit(1);
});
