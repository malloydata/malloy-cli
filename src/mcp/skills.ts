/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import fs from 'node:fs';
import path from 'node:path';

export interface Skill {
  name: string;
  description: string;
  body: string;
}

/**
 * Skills are markdown files shipped with the CLI. Each skill is exposed as an
 * MCP prompt (so a client can pull it into the LLM context on demand) and as
 * a resource (so a client can list/preview them).
 *
 * The markdown may have YAML-ish front matter with `description:`. The rest
 * of the document is the body.
 */
function parseSkill(filePath: string): Skill {
  const raw = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(filePath, '.md');
  let description = name;
  let body = raw;

  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (m) {
    const front = m[1];
    body = m[2];
    const d = /^description:\s*(.+)$/m.exec(front);
    if (d) description = d[1].trim();
  }
  return {name, description, body};
}

export function loadSkills(dir: string): Skill[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => parseSkill(path.join(dir, f)));
}

export function skillsDir(): string {
  // When packaged as dist/cli.js the build script copies skills/ next to it.
  // When running from source (ts-node) skills/ lives at the repo root.
  const candidates = [
    path.join(__dirname, '..', 'skills'),
    path.join(__dirname, '..', '..', 'skills'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return candidates[0];
}
