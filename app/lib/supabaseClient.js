"use client";

/* =========================================================================
   Supabase-klient for nettleseren.

   Leser to offentlige miljøvariabler (trygge å eksponere – anon-nøkkelen er
   ment for klienten, all sikkerhet håndheves av Row Level Security i
   supabase/schema.sql):
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY

   Er de ikke satt, returnerer getSupabase() null, og appen faller ærlig
   tilbake på venteliste/prototype-modus. Vi later ALDRI som en bruker er
   logget inn eller at data ble lagret uten en ekte backend bak.
   ========================================================================= */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = !!(URL && ANON);

let _client = null;

/**
 * Én delt klient-instans i nettleseren. Returnerer null på server (under
 * prerender) og når nøklene mangler – kalleren må håndtere null.
 */
export function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (typeof window === "undefined") return null;
  if (_client) return _client;
  _client = createClient(URL, ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return _client;
}
