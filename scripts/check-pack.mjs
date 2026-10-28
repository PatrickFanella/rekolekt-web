// Check the published file list: built output only, no examples, tests or sources.
import { execFileSync } from 'node:child_process';

const packed = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8' })
);
// npm 12 keys reports by package name; older npm versions return an array.
const reports = Array.isArray(packed) ? packed : Object.values(packed);
if (reports.length !== 1 || reports[0]?.name !== '@subcult/rekolekt-web') {
  throw new Error('Expected exactly one Rekolekt package report');
}
const [report] = reports;
const files = report.files.map((file) => file.path);
const required = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/atproto.js',
  'dist/metadata/index.js',
  'dist/metadata/cli.js',
  'dist/base.css',
  'openapi/openapi.json',
  'README.md',
];
const missing = required.filter((file) => !files.includes(file));
const forbidden = files.filter((file) => /^(examples|src|tests|integration|scripts)\//.test(file));
if (missing.length || forbidden.length) {
  console.error({ missing, forbidden });
  process.exit(1);
}
console.log(
  `${report.name}@${report.version}: ${files.length} files, ${report.size} bytes packed.`
);
