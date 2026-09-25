"use client";

/* =========================================================================
   Autentisering (magic link / passordløst) via Supabase.

   AuthProvider gir resten av appen den innloggede brukeren og session.
   Er ikke Supabase satt opp (ingen nøkler), er `configured=false` og appen
   kjører videre som lokal prototype uten innlogging – vi krever aldri en
   pålogging vi ikke har backend til å oppfylle.
   ========================================================================= */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { deleteMyData } from "../lib/db/profiles.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  /** Send en innloggingslenke til e-posten. Returnerer { error }. */
  const signInWithMagicLink = useCallback(async (email) => {
    const sb = getSupabase();
    if (!sb) return { error: new Error("Innlogging er ikke satt opp ennå") };
    const clean = String(email || "").trim();
    if (!clean) return { error: new Error("Skriv inn en e-post") };
    const emailRedirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await sb.auth.signInWithOtp({ email: clean, options: { emailRedirectTo } });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setSession(null);
  }, []);

  /** Sletter brukerens egne data og logger ut (se merknad i profiles.deleteMyData). */
  const deleteAccount = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) return { error: new Error("Ikke innlogget") };
    const { error } = await deleteMyData(uid);
    if (!error) setSession(null);
    return { error };
  }, [session]);

  const value = {
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    signInWithMagicLink,
    signOut,
    deleteAccount,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
