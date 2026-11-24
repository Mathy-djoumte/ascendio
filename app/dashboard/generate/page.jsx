"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const TEMPLATES = [
  {
    id: "classique",
    label: "Classique",
    desc: "Sobre et compatible ATS",
    icon: "📄",
  },
  {
    id: "moderne",
    label: "Moderne",
    desc: "Colonnes, design épuré",
    icon: "✨",
  },
  { id: "creatif", label: "Créatif", desc: "Audacieux et visuel", icon: "🎨" },
];

const STEPS = ["Informations", "Template", "Sélection", "Accroche", "Résumé"];

export default function GeneratePage() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [userId, setUserId] = useState(null);

  // Données du profil
  const [profile, setProfile] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [educations, setEducations] = useState([]);
  const [skills, setSkills] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [interests, setInterests] = useState([]);

  // Choix utilisateur
  const [cvTitle, setCvTitle] = useState("");
  const [targetJob, setTargetJob] = useState("");
  const [template, setTemplate] = useState("classique");
  const [summary, setSummary] = useState("");
  const [summaryMode, setSummaryMode] = useState("base"); // base | custom | ai

  // Sélections
  const [selExp, setSelExp] = useState([]);
  const [selEdu, setSelEdu] = useState([]);
  const [selSkills, setSelSkills] = useState([]);
  const [selLangs, setSelLangs] = useState([]);
  const [selCerts, setSelCerts] = useState([]);
  const [selProjects, setSelProjects] = useState([]);
  const [selInterests, setSelInterests] = useState([]);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const uid = session.session.user.id;
      setUserId(uid);

      const [p, exp, edu, sk, lang, cert, proj, int] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase
          .from("experiences")
          .select("*")
          .eq("user_id", uid)
          .order("display_order"),
        supabase
          .from("educations")
          .select("*")
          .eq("user_id", uid)
          .order("display_order"),
        supabase
          .from("skills")
          .select("*")
          .eq("user_id", uid)
          .order("display_order"),
        supabase
          .from("languages")
          .select("*")
          .eq("user_id", uid)
          .order("display_order"),
        supabase
          .from("certifications")
          .select("*")
          .eq("user_id", uid)
          .order("display_order"),
        supabase
          .from("projects")
          .select("*")
          .eq("user_id", uid)
          .order("display_order"),
        supabase
          .from("interests")
          .select("*")
          .eq("user_id", uid)
          .order("display_order"),
      ]);

      setProfile(p.data);
      setExperiences(exp.data || []);
      setEducations(edu.data || []);
      setSkills(sk.data || []);
      setLanguages(lang.data || []);
      setCertifications(cert.data || []);
      setProjects(proj.data || []);
      setInterests(int.data || []);

      // Présélectionner tout par défaut
      setSelExp((exp.data || []).map((e) => e.id));
      setSelEdu((edu.data || []).map((e) => e.id));
      setSelSkills((sk.data || []).map((e) => e.id));
      setSelLangs((lang.data || []).map((e) => e.id));
      setSelCerts((cert.data || []).map((e) => e.id));
      setSelProjects((proj.data || []).map((e) => e.id));
      setSelInterests((int.data || []).map((e) => e.id));

      // Accroche de base
      if (p.data?.summary) setSummary(p.data.summary);
    }
    load();
  }, []);

  function toggle(id, sel, setSel) {
    setSel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function validateStep() {
    const e = {};
    if (step === 0) {
      if (!cvTitle.trim()) e.cvTitle = "Obligatoire";
      if (!targetJob.trim()) e.targetJob = "Obligatoire";
    }
    if (step === 3) {
      if (!summary.trim()) e.summary = "Obligatoire";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleOptimizeSummary() {
    if (!summary.trim() || summary.trim().length < 20) {
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
                  "Tu es un expert en rédaction de CV. Adapte et améliore l'accroche professionnelle pour qu'elle corresponde parfaitement au poste visé. Réponds UNIQUEMENT avec l'accroche adaptée, sans introduction. Maximum 3 phrases.",
              },
              {
                role: "user",
                content: `Adapte cette accroche pour le poste de "${targetJob}" :\n\n"${summary}"\n\nProfile : ${profile?.first_name} ${profile?.last_name}${profile?.city ? `, basé(e) à ${profile.city}` : ""}.`,
              },
            ],
            max_tokens: 1000,
          }),
        },
      );
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) setSummary(text.trim());
      else alert("Erreur IA. Réessayez.");
    } catch (err) {
      alert("Erreur réseau : " + err.message);
    }
    setOptimizing(false);
  }

  async function handleGenerate() {
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        title: cvTitle.trim(),
        target_job: targetJob.trim(),
        template,
        language: "fr",
        selected_experiences: selExp,
        selected_educations: selEdu,
        selected_skills: selSkills,
        selected_languages: selLangs,
        selected_certifications: selCerts,
        selected_projects: selProjects,
        selected_interests: selInterests,
        content: {
          summary,
          profile,
          experiences: experiences.filter((e) => selExp.includes(e.id)),
          educations: educations.filter((e) => selEdu.includes(e.id)),
          skills: skills.filter((e) => selSkills.includes(e.id)),
          languages: languages.filter((e) => selLangs.includes(e.id)),
          certifications: certifications.filter((e) => selCerts.includes(e.id)),
          projects: projects.filter((e) => selProjects.includes(e.id)),
          interests: interests.filter((e) => selInterests.includes(e.id)),
        },
      };

      const { data, error } = await supabase
        .from("resumes")
        .insert(payload)
        .select();
      if (!error && data?.length > 0) {
        window.location.href = `/dashboard/resumes`;
      } else {
        alert("Erreur : " + JSON.stringify(error));
      }
    } catch (err) {
      alert("Erreur : " + err.message);
    }
    setSaving(false);
  }

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

  const inputClass = (field) =>
    `w-full border ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition`;

  return (
    <div className="max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1 mb-2"
        >
          ← Retour au dashboard
        </button>
        <h2 className="text-xl font-bold text-gray-800">Générer un CV</h2>
        <p className="text-gray-400 text-sm mt-0.5">
          Créez un CV personnalisé en quelques étapes.
        </p>
      </div>

      {/* Barre de progression */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                i < step
                  ? "bg-green-600 text-white"
                  : i === step
                    ? "bg-green-600 text-white ring-4 ring-green-100"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${i === step ? "text-green-700" : "text-gray-400"}`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 rounded ${i < step ? "bg-green-600" : "bg-gray-100"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ÉTAPE 0 — Informations */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-800">
            Informations de base
          </h3>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Nom interne du CV <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={cvTitle}
              onChange={(e) => {
                setCvTitle(e.target.value);
                setErrors((p) => ({ ...p, cvTitle: null }));
              }}
              placeholder="Ex : CV Google - Juillet 2025"
              maxLength={100}
              className={inputClass("cvTitle")}
            />
            {errors.cvTitle && (
              <p className="text-red-500 text-xs mt-1">{errors.cvTitle}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Ce nom est uniquement pour vous aider à retrouver ce CV.
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Poste visé <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={targetJob}
              onChange={(e) => {
                setTargetJob(e.target.value);
                setErrors((p) => ({ ...p, targetJob: null }));
              }}
              placeholder="Ex : Développeur Full-Stack, Chef de projet..."
              maxLength={100}
              className={inputClass("targetJob")}
            />
            {errors.targetJob && (
              <p className="text-red-500 text-xs mt-1">{errors.targetJob}</p>
            )}
          </div>
        </div>
      )}

      {/* ÉTAPE 1 — Template */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Choisir un template
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  template === t.id
                    ? "border-green-600 bg-green-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                <div className="text-3xl mb-2">{t.icon}</div>
                <p
                  className={`font-semibold text-sm ${template === t.id ? "text-green-700" : "text-gray-700"}`}
                >
                  {t.label}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t.desc}</p>
                {template === t.id && (
                  <p className="text-xs text-green-600 font-medium mt-2">
                    ✓ Sélectionné
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ÉTAPE 2 — Sélection des blocs */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Cochez les éléments à inclure dans ce CV. Tout est présélectionné
            par défaut.
          </p>

          {/* Expériences */}
          {experiences.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  💼 Expériences ({selExp.length}/{experiences.length})
                </h3>
                <button
                  onClick={() =>
                    setSelExp(
                      selExp.length === experiences.length
                        ? []
                        : experiences.map((e) => e.id),
                    )
                  }
                  className="text-xs text-green-600 hover:underline"
                >
                  {selExp.length === experiences.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </button>
              </div>
              <div className="space-y-2">
                {experiences.map((exp) => (
                  <label
                    key={exp.id}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selExp.includes(exp.id)}
                      onChange={() => toggle(exp.id, selExp, setSelExp)}
                      className="w-4 h-4 accent-green-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {exp.job_title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {exp.company} · {formatDate(exp.start_date)} —{" "}
                        {exp.is_current ? "Présent" : formatDate(exp.end_date)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Formations */}
          {educations.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  🎓 Formations ({selEdu.length}/{educations.length})
                </h3>
                <button
                  onClick={() =>
                    setSelEdu(
                      selEdu.length === educations.length
                        ? []
                        : educations.map((e) => e.id),
                    )
                  }
                  className="text-xs text-green-600 hover:underline"
                >
                  {selEdu.length === educations.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </button>
              </div>
              <div className="space-y-2">
                {educations.map((edu) => (
                  <label
                    key={edu.id}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selEdu.includes(edu.id)}
                      onChange={() => toggle(edu.id, selEdu, setSelEdu)}
                      className="w-4 h-4 accent-green-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {edu.degree} — {edu.field_of_study}
                      </p>
                      <p className="text-xs text-gray-400">{edu.institution}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Compétences */}
          {skills.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  🛠️ Compétences ({selSkills.length}/{skills.length})
                </h3>
                <button
                  onClick={() =>
                    setSelSkills(
                      selSkills.length === skills.length
                        ? []
                        : skills.map((s) => s.id),
                    )
                  }
                  className="text-xs text-green-600 hover:underline"
                >
                  {selSkills.length === skills.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => toggle(skill.id, selSkills, setSelSkills)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selSkills.includes(skill.id)
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Langues */}
          {languages.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  🌐 Langues ({selLangs.length}/{languages.length})
                </h3>
                <button
                  onClick={() =>
                    setSelLangs(
                      selLangs.length === languages.length
                        ? []
                        : languages.map((l) => l.id),
                    )
                  }
                  className="text-xs text-green-600 hover:underline"
                >
                  {selLangs.length === languages.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => toggle(lang.id, selLangs, setSelLangs)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selLangs.includes(lang.id)
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {lang.name} · {lang.level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  📜 Certifications ({selCerts.length}/{certifications.length})
                </h3>
                <button
                  onClick={() =>
                    setSelCerts(
                      selCerts.length === certifications.length
                        ? []
                        : certifications.map((c) => c.id),
                    )
                  }
                  className="text-xs text-green-600 hover:underline"
                >
                  {selCerts.length === certifications.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </button>
              </div>
              <div className="space-y-2">
                {certifications.map((cert) => (
                  <label
                    key={cert.id}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selCerts.includes(cert.id)}
                      onChange={() => toggle(cert.id, selCerts, setSelCerts)}
                      className="w-4 h-4 accent-green-600"
                    />
                    <p className="text-sm font-medium text-gray-800">
                      {cert.name} — {cert.issuing_org}
                    </p>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Projets */}
          {projects.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  📁 Projets ({selProjects.length}/{projects.length})
                </h3>
                <button
                  onClick={() =>
                    setSelProjects(
                      selProjects.length === projects.length
                        ? []
                        : projects.map((p) => p.id),
                    )
                  }
                  className="text-xs text-green-600 hover:underline"
                >
                  {selProjects.length === projects.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </button>
              </div>
              <div className="space-y-2">
                {projects.map((proj) => (
                  <label
                    key={proj.id}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selProjects.includes(proj.id)}
                      onChange={() =>
                        toggle(proj.id, selProjects, setSelProjects)
                      }
                      className="w-4 h-4 accent-green-600"
                    />
                    <p className="text-sm font-medium text-gray-800">
                      {proj.title}
                    </p>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Loisirs */}
          {interests.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  🎯 Loisirs ({selInterests.length}/{interests.length})
                </h3>
                <button
                  onClick={() =>
                    setSelInterests(
                      selInterests.length === interests.length
                        ? []
                        : interests.map((i) => i.id),
                    )
                  }
                  className="text-xs text-green-600 hover:underline"
                >
                  {selInterests.length === interests.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((int) => (
                  <button
                    key={int.id}
                    onClick={() =>
                      toggle(int.id, selInterests, setSelInterests)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selInterests.includes(int.id)
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {int.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ÉTAPE 3 — Accroche */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-800">
            Accroche pour ce CV
          </h3>
          <p className="text-sm text-gray-400">
            Poste visé :{" "}
            <span className="font-medium text-gray-700">{targetJob}</span>
          </p>

          {/* Mode de sélection */}
          <div className="flex gap-2">
            {[
              { id: "base", label: "Accroche de base" },
              { id: "custom", label: "Écrire manuellement" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSummaryMode(m.id);
                  if (m.id === "base" && profile?.summary)
                    setSummary(profile.summary);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  summaryMode === m.id
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">
                Accroche <span className="text-red-400">*</span>
              </label>
              <button
                onClick={handleOptimizeSummary}
                disabled={optimizing}
                className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-green-800 font-semibold px-3 py-1 rounded-lg text-xs transition-all"
              >
                {optimizing ? (
                  <>
                    <span className="animate-spin inline-block">⟳</span>{" "}
                    Adaptation...
                  </>
                ) : (
                  <>✦ Adapter au poste avec l'IA</>
                )}
              </button>
            </div>
            <textarea
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                setErrors((p) => ({ ...p, summary: null }));
              }}
              placeholder="Votre accroche professionnelle pour ce CV..."
              rows={5}
              maxLength={600}
              className={`w-full border ${errors.summary ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition resize-none`}
            />
            <div className="flex justify-between mt-1">
              {errors.summary ? (
                <p className="text-red-500 text-xs">{errors.summary}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-gray-300">{summary.length}/600</p>
            </div>
          </div>
        </div>
      )}

      {/* ÉTAPE 4 — Résumé */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              Résumé de votre CV
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Nom du CV</span>
                <span className="font-medium text-gray-800">{cvTitle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Poste visé</span>
                <span className="font-medium text-gray-800">{targetJob}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Template</span>
                <span className="font-medium text-gray-800 capitalize">
                  {template}
                </span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Expériences</span>
                <span className="font-medium text-gray-800">
                  {selExp.length} sélectionnée{selExp.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Formations</span>
                <span className="font-medium text-gray-800">
                  {selEdu.length} sélectionnée{selEdu.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Compétences</span>
                <span className="font-medium text-gray-800">
                  {selSkills.length} sélectionnée
                  {selSkills.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Langues</span>
                <span className="font-medium text-gray-800">
                  {selLangs.length} sélectionnée{selLangs.length > 1 ? "s" : ""}
                </span>
              </div>
              {selCerts.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Certifications</span>
                  <span className="font-medium text-gray-800">
                    {selCerts.length} sélectionnée
                    {selCerts.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {selProjects.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Projets</span>
                  <span className="font-medium text-gray-800">
                    {selProjects.length} sélectionné
                    {selProjects.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              <hr className="border-gray-100" />
              <div>
                <span className="text-xs text-gray-500">Accroche</span>
                <p className="text-sm text-gray-700 mt-1 italic">
                  "{summary.substring(0, 120)}
                  {summary.length > 120 ? "..." : ""}"
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800">
            ✓ Tout est prêt ! Cliquez sur <strong>"Générer le CV"</strong> pour
            sauvegarder votre CV dans l'historique.
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() =>
            step === 0
              ? (window.location.href = "/dashboard")
              : setStep((s) => s - 1)
          }
          className="border border-gray-200 text-gray-500 hover:text-gray-700 font-medium px-5 py-2.5 rounded-xl text-sm transition-all"
        >
          {step === 0 ? "Annuler" : "← Retour"}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={nextStep}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm"
          >
            Suivant →
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={saving}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-green-800 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin inline-block">⟳</span>{" "}
                Génération...
              </>
            ) : (
              "✦ Générer le CV"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
