#!/usr/bin/env node
// Validate every skills/*/SKILL.md: frontmatter, size, relative links, script syntax.
// Zero dependencies. Exit 1 on any error.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = resolve(process.argv[2] ?? join(repoRoot, 'skills'));
const errors = [];
const warnings = [];
const notes = [];
const MAX_LINES = 500;
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Minimal YAML frontmatter parser: top-level `key: value` and folded/literal blocks. */
function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) return null;
  const out = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const [, key, raw] = kv;
    if (raw === '>' || raw === '|' || raw === '>-' || raw === '|-') {
      const block = [];
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) block.push(lines[++i].trim());
      out[key] = block.join(raw.startsWith('>') ? ' ' : '\n');
    } else {
      out[key] = raw.replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

if (!existsSync(skillsDir)) {
  console.error(`validate-skill: no skills directory at ${skillsDir}`);
  process.exit(1);
}

const skills = readdirSync(skillsDir).filter((n) => existsSync(join(skillsDir, n, 'SKILL.md')));
if (skills.length === 0) errors.push('No skills/*/SKILL.md found.');

for (const skill of skills) {
  const dir = join(skillsDir, skill);
  const file = join(dir, 'SKILL.md');
  const text = readFileSync(file, 'utf8');
  const fm = parseFrontmatter(text);
  const where = relative(repoRoot, file).replace(/\\/g, '/');
  if (!fm) {
    errors.push(`${where}: missing YAML frontmatter`);
    continue;
  }
  if (!fm.name) errors.push(`${where}: frontmatter.name missing`);
  else {
    if (!NAME_RE.test(fm.name) || fm.name.length > 64)
      errors.push(`${where}: name "${fm.name}" must be lowercase-kebab, ≤64 chars`);
    if (fm.name !== skill) errors.push(`${where}: name "${fm.name}" must match folder "${skill}"`);
  }
  if (!fm.description) errors.push(`${where}: frontmatter.description missing`);
  else if (fm.description.length > 1024)
    errors.push(`${where}: description is ${fm.description.length} chars (max 1024)`);
  else if (!/\buse (when|for)\b/i.test(fm.description))
    warnings.push(`${where}: description should say when to use the skill ("Use when …")`);
  const lineCount = text.split(/\r?\n/).length;
  if (lineCount > MAX_LINES)
    errors.push(`${where}: ${lineCount} lines (max ${MAX_LINES}); move detail into references/`);
  notes.push(
    `${skill}: SKILL.md ${lineCount} lines, description ${fm.description?.length ?? 0} chars`,
  );

  for (const md of walk(dir).filter((p) => p.endsWith('.md'))) {
    const body = readFileSync(md, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const link of body.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = link[1].split('#')[0];
      if (!target || /^[a-z]+:/i.test(target) || target.startsWith('/')) continue;
      if (!existsSync(resolve(dirname(md), target))) {
        errors.push(`${relative(repoRoot, md).replace(/\\/g, '/')}: broken link → ${link[1]}`);
      }
    }
  }

  for (const script of walk(dir).filter((p) => /\.(mjs|cjs|js)$/.test(p))) {
    try {
      execFileSync(process.execPath, ['--check', script], { stdio: 'pipe' });
    } catch (e) {
      errors.push(
        `${relative(repoRoot, script).replace(/\\/g, '/')}: node --check failed\n${String(e.stderr ?? e.message)}`,
      );
    }
  }
}

for (const n of notes) console.log(`ok    ${n}`);
for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`error ${e}`);
console.log(
  `\nvalidate-skill: ${skills.length} skill(s), ${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length ? 1 : 0);
