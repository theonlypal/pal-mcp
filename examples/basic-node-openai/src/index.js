import 'dotenv/config';
import { openai } from './lib/openai-client.js';

async function main() {
  console.log('PAL + OpenAI Example\n');

  // Verify API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not set');
    console.error('Run `pal generate` to set up your environment');
    process.exit(1);
  }

  console.log('API key configured ✓\n');

  // Example: Chat completion
  try {
    console.log('Testing chat completion...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Say "PAL is working!" in a creative way.' }
      ],
      max_tokens: 100,
    });

    console.log('\nResponse:', completion.choices[0].message.content);
    console.log('\n✓ OpenAI integration working!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
