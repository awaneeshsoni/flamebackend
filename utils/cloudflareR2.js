const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
});

const uploadToR2 = async (fileKey, fileBuffer, mimeType) => {
    const uploadParams = {
        Bucket: process.env.R2_BUCKET,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimeType,
    };

    await r2Client.send(new PutObjectCommand(uploadParams));
    return `https://${process.env.R2_BUCKET}.${process.env.R2_ENDPOINT}/${fileKey}`;
};

const deleteFromR2 = async (fileKey) => {
    const deleteParams = {
        Bucket: process.env.R2_BUCKET,
        Key: fileKey,
    };

    await r2Client.send(new DeleteObjectCommand(deleteParams));
};

module.exports = { uploadToR2, deleteFromR2 };
