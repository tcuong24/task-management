import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps/web');
const allowedExtensions = new Set(['.css', '.ts', '.tsx']);
const checks = [
  { name: 'legacy Indigo utility', pattern: /\bindigo-/g },
  { name: 'unscoped transition', pattern: /\btransition-all\b/g },
  { name: 'gradient background', pattern: /\bbg-gradient-/g },
  {
    name: 'arbitrary color utility',
    pattern: /\b(?:bg|text|border|ring|from|via|to)-\[#(?:[0-9a-f]{3,8})\]/gi,
  },
];

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(absolute)));
    else if (allowedExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

const violations = [];
for (const file of await collectFiles(root)) {
  const content = await fs.readFile(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const check of checks) {
      check.pattern.lastIndex = 0;
      if (check.pattern.test(line)) {
        violations.push(
          `${path.relative(process.cwd(), file)}:${index + 1} ${check.name}: ${line.trim()}`,
        );
      }
    }
  });
}

const globals = await fs.readFile(path.join(root, 'app/globals.css'), 'utf8');
if (!globals.includes('focus-visible:')) {
  violations.push('apps/web/app/globals.css: missing focus-visible styling');
}
if (!globals.includes('prefers-reduced-motion')) {
  violations.push('apps/web/app/globals.css: missing reduced-motion support');
}

if (violations.length > 0) {
  console.error('TaskFlow design-token violations found:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('TaskFlow design-token guardrails passed.');
