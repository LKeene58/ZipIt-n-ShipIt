import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

// 🏢 MASTER LOG FOLDER
const MASTER_LOG_DIR = path.join(process.cwd(), 'logs');

// ⚙️ ROTATION CONFIGURATOR WITH DYNAMIC COMPLIANCE
const buildRotator = (folderName: string, retentionTime: string) => {
  return new DailyRotateFile({
    dirname: path.join(MASTER_LOG_DIR, folderName),
    filename: '%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true, 
    maxSize: '20m',      
    maxFiles: retentionTime, // 🛡️ Now it respects the specific legal protocol
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json() 
    )
  });
};

// 🧠 TIERED STORAGE LOGGERS (Legally Compliant Timelines)
// 14 Days: High volume, low value. Delete fast.
const debugLogger = winston.createLogger({ transports: [buildRotator('debug', '14d')] });

// 90 Days: The Standard. Covers Stripe dispute windows.
const operationalLogger = winston.createLogger({ transports: [buildRotator('operational', '90d')] });

// 1 Year: SB 243 AI "Human in the Loop" proof.
const reasoningLogger = winston.createLogger({ transports: [buildRotator('reasoning', '365d')] });

// 7 Years: IRS/SOX Compliance for financial/tax records.
const auditLogger = winston.createLogger({ transports: [buildRotator('audit', '2555d')] });

// Terminal output for your local development
const consoleLogger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          // 100% Type-Safe: No 'any' allowed.
          const safeSource = typeof info.source === 'string' 
            ? info.source.toUpperCase() 
            : 'UNKNOWN';
            
          const safeFunc = typeof info.functionName === 'string' 
            ? info.functionName 
            : 'unknown';
          
          return `[${safeSource}] [${safeFunc}] [${info.level}] ${info.message}`;
        })
      )
    })
  ]
});

// 🛡️ THE WRAPPER (Keeps your existing agent code 100% compatible)
export function auditLog(
  message: string | object, 
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'RAW' | 'COMPLIANCE' | 'REASONING' = 'INFO',
  source: string = 'sourcing',
  functionName: string = 'general'
): void {
  
  // Format the payload for the JSON file
  const logPayload = {
    source,
    functionName,
    level,
    message: typeof message === 'string' ? message : JSON.stringify(message),
  };

  // 🚨 1. Print to Terminal (Unless it's a massive RAW dump)
  if (level !== 'RAW') {
    // We map your custom levels to Winston's standard console colors
    const consoleLevel = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'info';
    consoleLogger.log(consoleLevel, logPayload.message, { source, functionName });
  }

  // 🗂️ 2. Route to the correct Triage File based on the protocol
  try {
    switch (level) {
      case 'ERROR':
        debugLogger.error(logPayload);
        break;
      case 'COMPLIANCE':
        auditLogger.info(logPayload);
        break;
      case 'REASONING':
        reasoningLogger.info(logPayload);
        break;
      default: // INFO, SUCCESS, RAW, WARN
        operationalLogger.info(logPayload);
        break;
    }
  } catch (err) {
    console.error(`💥 FATAL: Watchdog Failed to write async log for ${source}/${functionName}.`, err);
  }
}