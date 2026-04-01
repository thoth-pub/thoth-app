import { graphql } from '@/gql';

export const CREATE_PRICE = graphql(`
  mutation CreatePrice($data: NewPrice!) {
    createPrice(data: $data) {
      ...PriceFragment
    }
  }
`);

export const DELETE_PRICE = graphql(`
  mutation DeletePrice($priceId: Uuid!) {
    deletePrice(priceId: $priceId) {
      priceId
    }
  }
`);

export const UPDATE_PRICE = graphql(`
  mutation UpdatePrice($data: PatchPrice!) {
    updatePrice(data: $data) {
      ...PriceFragment
    }
  }
`);
