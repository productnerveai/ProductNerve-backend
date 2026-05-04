const AWS = require('aws-sdk');
const path = require('path');
const crypto = require('crypto');

// Configure AWS SDK for DigitalOcean Spaces
const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: process.env.DO_SPACES_REGION || 'nyc3'
});

/**
 * Upload file to DigitalOcean Spaces
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @param {string} folder - Folder name (optional)
 * @returns {Promise<string>} - File URL
 */
const uploadFileToSpaces = async (fileBuffer, fileName, mimeType, folder = 'profile-documents') => {
  try {
    // Generate unique filename
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `${folder}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;

    const params = {
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: uniqueFileName,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read' // Make profile documents publicly accessible
    };

    const result = await s3.upload(params).promise();

    // Return the file URL (for private files, you'll need signed URLs)
    return result.Location;
  } catch (error) {
    console.error('Error uploading to DigitalOcean Spaces:', error);
    throw new Error('Failed to upload file');
  }
};

/**
 * Generate signed URL for private file access
 * @param {string} fileUrl - File URL from Spaces
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<string>} - Signed URL
 */
const getSignedUrl = async (fileUrl, expiresIn = 3600) => {
  try {
    // Extract key from URL
    const urlParts = fileUrl.split('/');
    const key = urlParts.slice(3).join('/'); // Remove protocol, domain, bucket

    const params = {
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
      Expires: expiresIn
    };

    return await s3.getSignedUrl('getObject', params);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
};

/**
 * Delete file from DigitalOcean Spaces
 * @param {string} fileUrl - File URL to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteFileFromSpaces = async (fileUrl) => {
  try {
    // Extract key from URL
    const urlParts = fileUrl.split('/');
    const key = urlParts.slice(3).join('/');

    const params = {
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting from DigitalOcean Spaces:', error);
    throw new Error('Failed to delete file');
  }
};

module.exports = {
  uploadFileToSpaces,
  getSignedUrl,
  deleteFileFromSpaces
};
