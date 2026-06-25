import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DatabaseService } from '../database/database.service';

describe('HealthController', () => {
  it('reports ok when the database responds', async () => {
    const databaseMock = { db: { execute: jest.fn().mockResolvedValue(undefined) } };
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DatabaseService, useValue: databaseMock }],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
    expect(databaseMock.db.execute).toHaveBeenCalled();
  });

  it('reports degraded when the database throws', async () => {
    const databaseMock = { db: { execute: jest.fn().mockRejectedValue(new Error('down')) } };
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DatabaseService, useValue: databaseMock }],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.db).toBe('down');
  });
});
