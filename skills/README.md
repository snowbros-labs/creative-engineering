# SNOWBROS skills

AI agent skills that ship with SNOWBROS Creative Engineering. Each skill is a folder with a
`SKILL.md` (YAML frontmatter `name` + `description`, then instructions), `references/` loaded on
demand, and zero-dependency `scripts/`.

| Skill                                             | Purpose                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`snowbros-creative`](snowbros-creative/SKILL.md) | Creative-engineering workflow: direction, motion, scroll, 3D, SaaS UX, audits, cross-framework translation |

## Install (Claude Code)

Claude Code discovers skills in `~/.claude/skills/<name>/SKILL.md` (personal, all projects) and
`<project>/.claude/skills/<name>/SKILL.md` (project, shareable via git).

```bash
# personal — copy
cp -r skills/snowbros-creative ~/.claude/skills/

# personal — symlink (stays updated with your clone; Windows: run as admin or enable Developer Mode)
ln -s "$(pwd)/skills/snowbros-creative" ~/.claude/skills/snowbros-creative

# project-scoped
mkdir -p .claude/skills && cp -r /path/to/creative-engineering/skills/snowbros-creative .claude/skills/
```

Start a new session; the skill triggers on requests matching its description (design, animation,
scroll storytelling, 3D, dashboards, UI audits …). Invoke explicitly with `/snowbros-creative`.

Requirements for scripts: Node.js ≥ 18. Nothing else is installed.

```bash
node ~/.claude/skills/snowbros-creative/scripts/detect-stack.mjs . --pretty
node ~/.claude/skills/snowbros-creative/scripts/audit-motion.mjs .
```

## Uninstall

Delete the folder (or symlink) from `~/.claude/skills/` or `.claude/skills/`.

## Other agents

The skill is plain Markdown plus Node scripts, so agents that read `SKILL.md`-style skill folders, or
that accept a Markdown instruction file, can use it in principle. Only Claude Code has been exercised
by this repository; other agents are **untested** — load `SKILL.md` as an instruction file and point
the agent at `references/` and `scripts/`. Reports and PRs with verified setups are welcome.

## Validate

```bash
pnpm validate:skill        # frontmatter, size, links, script syntax
pnpm vitest run tools      # script behaviour against fixtures
```
