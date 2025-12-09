export const logger = {
    info: (msg: string, ...args: any[]) => console.log(`ℹ️  ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`⚠️  ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`❌ ${msg}`, ...args),
    success: (msg: string, ...args: any[]) => console.log(`✅ ${msg}`, ...args),
};
