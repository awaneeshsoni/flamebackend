// utils/azureconfig.js
require('dotenv').config(); // Make sure .env is loaded
const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME;

if (!AZURE_STORAGE_CONNECTION_STRING || !AZURE_STORAGE_CONTAINER_NAME) {
    throw new Error("Azure Storage configuration is missing. Check your .env file.");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);

/**
 * Uploads a file to Azure Blob Storage.
 * @param {Buffer} fileBuffer The file content as a Buffer.
 * @param {string} fileName The original name of the file.
 * @param {string} fileMimeType The MIME type of the file.
 * @returns {Promise<string>} The URL of the uploaded blob.
 */
async function uploadFileToAzure(fileBuffer, fileName, fileMimeType) {
    const blobName = 'video-' + Date.now() + '-' + fileName; // Unique blob name
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: { blobContentType: fileMimeType },
    });

    return blockBlobClient.url; // Return the *base* URL.  SAS will be added later.
}

/**
 * Generates a SAS URL for a given blob.
 * @param {string} blobUrl The base URL of the blob.
 * @param {number} expiryMinutes How long the SAS URL should be valid (in minutes).
 * @returns {Promise<string>} The SAS URL.
 */
async function generateSasUrl(blobUrl, expiryMinutes = 60) {
    const blobName = blobUrl.split('/').pop(); // Extract blob name from URL
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.valueOf() + expiryMinutes * 60 * 1000);

    const sasToken = generateBlobSASQueryParameters({
        containerName: AZURE_STORAGE_CONTAINER_NAME,
        blobName: blobName,
        permissions: BlobSASPermissions.parse("r"), // Read-only permissions
        startsOn: startsOn,
        expiresOn: expiresOn,
    }, blobServiceClient.credential).toString();

    return `${blobUrl}?${sasToken}`;
}

/**
 * Deletes a file in azure storage
 * @param {string} blobUrl the base url
 * @returns {Promise<void>}
 */
async function deleteFileFromAzure(blobUrl){
  const blobName = blobUrl.split('/').pop();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists()
}

module.exports = { uploadFileToAzure, generateSasUrl,deleteFileFromAzure };