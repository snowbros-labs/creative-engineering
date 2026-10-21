# Versioning and releases

- All `@snowbros/*` packages follow [Semantic Versioning](https://semver.org/). While on `0.x`, a minor
  bump (`0.1 → 0.2`) may contain breaking changes; patch releases never do.
- Packages are versioned independently with [Changesets](https://github.com/changesets/changesets).
  Internal dependencies use `workspace:^`, which pnpm rewrites to real ranges on publish.
- The skill (`skills/snowbros-creative`) is versioned with the repository tag (`vX.Y.Z`); notable
  changes go into `CHANGELOG.md`.
- **Stable** API: everything exported from a package's root entry and documented in its README.
  **Experimental**: anything marked `@experimental` in doc comments; it may change in any release.

## Release checklist

1. `pnpm run ci` green on a clean clone: `git clean -xfd && pnpm install --frozen-lockfile && pnpm run ci`.
2. `pnpm test:e2e` green against production builds.
3. `pnpm changeset version` → review generated changelogs → commit.
4. `pnpm -r --filter "./packages/**" publish --access public` (requires npm access to `@snowbros`).
5. Tag `vX.Y.Z` and create the GitHub release with notes.
