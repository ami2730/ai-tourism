import { uploadMedia } from "../../utils/upload.ts";

export class UploadService {
  static async handle(file: Express.Multer.File) {
    return uploadMedia(file);
  }
}
