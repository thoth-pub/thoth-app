type PageParams = {
  id: string;
};

export default async function WorkPage({ params }: { params: Promise<PageParams> }) {
  const { id } = await params;

  console.log(params);
  return (
    <div>
      <h1>Work {id}</h1>
    </div>
  );
}
