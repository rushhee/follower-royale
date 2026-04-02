import { getDb, getBattles } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function BattlesPage() {
  const db = getDb();
  const battles = getBattles(db);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/" className="text-gray-500 hover:text-gray-300 text-sm">&larr; Home</a>
        </div>
        <h1 className="text-4xl font-black mb-2">Battle History</h1>
        <p className="text-gray-400 mb-8">{battles.length} battles fought</p>

        {battles.length === 0 ? (
          <p className="text-gray-500">No battles yet.</p>
        ) : (
          <div className="space-y-3">
            {battles.map((b) => (
              <a
                key={b.id}
                href={`/battles/${b.id}`}
                className="block bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold">Battle #{b.id}</span>
                    <span className="text-gray-500 text-sm ml-3">{b.participant_count} fighters</span>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold">{b.winner_username ?? "Unknown"}</div>
                    <div className="text-gray-600 text-sm">
                      {new Date(b.created_at).toLocaleDateString()} &middot;{" "}
                      {b.duration_seconds ? `${Math.round(b.duration_seconds)}s` : "-"}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
