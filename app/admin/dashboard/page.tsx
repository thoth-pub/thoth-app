import { graphql } from '@/gql';
import { query } from '@/utils';

const GET_BOOKS_COUNT = graphql(`
  query GetBooksCount {
    bookCount
  }
`);

export default async function DashboardPage() {
  const { data } = await query({ query: GET_BOOKS_COUNT });

  return <div>Thoth Dashboard Page books count: {data?.bookCount}</div>;
}
