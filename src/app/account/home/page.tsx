import { PersonalHome } from "@/features/home/personal-home";
import type { HomeSearch } from "@/domain/home";
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearch>;
}) {
  return <PersonalHome query={await searchParams} />;
}
