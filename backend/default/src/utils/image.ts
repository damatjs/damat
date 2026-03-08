import sharp from 'sharp';

const CDN_BASE = process.env.CDN_BASE_URL || 'https://d2m7n3x2h4ihs.cloudfront.net';

export interface ProcessedImage {
    data: string;     // Base64 encoded string
    mimeType: string; // e.g., "image/jpeg"
}

/**
 * Build the image URL from a fileKey.
 */
export function buildImageUrl(fileKey: string): string {
    if (fileKey.startsWith('http')) return fileKey;
    return `${CDN_BASE}${fileKey}`;
}

/**
 * Fetch an image from URL and process it for optimal delivery.
 * Converts to JPEG, resizes, and compresses.
 */
export async function fetchAndProcessImage(url: string): Promise<ProcessedImage> {
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Convert to JPEG, resize, and compress
    const jpegBuffer = await sharp(inputBuffer)
        .resize({ width: 1024 })
        .jpeg({ quality: 80 })
        .toBuffer();

    return {
        data: jpegBuffer.toString('base64'),
        mimeType: 'image/jpeg',
    };
}
