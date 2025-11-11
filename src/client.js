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
      console.log('No saved session found, will create new one');
      return new StringSession('');
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

    await this.client.start({
      phoneNumber: async () => {
        console.log('\n=== Telegram Authorization Required ===');
        console.log('This is needed only once. Session will be saved.');
        return await input.text('Enter your phone number (with country code, e.g. +1234567890): ');
      },
      password: async () => {
        return await input.text('Enter your 2FA password (if enabled): ');
      },
      phoneCode: async () => {
        return await input.text('Enter the code you received in Telegram: ');
      },
      onError: (err) => {
        console.error('Auth error:', err);
      },
    });

    // Save session after successful auth
    await this.saveSession();

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
