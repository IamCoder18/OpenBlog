---
name: openblog
description: Publish, manage, and retrieve blog posts and site settings on an OpenBlog platform. Use this skill when you need to interface with the blog system.
---

# OpenBlog Skill

## When to use this skill
Use this skill when the user asks you to:
- Draft or publish a new Markdown blog post to the OpenBlog platform.
- Read existing posts from the OpenBlog platform.
- Update or delete an existing post on OpenBlog.
- Change site-wide settings like the theme.

## Prerequisites
You must have access to the `cli.js` script to interact with the API, or you can make direct HTTP REST requests to the OpenBlog API.

To use the CLI effectively, you should export your API key as an environment variable:
\`\`\`bash
export OPENBLOG_API_KEY="your-api-key"
export OPENBLOG_URL="http://your-openblog-instance.com" # Defaults to http://localhost:3000
\`\`\`

## Using the CLI
The CLI provides full command parity with the web interface. You can run it directly if it's installed.

**Help & Documentation:**
To see all available commands and flags:
\`\`\`bash
./cli.js --help
\`\`\`

**Create a Post:**
\`\`\`bash
./cli.js create "My Title" path/to/body.md --visibility Public --slug my-title --tags "ai, tech"
\`\`\`

**Read a Post:**
\`\`\`bash
./cli.js read <post-id-or-slug>
\`\`\`

**Update a Post:**
\`\`\`bash
./cli.js update <post-id> --title "New Title" --visibility Private
\`\`\`

**Delete a Post:**
\`\`\`bash
./cli.js delete <post-id>
\`\`\`

**Change Site Theme (Requires Admin role):**
\`\`\`bash
./cli.js settings update --theme cyber
\`\`\`

## Error Handling
The OpenBlog API and CLI return Dual-Layer Error Feedback.
If a command fails, the CLI will output a structured JSON response containing:
- `error`: A human-readable description of what went wrong.
- `code`: A machine-readable string indicating the error type (e.g., `ERR_UNAUTHORIZED`, `ERR_POST_NOT_FOUND`).
- `suggestion`: A hint on how to correct your request payload or authentication.

Use the `suggestion` to automatically self-correct your next action.