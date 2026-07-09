import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { UserDtoMapper } from '../model/user.mapper';
import type { UserDto, UserEntity } from '../model/user.types';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: UserDtoMapper;

  const createEntity = (overrides?: Partial<UserEntity>): UserEntity => ({
    id: faker.string.uuid(),
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isSuperuser: false,
    linkedPublishers: [],
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new UserDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: UserEntity) => ({
      userId: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      isSuperuser: entity.isSuperuser,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: UserDto) => ({
      id: dto.userId,
      email: dto.email ?? '',
      firstName: dto.firstName ?? '',
      lastName: dto.lastName ?? '',
      isSuperuser: dto.isSuperuser,
      linkedPublishers: [],
    }));

    service = new UserService(mockGraphqlService, mockMapper);
  });

  describe('getUser', () => {
    it('should call query and return mapped entity', async () => {
      const userId = faker.string.uuid();

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        me: {
          userId,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          isSuperuser: false,
          publisherContexts: [],
        },
      });

      const result = await service.getUser();

      expect(mockGraphqlService.query).toHaveBeenCalledWith(expect.anything(), {});
      expect(result.id).toBe(userId);
    });

    it('should use mapper toEntity on the result', async () => {
      const dto = {
        userId: faker.string.uuid(),
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        isSuperuser: true,
        publisherContexts: [],
      };

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({ me: dto });

      const spy = vi.spyOn(mockMapper, 'toEntity');

      await service.getUser();

      expect(spy).toHaveBeenCalledWith(dto);
    });
  });
});
