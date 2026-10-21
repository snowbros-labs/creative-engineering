# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x (latest) | ✅ |
| older | ❌ — upgrade to the latest release |

While SNOWBROS Creative Engineering is on 0.x, only the latest release receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately via **GitHub Security Advisories**:
[Security → Report a vulnerability](https://github.com/snowbros-labs/creative-engineering/security/advisories/new).
If you cannot use GitHub, email **security@snowbros.me**.

Include: affected package and version, browser/runtime, reproduction steps or proof of concept, and impact.

In scope, for example:

- XSS through library APIs (e.g. `splitText`, `scramble`, element attributes) when given untrusted input.
- The skill scripts (`detect-stack.mjs`, `audit-motion.mjs`, `validate-skill.mjs`) executing, writing or
  exfiltrating anything — they must only **read** files in the target directory.
- Supply-chain issues in published `@snowbros/*` packages.

Out of scope: visual bugs, performance problems, and issues in third-party libraries we interoperate
with (Lenis, GSAP, Motion, three.js) — report those upstream.

## Response expectations

- Acknowledgement within **72 hours**.
- Initial assessment within **7 days**.
- Fix or mitigation plan for confirmed vulnerabilities within **30 days**.

## Notes for users of the skill

The skill instructs AI agents. Treat its scripts like any other code you run: they are zero-dependency,
read-only Node scripts — read them before running them in sensitive repositories.
