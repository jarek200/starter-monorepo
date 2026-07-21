## Summary

<!-- What does this PR change and why? -->

## Checklist

- [ ] `pnpm verify` passes locally
- [ ] GraphQL schema changes include `pnpm codegen` (if applicable)
- [ ] CI status checks are green

## Deployment

<!-- Only fill in when requesting a deploy -->

- [ ] Ready for `deploy:int`
- [ ] Ready for `deploy:stage` (requires `deploy:int` label on this PR)
- [ ] Ready for `deploy:prod` (requires `deploy:int` + `deploy:stage`; prod Environment reviewer required)

Add the appropriate `deploy:*` label to trigger deployment. A successful prod deploy auto-merges this PR into `main` (when the base branch is `main`).
