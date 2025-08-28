export interface ToEntity<EntityType, DtoType> {
  toEntity(dto: DtoType): EntityType;
}

export interface BaseMapper<EntityType, DtoType> {
  toEntity(dto: DtoType): EntityType;
}
