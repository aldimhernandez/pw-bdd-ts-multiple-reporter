import { generate } from 'multiple-cucumber-html-reporter';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

// —————— Recrear __dirname en ESM ——————
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// —————— Ajusta según tus carpetas ——————
const jsonDir = join(__dirname, '../../cucumber-report/json');
const reportPath = join(__dirname, '../../cucumber-html');

// 1) Leemos todos los JSON
const files = fs
    .readdirSync(jsonDir)
    .filter(f => f.endsWith('.json'));

// 2) Construimos la metadata.platform que necesita el template
const platformMeta = {
    name: os.platform(),  // 'win32' / 'linux' / 'darwin'
    version: os.release(),   // ej. '10.0.22621'
};

// 3) “Monkey‑patch” de cada JSON para inyectar platform
for (const file of files) {
    const fullPath = join(jsonDir, file);
    const features: any[] = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    const patched = features.map(feature => {
        // Si viene como array list → lo convertimos a objeto
        if (Array.isArray(feature.metadata)) {
            const obj: any = {};
            feature.metadata.forEach((m: { name: string; value: any }) => {
                const key = m.name.toLowerCase();
                if (key === 'browser') obj.browser = { name: m.value };
                else if (key === 'project') obj.project = m.value;
                else obj[key] = m.value;
            });
            feature.metadata = obj;
        }
        // Inyectamos platform
        feature.metadata.platform = platformMeta;
        return feature;
    });

    fs.writeFileSync(fullPath, JSON.stringify(patched, null, 2), 'utf8');
}

// 4) Generamos el reporte HTML
generate({
    jsonDir,
    reportPath,
    openReportInBrowser: true,
    displayDuration: true,
    displayReportTime: true,
    metadata: {
        browser: { name: basename(files[0], '.json').replace('report-', '') },
        platform: platformMeta,
    },
    customData: {
        title: 'Ejecución Playwright‑BDD',
        data: [
            { label: 'Fecha', value: new Date().toLocaleString() },
            { label: 'Sistema', value: `${os.platform()} ${os.release()}` },
        ]
    }
});
