"use client";

import { useState, useMemo } from "react";
import type { LeaderboardEntry } from "@/types";

type SortKey = "wins" | "total_kills" | "battles_played" | "win_rate" | "avg_placement";

export default function LeaderboardTable({
  entries,
  linkToProfile = true,
}: {
  entries: LeaderboardEntry[];
  linkToProfile?: boolean;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("wins");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  const sorted = useMemo(() => {
    let filtered = entries;
    if (search) {
      const q = search.toLowerCase();
      filtered = entries.filter((e) => e.username.toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => {
      return sortAsc ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
    });
  }, [entries, sortBy, sortAsc, search]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      onClick={() => toggleSort(field)}
      className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors select-none"
    >
      {label} {sortBy === field ? (sortAsc ? "\u25B2" : "\u25BC") : ""}
    </th>
  );

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by username..."
        className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 mb-4 focus:outline-none focus:border-blue-500 text-white"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400 border-b border-gray-800">
            <tr>
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Player</th>
              <SortHeader label="Wins" field="wins" />
              <SortHeader label="Kills" field="total_kills" />
              <SortHeader label="Battles" field="battles_played" />
              <SortHeader label="Win %" field="win_rate" />
              <SortHeader label="Avg Place" field="avg_placement" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, i) => (
              <tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-gray-500 font-mono">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.avatar_color }} />
                    {linkToProfile ? (
                      <a href={`/player/${entry.username}`} className="font-mono hover:text-blue-400 transition-colors">
                        {entry.username}
                      </a>
                    ) : (
                      <span className="font-mono">{entry.username}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-yellow-400">{entry.wins}</td>
                <td className="px-4 py-3 text-right font-mono">{entry.total_kills}</td>
                <td className="px-4 py-3 text-right font-mono">{entry.battles_played}</td>
                <td className="px-4 py-3 text-right font-mono">{entry.win_rate}%</td>
                <td className="px-4 py-3 text-right font-mono">{entry.avg_placement}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {search ? "No players match your search" : "No battles played yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
