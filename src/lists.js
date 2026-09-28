import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL || "https://wdjrcoyopoytokqjpqca.supabase.co";
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkanJjb3lvcG95dG9rcWpwcWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjYyNDEsImV4cCI6MjEwMjYwMjI0MX0.okYYjQopxb0SAVETN1Cs_Kx_lI42XKywlIwDruomOV4";

export const supa = createClient(URL, ANON, {
  realtime: { params: { eventsPerSecond: 5 } },
});

export async function createList(name = "Ma liste") {
  const { data, error } = await supa.from("lists").insert({ name }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function fetchList(listId) {
  const { data } = await supa.from("lists").select("*").eq("id", listId).maybeSingle();
  return data;
}

export async function fetchItems(listId) {
  const { data, error } = await supa
    .from("list_items").select("*").eq("list_id", listId)
    .order("position", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addItem(listId, item) {
  const { data, error } = await supa
    .from("list_items").insert({ list_id: listId, ...item }).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateItem(id, patch) {
  const { error } = await supa.from("list_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function removeItem(id) {
  const { error } = await supa.from("list_items").delete().eq("id", id);
  if (error) throw error;
}

export async function renameList(listId, name) {
  await supa.from("lists").update({ name, updated_at: new Date().toISOString() }).eq("id", listId);
}

export function subscribeItems(listId, onChange) {
  const channel = supa
    .channel(`list-items-${listId}`)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "list_items", filter: `list_id=eq.${listId}` },
      onChange)
    .subscribe();
  return () => { supa.removeChannel(channel); };
}
