#!/bin/bash

set -euo pipefail

MESSAGE=$(git log -1 --pretty=%B | tr '[:upper:]' '[:lower:]')

NEWVERSION=""
if [[ "$MESSAGE" == *"chore(release)"* ]]; then
  echo "Not bumping chore release"
elif [[ "$MESSAGE" == *"breaking change"* ]]; then
  echo "Bumping major version"
  NEWVERSION=`npm version major --no-git-tag-version --no-verify`
elif [[ "$MESSAGE" == *"feat"* ]]; then
  echo "Bumping minor version"
  NEWVERSION=`npm version minor --no-git-tag-version --no-verify`
else
  echo "Bumping patch version"
  NEWVERSION=`npm version patch --no-git-tag-version --no-verify`
fi

if [ "$NEWVERSION" != "" ]; then
    git add package.json package-lock.json
    git commit -m "chore(release): $NEWVERSION" --no-verify
fi
