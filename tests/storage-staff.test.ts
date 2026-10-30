import test from "node:test";
import assert from "node:assert/strict";
import { KEYS, read, setStaffStorageNamespace, write, validHistory } from "../src/lib/storage";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("existing KEYFLOW local data migrates once into the signed-in staff namespace", () => {
  const original = globalThis.localStorage;
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try {
    const history = [{ id: "a", date: "2026-10-01", mode: "drill", title: "Test", elapsed: 10, status: "completed" }];
    storage.setItem(KEYS.history, JSON.stringify(history));
    storage.setItem(KEYS.drafts, JSON.stringify({ w1: { text: "draft", elapsed: 0, status: "ready", updated: "2026-10-01" } }));
    setStaffStorageNamespace("user-1");
    assert.deepEqual(read(KEYS.history, [], validHistory), history);
    assert.equal(storage.getItem(KEYS.history), null);
    write(KEYS.preferences, { theme: "dark" });
    setStaffStorageNamespace("user-2");
    assert.deepEqual(read(KEYS.history, [], validHistory), []);
    assert.equal(storage.getItem("keyflow.user-1.preferences.v1"), JSON.stringify({ theme: "dark" }));
  } finally {
    if (original === undefined) Reflect.deleteProperty(globalThis, "localStorage");
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  }
});

test("disabled localStorage does not prevent staff storage initialization", () => {
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } } });
  try { assert.doesNotThrow(() => setStaffStorageNamespace("staff-storage-disabled")); }
  finally { Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original }); }
});
