import { connection } from "next/server";
import { getTrendsData } from "@/app/actions/trends";
import { TrendsView } from "@/components/trends/trends-view";

export default async function TrendsPage() {
  await connection();
  const data = await getTrendsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Patterns across weeks and months
        </p>
      </div>

      <TrendsView data={data} />
    </div>
  );
}
