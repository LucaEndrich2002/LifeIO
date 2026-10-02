import { AiMonthScreen } from "@/features/ai/month-screen";
export const metadata = { title: "Life AI" };
export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  return <AiMonthScreen month={(await searchParams).month} />;
}
