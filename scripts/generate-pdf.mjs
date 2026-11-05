// reports/summary.json -> reports/summary.pdf
import PDFDocument from 'pdfkit';
import { createWriteStream, readFileSync } from 'node:fs';

const s = JSON.parse(readFileSync('reports/summary.json', 'utf8'));
const doc = new PDFDocument({ margin: 50 });
doc.pipe(createWriteStream('reports/summary.pdf'));

doc.fontSize(20).text('Automation Execution Summary');
doc.moveDown();
doc.fontSize(12);
for (const [k, v] of [
  ['Ticket', s.jiraKey], ['Tags', s.tags], ['Environment', s.environment], ['Tenant', s.tenant],
  ['Status', s.status], ['Total', s.total], ['Passed', s.passed], ['Failed', s.failed], ['Skipped', s.skipped],
  ['Jenkins Build', `#${s.buildNumber}`], ['Build URL', s.buildUrl], ['Generated', s.generatedAt],
]) doc.text(`${k}: ${v}`);

doc.moveDown().fontSize(14).text('Scenarios');
doc.fontSize(11);
for (const sc of s.scenarios) doc.text(`[${sc.status.toUpperCase()}] ${sc.name}  (${sc.tags.join(' ')})`);
doc.end();
