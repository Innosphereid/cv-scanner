/**
 * Utility for generating public Cloudinary URLs that work without authentication
 */

export interface PublicUrlOptions {
  cloudName: string;
  publicId: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  format?: string;
  version?: string | number;
}

/**
 * Generate a public Cloudinary URL that doesn't require authentication
 * This ensures URLs work even when the application is not running
 */
export function generatePublicCloudinaryUrl(options: PublicUrlOptions): string {
  const {
    cloudName,
    publicId,
    resourceType = 'raw',
    format = 'pdf',
    version,
  } = options;

  // Base Cloudinary delivery URL format
  const baseUrl = `https://res.cloudinary.com/${cloudName}`;

  // For raw resources (PDFs), use specific format
  const resourcePath = resourceType === 'raw' ? 'raw' : resourceType;

  // Clean up public ID - remove nested folder structure if needed
  // Cloudinary public IDs with slashes need URL encoding
  const encodedPublicId = encodeURIComponent(publicId);

  // Build URL components
  const versionPart = version ? `/v${version}` : '';
  const formatPart = format ? `.${format}` : '';

  // Try multiple URL formats for maximum compatibility
  // Format 1: Standard format with encoded public ID
  const url = `${baseUrl}/${resourcePath}/upload${versionPart}/${encodedPublicId}${formatPart}`;

  return url;
}

/**
 * Generate multiple URL format attempts for maximum compatibility
 */
export function generateAlternativeUrls(options: PublicUrlOptions): string[] {
  const {
    cloudName,
    publicId,
    resourceType = 'raw',
    format = 'pdf',
    version,
  } = options;
  const baseUrl = `https://res.cloudinary.com/${cloudName}`;
  const versionPart = version ? `/v${version}` : '';
  const formatPart = format ? `.${format}` : '';

  return [
    // Format 1: Standard with specified resource type and encoded public ID
    `${baseUrl}/${resourceType}/upload${versionPart}/${encodeURIComponent(publicId)}${formatPart}`,

    // Format 2: Without encoding (original format)
    `${baseUrl}/${resourceType}/upload${versionPart}/${publicId}${formatPart}`,

    // Format 3: Image resource type (fallback)
    `${baseUrl}/image/upload${versionPart}/${encodeURIComponent(publicId)}${formatPart}`,

    // Format 4: Auto resource type
    `${baseUrl}/auto/upload${versionPart}/${encodeURIComponent(publicId)}${formatPart}`,

    // Format 5: Without version
    `${baseUrl}/${resourceType}/upload/${encodeURIComponent(publicId)}${formatPart}`,
  ];
}

/**
 * Extract public ID from Cloudinary response and generate reliable public URL
 */
export function createReliablePublicUrl(
  cloudinaryResponse: any,
  cloudName: string,
): string {
  const publicId = cloudinaryResponse.public_id;
  const resourceType = cloudinaryResponse.resource_type || 'raw';
  const format = cloudinaryResponse.format || 'pdf';
  const version = cloudinaryResponse.version;

  // Try the primary format first
  const primaryUrl = generatePublicCloudinaryUrl({
    cloudName,
    publicId,
    resourceType,
    format,
    version,
  });

  return primaryUrl;
}
