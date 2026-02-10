import { QueryToken } from '@/src/shared';
import { BaseService } from '@/src/shared/interfaces/services';

import { UserDtoMapper } from '../model/user.mapper';
import { GET_USER } from '../model/user.schema';
import { UserDto, UserEntity } from '../model/user.types';

export class UserService extends BaseService<UserEntity, UserDto> {
  constructor(mapper = new UserDtoMapper()) {
    super(mapper);
  }

  async getUser(token: QueryToken): Promise<UserEntity> {
    const { me } = await this.graphqlService.query(GET_USER, {}, token);

    const user = this.dtoMapper.toEntity(me);

    return user;
  }
}
