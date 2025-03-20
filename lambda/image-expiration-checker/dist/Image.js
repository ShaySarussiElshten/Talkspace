"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Image = void 0;
class Image {
    constructor(data) {
        this.id = data.id || '';
        this.originalName = data.originalName;
        this.mimeType = data.mimeType;
        this.size = data.size;
        this.path = data.path;
        this.expiresAt = data.expiresAt;
        this.createdAt = data.createdAt || new Date();
        this.isExpiredFlag = data.isExpiredFlag || false;
    }
    isExpired() {
        return this.isExpiredFlag || new Date() > this.expiresAt;
    }
}
exports.Image = Image;
