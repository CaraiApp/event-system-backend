#!/bin/bash
set -e

echo "Starting custom build script"

# Remove package-lock.json to force fresh installation
echo "Removing package-lock.json"
rm -f package-lock.json

# Install dependencies
echo "Installing dependencies"
npm install --no-shrinkwrap --legacy-peer-deps

echo "Build completed successfully"