"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const levels = ["Débutant", "Intermédiaire", "Courant", "Bilingue", "Natif"];

const levelColors = {
  Débutant: "bg-gray-200 text-gray-600",
  Intermédiaire: "bg-yellow-100 text-yellow-700",
  Courant: "bg-blue-100 text-blue-700",
  Bilingue: "bg-green-100 text-green-700",
  Natif: "bg-green-600 text-white",
};

const levelBars = {
  Débutant: 1,
  Intermédiaire: 2,
  Courant: 3,
  Bilingue: 4,
  Natif: 5,
};

const empty = { name: "", level: "Courant" };

export default function LanguagesPage() {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const { data } = await supabase
        .from("languages")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("display_order", { ascending: true });
      setLanguages(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Obligatoire";
    else if (form.name.trim().length < 2) e.name = "Minimum 2 caractères";
    // Vérifier doublon
    const exists = languages.find(
      (l) =>
        l.name.toLowerCase() === form.name.trim().toLowerCase() &&
        l.id !== editing,
    );
    if (exists) e.name = "Cette langue est déjà ajoutée";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;
    if (!currentUserId) {
      alert("Session expirée. Reconnectez-vous.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: currentUserId,
      name: form.name.trim(),
      level: form.level,
      display_order: languages.length,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("languages")
        .update(payload)
        .eq("id", editing)
        .select();
      if (!error && data && data.length > 0) {
        setLanguages((prev) =>
          prev.map((l) => (l.id === editing ? data[0] : l)),
        );
      }
    } else {
      const { data, error } = await supabase
        .from("languages")
        .insert(payload)
        .select();
      if (!error && data && data.length > 0) {
        setLanguages((prev) => [...prev, data[0]]);
      } else {
        alert("Erreur : " + JSON.stringify(error));
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    handleClose();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette langue ?")) return;
    await supabase.from("languages").delete().eq("id", id);
    setLanguages((prev) => prev.filter((l) => l.id !== id));
  }

  function handleEdit(lang) {
    setForm({ name: lang.name || "", level: lang.level || "Courant" });
    setEditing(lang.id);
    setShowForm(true);
    setErrors({});
  }

  function handleClose() {
    setShowForm(false);
    setEditing(null);
    setForm(empty);
    setErrors({});
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Chargement...
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1 mb-1"
          >
            ← Retour au dashboard
          </button>
          <h2 className="text-xl font-bold text-gray-800">Langues</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {languages.length} langue{languages.length > 1 ? "s" : ""}{" "}
            enregistrée{languages.length > 1 ? "s" : ""}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm"
          >
            + Ajouter
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">
              {editing ? "Modifier la langue" : "Nouvelle langue"}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-light"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Nom */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Langue <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Français, Anglais, Espagnol..."
                maxLength={50}
                className={`w-full border ${errors.name ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition`}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Niveau */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Niveau</label>
              <div className="flex flex-wrap gap-2">
                {levels.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleChange("level", lvl)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      form.level === lvl
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-green-400"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={handleClose}
                className="border border-gray-200 text-gray-500 hover:text-gray-700 font-medium px-5 py-2 rounded-xl text-sm transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-xl text-sm transition-all shadow-sm"
              >
                {saving ? "Sauvegarde..." : editing ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {languages.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">🌐</p>
          <p className="text-gray-500 font-medium">Aucune langue ajoutée</p>
          <p className="text-gray-400 text-sm mt-1">
            Cliquez sur "Ajouter" pour commencer.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="space-y-3">
            {languages.map((lang) => (
              <div key={lang.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-sm font-medium text-gray-800 w-28 truncate">
                    {lang.name}
                  </span>
                  {/* Barre de niveau */}
                  <div className="flex gap-1 flex-1 max-w-32">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full ${
                          i <= levelBars[lang.level]
                            ? "bg-green-500"
                            : "bg-gray-100"
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${levelColors[lang.level]}`}
                  >
                    {lang.level}
                  </span>
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(lang)}
                    className="text-xs text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-300 px-2 py-1 rounded-lg transition-all"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(lang.id)}
                    className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 px-2 py-1 rounded-lg transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
