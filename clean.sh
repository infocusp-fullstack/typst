#!/bin/bash

# Remove deps
rm -rf node_modules
rm -f package-lock.json
rm -f pnpm-lock.yaml

# Optionally Install root dependencies again
# pnpm install

echo "Cleanup complete!" 