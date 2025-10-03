## Node.js Version

**Note**: This project is currently locked to Node.js 18.x due to the `pkg` packaging tool not supporting Node.js 20+. 

- `.node-version` is set to `18.20.4`
- DuckDB binaries use `node-v108` (Node.js 18 ABI)  
- `pkg` target is set to `node18`

Once we replace `pkg` with a more modern packaging solution (like `nexe`, Bun's `--compile`, or switch to npm-only distribution), we can upgrade to newer Node.js versions.

## Development

Build with `npm run build`, build automatically when coding with `npm run watch`.

Test CLI locally with `npm run cli -- {your commands here}` (note the double-dash, required!) or debug in VSCode, which will prompt for the CLI arguments.

## Publishing to npm

We use a custom publishing script (`npm run npm-publish`) that handles both `@next` (pre-release) and `@latest` (stable) releases.

### Publishing Script Usage

The script supports two distribution tags:

**`next`** - Pre-release versions for testing:
```bash
# Dry run (test without publishing)
npm run npm-publish -- next --dry-run

# Publish to @next tag
npm run npm-publish -- next
```

**`latest`** - Stable production releases:
```bash
# Dry run
npm run npm-publish -- latest --bump-type=patch --dry-run

# Publish to @latest tag
npm run npm-publish -- latest --bump-type=minor
```

**Note**: The `--` is required to pass arguments through npm scripts.

### Version Schemes

**Next releases** use automatic versioning:
- Format: `{base}-next.{date}.{sha}`
- Example: `0.0.47-next.2025.10.03.e97c69e`
- Does NOT modify git repository
- Only publishes to npm with `@next` tag

**Latest releases** use semantic versioning:
- **patch**: Bug fixes (0.0.47 → 0.0.48)
- **minor**: New features (0.0.47 → 0.1.0)
- **major**: Breaking changes (0.0.47 → 1.0.0)
- Commits version bump to git
- Creates git tag (e.g., `v0.0.48`)
- Pushes changes and tags to remote
- Publishes to npm with `@latest` tag

### GitHub Actions (Automated)

**Automatic `@next` releases** - Triggered on every push to `main`:
- Runs tests and linting
- Publishes to `@malloydata/cli@next` automatically
- No git operations

**Manual `@latest` releases** - Manually triggered workflow (patch bumps only):
1. Go to **Actions** → **Publish to npm**
2. Click **Run workflow**
3. Choose:
   - **dry_run**: Enable to test without publishing
4. The workflow will:
   - Run tests and linting
   - Bump patch version and publish
   - Commit changes and create git tag
   - Push to repository

**Note**: The GitHub Action only supports patch bumps. For minor or major version releases, you must publish locally (see below).

### Publishing Minor/Major Releases Locally

For minor or major version bumps, publish from your local machine:

```bash
# Make sure you're on main and up to date
git checkout main
git pull

# Set your npm token
export NODE_AUTH_TOKEN="your-npm-token"

# Dry run first (recommended)
npm run npm-publish -- latest --bump-type=minor --dry-run

# Then publish for real
npm run npm-publish -- latest --bump-type=minor
```

The script will handle version bumping, publishing, committing, tagging, and pushing automatically.

### Local Publishing Requirements

To publish locally, you need an npm authentication token:

```bash
# Set your npm token (get from npmjs.com)
export NODE_AUTH_TOKEN="your-npm-token"

# Then run the publish command
npm run npm-publish -- latest --bump-type=patch
```

### Package Structure

The published package includes:
- `dist/` - Compiled JavaScript and bundled assets
- `scripts/malloy-packages.ts` - Package management utilities
- Post-install script for platform-specific binaries (DuckDB)
- Third-party license notices

The `npm run package-npm` script (called by `npm-publish`) prepares all necessary files in the `dist/` directory before publishing.
