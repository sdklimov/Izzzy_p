import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';
import fs from 'fs/promises';
import { config } from './config.js';

const SESSION_FILE = 'session.json';

async function authorize() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║  Telegram Authorization Script                                        ║');
  console.log('║  This will create session.json file for Docker container             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  // Check if session already exists
  try {
    await fs.access(SESSION_FILE);
    console.log('⚠️  Warning: session.json already exists!');
    const overwrite = await input.text('Do you want to overwrite it? (yes/no): ');
    if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
      console.log('Authorization cancelled.');
      process.exit(0);
    }
  } catch {
    // File doesn't exist, continue
  }

  console.log('\n📱 Starting authorization process...\n');

  // Create new session
  const session = new StringSession('');
  const client = new TelegramClient(
    session,
    config.apiId,
    config.apiHash,
    {
      connectionRetries: 5,
    }
  );

  try {
    await client.start({
      phoneNumber: async () => {
        console.log('Step 1/3: Phone number');
        return await input.text('Enter your phone number (with country code, e.g. +1234567890): ');
      },
      password: async () => {
        console.log('Step 2/3: Two-factor authentication');
        return await input.text('Enter your 2FA password (press Enter if not enabled): ');
      },
      phoneCode: async () => {
        console.log('Step 3/3: Verification code');
        return await input.text('Enter the code you received in Telegram: ');
      },
      onError: (err) => {
        console.error('❌ Authorization error:', err.message);
      },
    });

    // Get user info
    const me = await client.getMe();
    console.log('\n✓ Successfully authorized!');
    console.log(`✓ Logged in as: @${me.username || 'User'} (${me.firstName || ''} ${me.lastName || ''})`);
    console.log(`✓ User ID: ${me.id}`);

    // Save session
    const sessionString = client.session.save();
    await fs.writeFile(
      SESSION_FILE,
      JSON.stringify({ session: sessionString }, null, 2)
    );
    console.log(`\n✓ Session saved to ${SESSION_FILE}`);

    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║  Authorization Complete!                                              ║');
    console.log('║                                                                       ║');
    console.log('║  Next steps:                                                          ║');
    console.log('║  1. Mount session.json into your Docker container                    ║');
    console.log('║  2. Start your application                                            ║');
    console.log('║                                                                       ║');
    console.log('║  Docker volume example:                                               ║');
    console.log('║  -v $(pwd)/session.json:/app/session.json                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    // Disconnect
    await client.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Authorization failed:', error.message);
    console.error('\nPlease check:');
    console.error('  - Your API_ID and API_HASH in .env are correct');
    console.error('  - Your phone number includes country code (e.g. +1234567890)');
    console.error('  - You entered the correct verification code');
    console.error('  - Your internet connection is stable');

    await client.disconnect();
    process.exit(1);
  }
}

// Run authorization
authorize().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
