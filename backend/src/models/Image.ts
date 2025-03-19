import { generateId } from '../utils/idGenerator';

export interface ImageMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  expiresAt: Date;
  createdAt: Date;
  url?: string;
  isExpiredFlag?: boolean; 
}

export class Image implements ImageMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  expiresAt: Date;
  createdAt: Date;
  url?: string;
  isExpiredFlag?: boolean;

  constructor(data: Omit<ImageMetadata, 'id' | 'createdAt' | 'isExpiredFlag'> & { id?: string; createdAt?: Date; isExpiredFlag?: boolean }) {
    this.id = data.id || generateId();
    this.originalName = data.originalName;
    this.mimeType = data.mimeType;
    this.size = data.size;
    this.path = data.path;
    this.expiresAt = data.expiresAt;
    this.createdAt = data.createdAt || new Date();
    this.isExpiredFlag = data.isExpiredFlag || false;
  }

  isExpired(): boolean {
    return this.isExpiredFlag || new Date() > this.expiresAt;
  }

  getRemainingTime(): number {
    if (this.isExpiredFlag) {
      return 0;
    }
    const now = new Date();
    return Math.max(0, this.expiresAt.getTime() - now.getTime());
  }

  toJSON(): Omit<ImageMetadata, 'path'> {
    const { path, ...rest } = this;
    return rest;
  }
}
