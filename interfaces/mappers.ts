export interface ToEntity<EntityType, DtoType> {
  toEntity(dto: DtoType): EntityType;
}
