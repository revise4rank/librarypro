import { PublicBlogDetail } from "../../../components/public-blog";

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicBlogDetail slug={slug} />;
}
