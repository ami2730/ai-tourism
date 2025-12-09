import dotenv from "dotenv"
dotenv.config()

function getEnv (key : string , required = true): string {
    const value = process.env[key];
    if (!value && required) {
        throw new Error(`missing env variable ${key} `);
    }

    return value as string
}


export const env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: getEnv("PORT"),
    DATABASE_URL: getEnv("DATABASE_URL"),
    JWT_SECRET: getEnv("JWT_SECRET"),
    ML_URL: getEnv("ML_URL"),
    CHAPA_SECRET_KEY: getEnv("CHAPA_SECRET_KEY"),
    CHAPA_INIT_URL: getEnv("CHAPA_INIT_URL"),
    CHAPA_VERIFY_URL: getEnv("CHAPA_VERIFY_URL"),
    CHAPA_CALLBACK_PATH: getEnv("CHAPA_CALLBACK_PATH"),
    INVOICE_TEMPLATE_PATH: getEnv("INVOICE_TEMPLATE_PATH"),
    CHAPA_RETURN_URL: getEnv("CHAPA_RETURN_URL"),
    BACKEND_URL :getEnv("BACKEND_URL"),
    CHAPA_WEBHOOK_SECRET :getEnv("CHAPA_WEBHOOK_SECRET"),
    CHAPA_WEBHOOK_HEADER :getEnv("CHAPA_WEBHOOK_HEADER"),
    UPLOAD_LOCAL_PATH : getEnv("UPLOAD_LOCAL_PATH"),
    CLOUDINARY_API_KEY: getEnv("CLOUDINARY_API_KEY"),
    FRONTEND_URL : getEnv("FRONTEND_URL"),
    CLOUDINARY_API_SECRET: getEnv("CLOUDINARY_API_SECRET"),
    CLOUDINARY_CLOUD_NAME: getEnv("CLOUDINARY_CLOUD_NAME"),
    UPLOAD_DRIVER:getEnv("UPLOAD_DRIVER"),
    JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN"),
    ML_SECRET:getEnv("ML_SECRET"),
    REFRESH_TOKEN_SECRET: getEnv("REFRESH_TOKEN_SECRET"),
    REFRESH_TOKEN_EXPIRES_IN: getEnv("REFRESH_TOKEN_EXPIRES_IN"),
    GEMINI_ENDPOINT:getEnv("GEMINI_ENDPOINT"),
    GEMINI_API_KEY:getEnv("GEMINI_API_KEY"),
    GEMINI_MODEL:getEnv("GEMINI_MODEL"),
    CHAT_MEMORY_MESSAGES:getEnv("CHAT_MEMORY_MESSAGES"),
    ML_SERVICE_URL:getEnv("ML_SERVICE_URL")

};