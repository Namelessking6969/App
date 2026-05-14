#!/bin/bash
set -e

BUMP_TYPE="${1:-patch}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f package.json ]; then
  echo "Error: package.json not found in $ROOT_DIR"
  exit 1
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")

NEW_VERSION=$(node -e "
const [maj, min, pat] = '$CURRENT_VERSION'.split('.').map(Number);
switch ('$BUMP_TYPE') {
  case 'major': console.log([maj+1, 0, 0].join('.')); break;
  case 'minor': console.log([maj, min+1, 0].join('.')); break;
  case 'patch': console.log([maj, min, pat+1].join('.')); break;
  default: console.error('Usage: \$0 [major|minor|patch]'); process.exit(1);
}
")

echo "Bumping $CURRENT_VERSION -> $NEW_VERSION"
echo ""
echo "Enter 'What's New' bullet points (one per line, blank line when done):"
BULLETS=()
while true; do
  printf "  • "
  read -r BULLET
  [ -z "$BULLET" ] && break
  BULLETS+=("$BULLET")
done

if [ ${#BULLETS[@]} -eq 0 ]; then
  COMMIT_MSG="v$NEW_VERSION"
  RELEASE_NOTES=""
else
  COMMIT_MSG="v$NEW_VERSION — ${BULLETS[0]}"
  RELEASE_NOTES=""
  for b in "${BULLETS[@]}"; do
    RELEASE_NOTES+="- $b"$'\n'
  done
fi

# Write release notes file for the workflow to pick up
cat > .release-notes <<EOF
## What's New

${RELEASE_NOTES}
EOF

node -e "
const fs = require('fs');

let plist = fs.readFileSync('Resources/Info.plist', 'utf8');
const bundleMatch = plist.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
const currentBundleVer = bundleMatch ? parseInt(bundleMatch[1]) : 0;
const newBundleVer = currentBundleVer + 1;
const newVersion = '$NEW_VERSION';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('  updated package.json');

plist = plist.replace(
  /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
  '\$1' + newVersion + '\$2'
);
plist = plist.replace(
  /(<key>CFBundleVersion<\/key>\s*<string>)\d+(<\/string>)/,
  '\$1' + newBundleVer + '\$2'
);
fs.writeFileSync('Resources/Info.plist', plist);
console.log('  updated Resources/Info.plist');

let yml = fs.readFileSync('project.yml', 'utf8');
yml = yml.replace(/(CFBundleShortVersionString: )\".*\"/, '\$1\"' + newVersion + '\"');
yml = yml.replace(/(CFBundleVersion: )\".*\"/, '\$1\"' + newBundleVer + '\"');
fs.writeFileSync('project.yml', yml);
console.log('  updated project.yml');

let pkgSh = fs.readFileSync('scripts/create-pkg.sh', 'utf8');
pkgSh = pkgSh.replace(/PRODUCT_VERSION=\"[^\"]*\"/, 'PRODUCT_VERSION=\"' + newVersion + '\"');
fs.writeFileSync('scripts/create-pkg.sh', pkgSh);
console.log('  updated scripts/create-pkg.sh');
"

git add package.json Resources/Info.plist project.yml scripts/create-pkg.sh .release-notes
git commit -m "$COMMIT_MSG"
git tag "v$NEW_VERSION"

echo ""
echo "Pushing to origin..."
git push origin main
git push origin "v$NEW_VERSION"
echo ""
echo "Released v$NEW_VERSION"
