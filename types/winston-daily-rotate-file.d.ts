declare module 'winston-daily-rotate-file' {
  import TransportStream from 'winston-transport';

  export interface DailyRotateFileOptions {
    filename?: string;
    datePattern?: string;
    zippedArchive?: boolean;
    maxSize?: string | number;
    maxFiles?: string | number;
    level?: string;
    dirname?: string;
    auditFile?: string;
    extension?: string;
    utc?: boolean;
    createSymlink?: boolean;
    symlinkName?: string;
    format?: unknown;
  }

  export default class DailyRotateFile extends TransportStream {
    constructor(options?: DailyRotateFileOptions);
  }
}
