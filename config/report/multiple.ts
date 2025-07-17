import { generate } from 'multiple-cucumber-html-reporter';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'path';

// —————— ESM __dirname ——————
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// —————— Rutas ——————
const jsonDir = join(__dirname, '../../cucumber-report/json');
const reportDir = join(__dirname, '../../cucumber-report/html');

// —————— Browser mapping ——————
const normalizeBrowser = (name: string): string => {
    if (name === 'chromium') return 'chrome';
    if (name === 'webkit') return 'safari';
    return name;
};

// —————— Platform meta ——————
const platformMeta = { name: os.platform(), version: os.release() };

// —————— JSON files ——————
const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
if (!files.length) throw new Error(`No JSON files in ${jsonDir}`);

// —————— Patch each file ——————
files.forEach(file => {
    const full = join(jsonDir, file);
    const features: any[] = JSON.parse(fs.readFileSync(full, 'utf8'));

    const patched = features.map(f => {
        let meta: any = {};

        if (Array.isArray(f.metadata)) {
            // list → object
            f.metadata.forEach(({ name, value }: any) => {
                const k = name.toLowerCase();
                if (k === 'browser') meta.browser = { name: normalizeBrowser(value) };
                else if (k === 'project') meta.project = value;
                else meta[k] = value;
            });
        } else if (f.metadata && typeof f.metadata === 'object') {
            // already object → clone & normalise browser
            meta = { ...f.metadata };
            if (meta.browser) {
                if (typeof meta.browser === 'string') meta.browser = { name: normalizeBrowser(meta.browser) };
                else if (typeof meta.browser.name === 'string') meta.browser.name = normalizeBrowser(meta.browser.name);
            }
        }

        meta.platform = platformMeta;
        return { ...f, metadata: meta };
    });

    fs.writeFileSync(full, JSON.stringify(patched, null, 2), 'utf8');
});

// —————— Determine global browser from first feature ——————
const first = JSON.parse(fs.readFileSync(join(jsonDir, files[0]), 'utf8'))[0];
const globalBrowser = normalizeBrowser(first?.metadata?.browser?.name ?? 'unknown');

// —————— Generate HTML ——————
generate({
    jsonDir,
    reportPath: reportDir,
    openReportInBrowser: true,
    displayDuration: true,
    displayReportTime: true,
    metadata: { browser: { name: globalBrowser }, platform: platformMeta },
    customData: {
        title: 'Ejecución Playwright‑BDD',
        data: [
            { label: 'Fecha', value: new Date().toLocaleString() },
            { label: 'Sistema', value: `${os.platform()} ${os.release()}` },
        ]
    }
});
