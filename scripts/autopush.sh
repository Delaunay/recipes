#!/bin/bash

# Usage: ./auto_push.sh /path/to/repo
REPO_PATH="$1"

if [ -z "$REPO_PATH" ]; then
    echo "Usage: $0 /path/to/repo"
    exit 1
fi

cd "$REPO_PATH" || { echo "Repository path not found: $REPO_PATH"; exit 1; }
git add --all

# Only commit if there are staged changes
if ! git diff --cached --quiet; then
    git commit -m "Auto commit on $(date '+%Y-%m-%d %H:%M:%S')"
    git push origin master
else
    echo "No changes to commit."
fi
