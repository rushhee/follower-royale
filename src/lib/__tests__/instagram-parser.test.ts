import { describe, it, expect } from "vitest";
import { parseInstagramExport } from "../instagram-parser";

describe("parseInstagramExport", () => {
  it("parses Instagram JSON format (relationships_followers)", () => {
    const json = JSON.stringify([
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          { href: "", value: "user_one", timestamp: 1700000000 },
        ],
      },
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          { href: "", value: "user_two", timestamp: 1700000001 },
        ],
      },
    ]);
    const result = parseInstagramExport(json, "json");
    expect(result).toEqual(["user_one", "user_two"]);
  });

  it("parses simple JSON array of usernames", () => {
    const json = JSON.stringify(["alice", "bob", "charlie"]);
    const result = parseInstagramExport(json, "json");
    expect(result).toEqual(["alice", "bob", "charlie"]);
  });

  it("parses CSV with header row", () => {
    const csv = "username\nalice\nbob\ncharlie";
    const result = parseInstagramExport(csv, "csv");
    expect(result).toEqual(["alice", "bob", "charlie"]);
  });

  it("parses CSV without header (plain list)", () => {
    const csv = "alice\nbob\ncharlie";
    const result = parseInstagramExport(csv, "csv");
    expect(result).toEqual(["alice", "bob", "charlie"]);
  });

  it("strips @ symbols and whitespace", () => {
    const json = JSON.stringify(["@alice", " bob ", "@charlie "]);
    const result = parseInstagramExport(json, "json");
    expect(result).toEqual(["alice", "bob", "charlie"]);
  });

  it("removes duplicates", () => {
    const json = JSON.stringify(["alice", "alice", "bob"]);
    const result = parseInstagramExport(json, "json");
    expect(result).toEqual(["alice", "bob"]);
  });

  it("filters out empty strings", () => {
    const csv = "alice\n\nbob\n\n";
    const result = parseInstagramExport(csv, "csv");
    expect(result).toEqual(["alice", "bob"]);
  });
});
