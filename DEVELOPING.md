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

### Setup Required

### Publishing with GitHub Action (Recommended)

1. Go to your repository on GitHub
2. Click on the "Actions" tab
3. Select "Publish to npm" workflow
4. Click "Run workflow" button
5. Choose your options:
   - **Version bump type**: `patch`, `minor`, or `major`
   - **Dry run**: Check this to test without actually publishing

The workflow will:
- Run tests and linting
- Update version in `package.json`
- Build and package using `npm run package-npm`
- Publish to npm from the `dist` directory
- Create git tag and GitHub release (if not dry run)

### Manual Publishing

For local development and testing:

```bash
# Test what would be published (dry run)
npm run package-npm
cd dist
npm publish --dry-run

# Actually publish (requires npm authentication)
npm version patch              # Updates version, commits, tags
npm run package-npm           # Builds the dist directory  
cd dist
npm publish                   # Publishes from dist
git push origin main --tags   # Push the commit and tag
```

#### Local Authentication Options

**Option 1: Interactive login**
```bash
npm login
```

**Option 2: Use npm token**
```bash
export NODE_AUTH_TOKEN="your-npm-token"
npm publish
```

#### Version Bumping

- **patch**: Bug fixes (0.0.42 → 0.0.43)
- **minor**: New features (0.0.42 → 0.1.0)  
- **major**: Breaking changes (0.0.42 → 1.0.0)

#### Package Structure

The published package includes:
- `dist/` - Compiled JavaScript and assets
- `scripts/malloy-packages.ts` - Package management script
- Post-install script for platform-specific binaries (like duckdb.node)

The package publishes from `dist/`, not the root directory. The `npm run package-npm` script prepares everything needed for npm in the `dist/` folder.
