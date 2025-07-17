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

// —————— Buscar único archivo JSON ——————
const jsonFile = join(jsonDir, 'report.json');
if (!fs.existsSync(jsonFile)) throw new Error(`No se encontró ${jsonFile}`);

// —————— Leer y modificar el contenido ——————
const features: any[] = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

const patched = features.map(f => {
    const meta: any = {};
    if (Array.isArray(f.metadata)) {
        f.metadata.forEach(({ name, value }: any) => {
            const k = name.toLowerCase();
            if (k === 'browser') meta.browser = { name: normalizeBrowser(value) };
            else if (k === 'project') meta.project = value;
            else meta[k] = value;
        });
    }

    meta.device = os.hostname();
    meta.platform = platformMeta;
    return { ...f, metadata: meta };
});

// Guardar archivo actualizado
fs.writeFileSync(jsonFile, JSON.stringify(patched, null, 2), 'utf8');

// —————— Obtener browser global del primer feature ——————
const globalBrowser = patched[0]?.metadata?.browser?.name ?? 'unknown';

// —————— Generar reporte HTML ——————
generate({
    jsonDir,
    reportPath: reportDir,
    openReportInBrowser: true,
    displayDuration: true,
    displayReportTime: true,
    metadata: { browser: { name: globalBrowser }, platform: platformMeta },
    customData: {
        title: 'Ejecución Playwright‑BDD Prueba',
        data: [
            { label: 'Fecha', value: new Date().toLocaleString() },
            { label: 'Sistema', value: `${os.platform()} ${os.release()}` },
            { label: 'Equipo', value: os.hostname() },
            { label: 'Usuario', value: os.userInfo().username }
        ]
    }
});
