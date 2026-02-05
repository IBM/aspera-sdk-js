#!/bin/bash

set -euo pipefail

# Get the version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

# Check if we're on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "Error: You must be on the main branch to release. Currently on: $BRANCH"
  exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: You have uncommitted changes. Please commit or stash them first."
  exit 1
fi

# Pull latest changes
echo "Pulling latest changes from main..."
git pull origin main

# Re-read version after pull (in case version.yml updated it)
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: Tag $TAG already exists."
  exit 1
fi

echo "Creating release for version $VERSION..."

# Create and push the tag
git tag "$TAG"
git push origin "$TAG"

echo ""
echo "Release $TAG triggered successfully!"
echo ""
echo "Follow the publish workflow here:"
echo "https://github.com/IBM/aspera-sdk-js/actions/workflows/publish.yml"
