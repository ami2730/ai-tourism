
import { body } from "express-validator";

export const createPostValidators = [
  body("title").isString().isLength({ min: 3 }).withMessage("title required (min 3)"),
  body("body").isString().isLength({ min: 10 }).withMessage("body required (min 10)"),
];

export const updatePostValidators = [
  body("title").optional().isString().isLength({ min: 3 }),
  body("body").optional().isString().isLength({ min: 10 }),
];
