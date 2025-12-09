export interface ToEntity<EntityType, DtoType> {
  toEntity(dto: DtoType): EntityType;
}

export interface ToDto<EntityType, DtoType> {
  toDto(entity: EntityType): Partial<DtoType>;
}

export interface BaseMapper<EntityType, DtoType> {
  toEntity(dto: DtoType): EntityType;
  // TODO: remove partial
  toDto: (entity: EntityType) => Partial<DtoType> | DtoType;
}
