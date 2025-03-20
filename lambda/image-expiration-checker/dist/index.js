"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const DynamoDBService_1 = __importDefault(require("./DynamoDBService"));
const S3Service_1 = __importDefault(require("./S3Service"));
async function deleteExpiredImage(image) {
    try {
        if (!image.isExpiredFlag) {
            await DynamoDBService_1.default.markImageAsExpired(image.id);
        }
        try {
            if (image.path) {
                await S3Service_1.default.deleteFile(image.path);
                console.log(`Deleted S3 file: ${image.path}`);
            }
            else {
                console.log(`Skipping S3 deletion for image ${image.id} - no path specified`);
            }
        }
        catch (error) {
            console.error(`Error deleting image ${image.id} from S3:`, error);
        }
        console.log(`Marked image ${image.id} as expired and removed from storage`);
    }
    catch (error) {
        console.error(`Error processing expired image ${image.id}:`, error);
    }
}
const handler = async (event, context) => {
    console.log('Starting expired images check');
    try {
        // Get expired images from DynamoDB
        const expiredImages = await DynamoDBService_1.default.getExpiredImages();
        if (expiredImages.length > 0) {
            console.log(`Found ${expiredImages.length} expired images to delete`);
            console.log('Expired images:', expiredImages.map(img => ({
                id: img.id,
                originalName: img.originalName,
                expiresAt: img.expiresAt.toISOString(),
                isExpiredFlag: img.isExpiredFlag
            })));
            for (const image of expiredImages) {
                // Mark as expired in DynamoDB before deleting
                if (!image.isExpiredFlag) {
                    await DynamoDBService_1.default.markImageAsExpired(image.id);
                }
                await deleteExpiredImage(image);
            }
        }
        // Also check for images that are expired by time but not yet marked
        const now = new Date();
        const images = await DynamoDBService_1.default.getAllImages();
        console.log(`Checking ${images.length} images for precise expiration timing at ${now.toISOString()}`);
        for (const image of images) {
            // Convert expiresAt to timestamp in seconds for comparison
            const expiresAtTimestamp = Math.floor(image.expiresAt.getTime() / 1000);
            const nowTimestamp = Math.floor(now.getTime() / 1000);
            const timeDiffSeconds = expiresAtTimestamp - nowTimestamp;
            // Check if URL has expired (based on presigned URL expiration)
            const isUrlExpired = !image.isExpiredFlag && expiresAtTimestamp < nowTimestamp;
            if (isUrlExpired) {
                console.log(`Marking image ${image.id} as expired - expired ${Math.abs(timeDiffSeconds)} seconds ago`);
                await DynamoDBService_1.default.markImageAsExpired(image.id);
                await deleteExpiredImage(image);
            }
            else if (!image.isExpiredFlag) {
                if (timeDiffSeconds < 300) { // Less than 5 minutes
                    console.log(`Image ${image.id} will expire in ${timeDiffSeconds} seconds`);
                }
            }
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Expired images check completed successfully',
                expiredImagesCount: expiredImages.length,
                timestamp: new Date().toISOString()
            })
        };
    }
    catch (error) {
        console.error('Error checking for expired images:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error checking for expired images',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            })
        };
    }
};
exports.handler = handler;
