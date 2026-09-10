"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function sanitize(str) {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
}

const empty = {
  name: "",
  category: "Technique",
  level: 3,
};

const categories = ["Technique", "Soft skill", "Outil", "Langue", "Autre"];

const levelLabels = {
  1: "Débutant",
  2: "Intermédiaire",
  3: "Avancé",
  4: "Expert",
  5: "Maître",
};

const levelColors = {
  1: "bg-gray-200",
  2: "bg-yellow-300",
  3: "bg-blue-400",
  4: "bg-green-500",
  5: "bg-green-700",
};

export default function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const { data } = await supabase
        .from("skills")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("display_order", { ascending: true });
      setSkills(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Obligatoire";
    else if (form.name.trim().length < 2) e.name = "Minimum 2 caractères";
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
      name: sanitize(form.name),
      category: form.category,
      level: parseInt(form.level),
      display_order: skills.length,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("skills")
        .update(payload)
        .eq("id", editing)
        .select();
      if (!error && data && data.length > 0) {
        setSkills((prev) => prev.map((s) => (s.id === editing ? data[0] : s)));
      }
    } else {
      const { data, error } = await supabase
        .from("skills")
        .insert(payload)
        .select();
      if (!error && data && data.length > 0) {
        setSkills((prev) => [...prev, data[0]]);
      } else {
        alert("Erreur : " + JSON.stringify(error));
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    handleClose();
  }

  async function handleSuggest() {
    if (skills.length === 0) {
      alert(
        "Ajoutez d'abord quelques compétences pour que l'IA puisse en suggérer d'autres.",
      );
      return;
    }
    setSuggesting(true);
    setSuggestions([]);
    try {
      const existingSkills = skills.map((s) => s.name).join(", ");
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `Tu es un expert en recrutement et développement de carrière.
En fonction des compétences existantes d'un candidat, suggère des compétences complémentaires pertinentes.
Réponds UNIQUEMENT avec une liste JSON de 6 compétences sous ce format exact, sans texte autour :
[{"name":"Compétence 1","category":"Technique"},{"name":"Compétence 2","category":"Soft skill"}]
Les catégories possibles sont : Technique, Soft skill, Outil, Autre`,
              },
              {
                role: "user",
                content: `Voici mes compétences actuelles : ${existingSkills}. Suggère 6 compétences complémentaires que je devrais ajouter à mon profil.`,
              },
            ],
            max_tokens: 300,
          }),
        },
      );
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        try {
          const clean = text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(clean);
          setSuggestions(parsed);
        } catch {
          alert("Erreur de parsing. Réessayez.");
        }
      }
    } catch (err) {
      alert("Erreur réseau : " + err.message);
    }
    setSuggesting(false);
  }

  async function addSuggestion(suggestion) {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;
    if (!currentUserId) return;

    const payload = {
      user_id: currentUserId,
      name: suggestion.name,
      category: suggestion.category,
      level: 2,
      display_order: skills.length,
    };
    const { data, error } = await supabase
      .from("skills")
      .insert(payload)
      .select();
    if (!error && data && data.length > 0) {
      setSkills((prev) => [...prev, data[0]]);
      setSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
    }
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette compétence ?")) return;
    await supabase.from("skills").delete().eq("id", id);
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }

  function handleEdit(skill) {
    setForm({
      name: skill.name || "",
      category: skill.category || "Technique",
      level: skill.level || 3,
    });
    setEditing(skill.id);
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

  // Grouper par catégorie
  const grouped = categories.reduce((acc, cat) => {
    const items = skills.filter((s) => s.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

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
          <h2 className="text-xl font-bold text-gray-800">Compétences</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {skills.length} compétence{skills.length > 1 ? "s" : ""} enregistrée
            {skills.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-green-800 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
          >
            {suggesting ? (
              <>
                <span className="animate-spin inline-block">⟳</span>{" "}
                Suggestion...
              </>
            ) : (
              <>✦ Suggérer avec l'IA</>
            )}
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm"
            >
              + Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Suggestions IA */}
      {suggestions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-yellow-800">
              ✦ Compétences suggérées par l'IA
            </p>
            <button
              onClick={() => setSuggestions([])}
              className="text-yellow-600 hover:text-yellow-800 text-xs"
            >
              Fermer
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => addSuggestion(s)}
                className="bg-white border border-yellow-300 hover:border-green-400 hover:bg-green-50 text-gray-700 text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
              >
                <span className="text-green-500">+</span> {s.name}
                <span className="text-gray-400 text-xs">({s.category})</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-yellow-700 mt-2">
            Cliquez sur une suggestion pour l'ajouter directement.
          </p>
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">
              {editing ? "Modifier la compétence" : "Nouvelle compétence"}
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
                Nom de la compétence <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="React, Gestion de projet, Photoshop..."
                maxLength={80}
                className={`w-full border ${errors.name ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition`}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Catégorie */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Catégorie
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleChange("category", cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.category === cat
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-green-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Niveau */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">
                Niveau :{" "}
                <span className="font-semibold text-gray-700">
                  {levelLabels[form.level]}
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={form.level}
                onChange={(e) =>
                  handleChange("level", parseInt(e.target.value))
                }
                className="w-full accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Débutant</span>
                <span>Maître</span>
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

      {/* Liste groupée par catégorie */}
      {skills.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">🛠️</p>
          <p className="text-gray-500 font-medium">Aucune compétence ajoutée</p>
          <p className="text-gray-400 text-sm mt-1">
            Cliquez sur "Ajouter" ou laissez l'IA suggérer des compétences.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div
              key={cat}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {cat}
              </h3>
              <div className="space-y-2">
                {items.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm text-gray-800 font-medium w-32 truncate">
                        {skill.name}
                      </span>
                      {/* Barre de niveau */}
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-2 flex-1 rounded-full ${i <= skill.level ? levelColors[skill.level] : "bg-gray-100"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400 w-24 text-right">
                        {levelLabels[skill.level]}
                      </span>
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(skill)}
                        className="text-xs text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-300 px-2 py-1 rounded-lg transition-all"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(skill.id)}
                        className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 px-2 py-1 rounded-lg transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
