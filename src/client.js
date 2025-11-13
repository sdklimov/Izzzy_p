import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { StoreSession } from 'telegram/sessions/StoreSession.js';
import input from 'input';
import fs from 'fs/promises';
import path from 'path';
import { config } from './config.js';

const SESSION_FILE = 'session.json';

class MTProtoClient {
  constructor() {
    this.client = null;
    this.session = null;
  }

  async loadSession() {
    try {
      const sessionData = await fs.readFile(SESSION_FILE, 'utf-8');
      const parsed = JSON.parse(sessionData);
      console.log('✓ Loaded saved session');
      return new StringSession(parsed.session);
    } catch (error) {
      console.error('\n❌ ERROR: No session file found!');
      console.error('\nTo authorize for the first time, run:');
      console.error('  npm run auth');
      console.error('\nThis will create session.json file that you can mount into Docker container.');
      console.error('');
      throw new Error('Session file not found. Please run: npm run auth');
    }
  }

  async saveSession() {
    try {
      const sessionString = this.client.session.save();
      await fs.writeFile(
        SESSION_FILE,
        JSON.stringify({ session: sessionString }, null, 2)
      );
      console.log('✓ Session saved to', SESSION_FILE);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  async connect() {
    console.log('Connecting to Telegram...');

    // Load or create session
    this.session = await this.loadSession();

    // Create client
    this.client = new TelegramClient(
      this.session,
      config.apiId,
      config.apiHash,
      {
        connectionRetries: 5,
      }
    );

    await this.client.connect();

    console.log('✓ Successfully connected to Telegram');
    console.log('✓ You are logged in as:', (await this.client.getMe()).username || 'User');
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      console.log('Disconnected from Telegram');
    }
  }

  getClient() {
    return this.client;
  }
}

// Singleton instance
let clientInstance = null;

export async function getClient() {
  if (!clientInstance) {
    clientInstance = new MTProtoClient();
    await clientInstance.connect();
  }
  return clientInstance.getClient();
}

export async function disconnect() {
  if (clientInstance) {
    await clientInstance.disconnect();
    clientInstance = null;
  }
}
