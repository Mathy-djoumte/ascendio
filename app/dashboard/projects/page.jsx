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
  title: "",
  description: "",
  project_url: "",
  technologies: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
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
        .from("projects")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("display_order", { ascending: true });
      setProjects(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Obligatoire";
    if (!form.description.trim()) e.description = "Obligatoire";
    else if (form.description.trim().length < 20)
      e.description = "Minimum 20 caractères";
    if (form.project_url && !form.project_url.startsWith("http"))
      e.project_url = "URL invalide (doit commencer par https://)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;
    if (!currentUserId) {
      alert("Session expirée.");
      setSaving(false);
      return;
    }

    const techArray = form.technologies
      ? form.technologies
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const payload = {
      user_id: currentUserId,
      title: sanitize(form.title),
      description: form.description.trim(),
      project_url: form.project_url.trim(),
      technologies: techArray,
      start_date: toDate(form.start_date),
      end_date: form.is_current ? null : toDate(form.end_date),
      display_order: projects.length,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", editing)
        .select();
      if (!error && data?.length > 0)
        setProjects((prev) =>
          prev.map((p) => (p.id === editing ? data[0] : p)),
        );
    } else {
      const { data, error } = await supabase
        .from("projects")
        .insert(payload)
        .select();
      if (!error && data?.length > 0) setProjects((prev) => [...prev, data[0]]);
      else {
        alert("Erreur : " + JSON.stringify(error));
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    handleClose();
  }

  async function handleOptimize() {
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
            model: "openai/gpt-oss-120b",
            messages: [
              {
                role: "system",
                content: `Tu es un expert en rédaction de CV. Reformule la description d'un projet personnel pour un CV professionnel.
Règles :
- Mets en avant l'objectif, les technologies utilisées et l'impact
- Format : 2 à 3 points courts avec tirets (-)
- Commence par un verbe d'action (Développé, Conçu, Créé...)
- Pas d'introduction ni de conclusion
- Garde la même langue (français)`,
              },
              {
                role: "user",
                content: `Reformule cette description du projet "${form.title}"${form.technologies ? ` (technologies : ${form.technologies})` : ""} :\n\n${form.description}`,
              },
            ],
            max_tokens: 1000,
          }),
        },
      );
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        setForm((prev) => ({ ...prev, description: text.trim() }));
        setErrors((prev) => ({ ...prev, description: null }));
      } else alert("Erreur IA. Réessayez.");
    } catch (err) {
      alert("Erreur réseau : " + err.message);
    }
    setOptimizing(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce projet ?")) return;
    await supabase.from("projects").delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function handleEdit(proj) {
    const toMonth = (d) => (d ? d.substring(0, 7) : "");
    setForm({
      title: proj.title || "",
      description: proj.description || "",
      project_url: proj.project_url || "",
      technologies: proj.technologies ? proj.technologies.join(", ") : "",
      start_date: toMonth(proj.start_date),
      end_date: toMonth(proj.end_date),
      is_current: !proj.end_date,
    });
    setEditing(proj.id);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1 mb-1"
          >
            ← Retour au dashboard
          </button>
          <h2 className="text-xl font-bold text-gray-800">Projets</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {projects.length} projet{projects.length > 1 ? "s" : ""}
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

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">
              {editing ? "Modifier le projet" : "Nouveau projet"}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Titre du projet <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Application de gestion de CV"
                maxLength={100}
                className={inputClass("title")}
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Technologies{" "}
                <span className="text-gray-300">
                  (optionnel, séparées par des virgules)
                </span>
              </label>
              <input
                type="text"
                value={form.technologies}
                onChange={(e) => handleChange("technologies", e.target.value)}
                placeholder="React, Node.js, PostgreSQL..."
                className={inputClass("technologies")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Date de début
                </label>
                <input
                  type="month"
                  value={form.start_date}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                  className={inputClass("start_date")}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Date de fin
                </label>
                <input
                  type="month"
                  value={form.end_date}
                  onChange={(e) => handleChange("end_date", e.target.value)}
                  disabled={form.is_current}
                  className={`${inputClass("end_date")} ${form.is_current ? "opacity-40 cursor-not-allowed" : ""}`}
                />
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
              <span className="text-sm text-gray-600">Projet en cours</span>
            </label>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Lien du projet{" "}
                <span className="text-gray-300">(optionnel)</span>
              </label>
              <input
                type="url"
                value={form.project_url}
                onChange={(e) => handleChange("project_url", e.target.value)}
                placeholder="https://github.com/..."
                className={inputClass("project_url")}
              />
              {errors.project_url && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.project_url}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">
                  Description <span className="text-red-400">*</span>
                </label>
                <button
                  onClick={handleOptimize}
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
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Décrivez l'objectif du projet, ce que vous avez fait et son impact..."
                rows={4}
                maxLength={800}
                className={`w-full border ${errors.description ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition resize-none`}
              />
              <div className="flex justify-between mt-1">
                {errors.description ? (
                  <p className="text-red-500 text-xs">{errors.description}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-gray-300">
                  {form.description.length}/800
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={handleClose}
                className="border border-gray-200 text-gray-500 px-5 py-2 rounded-xl text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-xl text-sm"
              >
                {saving ? "Sauvegarde..." : editing ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📁</p>
          <p className="text-gray-500 font-medium">Aucun projet ajouté</p>
          <p className="text-gray-400 text-sm mt-1">
            Cliquez sur "Ajouter" pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-800 text-sm">
                    {proj.title}
                  </h4>
                  {!proj.end_date && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      En cours
                    </span>
                  )}
                </div>
                {proj.technologies?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {proj.technologies.map((t, i) => (
                      <span
                        key={i}
                        className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-gray-400 text-xs">
                  {proj.start_date && formatDate(proj.start_date)}
                  {proj.start_date &&
                    (proj.end_date || !proj.end_date) &&
                    " — "}
                  {proj.end_date
                    ? formatDate(proj.end_date)
                    : proj.start_date
                      ? "Présent"
                      : ""}
                </p>
                {proj.description && (
                  <p className="text-gray-500 text-xs mt-2 line-clamp-2">
                    {proj.description}
                  </p>
                )}
                {proj.project_url && (
                  <a
                    href={proj.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                  >
                    🔗 Voir le projet
                  </a>
                )}
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleEdit(proj)}
                  className="text-xs text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-all"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(proj.id)}
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
