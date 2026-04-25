import crypto from 'crypto'
import { config } from './config.js'

function encodeS3Key(key) {
	return key
		.split('/')
		.map(part => encodeURIComponent(part))
		.join('/')
}

function hmac(key, value, encoding) {
	return crypto.createHmac('sha256', key).update(value, 'utf8').digest(encoding)
}

function sha256(value, encoding = 'hex') {
	return crypto.createHash('sha256').update(value).digest(encoding)
}

function getAmzDate(date) {
	return date.toISOString().replace(/[:-]|\.\d{3}/g, '')
}

function getDateStamp(date) {
	return getAmzDate(date).slice(0, 8)
}

function ensureStorageConfigured() {
	if (!config.ycAccessKeyId || !config.ycSecretAccessKey || !config.ycBucket) {
		throw new Error(
			'YC_ACCESS_KEY_ID, YC_SECRET_ACCESS_KEY and YC_BUCKET are required for Yandex Cloud uploads'
		)
	}
}

function buildObjectUrl(objectKey) {
	const encodedKey = encodeS3Key(objectKey)

	if (config.ycPublicBaseUrl) {
		return `${config.ycPublicBaseUrl.replace(/\/$/, '')}/${encodedKey}`
	}

	return `${config.ycEndpoint}/${config.ycBucket}/${encodedKey}`
}

function createObjectKey() {
	const now = new Date()
	const datePrefix = now.toISOString().slice(0, 10)
	const randomPart = crypto.randomUUID()
	return `telegram-previews/${datePrefix}/${randomPart}.jpg`
}

export function isYandexStorageConfigured() {
	return Boolean(
		config.ycAccessKeyId && config.ycSecretAccessKey && config.ycBucket
	)
}

export async function uploadImageToYandexCloud(buffer, options = {}) {
	ensureStorageConfigured()

	const contentType = options.contentType || 'image/jpeg'
	const objectKey = options.objectKey || createObjectKey()
	const requestDate = new Date()
	const amzDate = getAmzDate(requestDate)
	const dateStamp = getDateStamp(requestDate)
	const encodedKey = encodeS3Key(objectKey)
	const endpointUrl = new URL(config.ycEndpoint)
	const host = endpointUrl.host
	const canonicalUri = `/${config.ycBucket}/${encodedKey}`
	const payloadHash = sha256(buffer)
	const credentialScope = `${dateStamp}/${config.ycRegion}/s3/aws4_request`

	const canonicalHeaders =
		`host:${host}\n` +
		`x-amz-content-sha256:${payloadHash}\n` +
		`x-amz-date:${amzDate}\n`
	const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
	const canonicalRequest = [
		'PUT',
		canonicalUri,
		'',
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	].join('\n')

	const stringToSign = [
		'AWS4-HMAC-SHA256',
		amzDate,
		credentialScope,
		sha256(canonicalRequest),
	].join('\n')

	const dateKey = hmac(`AWS4${config.ycSecretAccessKey}`, dateStamp)
	const regionKey = hmac(dateKey, config.ycRegion)
	const serviceKey = hmac(regionKey, 's3')
	const signingKey = hmac(serviceKey, 'aws4_request')
	const signature = hmac(signingKey, stringToSign, 'hex')
	const authorization = [
		`AWS4-HMAC-SHA256 Credential=${config.ycAccessKeyId}/${credentialScope}`,
		`SignedHeaders=${signedHeaders}`,
		`Signature=${signature}`,
	].join(', ')

	const response = await fetch(`${config.ycEndpoint}${canonicalUri}`, {
		method: 'PUT',
		headers: {
			Authorization: authorization,
			'Content-Type': contentType,
			'Content-Length': String(buffer.length),
			'x-amz-content-sha256': payloadHash,
			'x-amz-date': amzDate,
		},
		body: buffer,
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Yandex Cloud upload failed with status ${response.status}: ${errorText || 'Unknown error'}`
		)
	}

	return {
		key: objectKey,
		url: buildObjectUrl(objectKey),
		bucket: config.ycBucket,
	}
}
