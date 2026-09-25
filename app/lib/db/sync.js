"use client";

/* =========================================================================
   Synk mellom klient-state og Supabase for profil + primærhund.

   Appen har (foreløpig) én hund i profilen; DB-en støtter flere. Vi behandler
   onboarding-hunden som brukerens første/primære hund: finnes en hund fra før
   oppdaterer vi den, ellers oppretter vi én. Ingenting dikter vi opp – tomt
   forblir tomt.
   ========================================================================= */

import { getMyProfile, upsertMyProfile } from "./profiles.js";
import { getMyDogs, createDog, updateDog } from "./dogs.js";

/**
 * Last brukerens profil + hunder fra Supabase til app-form.
 * Returnerer { profile, location, primaryDogId, onboarded, error }.
 * onboarded = true når det finnes minst én hund (ekte tegn på at brukeren
 * har kommet i gang), ikke bare fordi en rad finnes.
 */
export async function loadMyData(userId) {
  const [{ data: prof, error: pErr }, { data: dogs, error: dErr }] = await Promise.all([
    getMyProfile(userId),
    getMyDogs(userId),
  ]);
  const error = pErr || dErr || null;
  const primary = dogs && dogs[0] ? dogs[0] : null;
  const profile = {
    ...(primary || {}),
    ownerName: prof?.ownerName || "",
  };
  const location = prof
    ? { kommuneId: prof.kommuneId || null, omrade: null, radiusKm: prof.radiusKm ?? null }
    : null;
  return {
    profile: prof || primary ? profile : null,
    location,
    primaryDogId: primary?.id || null,
    onboarded: !!primary,
    error,
  };
}

/**
 * Lagre profil + primærhund til Supabase. Oppretter hunden hvis primaryDogId
 * mangler, ellers oppdaterer den. Returnerer { primaryDogId, error }.
 */
export async function persistProfileAndDog(userId, profile = {}, location = {}, primaryDogId = null) {
  const { error: pErr } = await upsertMyProfile(userId, profile, location);
  if (pErr) return { primaryDogId, error: pErr };

  const hasDog = !!(profile.dogName && profile.dogName.trim());
  if (!hasDog) return { primaryDogId, error: null };

  if (primaryDogId) {
    const { error } = await updateDog(primaryDogId, profile);
    return { primaryDogId, error };
  }
  const { data, error } = await createDog(userId, profile);
  return { primaryDogId: data?.id || primaryDogId, error };
}
