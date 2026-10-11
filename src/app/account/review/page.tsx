import { ReviewScreen } from "@/features/review/review-screen";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  return <ReviewScreen week={(await searchParams).week} />;
}
