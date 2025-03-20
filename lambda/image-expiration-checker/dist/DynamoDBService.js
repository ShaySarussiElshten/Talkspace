"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const Image_1 = require("./Image");
class DynamoDBService {
    constructor() {
        this.client = new client_dynamodb_1.DynamoDBClient({
            region: process.env.REGION || 'eu-west-1'
        });
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(this.client);
        this.tableName = process.env.DYNAMODB_TABLE || 'y-image-sharing-images';
    }
    async markImageAsExpired(imageId) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: {
                    id: imageId,
                },
                UpdateExpression: 'SET isExpiredFlag = :expired',
                ExpressionAttributeValues: {
                    ':expired': true,
                },
            });
            await this.docClient.send(command);
            console.log(`Marked image ${imageId} as expired in DynamoDB`);
        }
        catch (error) {
            console.error(`Error marking image ${imageId} as expired in DynamoDB:`, error);
            throw error;
        }
    }
    async getExpiredImages() {
        try {
            const now = Math.floor(Date.now() / 1000); // Current time in seconds
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'expiresAt < :now OR isExpiredFlag = :expired',
                ExpressionAttributeValues: {
                    ':now': now,
                    ':expired': true
                },
            });
            const response = await this.docClient.send(command);
            if (!response.Items || response.Items.length === 0) {
                return [];
            }
            // Convert items to Image objects
            return response.Items.map((item) => {
                return new Image_1.Image({
                    id: item.id,
                    originalName: item.originalName,
                    mimeType: item.mimeType,
                    size: item.size,
                    path: item.path,
                    expiresAt: new Date(item.expiresAt * 1000),
                    createdAt: new Date(item.createdAt),
                    url: item.url,
                    isExpiredFlag: item.isExpiredFlag || false
                });
            });
        }
        catch (error) {
            console.error('Error getting expired images from DynamoDB:', error);
            return [];
        }
    }
    async getAllImages() {
        try {
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                ConsistentRead: true, // Ensure we get the latest data
            });
            const response = await this.docClient.send(command);
            if (!response.Items || response.Items.length === 0) {
                return [];
            }
            return response.Items.map((item) => {
                return new Image_1.Image({
                    id: item.id,
                    originalName: item.originalName,
                    mimeType: item.mimeType,
                    size: item.size,
                    path: item.path,
                    expiresAt: new Date(item.expiresAt * 1000),
                    createdAt: new Date(item.createdAt),
                    url: item.url,
                    isExpiredFlag: item.isExpiredFlag || false
                });
            });
        }
        catch (error) {
            console.error('Error getting all images from DynamoDB:', error);
            return [];
        }
    }
}
exports.default = new DynamoDBService();
