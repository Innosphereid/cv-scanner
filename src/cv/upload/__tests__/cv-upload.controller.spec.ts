import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CvUploadController } from '../cv-upload.controller';
import { CvUploadService } from '../cv-upload.service';
import { Logger } from '../../../utils/logger';
import { SuccessBuilder } from '../../../utils/responses/success';
import { AccessTokenGuard } from '../../../auth/login/guards/access-token.guard';
import {
  createMockMulterFile,
  createMockRequest,
  createMockHandleUploadResult,
  createMockSuccessBuilder,
  TEST_CONSTANTS,
  TEST_SCENARIOS,
} from './test-utils';

// Mock the entire rate-limiter module
jest.mock('../../../middlewares/rate-limiter', () => ({
  RateLimitInterceptor: jest.fn(),
  RateLimit: jest.fn(() => () => {}),
}));

// Mock the SuccessBuilder
jest.mock('../../../utils/responses/success', () => ({
  SuccessBuilder: jest.fn(),
}));

// Mock the Logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  })),
}));

describe('CvUploadController', () => {
  let controller: CvUploadController;
  let service: CvUploadService;
  let mockSuccessBuilder: any;

  beforeEach(async () => {
    const mockService = {
      handleUpload: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CvUploadController],
      providers: [
        {
          provide: CvUploadService,
          useValue: mockService,
        },
        {
          provide: Logger,
          useValue: new Logger(),
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CvUploadController>(CvUploadController);
    service = module.get<CvUploadService>(CvUploadService);

    // Mock SuccessBuilder
    mockSuccessBuilder = createMockSuccessBuilder();
    (SuccessBuilder as jest.Mock).mockImplementation(() => mockSuccessBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadCv', () => {
    describe('Successful CV Upload', () => {
      it('should return 201 Created with upload ID and URL', async () => {
        // Arrange
        const mockFile = createMockMulterFile();
        const mockRequest = createMockRequest();
        const mockServiceResult = createMockHandleUploadResult();

        jest.spyOn(service, 'handleUpload').mockResolvedValue(mockServiceResult);

        // Act
        const result = await controller.uploadCv(mockFile, mockRequest);

        // Assert
        expect(service.handleUpload).toHaveBeenCalledWith({
          userId: TEST_CONSTANTS.USER_ID,
          originalFilename: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
          bufferOrPath: mockFile.buffer,
        });

        expect(SuccessBuilder).toHaveBeenCalledWith();
        expect(mockSuccessBuilder.message).toHaveBeenCalledWith('Upload successful');
        expect(mockSuccessBuilder.data).toHaveBeenCalledWith({
          id: mockServiceResult.id,
          url: mockServiceResult.url,
        });
        expect(mockSuccessBuilder.metadata).toHaveBeenCalledWith(mockRequest.requestMetadata);
        expect(mockSuccessBuilder.status).toHaveBeenCalledWith(HttpStatus.CREATED);
        expect(result).toEqual(mockSuccessBuilder.build());
      });
    });

    describe('Authentication Failures', () => {
      it('should handle missing user by using empty userId', async () => {
        // Arrange
        const mockFile = createMockMulterFile();
        const mockRequest = createMockRequest({ user: undefined });
        const mockServiceResult = createMockHandleUploadResult();

        jest.spyOn(service, 'handleUpload').mockResolvedValue(mockServiceResult);

        // Act
        const result = await controller.uploadCv(mockFile, mockRequest);

        // Assert
        expect(service.handleUpload).toHaveBeenCalledWith({
          userId: '', // Empty string when user is undefined
          originalFilename: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
          bufferOrPath: mockFile.buffer,
        });
        expect(result).toEqual(mockSuccessBuilder.build());
      });

      it('should handle empty userId by passing empty string to service', async () => {
        // Arrange
        const mockFile = createMockMulterFile();
        const mockRequest = createMockRequest({ user: { userId: '' } });
        const mockServiceResult = createMockHandleUploadResult();

        jest.spyOn(service, 'handleUpload').mockResolvedValue(mockServiceResult);

        // Act
        const result = await controller.uploadCv(mockFile, mockRequest);

        // Assert
        expect(service.handleUpload).toHaveBeenCalledWith({
          userId: '', // Empty string
          originalFilename: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
          bufferOrPath: mockFile.buffer,
        });
        expect(result).toEqual(mockSuccessBuilder.build());
      });
    });

    describe('File Validation Failures', () => {
      it('should throw HttpException 415 for wrong MIME type', async () => {
        // Arrange
        const mockFile = createMockMulterFile({
          mimetype: 'image/jpeg',
        });
        const mockRequest = createMockRequest();

        // Act & Assert
        await expect(controller.uploadCv(mockFile, mockRequest)).rejects.toThrow(
          new HttpException(TEST_SCENARIOS.ERROR_MESSAGES.UNSUPPORTED_MEDIA_TYPE, 415),
        );
        expect(service.handleUpload).not.toHaveBeenCalled();
      });

      it('should throw HttpException 413 for file too large', async () => {
        // Arrange
        const mockFile = createMockMulterFile({
          size: 6 * 1024 * 1024, // 6MB
        });
        const mockRequest = createMockRequest();

        // Act & Assert
        await expect(controller.uploadCv(mockFile, mockRequest)).rejects.toThrow(
          new HttpException(TEST_SCENARIOS.ERROR_MESSAGES.FILE_TOO_LARGE, 413),
        );
        expect(service.handleUpload).not.toHaveBeenCalled();
      });

      it('should throw HttpException 415 for server-side MIME check', async () => {
        // Arrange
        const mockFile = createMockMulterFile({
          mimetype: 'text/plain', // Wrong MIME type
        });
        const mockRequest = createMockRequest();

        // Act & Assert
        await expect(controller.uploadCv(mockFile, mockRequest)).rejects.toThrow(
          new HttpException(TEST_SCENARIOS.ERROR_MESSAGES.UNSUPPORTED_MEDIA_TYPE, 415),
        );
        expect(service.handleUpload).not.toHaveBeenCalled();
      });

      it('should throw HttpException 413 for server-side size check', async () => {
        // Arrange
        const mockFile = createMockMulterFile({
          size: 6 * 1024 * 1024, // 6MB
        });
        const mockRequest = createMockRequest();

        // Act & Assert
        await expect(controller.uploadCv(mockFile, mockRequest)).rejects.toThrow(
          new HttpException(TEST_SCENARIOS.ERROR_MESSAGES.FILE_TOO_LARGE, 413),
        );
        expect(service.handleUpload).not.toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      it('should handle missing file field', async () => {
        // Arrange
        const mockFile = undefined as any;
        const mockRequest = createMockRequest();

        // Act & Assert
        await expect(controller.uploadCv(mockFile, mockRequest)).rejects.toThrow();
        expect(service.handleUpload).not.toHaveBeenCalled();
      });

      it('should handle empty file buffer', async () => {
        // Arrange
        const mockFile = createMockMulterFile({
          buffer: Buffer.alloc(0),
        });
        const mockRequest = createMockRequest();
        const mockServiceResult = createMockHandleUploadResult();

        jest.spyOn(service, 'handleUpload').mockResolvedValue(mockServiceResult);

        // Act
        const result = await controller.uploadCv(mockFile, mockRequest);

        // Assert
        expect(service.handleUpload).toHaveBeenCalledWith({
          userId: TEST_CONSTANTS.USER_ID,
          originalFilename: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
          bufferOrPath: Buffer.alloc(0),
        });
        expect(result).toEqual(mockSuccessBuilder.build());
      });

      it('should handle undefined file buffer', async () => {
        // Arrange
        const mockFile = createMockMulterFile({
          buffer: undefined,
        });
        const mockRequest = createMockRequest();
        const mockServiceResult = createMockHandleUploadResult();

        jest.spyOn(service, 'handleUpload').mockResolvedValue(mockServiceResult);

        // Act
        const result = await controller.uploadCv(mockFile, mockRequest);

        // Assert
        expect(service.handleUpload).toHaveBeenCalledWith({
          userId: TEST_CONSTANTS.USER_ID,
          originalFilename: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
          bufferOrPath: '',
        });
        expect(result).toEqual(mockSuccessBuilder.build());
      });
    });

    describe('Service Upload Failures', () => {
      it('should propagate service error when handleUpload fails', async () => {
        // Arrange
        const mockFile = createMockMulterFile();
        const mockRequest = createMockRequest();
        const serviceError = new Error('Cloudinary upload failed');

        jest.spyOn(service, 'handleUpload').mockRejectedValue(serviceError);

        // Act & Assert
        await expect(controller.uploadCv(mockFile, mockRequest)).rejects.toThrow(serviceError);
        expect(service.handleUpload).toHaveBeenCalled();
      });

      it('should propagate database error when save fails', async () => {
        // Arrange
        const mockFile = createMockMulterFile();
        const mockRequest = createMockRequest();
        const databaseError = new Error('Database connection failed');

        jest.spyOn(service, 'handleUpload').mockRejectedValue(databaseError);

        // Act & Assert
        await expect(controller.uploadCv(mockFile, mockRequest)).rejects.toThrow(databaseError);
        expect(service.handleUpload).toHaveBeenCalled();
      });
    });

    describe('Boundary Testing', () => {
      it('should accept file with exactly 5MB size', async () => {
        // Arrange
        const mockFile = createMockMulterFile({
          size: TEST_CONSTANTS.MAX_FILE_SIZE, // Exactly 5MB
        });
        const mockRequest = createMockRequest();
        const mockServiceResult = createMockHandleUploadResult();

        jest.spyOn(service, 'handleUpload').mockResolvedValue(mockServiceResult);

        // Act
        const result = await controller.uploadCv(mockFile, mockRequest);

        // Assert
        expect(service.handleUpload).toHaveBeenCalledWith({
          userId: TEST_CONSTANTS.USER_ID,
          originalFilename: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
          bufferOrPath: mockFile.buffer,
        });
        expect(result).toEqual(mockSuccessBuilder.build());
      });

      it('should accept file with size just under 5MB', async () => {
        // Arrange
        const mockFile = createMockMulterFile({
          size: TEST_CONSTANTS.MAX_FILE_SIZE - 1, // Just under 5MB
        });
        const mockRequest = createMockRequest();
        const mockServiceResult = createMockHandleUploadResult();

        jest.spyOn(service, 'handleUpload').mockResolvedValue(mockServiceResult);

        // Act
        const result = await controller.uploadCv(mockFile, mockRequest);

        // Assert
        expect(service.handleUpload).toHaveBeenCalledWith({
          userId: TEST_CONSTANTS.USER_ID,
          originalFilename: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
          bufferOrPath: mockFile.buffer,
        });
        expect(result).toEqual(mockSuccessBuilder.build());
      });
    });

    describe('Request Metadata Handling', () => {
      it('should handle missing request metadata', async () => {
        // Arrange
        const mockFile = createMockMulterFile();
        const mockRequest = createMockRequest({ requestMetadata: undefined });
        const mockServiceResult = createMockHandleUploadResult();

        jest.spyOn(service, 'handleUpload').mockResolvedValue(mockServiceResult);

        // Act
        const result = await controller.uploadCv(mockFile, mockRequest);

        // Assert
        expect(mockSuccessBuilder.metadata).toHaveBeenCalledWith({
          request_id: '',
          execution_time: 0,
        });
        expect(result).toEqual(mockSuccessBuilder.build());
      });

      it('should handle partial request metadata', async () => {
        // Arrange
        const mockFile = createMockMulterFile();
        const mockRequest = createMockRequest({
          requestMetadata: { request_id: 'req-456' },
        });
        const mockServiceResult = createMockHandleUploadResult();

        jest.spyOn(service, 'handleUpload').mockResolvedValue(mockServiceResult);

        // Act
        const result = await controller.uploadCv(mockFile, mockRequest);

        // Assert
        expect(mockSuccessBuilder.metadata).toHaveBeenCalledWith({
          request_id: 'req-456',
        });
        expect(result).toEqual(mockSuccessBuilder.build());
      });
    });

    describe('File Validation Edge Cases', () => {
      it.each([
        ['image/jpeg', 'image/jpeg'],
        ['text/plain', 'text/plain'],
        ['application/msword', 'application/msword'],
        ['image/png', 'image/png'],
      ])('should reject non-PDF MIME type: %s', async (mimetype) => {
        // Arrange
        const mockFile = createMockMulterFile({ mimetype });
        const mockRequest = createMockRequest();

        // Act & Assert
        await expect(controller.uploadCv(mockFile, mockRequest)).rejects.toThrow(
          new HttpException(TEST_SCENARIOS.ERROR_MESSAGES.UNSUPPORTED_MEDIA_TYPE, 415),
        );
        expect(service.handleUpload).not.toHaveBeenCalled();
      });

      it.each([
        [6 * 1024 * 1024, '6MB'],
        [10 * 1024 * 1024, '10MB'],
        [100 * 1024 * 1024, '100MB'],
      ])('should reject oversized files: %d bytes (%s)', async (size, description) => {
        // Arrange
        const mockFile = createMockMulterFile({ size });
        const mockRequest = createMockRequest();

        // Act & Assert
        await expect(controller.uploadCv(mockFile, mockRequest)).rejects.toThrow(
          new HttpException(TEST_SCENARIOS.ERROR_MESSAGES.FILE_TOO_LARGE, 413),
        );
        expect(service.handleUpload).not.toHaveBeenCalled();
      });
    });
  });
});
