"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import FollowerUpload from "@/components/FollowerUpload";
import type { Follower, Battle } from "@/types";

export default function AdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followerSearch, setFollowerSearch] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const [battles, setBattles] = useState<(Battle & { winner_username: string | null })[]>([]);
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [useAll, setUseAll] = useState(true);

  const loadFollowers = useCallback(async () => {
    const params = followerSearch ? `?search=${encodeURIComponent(followerSearch)}` : "";
    const res = await fetch(`/api/followers${params}`);
    const data = await res.json();
    setFollowers(data.followers);
    setFollowerCount(data.total);
  }, [followerSearch]);

  const loadBattles = useCallback(async () => {
    const res = await fetch("/api/battles");
    const data = await res.json();
    setBattles(data.battles);
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadFollowers();
      loadBattles();
    }
  }, [authenticated, loadFollowers, loadBattles]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Invalid password");
    }
  };

  const addFollower = async () => {
    if (!newUsername.trim()) return;
    const res = await fetch("/api/followers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername }),
    });
    if (res.ok) {
      setNewUsername("");
      loadFollowers();
    }
  };

  const removeFollower = async (id: number) => {
    await fetch("/api/followers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadFollowers();
  };

  const runBattle = async () => {
    let selected: Follower[];
    if (useAll) {
      const res = await fetch("/api/followers");
      const data = await res.json();
      selected = data.followers;
    } else {
      const res = await fetch("/api/followers");
      const data = await res.json();
      const all: Follower[] = data.followers;
      const shuffled = all.sort(() => Math.random() - 0.5);
      selected = shuffled.slice(0, maxParticipants);
    }

    if (selected.length < 2) {
      alert("Need at least 2 followers to run a battle.");
      return;
    }

    sessionStorage.setItem("battleParticipants", JSON.stringify(selected));
    router.push("/battle");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <form onSubmit={handleAuth} className="bg-gray-900 p-8 rounded-xl border border-gray-800 w-80">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 mb-4 focus:outline-none focus:border-blue-500"
          />
          {authError && <p className="text-red-400 text-sm mb-3">{authError}</p>}
          <button type="submit" className="w-full py-2 bg-blue-600 rounded-lg hover:bg-blue-500 font-medium">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      <FollowerUpload onSync={loadFollowers} />

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mt-6">
        <h2 className="text-lg font-bold mb-4">Run Battle</h2>
        <p className="text-gray-400 text-sm mb-4">{followerCount} total followers available</p>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useAll} onChange={(e) => setUseAll(e.target.checked)} className="rounded" />
            <span className="text-sm">Use all followers</span>
          </label>
          {!useAll && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Max:</span>
              <input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 50)}
                min={2}
                max={500}
                className="w-20 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm"
              />
            </div>
          )}
        </div>
        <button onClick={runBattle} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 font-bold text-lg">
          Run Battle
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mt-6">
        <h2 className="text-lg font-bold mb-4">Followers ({followerCount})</h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={followerSearch}
            onChange={(e) => setFollowerSearch(e.target.value)}
            placeholder="Search followers..."
            className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Add username"
            className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === "Enter" && addFollower()}
          />
          <button onClick={addFollower} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 text-sm">
            Add
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {followers.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-800 rounded">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: f.avatar_color }} />
                <span className="font-mono text-sm">{f.username}</span>
              </div>
              <button onClick={() => removeFollower(f.id)} className="text-red-400 hover:text-red-300 text-sm">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mt-6">
        <h2 className="text-lg font-bold mb-4">Past Battles</h2>
        {battles.length === 0 ? (
          <p className="text-gray-500 text-sm">No battles yet.</p>
        ) : (
          <div className="space-y-2">
            {battles.map((b) => (
              <a
                key={b.id}
                href={`/battles/${b.id}`}
                className="flex items-center justify-between py-3 px-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
              >
                <div>
                  <span className="font-bold">Battle #{b.id}</span>
                  <span className="text-gray-400 text-sm ml-3">{b.participant_count} fighters</span>
                </div>
                <div className="text-right">
                  <span className="text-yellow-400 font-bold">{b.winner_username ?? "Unknown"}</span>
                  <span className="text-gray-500 text-sm ml-3">{new Date(b.created_at).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
