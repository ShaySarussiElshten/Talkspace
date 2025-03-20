"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
class S3Service {
    constructor() {
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.REGION || 'eu-west-1'
        });
        this.bucketName = process.env.S3_BUCKET || '';
    }
    async deleteFile(key) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key
            });
            await this.s3Client.send(command);
            return true;
        }
        catch (error) {
            console.error('Error deleting file from S3:', error);
            return false;
        }
    }
}
exports.default = new S3Service();
