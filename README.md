# PAL - Project API Locker

**Cross-platform API key management for developers. Secure, local, integrated with Claude Code.**

PAL manages your API keys securely using your OS keychain, auto-generates `.env` files, creates SDK client code, and integrates with Claude Code via MCP.

## Features

- **Secure Storage**: Keys stored in OS keychain (macOS Keychain, Windows Credential Manager) or AES-256-GCM encrypted fallback
- **Zero Plain Text**: API keys never stored in plain text files
- **Auto Generation**: Creates `.env` files and SDK client code
- **Framework Detection**: Automatically detects Next.js, Express, TypeScript, etc.
- **Claude Code Integration**: MCP server for AI-assisted key management
- **Multi-Provider**: OpenAI, Anthropic, Stripe, Twilio, SendGrid, Supabase, Firebase, AWS, and custom

## Quick Start

```bash
# Install globally
npm install -g @pal/cli

# Initialize in your project
cd your-project
pal init

# Add an API (securely stores the key)
pal add-api openai

# Generate .env and client code
pal generate

# Check health
pal doctor
```

## Commands

### `pal init`
Initialize PAL in your project. Detects framework, creates `pal.config.json`.

```bash
pal init
```

### `pal add-api [provider]`
Add an API service. Securely stores the key in your OS keychain.

```bash
pal add-api openai
pal add-api stripe --env-var STRIPE_KEY
pal add-api anthropic --id claude-api
```

**Supported Providers:**
- `openai` - OpenAI API
- `anthropic` - Anthropic Claude API
- `stripe` - Stripe payments
- `twilio` - Twilio SMS/Voice
- `sendgrid` - SendGrid email
- `resend` - Resend email
- `supabase` - Supabase backend
- `firebase` - Firebase/Google Cloud
- `aws` - AWS services
- `custom` - Any custom API

### `pal generate`
Generate `.env` file and SDK client code from stored keys.

```bash
pal generate
pal generate --dry-run  # Preview without writing
```

### `pal scan`
Scan project for API usage and suggest missing configurations.

```bash
pal scan
```

### `pal doctor`
Health check for PAL configuration.

```bash
pal doctor
```

## MCP Server (Claude Code Integration)

PAL includes an MCP server for integration with Claude Code.

### Setup

Add to your Claude Code MCP config:

```json
{
  "mcpServers": {
    "pal": {
      "command": "npx",
      "args": ["@pal/mcp-server"]
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all PAL-registered projects |
| `inspect_project` | Get project details, services, env status |
| `add_api_to_project` | Add API service programmatically |
| `generate_client_snippets` | Get integration code for services |
| `summarize_env_state` | Health check for env/keystore |

### Example Usage in Claude Code

```
"Add OpenAI to my current project with this API key: sk-..."
"Show me the status of API keys in /path/to/project"
"Generate the client code for Stripe in my project"
```

## Security

### Key Storage Priority

1. **OS Keychain** (recommended): Uses `keytar` for native keychain access
   - macOS: Keychain Access
   - Windows: Credential Manager
   - Linux: libsecret

2. **Encrypted File** (fallback): AES-256-GCM encrypted JSON file
   - Location: `~/.pal/keystore.enc`
   - Encryption key derived from machine-specific data

### Best Practices

- Never commit `.env` files (PAL auto-adds to `.gitignore`)
- Use OS keychain when available (install `keytar`)
- Run `pal doctor` to verify security setup
- Rotate keys periodically

## Configuration

### pal.config.json

```json
{
  "projectName": "my-app",
  "language": "node",
  "framework": "nextjs",
  "envFile": ".env.local",
  "services": [
    {
      "id": "openai",
      "provider": "openai",
      "envVarKey": "OPENAI_API_KEY",
      "scopes": ["chat", "embeddings"]
    }
  ]
}
```

### Framework Detection

PAL automatically detects:
- **Next.js**: Uses `.env.local`
- **Express**: Standard `.env`
- **TypeScript**: Generates `.ts` files
- **Package Manager**: npm, yarn, pnpm, bun

## Packages

| Package | Description |
|---------|-------------|
| `@pal/core` | Core library (types, keystore, codegen) |
| `@pal/cli` | Command-line interface |
| `@pal/mcp-server` | MCP server for Claude Code |

## Development

```bash
# Clone the repo
git clone https://github.com/your-username/pal-mcp.git
cd pal-mcp

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run CLI locally
pnpm --filter @pal/cli start -- init
```

## Examples

See the `examples/` directory:

- `basic-node-openai/` - Simple Node.js + OpenAI example

## License

MIT

---

**Built for developers who value security and speed.**
