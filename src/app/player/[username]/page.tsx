import { notFound } from "next/navigation";
import { getDb, getPlayerStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const db = getDb();
  const stats = getPlayerStats(db, decodeURIComponent(username));

  if (!stats) return notFound();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/leaderboard" className="text-gray-500 hover:text-gray-300 text-sm">&larr; Leaderboard</a>
        </div>

        <div className="flex items-center gap-4 mb-8">
          {stats.follower.avatar_url ? (
            <img
              src={stats.follower.avatar_url}
              alt={stats.follower.username}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full" style={{ backgroundColor: stats.follower.avatar_color }} />
          )}
          <div>
            <h1 className="text-3xl font-black">{stats.follower.username}</h1>
            <p className="text-gray-400 text-sm">Joined {new Date(stats.follower.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Wins", value: stats.wins, color: "text-yellow-400" },
            { label: "Total Kills", value: stats.total_kills, color: "text-red-400" },
            { label: "Battles", value: stats.battles_played, color: "text-blue-400" },
            { label: "Win Rate", value: `${stats.win_rate}%`, color: "text-green-400" },
            { label: "Best Place", value: stats.best_placement || "-", color: "text-purple-400" },
            { label: "Avg Place", value: stats.avg_placement || "-", color: "text-orange-400" },
            { label: "Win Streak", value: stats.current_streak, color: "text-pink-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-4">Battle History</h2>
        {stats.battleHistory.length === 0 ? (
          <p className="text-gray-500">No battles yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.battleHistory.map((b) => (
              <a
                key={b.battle_id}
                href={`/battles/${b.battle_id}`}
                className="flex items-center justify-between py-3 px-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-bold ${b.placement === 1 ? "text-yellow-400" : b.placement <= 3 ? "text-blue-400" : "text-gray-400"}`}>
                    #{b.placement}
                  </span>
                  <span className="text-gray-500 text-sm">of {b.participant_count}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-red-400 font-mono text-sm">{b.kills} kills</span>
                  <span className="text-gray-600 text-sm">{new Date(b.created_at).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
