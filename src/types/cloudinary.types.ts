// src/types/cloudinary.types.ts

export interface IUploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface ICloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
}
