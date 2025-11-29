# SST Monorepo Starter

A modern, production-ready starter template for building full-stack applications with:

- **Frontend**: SvelteKit 2 + TypeScript + Tailwind CSS
- **Backend**: AWS AppSync (GraphQL) with JavaScript resolvers
- **Database**: DynamoDB (single-table design)
- **Authentication**: AWS Cognito User Pools
- **Infrastructure**: SST v3 (Ion) with Pulumi
- **Monorepo**: Nx + pnpm workspaces

## Features

- ✅ User authentication (signup, login, email verification)
- ✅ Landing page with modern design
- ✅ Protected routes with authentication guards
- ✅ Dashboard with profile management
- ✅ GraphQL API with AppSync JavaScript resolvers
- ✅ Responsive UI with Tailwind CSS
- ✅ Type-safe GraphQL queries and mutations

## Prerequisites

- **Node.js 22** (use nvm: `nvm install 22`)
- **pnpm**: `npm install -g pnpm`
- **AWS CLI** configured with credentials
- **AWS Account** with appropriate permissions

## Quick Start

### 1. Install Dependencies

```bash
cd sst-monorepo
pnpm install
```

### 2. Configure AWS

Ensure your AWS CLI is configured:

```bash
aws configure
# Or use AWS_PROFILE environment variable
export AWS_PROFILE=your-profile
```

### 3. Start Development (Recommended: SST Dev Mode)

**Use `pnpm dev`** - This automatically handles environment variables and provides hot reload:

```bash
pnpm dev
```

This will:
- Deploy your infrastructure to AWS (first time only)
- Start the development server with hot reload
- Automatically inject environment variables (no `.env` file needed!)
- Watch for code changes and redeploy automatically

**That's it!** Your app will be available at the URL shown in the terminal.

**Alternative: Local-Only Development** (requires manual `.env` setup):
```bash
# First, deploy once to get environment variables
pnpm sst deploy
# Copy values from deployment output to .env file
pnpm dev:local
```

**Note**: `.env` file is only needed for `dev:local`. Use `pnpm dev` to avoid manual setup.

### 4. Deploy Infrastructure (Production)

Deploy the infrastructure to AWS:

```bash
pnpm sst deploy
```

This will:
- Create DynamoDB table with 2 GSIs
- Set up Cognito User Pool
- Create AppSync GraphQL API
- Deploy SvelteKit frontend to CloudFront

## Project Structure

```
sst-monorepo/
├── apps/
│   └── web/                    # SvelteKit frontend
│       ├── src/
│       │   ├── lib/
│       │   │   ├── components/ui/  # UI components
│       │   │   ├── services/        # GraphQL service
│       │   │   ├── stores/         # Svelte stores (auth)
│       │   │   └── utils/         # Utility functions
│       │   └── routes/
│       │       ├── +page.svelte    # Landing page
│       │       ├── login/          # Login/signup page
│       │       └── (protected)/    # Protected routes
│       │           └── dashboard/  # Dashboard page
│       └── package.json
├── packages/
│   ├── core/                   # Shared types and utilities
│   ├── functions/              # Lambda functions
│   │   └── auth/               # User profile creation
│   └── graphql/                # GraphQL schema
├── infra/                      # Infrastructure modules
│   ├── storage.ts              # DynamoDB table
│   ├── functions.ts            # Lambda function definitions
│   ├── auth.ts                 # Cognito User Pool setup
│   └── api/
│       ├── api-setup.ts        # AppSync API & data sources
│       └── resolvers/           # GraphQL resolvers
│           ├── index.ts
│           └── users.ts         # User resolvers
├── sst.config.ts              # Main SST config
└── package.json               # Root package.json
```

## GraphQL Schema

The starter includes a minimal schema with:

- **User**: User profile information

### Queries

- `getMyProfile: User` - Get current user's profile

### Mutations

- `updateUserProfile(input: UpdateUserInput!): User` - Update user profile

## Environment Variables

### Recommended: SST Dev Mode (No .env file needed!)

When using `pnpm dev`, SST automatically injects environment variables. No manual setup required!

### Local Development Only

If using `pnpm dev:local`, copy `.env.example` to `.env` and fill in values from SST deployment output:

```bash
cp .env.example .env
```

## Database Schema (DynamoDB)

Single table design with 2 Global Secondary Indexes (GSIs):

**Primary Key**: `PK` (partition key) + `SK` (sort key)

**GSI1**: User-centric queries  
**GSI2**: Global queries

Entity patterns:
- `USER#${userId}` / `PROFILE` - User profiles

## Architecture Highlights

- **Serverless**: No servers to manage
- **Direct Resolvers**: Simple DynamoDB resolvers for CRUD operations
- **Single Table**: Optimized DynamoDB access patterns with GSIs
- **Scalable**: Auto-scales with traffic
- **Cost-effective**: Pay only for what you use

## Adding New Features

### 1. Add a new GraphQL type

1. Update `packages/graphql/schema.graphql`
2. Add resolvers in `infra/api/resolvers/`
3. Add types in `packages/core/src/types/`
4. Add service functions in `apps/web/src/lib/services/graphql.ts`

### 2. Add a new Lambda function

1. Create function in `packages/functions/src/`
2. Add function definition in `infra/functions.ts`
3. Link it in `sst.config.ts`

## Cost Estimate

For a new app with **<1000 users**:

| Service | Free Tier | Est. Cost |
|---------|-----------|-----------|
| DynamoDB | 25 GB storage, 25 read/write units | $0-5/month |
| AppSync | 250K query/mutation operations | $0-10/month |
| Cognito | 50K MAU | $0 |
| Lambda | 1M requests, 400K GB-seconds | $0 |
| CloudFront | 1 TB data transfer | $0-5/month |
| **Total** | | **$0-20/month** |

## License

ISC
