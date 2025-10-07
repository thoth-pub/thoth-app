import { graphql } from '@/gql';

export const PRICE_FRAGMENT = graphql(`
  fragment PriceFragment on Price {
    unitPrice
    priceId
    currencyCode
  }
`);
