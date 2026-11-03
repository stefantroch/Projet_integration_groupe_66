import { Test, TestingModule } from '@nestjs/testing';
import { BadgesController } from './badges.controller.js';
import { BadgesService } from './badges.service.js';

describe('BadgesController', () => {
  let controller: BadgesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BadgesController],
      providers: [BadgesService],
    }).compile();

    controller = module.get<BadgesController>(BadgesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
