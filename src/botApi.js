/**
 * Uploads a photo to Telegram Bot API and returns a file URL
 * @param {Buffer} photoBuffer - The photo buffer to upload
 * @param {string} botToken - Bot API token
 * @param {string|number} chatId - Chat ID where to send temporary photo
 * @returns {Promise<string>} - Direct URL to the photo
 */
export async function getPhotoUrl(photoBuffer, botToken, chatId) {
	if (!botToken || !chatId) {
		throw new Error('Bot token and chat ID are required for getting file URLs')
	}

	try {
		// Step 1: Upload photo to bot using native FormData
		// Convert Buffer to Blob for fetch compatibility
		const blob = new Blob([photoBuffer], { type: 'image/jpeg' })
		const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })

		const formData = new FormData()
		formData.append('chat_id', chatId)
		formData.append('photo', file)

		const uploadResponse = await fetch(
			`https://api.telegram.org/bot${botToken}/sendPhoto`,
			{
				method: 'POST',
				body: formData,
			}
		)

		const uploadResult = await uploadResponse.json()

		if (!uploadResult.ok) {
			throw new Error(
				`Bot API upload failed: ${uploadResult.description || 'Unknown error'}`
			)
		}

		// Extract file_id from the largest photo size
		const photos = uploadResult.result.photo
		const largestPhoto = photos[photos.length - 1]
		const fileId = largestPhoto.file_id
		const messageId = uploadResult.result.message_id

		// Step 2: Get file path
		const fileResponse = await fetch(
			`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
		)

		const fileResult = await fileResponse.json()

		if (!fileResult.ok) {
			throw new Error(
				`Bot API getFile failed: ${fileResult.description || 'Unknown error'}`
			)
		}

		const filePath = fileResult.result.file_path

		// Step 3: Delete the temporary message (optional, fire and forget)
		fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				message_id: messageId,
			}),
		}).catch(err => {
			console.warn('Could not delete temporary photo message:', err.message)
		})

		// Step 4: Return the direct file URL
		return `https://api.telegram.org/file/bot${botToken}/${filePath}`
	} catch (error) {
		console.error('Error getting photo URL via Bot API:', error)
		throw error
	}
}

/**
 * Checks if Bot API is configured
 * @param {string} botToken - Bot token to check
 * @param {string|number} chatId - Chat ID to check
 * @returns {boolean}
 */
export function isBotApiConfigured(botToken, chatId) {
	return Boolean(botToken && chatId)
}
