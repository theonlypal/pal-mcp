# Basic Node.js + OpenAI Example

This example demonstrates using PAL to manage OpenAI API keys in a Node.js project.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure with PAL:**
   ```bash
   # From this directory
   pal add-api openai
   pal generate
   ```

3. **Run the example:**
   ```bash
   npm start
   ```

## What PAL Does

1. **Secure Key Storage**: Your OpenAI API key is stored in your OS keychain (macOS Keychain, Windows Credential Manager) - never in plain text.

2. **Environment Generation**: Running `pal generate` creates/updates `.env` with your key and generates the client code.

3. **Client Code**: The `src/lib/openai-client.js` file is auto-generated with proper initialization.

## Files

- `pal.config.json` - PAL configuration
- `src/lib/openai-client.js` - Generated OpenAI client
- `src/index.js` - Example usage
- `.env` - Generated environment file (gitignored)

## Security

- `.env` is automatically added to `.gitignore`
- API keys are stored in OS keychain when possible
- Keys are never committed to version control
