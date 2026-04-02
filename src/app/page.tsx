import { getDb, getBattles, getLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const db = getDb();
  const battles = getBattles(db);
  const leaderboard = getLeaderboard(db).slice(0, 10);
  const latestBattle = battles[0] ?? null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-black mb-4 leading-tight">
          Every follower fights.<br />
          <span className="text-red-500">One wins.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-lg mb-8">
          Follow on Instagram to join the daily battle royale. Watch the Reel to see if you survived.
        </p>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          Follow to Enter
        </a>
      </section>

      {latestBattle && (
        <section className="max-w-3xl mx-auto px-6 py-12">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Latest Battle</h2>
          <a
            href={`/battles/${latestBattle.id}`}
            className="block bg-gray-900 rounded-xl p-8 border border-gray-800 hover:border-gray-700 transition-colors text-center"
          >
            <div className="text-sm text-gray-500 mb-2">
              Battle #{latestBattle.id} &middot; {latestBattle.participant_count} fighters
            </div>
            <div className="text-4xl font-black text-yellow-400 mb-1">
              {latestBattle.winner_username ?? "Unknown"}
            </div>
            <div className="text-gray-500 text-sm">
              {new Date(latestBattle.created_at).toLocaleDateString()}
            </div>
          </a>
        </section>
      )}

      {leaderboard.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm uppercase tracking-widest text-gray-500">Top Fighters</h2>
            <a href="/leaderboard" className="text-blue-400 hover:underline text-sm">View All &rarr;</a>
          </div>
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <a
                key={entry.id}
                href={`/player/${entry.username}`}
                className="flex items-center justify-between py-3 px-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className={`font-bold w-8 text-center ${i < 3 ? "text-yellow-400" : "text-gray-500"}`}>
                    {i + 1}
                  </span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.avatar_color }} />
                  <span className="font-mono">{entry.username}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-yellow-400 font-bold">{entry.wins}W</span>
                  <span className="text-gray-500 text-sm">{entry.total_kills} kills</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <footer className="max-w-3xl mx-auto px-6 py-12 flex gap-6 text-sm text-gray-600">
        <a href="/leaderboard" className="hover:text-gray-400">Leaderboard</a>
        <a href="/battles" className="hover:text-gray-400">Battle History</a>
      </footer>
    </div>
  );
}
