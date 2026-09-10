"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function sanitize(str) {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
}

function toDate(monthStr) {
  if (!monthStr) return null;
  return monthStr + "-01";
}

const empty = {
  job_title: "",
  company: "",
  location: "",
  start_date: "",
  end_date: "",
  is_current: false,
  description: "",
};

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const { data } = await supabase
        .from("experiences")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("display_order", { ascending: true });
      setExperiences(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function validate() {
    const e = {};
    if (!form.job_title.trim()) e.job_title = "Obligatoire";
    if (!form.company.trim()) e.company = "Obligatoire";
    if (!form.start_date) e.start_date = "Obligatoire";
    if (!form.is_current && !form.end_date)
      e.end_date = "Obligatoire si poste terminé";
    if (form.start_date && form.end_date && form.end_date < form.start_date)
      e.end_date = "La date de fin doit être après le début";
    if (!form.description.trim()) e.description = "Obligatoire";
    else if (form.description.trim().length < 20)
      e.description = "Minimum 20 caractères";
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
      job_title: sanitize(form.job_title),
      company: sanitize(form.company),
      location: sanitize(form.location),
      start_date: toDate(form.start_date),
      end_date: form.is_current ? null : toDate(form.end_date),
      is_current: form.is_current,
      description: form.description.trim(),
      display_order: experiences.length,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("experiences")
        .update(payload)
        .eq("id", editing)
        .select();
      if (!error && data && data.length > 0) {
        setExperiences((prev) =>
          prev.map((e) => (e.id === editing ? data[0] : e)),
        );
      }
    } else {
      const { data, error } = await supabase
        .from("experiences")
        .insert(payload)
        .select();
      if (!error && data && data.length > 0) {
        setExperiences((prev) => [...prev, data[0]]);
      } else {
        alert("Erreur : " + JSON.stringify(error));
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    handleClose();
  }

  async function handleOptimizeDescription() {
    if (!form.description || form.description.trim().length < 20) {
      alert("Écrivez d'abord une description d'au moins 20 caractères.");
      return;
    }
    setOptimizing(true);
    try {
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
                content: `Tu es un expert en rédaction de CV. Reformule la description de mission pour un CV professionnel.
Règles :
- Commence chaque point par un verbe d'action fort (Développé, Géré, Conçu, Optimisé...)
- Oriente vers les résultats et l'impact
- Format : 3 à 5 points courts avec tirets (-)
- Pas d'introduction ni de conclusion
- Garde la même langue (français)`,
              },
              {
                role: "user",
                content: `Reformule cette description de mission pour le poste "${form.job_title}" chez "${form.company}" :\n\n${form.description}`,
              },
            ],
            max_tokens: 400,
          }),
        },
      );
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        setForm((prev) => ({ ...prev, description: text.trim() }));
        setErrors((prev) => ({ ...prev, description: null }));
      } else {
        alert("Erreur IA. Réessayez.");
      }
    } catch (err) {
      alert("Erreur réseau : " + err.message);
    }
    setOptimizing(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette expérience ?")) return;
    await supabase.from("experiences").delete().eq("id", id);
    setExperiences((prev) => prev.filter((e) => e.id !== id));
  }

  function handleEdit(exp) {
    // Convertir 2026-07-01 → 2026-07 pour le champ month
    const toMonth = (d) => (d ? d.substring(0, 7) : "");
    setForm({
      job_title: exp.job_title || "",
      company: exp.company || "",
      location: exp.location || "",
      start_date: toMonth(exp.start_date),
      end_date: toMonth(exp.end_date),
      is_current: exp.is_current || false,
      description: exp.description || "",
    });
    setEditing(exp.id);
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

  const inputClass = (field) =>
    `w-full border ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition`;

  function formatDate(d) {
    if (!d) return "";
    const [y, m] = d.split("-");
    const months = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    return `${months[parseInt(m) - 1]} ${y}`;
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
          <h2 className="text-xl font-bold text-gray-800">
            Expériences professionnelles
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {experiences.length} expérience{experiences.length > 1 ? "s" : ""}{" "}
            enregistrée{experiences.length > 1 ? "s" : ""}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
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
              {editing ? "Modifier l'expérience" : "Nouvelle expérience"}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-light"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Poste <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.job_title}
                  onChange={(e) => handleChange("job_title", e.target.value)}
                  placeholder="Développeur Full-Stack"
                  maxLength={100}
                  className={inputClass("job_title")}
                />
                {errors.job_title && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.job_title}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Entreprise <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  placeholder="Google"
                  maxLength={100}
                  className={inputClass("company")}
                />
                {errors.company && (
                  <p className="text-red-500 text-xs mt-1">{errors.company}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Lieu <span className="text-gray-300">(optionnel)</span>
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="Douala, Cameroun"
                maxLength={100}
                className={inputClass("location")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Date de début <span className="text-red-400">*</span>
                </label>
                <input
                  type="month"
                  value={form.start_date}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                  className={inputClass("start_date")}
                />
                {errors.start_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.start_date}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Date de fin <span className="text-red-400">*</span>
                </label>
                <input
                  type="month"
                  value={form.end_date}
                  onChange={(e) => handleChange("end_date", e.target.value)}
                  disabled={form.is_current}
                  className={`${inputClass("end_date")} ${form.is_current ? "opacity-40 cursor-not-allowed" : ""}`}
                />
                {errors.end_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_current}
                onChange={(e) => {
                  handleChange("is_current", e.target.checked);
                  if (e.target.checked) handleChange("end_date", "");
                }}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-sm text-gray-600">Poste actuel</span>
            </label>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">
                  Description des missions{" "}
                  <span className="text-red-400">*</span>
                </label>
                <button
                  onClick={handleOptimizeDescription}
                  disabled={optimizing}
                  className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-green-800 font-semibold px-3 py-1 rounded-lg text-xs transition-all"
                >
                  {optimizing ? (
                    <>
                      <span className="animate-spin inline-block">⟳</span>{" "}
                      Reformulation...
                    </>
                  ) : (
                    <>✦ Reformuler avec l'IA</>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-2">
                Décrivez librement vos missions, l'IA les reformulera en points
                CV percutants.
              </p>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Ex : J'ai développé une application mobile, géré une équipe de 3 personnes..."
                rows={5}
                maxLength={1000}
                className={`w-full border ${errors.description ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition resize-none`}
              />
              <div className="flex justify-between mt-1">
                {errors.description ? (
                  <p className="text-red-500 text-xs">{errors.description}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-gray-300">
                  {form.description.length}/1000
                </p>
              </div>
              {optimizing && (
                <p className="text-xs text-yellow-600 mt-1 animate-pulse">
                  ✦ L'IA reformule vos missions...
                </p>
              )}
            </div>

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
      {experiences.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">💼</p>
          <p className="text-gray-500 font-medium">Aucune expérience ajoutée</p>
          <p className="text-gray-400 text-sm mt-1">
            Cliquez sur "Ajouter" pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-800 text-sm">
                    {exp.job_title}
                  </h4>
                  {exp.is_current && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      En cours
                    </span>
                  )}
                </div>
                <p className="text-green-600 text-sm font-medium">
                  {exp.company}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {exp.location && `${exp.location} · `}
                  {formatDate(exp.start_date)} —{" "}
                  {exp.is_current ? "Présent" : formatDate(exp.end_date)}
                </p>
                {exp.description && (
                  <p className="text-gray-500 text-xs mt-2 line-clamp-2">
                    {exp.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleEdit(exp)}
                  className="text-xs text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-all"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(exp.id)}
                  className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-all"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
