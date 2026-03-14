import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// 🏢 MASTER LOG FOLDER
const MASTER_LOG_DIR = path.join(process.cwd(), 'logs');

/**
 * 🛡️ SECURITY FIX: Path Traversal Protection
 * Removes any characters that could be used to navigate directories (like .. or /)
 */
const sanitizeFolderName = (name: string) => {
  return name.replace(/[^a-zA-Z0-9_-]/g, '');
};

// ⚙️ ROTATION CONFIGURATOR WITH DYNAMIC COMPLIANCE
const buildRotator = (folderName: string, retentionTime: string) => {
  // Sanitize the input before joining paths
  const safeFolder = sanitizeFolderName(folderName);
  const logPath = path.join(MASTER_LOG_DIR, safeFolder);

  // Ensure the specific tiered directory exists safely
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
  }

  return new DailyRotateFile({
    dirname: logPath,
    filename: '%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true, 
    maxSize: '20m',      
    maxFiles: retentionTime, // 🛡️ Respects specific legal protocols
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json() 
    )
  });
};

// 🧠 TIERED STORAGE LOGGERS (Legally Compliant Timelines)
// 14 Days: High volume, low value.
const debugLogger = winston.createLogger({ transports: [buildRotator('debug', '14d')] });

// 90 Days: The Standard. Covers Stripe dispute windows.
const operationalLogger = winston.createLogger({ transports: [buildRotator('operational', '90d')] });

// 1 Year: SB 243 AI "Human in the Loop" proof.
const reasoningLogger = winston.createLogger({ transports: [buildRotator('reasoning', '365d')] });

// 7 Years: IRS/SOX Compliance for financial/tax records.
const auditLogger = winston.createLogger({ transports: [buildRotator('audit', '2555d')] });

// Terminal output for local development
const consoleLogger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          const safeSource = typeof info.source === 'string' ? info.source.toUpperCase() : 'UNKNOWN';
          const safeFunc = typeof info.functionName === 'string' ? info.functionName : 'unknown';
          
          // 🛡️ SECURITY FIX: Using standard string arguments to prevent format-string injection
          return `[${safeSource}] [${safeFunc}] [${info.level}] ${info.message}`;
        })
      )
    })
  ]
});

/**
 * 🛡️ THE WRAPPER 
 * Keeps existing agent code 100% compatible.
 */
export function auditLog(
  message: string | object, 
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'RAW' | 'COMPLIANCE' | 'REASONING' = 'INFO',
  source: string = 'sourcing',
  functionName: string = 'general'
): void {
  
  const logPayload = {
    source,
    functionName,
    level,
    message: typeof message === 'string' ? message : JSON.stringify(message),
  };

  // 🚨 1. Print to Terminal (Unless it's a massive RAW dump)
  if (level !== 'RAW') {
    const consoleLevel = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'info';
    // Passing payload data separately to Winston ensures safe formatting
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
    // 🛡️ SECURITY FIX: Prevent log-forging by using %s instead of direct interpolation in error logs
    console.error('💥 FATAL: Watchdog Failed to write async log for %s/%s.', source, functionName, err);
  }
}