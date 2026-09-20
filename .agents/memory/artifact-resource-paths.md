---
name: Artifact resource paths
description: Runtime path handling for non-code resources used by bundled API artifacts.
---

When an API artifact reads a bundled file at runtime, support both the artifact workflow's working directory and the repository-root working directory, and copy the resource into the build output when the server is bundled.

**Why:** Managed artifact workflows can start with the artifact directory as the current working directory, while ad hoc commands and some deployment contexts start at the repository root. Assuming only one location makes a working build fail at runtime.

**How to apply:** Add cwd-relative candidates for source and build output, keep a module-relative fallback, and include a build step that copies the resource beside the bundled server.