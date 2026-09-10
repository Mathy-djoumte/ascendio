"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function sanitize(str) {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
}

const suggestions = [
  "Lecture",
  "Musique",
  "Sport",
  "Voyage",
  "Photographie",
  "Cuisine",
  "Gaming",
  "Cinéma",
  "Bénévolat",
  "Dessin",
  "Danse",
  "Randonnée",
  "Podcast",
  "Blogging",
  "Natation",
  "Football",
  "Arts martiaux",
];

export default function InterestsPage() {
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newInterest, setNewInterest] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const { data } = await supabase
        .from("interests")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("display_order", { ascending: true });
      setInterests(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleAdd(name) {
    const val = name || newInterest;
    if (!val.trim()) {
      setError("Entrez un loisir");
      return;
    }
    if (val.trim().length < 2) {
      setError("Minimum 2 caractères");
      return;
    }
    const exists = interests.find(
      (i) => i.name.toLowerCase() === val.trim().toLowerCase(),
    );
    if (exists) {
      setError("Ce loisir est déjà ajouté");
      return;
    }

    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;
    if (!currentUserId) {
      setSaving(false);
      return;
    }

    const payload = {
      user_id: currentUserId,
      name: sanitize(val),
      display_order: interests.length,
    };
    const { data, error: err } = await supabase
      .from("interests")
      .insert(payload)
      .select();
    if (!err && data?.length > 0) {
      setInterests((prev) => [...prev, data[0]]);
      setNewInterest("");
      setError("");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    await supabase.from("interests").delete().eq("id", id);
    setInterests((prev) => prev.filter((i) => i.id !== id));
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Chargement...
      </div>
    );

  const unusedSuggestions = suggestions.filter(
    (s) => !interests.find((i) => i.name.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1 mb-1"
        >
          ← Retour au dashboard
        </button>
        <h2 className="text-xl font-bold text-gray-800">
          Loisirs & Centres d'intérêt
        </h2>
        <p className="text-gray-400 text-sm mt-0.5">
          {interests.length} loisir{interests.length > 1 ? "s" : ""} enregistré
          {interests.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Champ d'ajout */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <label className="text-xs text-gray-500 mb-2 block">
          Ajouter un loisir
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newInterest}
            onChange={(e) => {
              setNewInterest(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Ex : Photographie, Football, Lecture..."
            maxLength={50}
            className={`flex-1 border ${error ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition`}
          />
          <button
            onClick={() => handleAdd()}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            + Ajouter
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        <p className="text-xs text-gray-400 mt-1">
          Appuyez sur Entrée pour ajouter rapidement.
        </p>
      </div>

      {/* Suggestions */}
      {unusedSuggestions.length > 0 && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-xs text-gray-500 font-semibold mb-2">
            Suggestions rapides :
          </p>
          <div className="flex flex-wrap gap-2">
            {unusedSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleAdd(s)}
                className="bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 text-gray-600 text-xs px-3 py-1.5 rounded-lg transition-all"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste */}
      {interests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-gray-500 font-medium">Aucun loisir ajouté</p>
          <p className="text-gray-400 text-sm mt-1">
            Ajoutez vos centres d'intérêt ci-dessus.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <div
                key={interest.id}
                className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-1.5 rounded-full text-sm"
              >
                <span>{interest.name}</span>
                <button
                  onClick={() => handleDelete(interest.id)}
                  className="text-green-400 hover:text-red-500 transition-colors text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
