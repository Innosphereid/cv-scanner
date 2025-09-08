import { CvUploadEntity } from '../../../entities/cv-upload.entity';
import { HandleUploadInput, HandleUploadResult } from '../cv-upload.service';
import { MulterFile, UploadResult } from '../../../utils/uploadFile/types';

// Test data constants
export const TEST_CONSTANTS = {
  USER_ID: '550e8400-e29b-41d4-a716-446655440000',
  UPLOAD_ID: '660e8400-e29b-41d4-a716-446655440001',
  ORIGINAL_FILENAME: 'resume.pdf',
  FILE_SIZE: 1024 * 1024, // 1MB
  CLOUDINARY_PUBLIC_ID: 'cv/550e8400-e29b-41d4-a716-446655440000/uuid-123',
  CLOUDINARY_URL:
    'https://res.cloudinary.com/demo/image/upload/v1725342345/cv/USER123/UUID.pdf',
  FILE_HASH: 'sha256-hash-123',
  REQUEST_ID: 'req-123',
  EXECUTION_TIME: 150,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ACCEPTED_MIME: 'application/pdf',
} as const;

// Mock MulterFile factory
export const createMockMulterFile = (
  overrides: Partial<MulterFile> = {},
): MulterFile => ({
  fieldname: 'cv_file',
  originalname: TEST_CONSTANTS.ORIGINAL_FILENAME,
  encoding: '7bit',
  mimetype: TEST_CONSTANTS.ACCEPTED_MIME,
  size: TEST_CONSTANTS.FILE_SIZE,
  buffer: Buffer.from('mock pdf content'),
  ...overrides,
});

// Mock HandleUploadInput factory
export const createMockHandleUploadInput = (
  overrides: Partial<HandleUploadInput> = {},
): HandleUploadInput => ({
  userId: TEST_CONSTANTS.USER_ID,
  originalFilename: TEST_CONSTANTS.ORIGINAL_FILENAME,
  mimetype: TEST_CONSTANTS.ACCEPTED_MIME,
  size: TEST_CONSTANTS.FILE_SIZE,
  bufferOrPath: Buffer.from('mock pdf content'),
  ...overrides,
});

// Mock HandleUploadResult factory
export const createMockHandleUploadResult = (
  overrides: Partial<HandleUploadResult> = {},
): HandleUploadResult => ({
  id: TEST_CONSTANTS.UPLOAD_ID,
  url: TEST_CONSTANTS.CLOUDINARY_URL,
  isNewUpload: true,
  ...overrides,
});

// Mock UploadResult factory
export const createMockUploadResult = (
  overrides: Partial<UploadResult> = {},
): UploadResult => ({
  url: TEST_CONSTANTS.CLOUDINARY_URL,
  publicId: TEST_CONSTANTS.CLOUDINARY_PUBLIC_ID,
  size: TEST_CONSTANTS.FILE_SIZE,
  format: 'pdf',
  checksum: TEST_CONSTANTS.FILE_HASH,
  ...overrides,
});

// Mock CvUploadEntity factory
export const createMockCvUploadEntity = (
  overrides: Partial<CvUploadEntity> = {},
): CvUploadEntity =>
  ({
    id: TEST_CONSTANTS.UPLOAD_ID,
    userId: TEST_CONSTANTS.USER_ID,
    originalFilename: TEST_CONSTANTS.ORIGINAL_FILENAME,
    fileSizeBytes: TEST_CONSTANTS.FILE_SIZE,
    cloudinaryPublicId: TEST_CONSTANTS.CLOUDINARY_PUBLIC_ID,
    cloudinaryUrl: TEST_CONSTANTS.CLOUDINARY_URL,
    cloudinarySecureUrl: TEST_CONSTANTS.CLOUDINARY_URL,
    fileHash: TEST_CONSTANTS.FILE_HASH,
    parsingStatus: 'pending',
    parsingErrorMessage: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  }) as CvUploadEntity;

// Mock request factory
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
export const createMockRequest = (overrides: any = {}) => ({
  user: { userId: TEST_CONSTANTS.USER_ID },
  requestMetadata: {
    request_id: TEST_CONSTANTS.REQUEST_ID,
    execution_time: TEST_CONSTANTS.EXECUTION_TIME,
  },
  ...overrides,
});

// Mock Cloudinary client factory
export const createMockCloudinaryClient = () => ({
  uploader: {
    upload_stream: jest.fn(),
  },
  config: jest.fn(),
});

// Mock repository factory
export const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

// Mock logger factory
export const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
});

// Test scenarios data
export const TEST_SCENARIOS = {
  FILE_VALIDATION: {
    VALID_PDF: {
      mimetype: 'application/pdf',
      size: 1024 * 1024, // 1MB
      originalname: 'resume.pdf',
    },
    INVALID_MIME: {
      mimetype: 'image/jpeg',
      size: 1024 * 1024,
      originalname: 'image.jpg',
    },
    OVERSIZED_FILE: {
      mimetype: 'application/pdf',
      size: 6 * 1024 * 1024, // 6MB
      originalname: 'large.pdf',
    },
    BOUNDARY_SIZE: {
      mimetype: 'application/pdf',
      size: 5 * 1024 * 1024, // Exactly 5MB
      originalname: 'boundary.pdf',
    },
    EMPTY_FILE: {
      mimetype: 'application/pdf',
      size: 0,
      originalname: 'empty.pdf',
    },
  },
  FILENAMES: {
    NORMAL: 'resume.pdf',
    UNICODE: 'résumé.pdf',
    SPECIAL_CHARS: 'my-cv_v2.0.pdf',
    LONG_NAME: 'a'.repeat(300) + '.pdf',
    MULTIPLE_DOTS: 'my.cv.final.version.pdf',
    EMPTY: '',
  },
  ERROR_MESSAGES: {
    UNSUPPORTED_MEDIA_TYPE: 'Only PDF files are supported',
    FILE_TOO_LARGE: 'File exceeds 5 MB limit',
    AUTH_REQUIRED: 'Authentication required',
    INVALID_TOKEN: 'Invalid or expired access token',
    RATE_LIMIT_EXCEEDED: 'Too many requests',
  },
} as const;

// Helper functions
export const mockDate = (dateString: string): jest.SpyInstance => {
  const mockDate = new Date(dateString);
  return jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
};

export const restoreDate = (): void => {
  jest.restoreAllMocks();
};

export const setEnvironment = (
  env: 'development' | 'production',
): (() => void) => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = env;
  return () => {
    process.env.NODE_ENV = originalEnv;
  };
};

// Mock uploadSingle utility
export const createMockUploadSingle = () => jest.fn();

// Mock SuccessBuilder
export const createMockSuccessBuilder = () => ({
  message: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  metadata: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({
    success: true,
    message: 'Upload successful',
    data: { id: TEST_CONSTANTS.UPLOAD_ID, url: TEST_CONSTANTS.CLOUDINARY_URL },
    metadata: {
      request_id: TEST_CONSTANTS.REQUEST_ID,
      execution_time: TEST_CONSTANTS.EXECUTION_TIME,
    },
    status: 201,
  }),
});

// Mock ErrorBuilder
export const createMockErrorBuilder = () => ({
  message: jest.fn().mockReturnThis(),
  errors: jest.fn().mockReturnThis(),
  metadata: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({
    success: false,
    message: 'Error occurred',
    errors: [],
    metadata: {
      request_id: TEST_CONSTANTS.REQUEST_ID,
      execution_time: TEST_CONSTANTS.EXECUTION_TIME,
    },
    status: 500,
  }),
});
