"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function sanitize(str) {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
}

function isValidUrl(url) {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidPhone(phone) {
  return /^[+\d\s\-().]{6,20}$/.test(phone);
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [errors, setErrors] = useState({});
  const [original, setOriginal] = useState(null);
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    city: "",
    country: "",
    linkedin_url: "",
    website_url: "",
    summary: "",
  });

  useEffect(() => {
    async function loadProfile() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.session.user.id)
        .single();
      if (data) {
        const loaded = {
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          city: data.city || "",
          country: data.country || "",
          linkedin_url: data.linkedin_url || "",
          website_url: data.website_url || "",
          summary: data.summary || "",
        };
        setProfile(loaded);
        setOriginal(loaded);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  function validate() {
    const newErrors = {};
    if (!profile.first_name.trim()) newErrors.first_name = "Obligatoire";
    else if (profile.first_name.trim().length < 2)
      newErrors.first_name = "Minimum 2 caractères";
    if (!profile.last_name.trim()) newErrors.last_name = "Obligatoire";
    else if (profile.last_name.trim().length < 2)
      newErrors.last_name = "Minimum 2 caractères";
    if (!profile.phone.trim()) newErrors.phone = "Obligatoire";
    else if (!isValidPhone(profile.phone)) newErrors.phone = "Numéro invalide";
    if (!profile.city.trim()) newErrors.city = "Obligatoire";
    if (!profile.country.trim()) newErrors.country = "Obligatoire";
    if (profile.linkedin_url && !isValidUrl(profile.linkedin_url))
      newErrors.linkedin_url = "URL invalide (https://...)";
    if (profile.website_url && !isValidUrl(profile.website_url))
      newErrors.website_url = "URL invalide (https://...)";
    if (!profile.summary.trim()) newErrors.summary = "Obligatoire";
    else if (profile.summary.trim().length < 30)
      newErrors.summary = "Minimum 30 caractères";
    else if (profile.summary.trim().length > 600)
      newErrors.summary = "Maximum 600 caractères";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSuccess(false);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    const cleanProfile = {
      first_name: sanitize(profile.first_name),
      last_name: sanitize(profile.last_name),
      phone: sanitize(profile.phone),
      city: sanitize(profile.city),
      country: sanitize(profile.country),
      linkedin_url: profile.linkedin_url.trim(),
      website_url: profile.website_url.trim(),
      summary: profile.summary.trim(),
    };
    const { error } = await supabase
      .from("profiles")
      .update(cleanProfile)
      .eq("id", session.session.user.id);
    if (!error) {
      setSuccess(true);
      setOriginal(profile);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  function handleCancel() {
    if (original) {
      setProfile(original);
      setErrors({});
    }
  }

  async function handleOptimize() {
    if (!profile.summary || profile.summary.trim().length < 20) {
      alert("Écrivez d'abord une accroche d'au moins 20 caractères.");
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
                content:
                  "Tu es un expert en rédaction de CV. Améliore les accroches professionnelles pour les rendre percutantes et orientées résultats. Réponds UNIQUEMENT avec l'accroche améliorée, sans introduction ni explication. Maximum 3 phrases. Garde la même langue (français). N'utilise pas de caractères HTML encodés.",
              },
              {
                role: "user",
                content: `Améliore cette accroche : "${profile.summary}". Contexte : ${profile.first_name} ${profile.last_name}${profile.city ? `, basé(e) à ${profile.city}` : ""}.`,
              },
            ],
            max_tokens: 1000,
          }),
        },
      );
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        setProfile((prev) => ({ ...prev, summary: text.trim() }));
        setErrors((prev) => ({ ...prev, summary: null }));
      } else {
        alert("Erreur IA. Réessayez.");
      }
    } catch (err) {
      alert("Erreur réseau : " + err.message);
    }
    setOptimizing(false);
  }

  function handleChange(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  const inputClass = (field) =>
    `w-full border ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition`;

  if (loading)
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Chargement...
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto">
      {/* En-tête avec retour dashboard */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1 mb-1"
          >
            ← Retour au dashboard
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            Informations personnelles
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Ces informations apparaîtront en haut de vos CV.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Identité */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Identité <span className="text-red-400">*</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prénom</label>
              <input
                type="text"
                value={profile.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                placeholder="Jean"
                maxLength={50}
                className={inputClass("first_name")}
              />
              {errors.first_name && (
                <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nom</label>
              <input
                type="text"
                value={profile.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                placeholder="Dupont"
                maxLength={50}
                className={inputClass("last_name")}
              />
              {errors.last_name && (
                <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Contact <span className="text-red-400">*</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Téléphone
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+237 6XX XXX XXX"
                maxLength={20}
                className={inputClass("phone")}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ville</label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Yaoundé"
                maxLength={50}
                className={inputClass("city")}
              />
              {errors.city && (
                <p className="text-red-500 text-xs mt-1">{errors.city}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Pays</label>
              <input
                type="text"
                value={profile.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="Cameroun"
                maxLength={50}
                className={inputClass("country")}
              />
              {errors.country && (
                <p className="text-red-500 text-xs mt-1">{errors.country}</p>
              )}
            </div>
          </div>
        </div>

        {/* Liens */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Liens</h3>
          <p className="text-xs text-gray-400 mb-3">
            Le portfolio est optionnel.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                LinkedIn <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={profile.linkedin_url}
                onChange={(e) => handleChange("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/in/votre-profil"
                className={inputClass("linkedin_url")}
              />
              {errors.linkedin_url && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.linkedin_url}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Site web / Portfolio{" "}
                <span className="text-gray-300 font-normal">(optionnel)</span>
              </label>
              <input
                type="url"
                value={profile.website_url}
                onChange={(e) => handleChange("website_url", e.target.value)}
                placeholder="https://monsite.com"
                className={inputClass("website_url")}
              />
              {errors.website_url && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.website_url}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Accroche + IA */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-700">
              Accroche professionnelle <span className="text-red-400">*</span>
            </h3>
            <button
              onClick={handleOptimize}
              disabled={optimizing}
              className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-green-800 font-semibold px-3 py-1.5 rounded-lg text-xs transition-all"
            >
              {optimizing ? (
                <>
                  <span className="animate-spin inline-block">⟳</span>{" "}
                  Optimisation...
                </>
              ) : (
                <>✦ Optimiser avec l'IA</>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Entre 30 et 600 caractères.
          </p>
          <textarea
            value={profile.summary}
            onChange={(e) => handleChange("summary", e.target.value)}
            placeholder="Ex : Développeur Full-Stack avec 5 ans d'expérience. Je crée des applications web performantes."
            rows={4}
            maxLength={600}
            className={`w-full border ${errors.summary ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition resize-none`}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.summary ? (
              <p className="text-red-500 text-xs">{errors.summary}</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-gray-300">
              {profile.summary.length}/600
            </p>
          </div>
          {optimizing && (
            <p className="text-xs text-yellow-600 mt-1 animate-pulse">
              ✦ L'IA améliore votre accroche...
            </p>
          )}
        </div>

        <p className="text-xs text-gray-400">
          <span className="text-red-400">*</span> Champs obligatoires
        </p>

        {/* Boutons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            {success && (
              <span className="text-green-600 text-sm font-medium">
                ✓ Profil sauvegardé !
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
