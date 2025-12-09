import { Router } from "express";
import { MediaController } from "../modules/file-management/upload.controller.ts";
import { upload } from "../utils/upload.ts";

const router = Router();

router.post("/", upload.single("file"), MediaController.upload);

export default router;
