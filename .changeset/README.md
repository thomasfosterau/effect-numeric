# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).

To record a change, run `pnpm changeset`, pick the bump type and describe the change. Commit the generated markdown file with your pull request. When it is merged to `trunk`, the release workflow opens (or updates) a "chore: version packages" pull request; merging that publishes the new version to npm.
