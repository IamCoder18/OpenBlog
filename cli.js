#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');

const version = '1.0.0';

// Helper to get configuration
function getConfig() {
  const token = process.env.OPENBLOG_API_KEY;
  const baseUrl = process.env.OPENBLOG_URL || 'http://localhost:3000';
  return { token, baseUrl };
}

// Helper to handle Fetch errors with Dual-Layer format
async function handleError(res, error) {
  if (res) {
    try {
      const data = await res.json();
      console.error(JSON.stringify({
        error: data.error || 'An unknown error occurred.',
        code: data.code || 'ERR_UNKNOWN',
        suggestion: data.suggestion || 'Check your request and try again.'
      }, null, 2));
    } catch {
      console.error(JSON.stringify({
        error: `HTTP Error: ${res.status} ${res.statusText}`,
        code: 'ERR_HTTP',
        suggestion: 'Ensure the server is returning valid JSON.'
      }, null, 2));
    }
  } else if (error) {
    console.error(JSON.stringify({
      error: error.message,
      code: 'ERR_NETWORK_OR_INTERNAL',
      suggestion: 'Ensure the OpenBlog server is running and accessible.'
    }, null, 2));
  }
  process.exit(1);
}

// Helper to build fetch request
async function makeRequest(method, endpoint, payload = null) {
  const { token, baseUrl } = getConfig();

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
  };

  if (payload) {
    options.body = JSON.stringify(payload);
  }

  try {
    const res = await fetch(`${baseUrl}/api${endpoint}`, options);
    if (!res.ok) {
      await handleError(res, null);
    }
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    await handleError(null, error);
  }
}

// Helper to safely read a file
function readFileSafely(filepath) {
  try {
    const absolutePath = path.resolve(process.cwd(), filepath);
    if (!fs.existsSync(absolutePath)) {
      console.error(JSON.stringify({
        error: `File not found at ${absolutePath}`,
        code: 'ERR_FILE_NOT_FOUND',
        suggestion: 'Provide a valid relative or absolute file path.'
      }, null, 2));
      process.exit(1);
    }
    return fs.readFileSync(absolutePath, 'utf8');
  } catch (e) {
    console.error(JSON.stringify({ error: e.message, code: 'ERR_FILE_READ', suggestion: 'Check file permissions.' }));
    process.exit(1);
  }
}

// Help documentation
function printHelp() {
  console.log(`
Usage: openblog [command] [options]

Commands:
  create <title> <filepath>    Create a new post
  read [id_or_slug]            Read a single post or list all public posts
  update <id>                  Update an existing post
  delete <id>                  Delete a post
  keys <agentId>               Generate an API key for an Agent (Admin only)
  settings read                Read current settings
  settings update              Update site-wide settings (Admin only)

Options for 'create':
  --visibility <status>        Public or Private (default: Public)
  --slug <slug>                Custom URL slug
  --description <desc>         SEO description
  --tags <tags>                Comma separated tags

Options for 'update':
  --title <title>              New title
  --filepath <filepath>        New Markdown file path for body
  --visibility <status>        New visibility status
  --slug <slug>                New URL slug
  --description <desc>         New SEO description
  --tags <tags>                New tags

Options for 'settings update':
  --theme <theme>              Theme mode (e.g., cyber, clean)

Global Options:
  -h, --help                   Display this help message
  -v, --version                Display version number
  `);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log(`openblog v${version}`);
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1).filter(a => !a.startsWith('-'));

  // Parse options manually
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      options[key] = args[i + 1] && !args[i + 1].startsWith('-') ? args[++i] : true;
    } else if (args[i].startsWith('-') && args[i] !== '-h' && args[i] !== '-v') {
       // simple short-flag parsing mapping
       const map = { '-t': 'title', '-f': 'filepath', '-s': 'slug', '-d': 'description' };
       const key = map[args[i]];
       if (key) {
         options[key] = args[i + 1] && !args[i + 1].startsWith('-') ? args[++i] : true;
       }
    }
  }

  switch (command) {
    case 'create': {
      if (commandArgs.length < 2) {
        console.error('Error: create requires <title> and <filepath>');
        process.exit(1);
      }
      const title = commandArgs[0];
      const filepath = commandArgs[1];
      const body = readFileSafely(filepath);
      const defaultSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      await makeRequest('POST', '/posts', {
        title,
        body,
        visibility: options.visibility || 'Public',
        slug: options.slug || defaultSlug,
        description: options.description,
        tags: options.tags
      });
      break;
    }
    case 'read': {
      const idOrSlug = commandArgs[0];
      const endpoint = idOrSlug ? `/posts/${idOrSlug}` : '/posts';
      await makeRequest('GET', endpoint);
      break;
    }
    case 'update': {
      if (commandArgs.length < 1) {
        console.error('Error: update requires <id>');
        process.exit(1);
      }
      const id = commandArgs[0];
      const payload = {};
      if (options.title) payload.title = options.title;
      if (options.visibility) payload.visibility = options.visibility;
      if (options.slug) payload.slug = options.slug;
      if (options.description) payload.description = options.description;
      if (options.tags) payload.tags = options.tags;
      if (options.filepath) payload.body = readFileSafely(options.filepath);

      if (Object.keys(payload).length === 0) {
        console.error(JSON.stringify({ error: "No fields to update provided", code: "ERR_NO_UPDATES", suggestion: "Provide at least one option flag (e.g., --title)."}));
        process.exit(1);
      }
      await makeRequest('PUT', `/posts/${id}`, payload);
      break;
    }
    case 'delete': {
      if (commandArgs.length < 1) {
        console.error('Error: delete requires <id>');
        process.exit(1);
      }
      await makeRequest('DELETE', `/posts/${commandArgs[0]}`);
      break;
    }
    case 'keys': {
      if (commandArgs.length < 1) {
        console.error('Error: keys requires <agentId>');
        process.exit(1);
      }
      await makeRequest('POST', '/keys', { agentId: commandArgs[0] });
      break;
    }
    case 'settings': {
      const subCommand = commandArgs[0];
      if (subCommand === 'read') {
        await makeRequest('GET', '/settings');
      } else if (subCommand === 'update') {
        if (!options.theme) {
          console.error(JSON.stringify({ error: "No setting provided", code: "ERR_NO_UPDATES", suggestion: "Provide a setting flag (e.g., --theme)."}));
          process.exit(1);
        }
        await makeRequest('PUT', '/settings', { theme: options.theme });
      } else {
        console.error("Error: invalid settings command. Use 'read' or 'update'.");
        process.exit(1);
      }
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
  }
}

main();