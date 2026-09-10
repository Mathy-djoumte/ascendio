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
  degree: "",
  institution: "",
  field_of_study: "",
  location: "",
  start_date: "",
  end_date: "",
  is_current: false,
  mention: "",
  description: "",
};

export default function EducationsPage() {
  const [educations, setEducations] = useState([]);
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
        .from("educations")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("display_order", { ascending: true });
      setEducations(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function validate() {
    const e = {};
    if (!form.degree.trim()) e.degree = "Obligatoire";
    if (!form.institution.trim()) e.institution = "Obligatoire";
    if (!form.field_of_study.trim()) e.field_of_study = "Obligatoire";
    if (!form.start_date) e.start_date = "Obligatoire";
    if (!form.is_current && !form.end_date)
      e.end_date = "Obligatoire si formation terminée";
    if (form.start_date && form.end_date && form.end_date < form.start_date)
      e.end_date = "La date de fin doit être après le début";
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
      degree: sanitize(form.degree),
      institution: sanitize(form.institution),
      field_of_study: sanitize(form.field_of_study),
      location: sanitize(form.location),
      start_date: toDate(form.start_date),
      end_date: form.is_current ? null : toDate(form.end_date),
      mention: sanitize(form.mention),
      description: form.description.trim(),
      display_order: educations.length,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("educations")
        .update(payload)
        .eq("id", editing)
        .select();
      if (!error && data && data.length > 0) {
        setEducations((prev) =>
          prev.map((e) => (e.id === editing ? data[0] : e)),
        );
      }
    } else {
      const { data, error } = await supabase
        .from("educations")
        .insert(payload)
        .select();
      if (!error && data && data.length > 0) {
        setEducations((prev) => [...prev, data[0]]);
      } else {
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
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `Tu es un expert en rédaction de CV. Reformule la description d'une formation pour un CV professionnel.
Règles :
- Mets en avant les compétences acquises, les projets réalisés et les points forts
- Format : 3 à 4 points courts avec tirets (-)
- Commence chaque point par un nom ou verbe fort
- Pas d'introduction ni de conclusion
- Garde la même langue (français)`,
              },
              {
                role: "user",
                content: `Reformule cette description pour la formation "${form.degree}" en "${form.field_of_study}" à "${form.institution}" :\n\n${form.description}`,
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
    if (!confirm("Supprimer cette formation ?")) return;
    await supabase.from("educations").delete().eq("id", id);
    setEducations((prev) => prev.filter((e) => e.id !== id));
  }

  function handleEdit(edu) {
    const toMonth = (d) => (d ? d.substring(0, 7) : "");
    setForm({
      degree: edu.degree || "",
      institution: edu.institution || "",
      field_of_study: edu.field_of_study || "",
      location: edu.location || "",
      start_date: toMonth(edu.start_date),
      end_date: toMonth(edu.end_date),
      is_current: !edu.end_date,
      mention: edu.mention || "",
      description: edu.description || "",
    });
    setEditing(edu.id);
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
          <h2 className="text-xl font-bold text-gray-800">Formations</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {educations.length} formation{educations.length > 1 ? "s" : ""}{" "}
            enregistrée{educations.length > 1 ? "s" : ""}
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
              {editing ? "Modifier la formation" : "Nouvelle formation"}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-light"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Diplôme & Établissement */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Diplôme <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.degree}
                  onChange={(e) => handleChange("degree", e.target.value)}
                  placeholder="Master, Licence, BTS..."
                  maxLength={100}
                  className={inputClass("degree")}
                />
                {errors.degree && (
                  <p className="text-red-500 text-xs mt-1">{errors.degree}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Établissement <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.institution}
                  onChange={(e) => handleChange("institution", e.target.value)}
                  placeholder="Université de Yaoundé I"
                  maxLength={100}
                  className={inputClass("institution")}
                />
                {errors.institution && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.institution}
                  </p>
                )}
              </div>
            </div>

            {/* Domaine & Lieu */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Domaine d'étude <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.field_of_study}
                  onChange={(e) =>
                    handleChange("field_of_study", e.target.value)
                  }
                  placeholder="Informatique, Gestion..."
                  maxLength={100}
                  className={inputClass("field_of_study")}
                />
                {errors.field_of_study && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.field_of_study}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Lieu <span className="text-gray-300">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  placeholder="Yaoundé, Cameroun"
                  maxLength={100}
                  className={inputClass("location")}
                />
              </div>
            </div>

            {/* Dates */}
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

            {/* En cours */}
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
              <span className="text-sm text-gray-600">Formation en cours</span>
            </label>

            {/* Mention */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Mention <span className="text-gray-300">(optionnel)</span>
              </label>
              <select
                value={form.mention}
                onChange={(e) => handleChange("mention", e.target.value)}
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              >
                <option value="">Aucune mention</option>
                <option value="Passable">Passable</option>
                <option value="Assez bien">Assez bien</option>
                <option value="Bien">Bien</option>
                <option value="Très bien">Très bien</option>
                <option value="Excellent">Excellent</option>
                <option value="Félicitations du jury">
                  Félicitations du jury
                </option>
              </select>
            </div>

            {/* Description + IA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">
                  Compétences acquises / Description{" "}
                  <span className="text-gray-300">(optionnel)</span>
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
              <p className="text-xs text-gray-400 mb-2">
                Décrivez librement ce que vous avez appris, l'IA reformulera
                pour un CV.
              </p>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Ex : J'ai appris la programmation web, réalisé un projet de fin d'études sur l'IA, obtenu une spécialisation en cybersécurité..."
                rows={4}
                maxLength={500}
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition resize-none"
              />
              <div className="flex justify-between mt-1">
                <span />
                <p className="text-xs text-gray-300">
                  {form.description.length}/500
                </p>
              </div>
              {optimizing && (
                <p className="text-xs text-yellow-600 mt-1 animate-pulse">
                  ✦ L'IA reformule vos compétences...
                </p>
              )}
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
      {educations.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">🎓</p>
          <p className="text-gray-500 font-medium">Aucune formation ajoutée</p>
          <p className="text-gray-400 text-sm mt-1">
            Cliquez sur "Ajouter" pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {educations.map((edu) => (
            <div
              key={edu.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-800 text-sm">
                    {edu.degree}
                  </h4>
                  {!edu.end_date && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      En cours
                    </span>
                  )}
                  {edu.mention && (
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {edu.mention}
                    </span>
                  )}
                </div>
                <p className="text-green-600 text-sm font-medium">
                  {edu.institution}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {edu.field_of_study}
                  {edu.location && ` · ${edu.location}`}
                  {" · "}
                  {formatDate(edu.start_date)} —{" "}
                  {edu.end_date ? formatDate(edu.end_date) : "Présent"}
                </p>
                {edu.description && (
                  <p className="text-gray-500 text-xs mt-2 line-clamp-2">
                    {edu.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleEdit(edu)}
                  className="text-xs text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-all"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(edu.id)}
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
