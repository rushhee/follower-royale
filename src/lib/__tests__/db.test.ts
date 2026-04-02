import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initializeDatabase, addFollower, getFollowers, getFollowerByUsername } from "../db";

describe("database", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeDatabase(db);
  });

  it("creates tables on initialization", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("followers");
    expect(names).toContain("battles");
    expect(names).toContain("battle_results");
  });

  it("adds a follower with auto-generated color", () => {
    const follower = addFollower(db, "testuser");
    expect(follower.username).toBe("testuser");
    expect(follower.avatar_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(follower.id).toBe(1);
  });

  it("rejects duplicate usernames", () => {
    addFollower(db, "testuser");
    expect(() => addFollower(db, "testuser")).toThrow();
  });

  it("lists all followers", () => {
    addFollower(db, "user1");
    addFollower(db, "user2");
    const all = getFollowers(db);
    expect(all).toHaveLength(2);
  });

  it("finds follower by username", () => {
    addFollower(db, "findme");
    const found = getFollowerByUsername(db, "findme");
    expect(found).not.toBeNull();
    expect(found!.username).toBe("findme");
  });

  it("returns null for missing username", () => {
    const found = getFollowerByUsername(db, "ghost");
    expect(found).toBeNull();
  });
});
