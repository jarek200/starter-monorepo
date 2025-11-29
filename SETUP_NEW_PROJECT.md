# Setting Up a New Project from This Template

This guide walks you through using this monorepo as a template for a new project.

## Option 1: GitHub Template (Recommended)

### Step 1: Create Repository from Template

1. Go to your GitHub repository
2. Click **"Use this template"** → **"Create a new repository"**
3. Name your new repository (e.g., `my-new-app`)
4. Choose public/private
5. Click **"Create repository"**

### Step 2: Clone and Setup

```bash
# Clone your new repository
git clone https://github.com/your-username/my-new-app.git
cd my-new-app

# Install dependencies
pnpm install

# Initialize git (if not already done)
git remote set-url origin https://github.com/your-username/my-new-app.git
```

### Step 3: Customize Project

**Option A: Use the automated setup script** (Recommended):

```bash
# Make script executable (if not already)
chmod +x scripts/setup-new-project.sh

# Run the script with your project name
./scripts/setup-new-project.sh "My New Project"
```

This will automatically:
- Update `package.json` name and description
- Update app title in `apps/web/src/app.html`
- Install dependencies

**Option B: Manual setup** - Follow the steps below:

1. **Update package.json**:
   - Change `name` from `sst-monorepo-starter` to your project name
   - Update `description`
   - Update `author` and `license` if needed

2. **Update README.md**:
   - Replace project name
   - Update description
   - Add your project-specific documentation

3. **Update app metadata**:
   - `apps/web/src/app.html` - Update title and meta tags
   - `apps/web/src/routes/+page.svelte` - Update landing page content

4. **Update GraphQL schema**:
   - `packages/graphql/schema.graphql` - Customize for your domain

5. **Clean up template-specific files**:
   - Remove or update this `SETUP_NEW_PROJECT.md` file
   - Update any template placeholders

### Step 4: Configure AWS

```bash
# Ensure AWS CLI is configured
aws configure
# Or set AWS_PROFILE
export AWS_PROFILE=your-profile
```

### Step 5: Deploy and Test

```bash
# Deploy infrastructure (first time)
pnpm dev

# Run tests
pnpm test:e2e
```

## Option 2: Manual Clone (Alternative)

If you prefer to clone manually:

```bash
# Clone the template repository
git clone https://github.com/your-username/sst-monorepo-starter.git my-new-app
cd my-new-app

# Remove existing git history
rm -rf .git

# Initialize new git repository
git init
git add .
git commit -m "Initial commit from template"

# Add your remote
git remote add origin https://github.com/your-username/my-new-app.git
git branch -M main
git push -u origin main

# Follow Step 3-5 from Option 1
```

## Quick Setup Checklist

- [ ] Clone/create repository from template
- [ ] Run `pnpm install`
- [ ] Update `package.json` name and description
- [ ] Update `README.md` with your project info
- [ ] Update app title in `apps/web/src/app.html`
- [ ] Customize landing page in `apps/web/src/routes/+page.svelte`
- [ ] Update GraphQL schema in `packages/graphql/schema.graphql`
- [ ] Configure AWS credentials
- [ ] Run `pnpm dev` to deploy infrastructure
- [ ] Update e2e test credentials in `.env` (if needed)
- [ ] Run `pnpm test:e2e` to verify setup
- [ ] Commit and push initial changes

## What to Customize

### Must Change
- ✅ Project name (`package.json`)
- ✅ App title and meta tags (`apps/web/src/app.html`)
- ✅ Landing page content (`apps/web/src/routes/+page.svelte`)
- ✅ GraphQL schema (`packages/graphql/schema.graphql`)

### Should Change
- 📝 README.md with your project documentation
- 📝 License (if different from ISC)
- 📝 Package descriptions

### Optional
- 🎨 Brand colors (Tailwind config)
- 🎨 Logo and favicon
- 📦 Additional packages/features

## Environment Variables

When using `pnpm dev`, SST automatically injects environment variables. No `.env` file needed!

For local development (`pnpm dev:local`), copy `.env.example` to `.env` and fill in values from SST deployment output.

## Next Steps

1. **Add your domain models** to GraphQL schema
2. **Create resolvers** for your queries/mutations
3. **Build your UI** components and pages
4. **Add tests** for your features
5. **Deploy** to production with `pnpm deploy`

## Troubleshooting

### Issues with pnpm install
```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### AWS Permission Issues
Ensure your AWS credentials have permissions for:
- DynamoDB
- Cognito
- AppSync
- Lambda
- CloudFront
- S3

### Port Already in Use
If port 3000 is taken:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use a different port
PORT=3001 pnpm dev
```

## Support

For issues or questions:
1. Check the main README.md
2. Review SST documentation: https://docs.sst.dev
3. Check AWS service documentation
