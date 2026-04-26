const path = require("path");
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, colorize, printf, json } = format;

const logsDir = path.resolve(process.env.LOGS_DIR || "logs");

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? JSON.stringify(meta) : "";
    return `${timestamp} [${level}]: ${message} ${extra}`;
});

const logger = createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" })),
    transports: [
        new transports.Console({
            format:
                process.env.NODE_ENV === "production"
                    ? combine(timestamp(), json())
                    : combine(colorize(), timestamp({ format: "HH:mm:ss" }), devFormat),
        }),
        new transports.File({
            filename: path.join(logsDir, "error.log"),
            level: "error",
            format: combine(timestamp(), json()),
        }),
        new transports.File({
            filename: path.join(logsDir, "combined.log"),
            format: combine(timestamp(), json()),
        }),
    ],
});

module.exports = logger;