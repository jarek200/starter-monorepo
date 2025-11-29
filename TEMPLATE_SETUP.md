# Converting This Repository to a GitHub Template

Follow these steps to enable this repository as a GitHub template:

## Step 1: Enable Template Repository

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/sst-monorepo-starter`
2. Click **Settings** (top right)
3. Scroll down to **Template repository** section
4. Check the box: **☑ Template repository**
5. Click **Save**

## Step 2: Verify Template Status

After enabling, you should see:
- A **"Use this template"** button on the repository homepage
- The repository marked as a template in the repository header

## Step 3: Test Template Creation

1. Click **"Use this template"** → **"Create a new repository"**
2. Name your test repository (e.g., `test-from-template`)
3. Create the repository
4. Clone it and verify it works:
   ```bash
   git clone https://github.com/YOUR_USERNAME/test-from-template.git
   cd test-from-template
   pnpm install
   ```

## Step 4: Update Repository Description

Update your GitHub repository description to:
```
🚀 Production-ready SST monorepo template with SvelteKit, AWS AppSync, Cognito, and DynamoDB. Click "Use this template" to get started.
```

## Step 5: Add Topics/Tags

Add these topics to your repository (Settings → Topics):
- `sst`
- `sveltekit`
- `aws`
- `appsync`
- `graphql`
- `dynamodb`
- `cognito`
- `monorepo`
- `typescript`
- `template`
- `starter`

## What Makes a Good Template?

✅ **This repository includes:**
- Clear README with setup instructions
- SETUP_NEW_PROJECT.md guide
- Automated setup script (`scripts/setup-new-project.sh`)
- Example environment file (`.env.example`)
- Comprehensive documentation
- Working example code
- Test setup

✅ **Best Practices:**
- No sensitive data (all `.env` files are gitignored)
- Clear documentation
- Easy to customize
- Production-ready structure

## Template Usage

Once enabled, users can:
1. Click **"Use this template"** on your repository
2. Create a new repository from it
3. Clone and customize for their project
4. Follow `SETUP_NEW_PROJECT.md` for setup instructions

## Notes

- Template repositories can still be used normally (cloned, forked, etc.)
- Creating from template gives a clean git history (no template commits)
- Users get all files except `.git` directory
- Template status is visible on the repository page
