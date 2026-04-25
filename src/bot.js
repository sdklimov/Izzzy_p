import { getClient } from './client.js'
// import { config } from './config.js'
// import { getPhotoUrl, isBotApiConfigured } from './botApi.js'
import { isYandexStorageConfigured, uploadImageToYandexCloud } from './storage.js'

const TELEGRAM_PREVIEW_PROCESSING_DELAY_MS = 2000;

class URLParserBot {
	async parseURL(url) {
		try {
			const client = await getClient()

			console.log(`Sending URL for parsing: ${url}`)

			// Send message to "Saved Messages" (yourself)
			const result = await client.sendMessage('me', {
				message: url,
			})

			// Wait for Telegram to process the preview
			await this.sleep(TELEGRAM_PREVIEW_PROCESSING_DELAY_MS)

			// Get the sent message with full details
			const messages = await client.getMessages('me', {
				ids: [result.id],
			})

			const message = messages[0]

			// Extract metadata from the message
			const metadata = await this.extractMetadata(message, url)

			// Delete the message from Saved Messages
			try {
				await client.deleteMessages('me', [result.id], { revoke: true })
			} catch (error) {
				console.warn('Could not delete message:', error.message)
			}

			console.log('Successfully parsed URL:', url)
			return metadata
		} catch (error) {
			console.error('Error parsing URL:', error)
			throw error
		}
	}

	async extractMetadata(message, originalUrl) {
		const metadata = {
			url: originalUrl,
			message_id: message.id,
			date: new Date(message.date * 1000).toISOString(),
			text: message.message || null,
		}

		// Extract WebPage preview data (THIS IS THE GOLD!)
		if (message.media && message.media.className === 'MessageMediaWebPage') {
			const webPage = message.media.webpage

			if (webPage.className === 'WebPage') {
				// Main metadata
				metadata.siteName = webPage.siteName || null
				metadata.title = webPage.title || null
				metadata.description = webPage.description || null
				metadata.url = webPage.url || originalUrl
				metadata.displayUrl = webPage.displayUrl || null
				metadata.type = webPage.type || null
				metadata.author = webPage.author || null
				metadata.embedUrl = webPage.embedUrl || null
				metadata.embedType = webPage.embedType || null
				metadata.embedWidth = webPage.embedWidth || null
				metadata.embedHeight = webPage.embedHeight || null
				metadata.duration = webPage.duration || null

				// Photo/Image
				if (webPage.photo) {
					const photo = webPage.photo
					const sizes = photo.sizes || []

					metadata.photo = {
						id: photo.id?.toString() || null,
						dcId: photo.dcId || null,
						date: photo.date ? new Date(photo.date * 1000).toISOString() : null,
						sizes: sizes.map(size => ({
							type: size.type || size.className,
							width: size.w || size.width || null,
							height: size.h || size.height || null,
							size: size.size || null,
						})),
					}

					// Get largest photo size
					const largestSize = sizes.reduce((max, size) => {
						const currentArea =
							(size.w || size.width || 0) * (size.h || size.height || 0)
						const maxArea =
							(max.w || max.width || 0) * (max.h || max.height || 0)
						return currentArea > maxArea ? size : max
					}, sizes[0] || {})

					if (largestSize) {
						metadata.photo.largest = {
							type: largestSize.type || largestSize.className,
							width: largestSize.w || largestSize.width || null,
							height: largestSize.h || largestSize.height || null,
						}
					}

					// Upload the image to Yandex Cloud Object Storage when configured.
					try {
						const client = await getClient()
						const buffer = await client.downloadMedia(photo, {
							workers: 1,
						})

						if (buffer) {
							// if (isBotApiConfigured(config.botToken, config.botChatId)) {
							if (isYandexStorageConfigured()) {
								try {
									const uploadedPhoto = await uploadImageToYandexCloud(buffer);
									// const photoUrl = await getPhotoUrl(buffer, config.botToken, config.botChatId)
									metadata.photo.url = uploadedPhoto.url;
								} catch (storageError) {
									console.warn(
										'Yandex Cloud upload failed, falling back to Bot API/base64:',
										storageError.message
									);
									// Fallback to base64
									const base64 = buffer.toString('base64');
									metadata.photo.base64 = `data:image/jpeg;base64,${base64}`;
									metadata.photo._note = 'Yandex Cloud upload failed, to get direct URLs instead of base64';
								}
							} else {
								// No Bot API configured, use base64
								const base64 = buffer.toString('base64');
								metadata.photo.base64 = `data:image/jpeg;base64,${base64}`;
								metadata.photo._note = 'Configure S3 in .env to get direct URLs instead of base64';
							}
						}
					} catch (error) {
						console.warn('Could not download photo:', error.message)
						metadata.photo.error = 'Failed to download photo'
					}
				}

				// Video
				if (webPage.video) {
					const video = webPage.video
					metadata.video = {
						id: video.id?.toString() || null,
						duration: video.duration || null,
						width: video.w || null,
						height: video.h || null,
						mimeType: video.mimeType || null,
						size: video.size || null,
					}
				}

				// Document
				if (webPage.document) {
					const doc = webPage.document
					metadata.document = {
						id: doc.id?.toString() || null,
						mimeType: doc.mimeType || null,
						size: doc.size || null,
					}
				}

				// Attributes (additional metadata)
				if (webPage.attributes && webPage.attributes.length > 0) {
					metadata.attributes = webPage.attributes.map(attr => ({
						type: attr.className,
						...attr,
					}))
				}
			} else if (webPage.className === 'WebPageEmpty') {
				metadata._note =
					'WebPage preview is empty. URL might not support Open Graph metadata.'
			} else if (webPage.className === 'WebPagePending') {
				metadata._note =
					'WebPage preview is still being generated. Try again in a moment.'
			}
		} else {
			metadata._note = 'No web preview available for this URL.'
		}

		return metadata
	}

	sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms))
	}
}

export default URLParserBot
