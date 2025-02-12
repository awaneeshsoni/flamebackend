const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();



const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const uploadToAWS = async (fileKey, fileBuffer, mimeType) => {
    const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimeType,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    return `${process.env.AWS_CLOUDFRONT_URL}/${fileKey}`;
};

const deleteFromAWS = async (fileKey) => {
    const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
};

module.exports = { uploadToAWS, deleteFromAWS };
