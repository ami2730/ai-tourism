import type { Request, Response } from "express";
import { UploadService } from "./upload.service.ts";

export class MediaController {
  static async upload(req: Request, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ message: "File required" });

      const url = await UploadService.handle(req.file);

      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
}
