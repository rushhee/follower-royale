import LeaderboardTable from "@/components/LeaderboardTable";
import { getDb, getLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const db = getDb();
  const entries = getLeaderboard(db);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/" className="text-gray-500 hover:text-gray-300 text-sm">&larr; Home</a>
        </div>
        <h1 className="text-4xl font-black mb-2">Leaderboard</h1>
        <p className="text-gray-400 mb-8">{entries.length} fighters ranked by wins</p>
        <LeaderboardTable entries={entries} />
      </div>
    </div>
  );
}
