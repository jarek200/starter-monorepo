#!/bin/bash

# Setup script for new projects from template
# Usage: ./scripts/setup-new-project.sh "My New Project"

set -e

PROJECT_NAME="${1:-my-new-project}"
PROJECT_SLUG=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

echo "🚀 Setting up new project: $PROJECT_NAME"
echo "📦 Project slug: $PROJECT_SLUG"
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Update package.json
echo "📝 Updating package.json..."
if [ -f "package.json" ]; then
    # Use sed to update package name (works on macOS and Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"name\": \"sst-monorepo-starter\"/\"name\": \"$PROJECT_SLUG\"/" package.json
        sed -i '' "s/\"description\": \".*\"/\"description\": \"$PROJECT_NAME\"/" package.json
    else
        sed -i "s/\"name\": \"sst-monorepo-starter\"/\"name\": \"$PROJECT_SLUG\"/" package.json
        sed -i "s/\"description\": \".*\"/\"description\": \"$PROJECT_NAME\"/" package.json
    fi
    echo "✅ Updated package.json"
else
    echo "⚠️  package.json not found, skipping..."
fi

# Update app.html title
echo "📝 Updating app title..."
if [ -f "apps/web/src/app.html" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/<title>.*<\/title>/<title>$PROJECT_NAME<\/title>/" apps/web/src/app.html
    else
        sed -i "s/<title>.*<\/title>/<title>$PROJECT_NAME<\/title>/" apps/web/src/app.html
    fi
    echo "✅ Updated app.html"
else
    echo "⚠️  apps/web/src/app.html not found, skipping..."
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update README.md with your project information"
echo "2. Customize apps/web/src/routes/+page.svelte (landing page)"
echo "3. Update packages/graphql/schema.graphql for your domain"
echo "4. Configure AWS credentials: aws configure"
echo "5. Deploy infrastructure: pnpm dev"
echo "6. Run tests: pnpm test:e2e"
echo ""
echo "Happy coding! 🎉"

