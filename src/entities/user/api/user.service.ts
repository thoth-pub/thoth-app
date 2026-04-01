import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';

import { UserDtoMapper } from '../model/user.mapper';
import { GET_USER } from '../model/user.schema';
import { UserDto, UserEntity } from '../model/user.types';

export class UserService extends BaseService<UserEntity, UserDto> {
  constructor(graphqlService: GraphqlService, mapper = new UserDtoMapper()) {
    super(graphqlService, mapper);
  }

  async getUser(): Promise<UserEntity> {
    const { me } = await this.graphqlService.query(GET_USER, {});

    const user = this.dtoMapper.toEntity(me);

    return user;
  }
}
