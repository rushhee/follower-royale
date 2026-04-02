import { notFound } from "next/navigation";
import { getDb, getBattleDetail } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BattleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const battle = getBattleDetail(db, parseInt(id, 10));

  if (!battle) return notFound();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/battles" className="text-gray-500 hover:text-gray-300 text-sm">&larr; All Battles</a>
        </div>

        <h1 className="text-4xl font-black mb-2">Battle #{battle.id}</h1>
        <div className="text-gray-400 mb-2">
          {battle.participant_count} fighters &middot;{" "}
          {battle.duration_seconds ? `${Math.round(battle.duration_seconds)}s` : ""} &middot;{" "}
          {new Date(battle.created_at).toLocaleString()}
        </div>

        {battle.winner_username && (
          <div className="bg-gray-900 rounded-xl p-6 border border-yellow-400/30 mb-8 text-center">
            <div className="text-sm text-yellow-400/60 uppercase tracking-widest mb-1">Champion</div>
            <a href={`/player/${battle.winner_username}`} className="text-3xl font-black text-yellow-400 hover:underline">
              {battle.winner_username}
            </a>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">Results</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left w-16">Place</th>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-right">Kills</th>
                <th className="px-4 py-3 text-right">Killed By</th>
                <th className="px-4 py-3 text-right">Survived</th>
              </tr>
            </thead>
            <tbody>
              {battle.results.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <span className={`font-bold ${r.placement === 1 ? "text-yellow-400" : r.placement <= 3 ? "text-blue-400" : "text-gray-500"}`}>
                      #{r.placement}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.avatar_color }} />
                      <a href={`/player/${r.username}`} className="font-mono hover:text-blue-400">{r.username}</a>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-400">{r.kills}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">
                    {r.killer_username ?? (r.placement === 1 ? "-" : "Zone")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">
                    {r.survived_seconds ? `${Math.round(r.survived_seconds)}s` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
