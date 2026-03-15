#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const program = new Command();

program
  .name('openblog')
  .description('CLI tool to interact with the OpenBlog platform.')
  .version('1.0.0');

// Helper to get configuration
function getConfig() {
  const token = process.env.OPENBLOG_API_KEY;
  const baseUrl = process.env.OPENBLOG_URL || 'http://localhost:3000';
  return { token, baseUrl };
}

// Helper to handle Axios errors with Dual-Layer format
function handleError(error) {
  if (error.response && error.response.data) {
    const data = error.response.data;
    console.error(JSON.stringify({
      error: data.error || 'An unknown error occurred.',
      code: data.code || 'ERR_UNKNOWN',
      suggestion: data.suggestion || 'Check your request and try again.'
    }, null, 2));
  } else {
    console.error(JSON.stringify({
      error: error.message,
      code: 'ERR_NETWORK_OR_INTERNAL',
      suggestion: 'Ensure the OpenBlog server is running and accessible.'
    }, null, 2));
  }
  process.exit(1);
}

// Helper to build axios client
function getClient(token, baseUrl) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return axios.create({
    baseURL: `${baseUrl}/api`,
    headers
  });
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
  .action(async (title, filepath, options) => {
    const { token, baseUrl } = getConfig();
    const client = getClient(token, baseUrl);

    const body = readFileSafely(filepath);

    const defaultSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const payload = {
      title,
      body,
      visibility: options.visibility,
      slug: options.slug || defaultSlug,
      description: options.description,
      tags: options.tags
    };

    try {
      const res = await client.post('/posts', payload);
      console.log(JSON.stringify(res.data, null, 2));
    } catch (error) {
      handleError(error);
    }
  });

// ----------------------------------------------------------------------
// COMMAND: read
// ----------------------------------------------------------------------
program.command('read')
  .description('Read a single post or list all public posts if no ID provided')
  .argument('[id_or_slug]', 'The ID or slug of the post to read')
  .action(async (idOrSlug) => {
    const { token, baseUrl } = getConfig();
    const client = getClient(token, baseUrl);

    try {
      const url = idOrSlug ? `/posts/${idOrSlug}` : '/posts';
      const res = await client.get(url);
      console.log(JSON.stringify(res.data, null, 2));
    } catch (error) {
      handleError(error);
    }
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
  .action(async (id, options) => {
    const { token, baseUrl } = getConfig();
    const client = getClient(token, baseUrl);

    const payload = {};
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

    try {
      const res = await client.put(`/posts/${id}`, payload);
      console.log(JSON.stringify(res.data, null, 2));
    } catch (error) {
      handleError(error);
    }
  });

// ----------------------------------------------------------------------
// COMMAND: delete
// ----------------------------------------------------------------------
program.command('delete')
  .description('Delete a post')
  .argument('<id>', 'The ID of the post to delete')
  .action(async (id) => {
    const { token, baseUrl } = getConfig();
    const client = getClient(token, baseUrl);

    try {
      const res = await client.delete(`/posts/${id}`);
      console.log(JSON.stringify(res.data, null, 2));
    } catch (error) {
      handleError(error);
    }
  });

// ----------------------------------------------------------------------
// COMMAND: keys
// ----------------------------------------------------------------------
program.command('keys')
  .description('Generate an API key for an Agent (Requires Admin Auth)')
  .argument('<agentId>', 'The User ID of the Agent')
  .action(async (agentId) => {
    const { token, baseUrl } = getConfig();
    const client = getClient(token, baseUrl);

    try {
      const res = await client.post(`/keys`, { agentId });
      console.log(JSON.stringify(res.data, null, 2));
    } catch (error) {
      handleError(error);
    }
  });

// ----------------------------------------------------------------------
// COMMAND: settings
// ----------------------------------------------------------------------
const settingsCmd = program.command('settings').description('Manage site-wide settings');

settingsCmd.command('read')
  .description('Read current settings')
  .action(async () => {
    const { token, baseUrl } = getConfig();
    const client = getClient(token, baseUrl);

    try {
      const res = await client.get(`/settings`);
      console.log(JSON.stringify(res.data, null, 2));
    } catch (error) {
      handleError(error);
    }
  });

settingsCmd.command('update')
  .description('Update a site-wide setting (Requires Admin Auth)')
  .option('--theme <theme>', 'Theme mode (e.g., cyber, clean)')
  .action(async (options) => {
    const { token, baseUrl } = getConfig();
    const client = getClient(token, baseUrl);

    if (!options.theme) {
       console.error(JSON.stringify({ error: "No setting provided", code: "ERR_NO_UPDATES", suggestion: "Provide a setting flag (e.g., --theme)."}));
       process.exit(1);
    }

    try {
      const res = await client.put(`/settings`, { theme: options.theme });
      console.log(JSON.stringify(res.data, null, 2));
    } catch (error) {
      handleError(error);
    }
  });

program.parse(process.argv);
