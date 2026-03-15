#!/usr/bin/env -S npx tsx

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('openblog')
  .description('CLI tool to interact with the OpenBlog platform.')
  .version('1.0.0');

interface Config {
  token: string | undefined;
  baseUrl: string;
}

// Helper to get configuration
function getConfig(): Config {
  const token = process.env.OPENBLOG_API_KEY;
  const baseUrl = process.env.OPENBLOG_URL || 'http://localhost:3000';
  return { token, baseUrl };
}

// Helper to handle Fetch errors with Dual-Layer format
async function handleError(res: Response | null, error: Error | null): Promise<void> {
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
async function makeRequest(method: string, endpoint: string, payload: any = null): Promise<void> {
  const { token, baseUrl } = getConfig();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options: RequestInit = {
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
    } else {
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    await handleError(null, error);
  }
}

// Helper to safely read a file
function readFileSafely(filepath: string): string {
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
  } catch (e: any) {
    console.error(JSON.stringify({ error: e.message, code: 'ERR_FILE_READ', suggestion: 'Check file permissions.' }));
    process.exit(1);
  }
}

// ----------------------------------------------------------------------
// COMMAND: create
// ----------------------------------------------------------------------
program.command('create')
  .description('Create a new post')
  .argument('<title>', 'The title of the post')
  .argument('<filepath>', 'Path to the Markdown file containing the post body')
  .option('-v, --visibility <visibility>', 'Visibility status (Public or Private)', 'Public')
  .option('-s, --slug <slug>', 'A unique URL slug. Defaults to a sluggified title')
  .option('-d, --description <description>', 'A short SEO description')
  .option('-t, --tags <tags>', 'Comma separated list of tags')
  .action(async (title: string, filepath: string, options: any) => {
    const body = readFileSafely(filepath);
    const defaultSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    await makeRequest('POST', '/posts', {
      title,
      body,
      visibility: options.visibility,
      slug: options.slug || defaultSlug,
      description: options.description,
      tags: options.tags
    });
  });

// ----------------------------------------------------------------------
// COMMAND: read
// ----------------------------------------------------------------------
program.command('read')
  .description('Read a single post or list all public posts if no ID provided')
  .argument('[id_or_slug]', 'The ID or slug of the post to read')
  .action(async (idOrSlug?: string) => {
    const url = idOrSlug ? `/posts/${idOrSlug}` : '/posts';
    await makeRequest('GET', url);
  });

// ----------------------------------------------------------------------
// COMMAND: update
// ----------------------------------------------------------------------
program.command('update')
  .description('Update an existing post')
  .argument('<id>', 'The ID of the post to update')
  .option('-t, --title <title>', 'New title')
  .option('-f, --filepath <filepath>', 'Path to a new Markdown file for the body')
  .option('-v, --visibility <visibility>', 'New visibility status (Public or Private)')
  .option('-s, --slug <slug>', 'New URL slug')
  .option('-d, --description <description>', 'New SEO description')
  .option('--tags <tags>', 'New tags')
  .action(async (id: string, options: any) => {
    const payload: any = {};
    if (options.title) payload.title = options.title;
    if (options.visibility) payload.visibility = options.visibility;
    if (options.slug) payload.slug = options.slug;
    if (options.description) payload.description = options.description;
    if (options.tags) payload.tags = options.tags;

    if (options.filepath) {
      payload.body = readFileSafely(options.filepath);
    }

    if (Object.keys(payload).length === 0) {
      console.error(JSON.stringify({ error: "No fields to update provided", code: "ERR_NO_UPDATES", suggestion: "Provide at least one option flag (e.g., --title)."}));
      process.exit(1);
    }

    await makeRequest('PUT', `/posts/${id}`, payload);
  });

// ----------------------------------------------------------------------
// COMMAND: delete
// ----------------------------------------------------------------------
program.command('delete')
  .description('Delete a post')
  .argument('<id>', 'The ID of the post to delete')
  .action(async (id: string) => {
    await makeRequest('DELETE', `/posts/${id}`);
  });

// ----------------------------------------------------------------------
// COMMAND: keys
// ----------------------------------------------------------------------
program.command('keys')
  .description('Generate an API key for an Agent (Requires Admin Auth)')
  .argument('<agentId>', 'The User ID of the Agent')
  .action(async (agentId: string) => {
    await makeRequest('POST', '/keys', { agentId });
  });

// ----------------------------------------------------------------------
// COMMAND: settings
// ----------------------------------------------------------------------
const settingsCmd = program.command('settings').description('Manage site-wide settings');

settingsCmd.command('read')
  .description('Read current settings')
  .action(async () => {
    await makeRequest('GET', '/settings');
  });

settingsCmd.command('update')
  .description('Update a site-wide setting (Requires Admin Auth)')
  .option('--theme <theme>', 'Theme mode (e.g., cyber, clean)')
  .action(async (options: any) => {
    if (!options.theme) {
       console.error(JSON.stringify({ error: "No setting provided", code: "ERR_NO_UPDATES", suggestion: "Provide a setting flag (e.g., --theme)."}));
       process.exit(1);
    }
    await makeRequest('PUT', '/settings', { theme: options.theme });
  });

program.parse(process.argv);