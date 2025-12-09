import path from "path";
import fs from "fs";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { env } from "../config/env.ts";
import { cloudinary } from "./uploadCloud.ts";

const UPLOAD_DRIVER = env.UPLOAD_DRIVER;

// --------------------------------------------
// VALID MIME TYPES
// --------------------------------------------
const IMAGE_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-matroska"];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter(req, file, cb) {
    if ([...IMAGE_TYPES, ...VIDEO_TYPES].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// --------------------------------------------
// HELPER: SAVE FILE LOCALLY
// --------------------------------------------
async function saveLocal(file: Express.Multer.File) {
  const ext = path.extname(file.originalname);
  const filename = `${uuid()}${ext}`;
  const filePath = path.join(env.UPLOAD_LOCAL_PATH, filename);

  await fs.promises.writeFile(filePath, file.buffer);

  return `/uploads/${filename}`; // URL served by Express static
}

// --------------------------------------------
// HELPER: SAVE FILE ON CLOUDINARY
// --------------------------------------------
async function saveCloud(file: Express.Multer.File) {
  const b64 = file.buffer.toString("base64");
  const dataURI = "data:" + file.mimetype + ";base64," + b64;

  const upload = await cloudinary.uploader.upload(dataURI, {
    folder: "event-planner",
    resource_type: file.mimetype.startsWith("video") ? "video" : "image",
  });

  return upload.secure_url;
}

// --------------------------------------------
// MAIN EXPORTED UPLOAD HANDLER
// --------------------------------------------
export async function uploadMedia(file: Express.Multer.File) {
  if (!file) throw new Error("No file provided");

  if (UPLOAD_DRIVER === "cloud") {
    return saveCloud(file);
  }

  return saveLocal(file);
}
