# Integrations for Spaced Recall

This directory contains API routes for integrating with external services like Notion and Obsidian.

## Notion Integration

The Notion integration allows users to:
1. Import subjects, topics, and concepts from Notion databases and pages
2. Export subjects to Notion as pages or database entries
3. Sync study progress between Spaced Recall and Notion

### Setup

To use the Notion integration, you need to:

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Add the following environment variables to your `.env.local` file:
   ```
   NOTION_CLIENT_ID=your_notion_client_id
   NOTION_CLIENT_SECRET=your_notion_client_secret
   NEXT_PUBLIC_URL=your_app_url
   ```
3. Configure the redirect URL in your Notion integration to `{NEXT_PUBLIC_URL}/api/integrations/notion/auth/callback`

### API Routes

- `GET /api/integrations/notion/auth` - Initiates the Notion OAuth flow
- `POST /api/integrations/notion/auth` - Completes the Notion OAuth flow
- `GET /api/integrations/notion/auth/callback` - Handles the OAuth callback from Notion
- `POST /api/integrations/notion/import` - Imports content from Notion
- `POST /api/integrations/notion/export` - Exports content to Notion

## Obsidian Integration

The Obsidian integration allows users to:
1. Import subjects, topics, and concepts from Obsidian vault exports
2. Export subjects to Obsidian-compatible markdown files
3. Include spaced repetition metadata compatible with Obsidian plugins

### API Routes

- `POST /api/integrations/obsidian/import` - Imports content from Obsidian
- `POST /api/integrations/obsidian/export` - Exports content to Obsidian

### File Structure

When exporting to Obsidian, the following structure is created:

```
Subject Name/
  index.md                  # Subject overview
  Topic 1/
    index.md                # Topic overview
    Concept 1.md            # Concept content
    Concept 2.md
  Topic 2/
    index.md
    Concept 3.md
    Concept 4.md
```

Frontmatter is added to each file to support Obsidian features like tags, links, and spaced repetition metadata. 