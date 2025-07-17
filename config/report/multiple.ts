import { generate } from 'multiple-cucumber-html-reporter';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'path';

// —————— ESM __dirname ——————
// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// —————— Paths ——————
const jsonDir = join(__dirname, '../../cucumber-report/json');
const reportDir = join(__dirname, '../../cucumber-report/html');

// —————— Browser mapping ——————
const normalizeBrowser = (name: string): string => {
    if (name === 'chromium') return 'chrome';
    if (name === 'webkit') return 'safari';
    return name;
};

// —————— Platform metadata ——————
const platformMeta = { name: os.platform(), version: os.release() };

// —————— Find single JSON file ——————
const jsonFile = join(jsonDir, 'report.json');
if (!fs.existsSync(jsonFile)) throw new Error(`Could not find ${jsonFile}`);

// —————— Read and modify the content ——————
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

// Save updated file
fs.writeFileSync(jsonFile, JSON.stringify(patched, null, 2), 'utf8');

// —————— Get global browser from the first feature ——————
const globalBrowser = patched[0]?.metadata?.browser?.name ?? 'unknown';

// —————— Generate HTML report ——————
generate({
    jsonDir,
    reportPath: reportDir,
    openReportInBrowser: true,
    displayDuration: true,
    displayReportTime: true,
    metadata: { browser: { name: globalBrowser }, platform: platformMeta },
    customData: {
        title: 'Playwright BDD and Multiple Cucumber HTML Report Integration Test',
        data: [
            { label: 'Date', value: new Date().toLocaleString() },
            { label: 'System', value: `${os.platform()} ${os.release()}` },
            { label: 'Machine', value: os.hostname() },
            { label: 'User', value: os.userInfo().username }
        ]
    }
});
