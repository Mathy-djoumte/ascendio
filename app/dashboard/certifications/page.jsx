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
  name: "",
  issuing_org: "",
  issue_date: "",
  expiry_date: "",
  credential_url: "",
};

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState([]);
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
        .from("certifications")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("display_order", { ascending: true });
      setCertifications(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Obligatoire";
    if (!form.issuing_org.trim()) e.issuing_org = "Obligatoire";
    if (!form.issue_date) e.issue_date = "Obligatoire";
    if (form.credential_url && !form.credential_url.startsWith("http"))
      e.credential_url = "URL invalide (doit commencer par https://)";
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

    const payload = {
      user_id: currentUserId,
      name: sanitize(form.name),
      issuing_org: sanitize(form.issuing_org),
      issue_date: toDate(form.issue_date),
      expiry_date: toDate(form.expiry_date),
      credential_url: form.credential_url.trim(),
      display_order: certifications.length,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("certifications")
        .update(payload)
        .eq("id", editing)
        .select();
      if (!error && data?.length > 0)
        setCertifications((prev) =>
          prev.map((c) => (c.id === editing ? data[0] : c)),
        );
    } else {
      const { data, error } = await supabase
        .from("certifications")
        .insert(payload)
        .select();
      if (!error && data?.length > 0)
        setCertifications((prev) => [...prev, data[0]]);
      else {
        alert("Erreur : " + JSON.stringify(error));
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    handleClose();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette certification ?")) return;
    await supabase.from("certifications").delete().eq("id", id);
    setCertifications((prev) => prev.filter((c) => c.id !== id));
  }

  function handleEdit(cert) {
    const toMonth = (d) => (d ? d.substring(0, 7) : "");
    setForm({
      name: cert.name || "",
      issuing_org: cert.issuing_org || "",
      issue_date: toMonth(cert.issue_date),
      expiry_date: toMonth(cert.expiry_date),
      credential_url: cert.credential_url || "",
    });
    setEditing(cert.id);
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

  function isExpired(d) {
    if (!d) return false;
    return new Date(d) < new Date();
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
          <h2 className="text-xl font-bold text-gray-800">Certifications</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {certifications.length} certification
            {certifications.length > 1 ? "s" : ""}
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
              {editing ? "Modifier" : "Nouvelle certification"}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Nom <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="AWS Solutions Architect"
                  maxLength={100}
                  className={inputClass("name")}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Organisme <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.issuing_org}
                  onChange={(e) => handleChange("issuing_org", e.target.value)}
                  placeholder="Amazon, Google, Microsoft..."
                  maxLength={100}
                  className={inputClass("issuing_org")}
                />
                {errors.issuing_org && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.issuing_org}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Date d'obtention <span className="text-red-400">*</span>
                </label>
                <input
                  type="month"
                  value={form.issue_date}
                  onChange={(e) => handleChange("issue_date", e.target.value)}
                  className={inputClass("issue_date")}
                />
                {errors.issue_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.issue_date}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Date d'expiration{" "}
                  <span className="text-gray-300">(optionnel)</span>
                </label>
                <input
                  type="month"
                  value={form.expiry_date}
                  onChange={(e) => handleChange("expiry_date", e.target.value)}
                  className={inputClass("expiry_date")}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Lien de vérification{" "}
                <span className="text-gray-300">(optionnel)</span>
              </label>
              <input
                type="url"
                value={form.credential_url}
                onChange={(e) => handleChange("credential_url", e.target.value)}
                placeholder="https://credential.net/..."
                className={inputClass("credential_url")}
              />
              {errors.credential_url && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.credential_url}
                </p>
              )}
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

      {certifications.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📜</p>
          <p className="text-gray-500 font-medium">
            Aucune certification ajoutée
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Cliquez sur "Ajouter" pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-800 text-sm">
                    {cert.name}
                  </h4>
                  {cert.expiry_date && isExpired(cert.expiry_date) && (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                      Expiré
                    </span>
                  )}
                  {cert.expiry_date && !isExpired(cert.expiry_date) && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      Valide
                    </span>
                  )}
                </div>
                <p className="text-green-600 text-sm font-medium">
                  {cert.issuing_org}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Obtenu : {formatDate(cert.issue_date)}
                  {cert.expiry_date &&
                    ` · Expire : ${formatDate(cert.expiry_date)}`}
                </p>
                {cert.credential_url && (
                  <a
                    href={cert.credential_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                  >
                    🔗 Voir le certificat
                  </a>
                )}
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleEdit(cert)}
                  className="text-xs text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-all"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(cert.id)}
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
