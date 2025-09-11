import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CvUploadService } from '../cv-upload.service';
import { CvUploadEntity } from '../../../entities/cv-upload.entity';
import { CLOUDINARY_TOKEN } from '../../../config/cloudinary/cloudinary.module';
import { Logger } from '../../../utils/logger';
import { uploadSingle } from '../../../utils/uploadFile/upload';
import {
  createMockHandleUploadInput,
  createMockUploadResult,
  createMockCvUploadEntity,
  createMockRepository,
  createMockLogger,
  createMockCloudinaryClient,
  TEST_CONSTANTS,
} from './test-utils';

// Mock the uploadSingle utility
jest.mock('../../../utils/uploadFile/upload', () => ({
  uploadSingle: jest.fn(),
}));

// Mock the Logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => createMockLogger()),
}));

describe('CvUploadService', () => {
  let service: CvUploadService;
  let repository: Repository<CvUploadEntity>;
  let cloudinary: any;
  let logger: Logger;

  beforeEach(async () => {
    const mockRepository = createMockRepository();
    const mockCloudinary = createMockCloudinaryClient();
    const mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvUploadService,
        {
          provide: getRepositoryToken(CvUploadEntity),
          useValue: mockRepository,
        },
        {
          provide: CLOUDINARY_TOKEN,
          useValue: mockCloudinary,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CvUploadService>(CvUploadService);
    repository = module.get<Repository<CvUploadEntity>>(getRepositoryToken(CvUploadEntity));
    cloudinary = module.get(CLOUDINARY_TOKEN);
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleUpload', () => {
    describe('Successful Upload Processing', () => {
      it('should return HandleUploadResult with ID and URL', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput();
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity();
        const mockSavedEntity = { ...mockEntity, id: TEST_CONSTANTS.UPLOAD_ID };

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mockSavedEntity as any);

        // Act
        const result = await service.handleUpload(mockInput);

        // Assert
        expect(uploadSingle).toHaveBeenCalledWith(
          cloudinary,
          logger,
          mockInput.bufferOrPath,
          {
            folderPrefix: expect.stringMatching(/^cv\/[a-f0-9-]+\/[a-f0-9-]+$/),
            resourceType: 'auto',
            maxAttempts: 3,
            attemptDelayMs: 500,
          },
        );

        expect(repository.create).toHaveBeenCalledWith({
          userId: mockInput.userId,
          originalFilename: mockInput.originalFilename,
          fileSizeBytes: mockInput.size,
          cloudinaryPublicId: mockUploadResult.publicId,
          cloudinaryUrl: mockUploadResult.url,
          cloudinarySecureUrl: mockUploadResult.url,
          fileHash: mockUploadResult.checksum,
          parsingStatus: 'pending',
          parsingErrorMessage: null,
        });

        expect(repository.save).toHaveBeenCalledWith(mockEntity);

        expect(logger.info).toHaveBeenCalledWith('CV upload persisted', {
          userId: mockInput.userId,
          uploadId: mockSavedEntity.id,
          publicId: mockUploadResult.publicId,
        });

        expect(result).toEqual({
          id: mockSavedEntity.id,
          url: mockUploadResult.url,
        });
      });

      it('should generate unique folder prefix for each upload', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput();
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity();
        const mockSavedEntity = { ...mockEntity, id: TEST_CONSTANTS.UPLOAD_ID };

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mockSavedEntity as any);

        // Act
        await service.handleUpload(mockInput);

        // Assert
        const uploadCalls = (uploadSingle as jest.Mock).mock.calls;
        const folderPrefix = uploadCalls[0][3].folderPrefix;
        
        expect(folderPrefix).toMatch(/^cv\/[a-f0-9-]+\/[a-f0-9-]+$/);
        expect(folderPrefix).toContain(mockInput.userId);
      });
    });

    describe('Cloudinary Upload Failures', () => {
      it('should propagate Cloudinary error when upload fails', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput();
        const cloudinaryError = new Error('Cloudinary service unavailable');

        (uploadSingle as jest.Mock).mockRejectedValue(cloudinaryError);

        // Act & Assert
        await expect(service.handleUpload(mockInput)).rejects.toThrow(cloudinaryError);
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
      });

      it('should propagate Cloudinary error after retries exhausted', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput();
        const retryError = new Error('Upload failed after retries');

        (uploadSingle as jest.Mock).mockRejectedValue(retryError);

        // Act & Assert
        await expect(service.handleUpload(mockInput)).rejects.toThrow(retryError);
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
      });

      it('should not create database record when Cloudinary fails', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput();
        const networkError = new Error('Network timeout');

        (uploadSingle as jest.Mock).mockRejectedValue(networkError);

        // Act & Assert
        await expect(service.handleUpload(mockInput)).rejects.toThrow(networkError);
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
      });
    });

    describe('Database Save Failures', () => {
      it('should propagate database error when save fails', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput();
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity();
        const databaseError = new Error('Database connection failed');

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockRejectedValue(databaseError);

        // Act & Assert
        await expect(service.handleUpload(mockInput)).rejects.toThrow(databaseError);
        expect(uploadSingle).toHaveBeenCalled();
        expect(repository.create).toHaveBeenCalled();
        expect(repository.save).toHaveBeenCalled();
      });

      it('should not rollback Cloudinary upload when database fails', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput();
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity();
        const databaseError = new Error('Database save failed');

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockRejectedValue(databaseError);

        // Act & Assert
        await expect(service.handleUpload(mockInput)).rejects.toThrow(databaseError);
        
        // Cloudinary upload should have completed successfully
        expect(uploadSingle).toHaveBeenCalled();
        expect(uploadSingle).toHaveReturnedTimes(1);
      });
    });

    describe('Invalid Input Handling', () => {
      it('should handle missing userId by using empty string in folder prefix', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput({ userId: '' });
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity();
        const mockSavedEntity = { ...mockEntity, id: TEST_CONSTANTS.UPLOAD_ID };

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mockSavedEntity as any);

        // Act
        const result = await service.handleUpload(mockInput);

        // Assert
        expect(uploadSingle).toHaveBeenCalledWith(
          cloudinary,
          logger,
          mockInput.bufferOrPath,
          expect.objectContaining({
            folderPrefix: expect.stringMatching(/^cv\/\/[a-f0-9-]+$/), // Empty userId results in double slash
          }),
        );
        expect(result).toEqual({
          id: mockSavedEntity.id,
          url: mockUploadResult.url,
        });
      });

      it('should handle null userId by using "null" string in folder prefix', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput({ userId: null as any });
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity();
        const mockSavedEntity = { ...mockEntity, id: TEST_CONSTANTS.UPLOAD_ID };

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mockSavedEntity as any);

        // Act
        const result = await service.handleUpload(mockInput);

        // Assert
        expect(uploadSingle).toHaveBeenCalledWith(
          cloudinary,
          logger,
          mockInput.bufferOrPath,
          expect.objectContaining({
            folderPrefix: expect.stringMatching(/^cv\/null\/[a-f0-9-]+$/),
          }),
        );
        expect(result).toEqual({
          id: mockSavedEntity.id,
          url: mockUploadResult.url,
        });
      });

      it('should handle missing file buffer by passing null to uploadSingle', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput({ bufferOrPath: null as any });
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity();
        const mockSavedEntity = { ...mockEntity, id: TEST_CONSTANTS.UPLOAD_ID };

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mockSavedEntity as any);

        // Act
        const result = await service.handleUpload(mockInput);

        // Assert
        expect(uploadSingle).toHaveBeenCalledWith(
          cloudinary,
          logger,
          null,
          expect.objectContaining({
            folderPrefix: expect.stringMatching(/^cv\/[a-f0-9-]+\/[a-f0-9-]+$/),
          }),
        );
        expect(result).toEqual({
          id: mockSavedEntity.id,
          url: mockUploadResult.url,
        });
      });

      it('should handle empty file buffer by passing empty buffer to uploadSingle', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput({ bufferOrPath: Buffer.alloc(0) });
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity();
        const mockSavedEntity = { ...mockEntity, id: TEST_CONSTANTS.UPLOAD_ID };

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mockSavedEntity as any);

        // Act
        const result = await service.handleUpload(mockInput);

        // Assert
        expect(uploadSingle).toHaveBeenCalledWith(
          cloudinary,
          logger,
          Buffer.alloc(0),
          expect.objectContaining({
            folderPrefix: expect.stringMatching(/^cv\/[a-f0-9-]+\/[a-f0-9-]+$/),
          }),
        );
        expect(result).toEqual({
          id: mockSavedEntity.id,
          url: mockUploadResult.url,
        });
      });
    });

    describe('Concurrent Uploads', () => {
      it('should handle multiple simultaneous uploads from same user', async () => {
        // Arrange
        const mockInput1 = createMockHandleUploadInput({ originalFilename: 'resume1.pdf' });
        const mockInput2 = createMockHandleUploadInput({ originalFilename: 'resume2.pdf' });
        const mockUploadResult1 = createMockUploadResult({ publicId: 'cv/user/uuid1' });
        const mockUploadResult2 = createMockUploadResult({ publicId: 'cv/user/uuid2' });
        const mockEntity1 = createMockCvUploadEntity({ id: 'upload1' });
        const mockEntity2 = createMockCvUploadEntity({ id: 'upload2' });

        (uploadSingle as jest.Mock)
          .mockResolvedValueOnce(mockUploadResult1)
          .mockResolvedValueOnce(mockUploadResult2);
        
        jest.spyOn(repository, 'create')
          .mockReturnValueOnce(mockEntity1 as any)
          .mockReturnValueOnce(mockEntity2 as any);
        
        jest.spyOn(repository, 'save')
          .mockResolvedValueOnce(mockEntity1 as any)
          .mockResolvedValueOnce(mockEntity2 as any);

        // Act
        await Promise.all([
          service.handleUpload(mockInput1),
          service.handleUpload(mockInput2),
        ]);

        // Assert
        expect(uploadSingle).toHaveBeenCalledTimes(2);
        expect(repository.create).toHaveBeenCalledTimes(2);
        expect(repository.save).toHaveBeenCalledTimes(2);

        // Verify different folder prefixes were generated
        const uploadCalls = (uploadSingle as jest.Mock).mock.calls;
        const folderPrefix1 = uploadCalls[0][3].folderPrefix;
        const folderPrefix2 = uploadCalls[1][3].folderPrefix;
        
        expect(folderPrefix1).not.toEqual(folderPrefix2);
        expect(folderPrefix1).toContain(mockInput1.userId);
        expect(folderPrefix2).toContain(mockInput2.userId);
      });

      it('should handle concurrent uploads with different users', async () => {
        // Arrange
        const user1Id = 'user1-id';
        const user2Id = 'user2-id';
        const mockInput1 = createMockHandleUploadInput({ userId: user1Id });
        const mockInput2 = createMockHandleUploadInput({ userId: user2Id });
        const mockUploadResult1 = createMockUploadResult();
        const mockUploadResult2 = createMockUploadResult();
        const mockEntity1 = createMockCvUploadEntity();
        const mockEntity2 = createMockCvUploadEntity();

        (uploadSingle as jest.Mock)
          .mockResolvedValueOnce(mockUploadResult1)
          .mockResolvedValueOnce(mockUploadResult2);
        
        jest.spyOn(repository, 'create')
          .mockReturnValueOnce(mockEntity1 as any)
          .mockReturnValueOnce(mockEntity2 as any);
        
        jest.spyOn(repository, 'save')
          .mockResolvedValueOnce(mockEntity1 as any)
          .mockResolvedValueOnce(mockEntity2 as any);

        // Act
        await Promise.all([
          service.handleUpload(mockInput1),
          service.handleUpload(mockInput2),
        ]);

        // Assert
        expect(uploadSingle).toHaveBeenCalledTimes(2);
        expect(repository.create).toHaveBeenCalledTimes(2);
        expect(repository.save).toHaveBeenCalledTimes(2);

        // Verify different user IDs in folder prefixes
        const uploadCalls = (uploadSingle as jest.Mock).mock.calls;
        const folderPrefix1 = uploadCalls[0][3].folderPrefix;
        const folderPrefix2 = uploadCalls[1][3].folderPrefix;
        
        expect(folderPrefix1).toContain(user1Id);
        expect(folderPrefix2).toContain(user2Id);
        expect(folderPrefix1).not.toEqual(folderPrefix2);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long filenames', async () => {
        // Arrange
        const longFilename = 'a'.repeat(300) + '.pdf';
        const mockInput = createMockHandleUploadInput({ originalFilename: longFilename });
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity({ originalFilename: longFilename });
        const mockSavedEntity = { ...mockEntity, id: TEST_CONSTANTS.UPLOAD_ID };

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mockSavedEntity as any);

        // Act
        const result = await service.handleUpload(mockInput);

        // Assert
        expect(repository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            originalFilename: longFilename,
          }),
        );
        expect(result).toEqual({
          id: mockSavedEntity.id,
          url: mockUploadResult.url,
        });
      });

      it('should handle special characters in filename', async () => {
        // Arrange
        const specialFilename = 'résumé-cv_v2.0.pdf';
        const mockInput = createMockHandleUploadInput({ originalFilename: specialFilename });
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity({ originalFilename: specialFilename });
        const mockSavedEntity = { ...mockEntity, id: TEST_CONSTANTS.UPLOAD_ID };

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mockSavedEntity as any);

        // Act
        const result = await service.handleUpload(mockInput);

        // Assert
        expect(repository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            originalFilename: specialFilename,
          }),
        );
        expect(result).toEqual({
          id: mockSavedEntity.id,
          url: mockUploadResult.url,
        });
      });

      it('should handle empty filename', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput({ originalFilename: '' });
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity({ originalFilename: '' });
        const mockSavedEntity = { ...mockEntity, id: TEST_CONSTANTS.UPLOAD_ID };

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mockSavedEntity as any);

        // Act
        const result = await service.handleUpload(mockInput);

        // Assert
        expect(repository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            originalFilename: '',
          }),
        );
        expect(result).toEqual({
          id: mockSavedEntity.id,
          url: mockUploadResult.url,
        });
      });
    });

    describe('Upload Configuration', () => {
      it('should call uploadSingle with correct configuration', async () => {
        // Arrange
        const mockInput = createMockHandleUploadInput();
        const mockUploadResult = createMockUploadResult();
        const mockEntity = createMockCvUploadEntity();
        const mockSavedEntity = { ...mockEntity, id: TEST_CONSTANTS.UPLOAD_ID };

        (uploadSingle as jest.Mock).mockResolvedValue(mockUploadResult);
        jest.spyOn(repository, 'create').mockReturnValue(mockEntity as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mockSavedEntity as any);

        // Act
        await service.handleUpload(mockInput);

        // Assert
        expect(uploadSingle).toHaveBeenCalledWith(
          cloudinary,
          logger,
          mockInput.bufferOrPath,
          {
            folderPrefix: expect.stringMatching(/^cv\/[a-f0-9-]+\/[a-f0-9-]+$/),
            resourceType: 'auto',
            maxAttempts: 3,
            attemptDelayMs: 500,
          },
        );
      });
    });
  });
});
