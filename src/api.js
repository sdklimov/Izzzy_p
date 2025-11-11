import express from 'express';
import URLParserBot from './bot.js';

const router = express.Router();
const bot = new URLParserBot();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tg-bot-parser'
  });
});

// Parse URL endpoint
router.post('/parse', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required in request body'
      });
    }

    console.log('Received parse request for URL:', url);

    // Parse URL using Telegram bot
    const metadata = await bot.parseURL(url);

    res.json({
      success: true,
      url: url,
      metadata: metadata,
      error: null
    });

  } catch (error) {
    console.error('Error in /parse endpoint:', error);

    res.status(500).json({
      success: false,
      url: req.body.url || null,
      metadata: null,
      error: error.message
    });
  }
});

export default router;
