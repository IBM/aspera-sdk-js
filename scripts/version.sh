#!/bin/bash

set -euo pipefail

# Get all commit messages since the last version tag
LAST_TAG=$(git describe --tags --abbrev=0 --match "v*" 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
  MESSAGES=$(git log --pretty=%B | tr '[:upper:]' '[:lower:]')
else
  MESSAGES=$(git log "$LAST_TAG"..HEAD --pretty=%B | tr '[:upper:]' '[:lower:]')
fi

if [ -z "$MESSAGES" ]; then
  echo "No new commits since $LAST_TAG. Nothing to bump."
  exit 0
fi

# Determine bump type: highest wins (major > minor > patch)
BUMP="patch"
if echo "$MESSAGES" | grep -q "feat"; then
  BUMP="minor"
fi
if echo "$MESSAGES" | grep -q "breaking change"; then
  BUMP="major"
fi

echo "Bumping $BUMP version"
NEWVERSION=$(npm version "$BUMP" --no-git-tag-version --no-verify)
echo "New version: $NEWVERSION"

git add package.json package-lock.json
git commit -m "chore(release): $NEWVERSION" --no-verify
