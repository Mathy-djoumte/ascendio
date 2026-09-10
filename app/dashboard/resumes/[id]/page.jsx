"use client";
import { useState, useEffect, useRef, use } from "react";
import { supabase } from "@/lib/supabase";

// ─── TRADUCTIONS ──────────────────────────────────────────────────────────────
const T = {
  fr: {
    profile: "Profil Professionnel",
    strengths: "Points Forts",
    experience: "Expérience Professionnelle",
    education: "Formation",
    skills: "Compétences",
    languages: "Langues",
    certifications: "Certifications",
    projects: "Projets",
    interests: "Loisirs & Intérêts",
    contact: "Contact",
    present: "Présent",
  },
  en: {
    profile: "Professional Profile",
    strengths: "Key Strengths",
    experience: "Professional Experience",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    certifications: "Certifications",
    projects: "Projects",
    interests: "Hobbies & Interests",
    contact: "Contact",
    present: "Present",
  },
};

function formatDate(d, lang = "fr") {
  if (!d) return "";
  const [y, m] = d.split("-");
  const monthsFr = [
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
  const monthsEn = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const months = lang === "en" ? monthsEn : monthsFr;
  return `${months[parseInt(m) - 1]} ${y}`;
}

export default function ResumePreviewPage({ params }) {
  const { id } = use(params);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const cvRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", id)
        .single();
      setResume(data);
      setLoading(false);
    }
    load();
  }, [id]);

  function handleDownload() {
    setDownloading(true);
    const style = document.createElement("style");
    style.id = "print-style";
    style.innerHTML = `
      @media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        body > *:not(#cv-print-area) { display: none !important; }
        #cv-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; background: white; }
        @page { margin: 0; size: A4 portrait; }
      }
    `;
    document.head.appendChild(style);
    const printArea = document.createElement("div");
    printArea.id = "cv-print-area";
    printArea.style.display = "none";
    printArea.innerHTML = cvRef.current.innerHTML;
    document.body.appendChild(printArea);
    window.print();
    setTimeout(() => {
      document.head.removeChild(style);
      document.body.removeChild(printArea);
      setDownloading(false);
    }, 1000);
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Chargement...
      </div>
    );
  if (!resume)
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        CV introuvable.
      </div>
    );

  const template = resume.template || "classique";
  const lang = resume.language || "fr";

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Barre d'actions */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (window.location.href = "/dashboard/resumes")}
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
          >
            ← Retour
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700 truncate max-w-48">
            {resume.title}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              template === "classique"
                ? "bg-gray-100 text-gray-600"
                : template === "moderne"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-purple-100 text-purple-600"
            }`}
          >
            {template}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium uppercase">
            {lang}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              (window.location.href = `/dashboard/generate?edit=${resume.id}`)
            }
            className="border border-gray-200 hover:border-green-400 text-gray-600 hover:text-green-700 font-medium px-4 py-2 rounded-xl text-sm transition-all"
          >
            ✏️ Modifier
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
          >
            {downloading ? (
              <>
                <span className="animate-spin inline-block">⟳</span>{" "}
                Préparation...
              </>
            ) : (
              <>⬇ Télécharger PDF</>
            )}
          </button>
        </div>
      </div>

      {/* Aperçu */}
      <div className="flex justify-center py-8 px-4">
        <div
          ref={cvRef}
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "white",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          }}
        >
          {template === "classique" && (
            <ClassiqueTemplate resume={resume} lang={lang} t={T[lang]} />
          )}
          {template === "moderne" && (
            <ModerneTemplate resume={resume} lang={lang} t={T[lang]} />
          )}
          {template === "creatif" && (
            <CreatifTemplate resume={resume} lang={lang} t={T[lang]} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TEMPLATE CLASSIQUE ───────────────────────────────────────────────────────
function ClassiqueTemplate({ resume, lang, t }) {
  const c = resume.content || {};
  const p = c.profile || {};
  const GREEN = "#1e4d2b";
  const GOLD = "#f0a500";
  const LIGHT = "#f0f7f2";

  return (
    <div
      style={{
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        color: "#2c2c2c",
        fontSize: "9.5pt",
        lineHeight: 1.5,
      }}
    >
      {/* HEADER */}
      <div
        style={{ background: GREEN, padding: "10mm 12mm 8mm", color: "white" }}
      >
        <h1
          style={{
            fontSize: "22pt",
            fontWeight: "800",
            margin: 0,
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          {p.first_name} {p.last_name}
        </h1>
        <h2
          style={{
            fontSize: "11pt",
            color: GOLD,
            margin: "2mm 0 4mm",
            fontWeight: "500",
            fontStyle: "italic",
          }}
        >
          {resume.target_job}
        </h2>
        <div
          style={{
            display: "flex",
            gap: "8mm",
            flexWrap: "wrap",
            fontSize: "8.5pt",
            color: "#c8e6d0",
          }}
        >
          {p.phone && <span>📞 {p.phone}</span>}
          {p.city && (
            <span>
              📍 {p.city}
              {p.country ? `, ${p.country}` : ""}
            </span>
          )}
          {p.linkedin_url && <span>🔗 linkedin.com/in/profil</span>}
          {p.website_url && <span>🌐 Portfolio</span>}
        </div>
      </div>

      {/* CORPS */}
      <div style={{ padding: "8mm 12mm" }}>
        {/* Profil */}
        {c.summary && (
          <Section title={t.profile} color={GREEN} gold={GOLD} light={LIGHT}>
            <p
              style={{
                margin: 0,
                color: "#444",
                lineHeight: 1.6,
                textAlign: "justify",
              }}
            >
              {c.summary}
            </p>
          </Section>
        )}

        {/* Expériences */}
        {c.experiences?.length > 0 && (
          <Section title={t.experience} color={GREEN} gold={GOLD} light={LIGHT}>
            {c.experiences.map((exp, i) => (
              <div key={i} style={{ marginBottom: "5mm" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "10pt",
                        color: GREEN,
                      }}
                    >
                      {exp.job_title}
                    </div>
                    <div
                      style={{
                        color: GOLD,
                        fontWeight: "600",
                        fontSize: "9pt",
                      }}
                    >
                      {exp.company}
                      {exp.location ? ` • ${exp.location}` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      background: LIGHT,
                      color: GREEN,
                      fontSize: "8pt",
                      fontWeight: "600",
                      padding: "1mm 3mm",
                      borderRadius: "2mm",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {formatDate(exp.start_date, lang)} –{" "}
                    {exp.is_current
                      ? t.present
                      : formatDate(exp.end_date, lang)}
                  </div>
                </div>
                {exp.description && (
                  <div
                    style={{
                      marginTop: "1.5mm",
                      color: "#444",
                      fontSize: "9pt",
                      whiteSpace: "pre-line",
                      paddingLeft: "2mm",
                      borderLeft: `2px solid ${GOLD}`,
                    }}
                  >
                    {exp.description}
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Formation */}
        {c.educations?.length > 0 && (
          <Section title={t.education} color={GREEN} gold={GOLD} light={LIGHT}>
            {c.educations.map((edu, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "4mm",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "10pt",
                      color: GREEN,
                    }}
                  >
                    {edu.degree}
                  </div>
                  <div
                    style={{ color: GOLD, fontWeight: "600", fontSize: "9pt" }}
                  >
                    {edu.institution}
                    {edu.location ? ` • ${edu.location}` : ""}
                  </div>
                  <div style={{ color: "#666", fontSize: "8.5pt" }}>
                    {edu.field_of_study}
                    {edu.mention ? ` — ${edu.mention}` : ""}
                  </div>
                </div>
                <div
                  style={{
                    background: LIGHT,
                    color: GREEN,
                    fontSize: "8pt",
                    fontWeight: "600",
                    padding: "1mm 3mm",
                    borderRadius: "2mm",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {formatDate(edu.start_date, lang)} –{" "}
                  {edu.end_date ? formatDate(edu.end_date, lang) : t.present}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Compétences + Langues */}
        <div style={{ display: "flex", gap: "8mm" }}>
          {c.skills?.length > 0 && (
            <div style={{ flex: 1 }}>
              <SectionTitle title={t.skills} color={GREEN} gold={GOLD} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm" }}>
                {c.skills.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      background: LIGHT,
                      color: GREEN,
                      border: `1px solid ${GREEN}20`,
                      fontSize: "8.5pt",
                      fontWeight: "500",
                      padding: "1mm 3mm",
                      borderRadius: "3mm",
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {c.languages?.length > 0 && (
            <div style={{ flex: 1 }}>
              <SectionTitle title={t.languages} color={GREEN} gold={GOLD} />
              {c.languages.map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2mm",
                    fontSize: "9pt",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#2c2c2c" }}>
                    {l.name}
                  </span>
                  <span style={{ color: GOLD, fontWeight: "500" }}>
                    {l.level}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Certifications */}
        {c.certifications?.length > 0 && (
          <Section
            title={t.certifications}
            color={GREEN}
            gold={GOLD}
            light={LIGHT}
          >
            {c.certifications.map((cert, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "2mm",
                  fontSize: "9pt",
                }}
              >
                <span>
                  <strong>{cert.name}</strong> — {cert.issuing_org}
                </span>
                <span style={{ color: "#888", fontSize: "8.5pt" }}>
                  {formatDate(cert.issue_date, lang)}
                </span>
              </div>
            ))}
          </Section>
        )}

        {/* Projets */}
        {c.projects?.length > 0 && (
          <Section title={t.projects} color={GREEN} gold={GOLD} light={LIGHT}>
            {c.projects.map((proj, i) => (
              <div key={i} style={{ marginBottom: "3mm" }}>
                <div
                  style={{ fontWeight: "700", color: GREEN, fontSize: "9.5pt" }}
                >
                  {proj.title}
                  {proj.technologies?.length > 0 && (
                    <span
                      style={{
                        color: "#888",
                        fontWeight: "400",
                        fontSize: "8.5pt",
                      }}
                    >
                      {" "}
                      — {proj.technologies.join(", ")}
                    </span>
                  )}
                </div>
                {proj.description && (
                  <div
                    style={{
                      color: "#444",
                      fontSize: "9pt",
                      whiteSpace: "pre-line",
                      marginTop: "0.5mm",
                    }}
                  >
                    {proj.description}
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Loisirs */}
        {c.interests?.length > 0 && (
          <Section title={t.interests} color={GREEN} gold={GOLD} light={LIGHT}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm" }}>
              {c.interests.map((int, i) => (
                <span
                  key={i}
                  style={{
                    background: `${GOLD}20`,
                    color: "#7a5a00",
                    fontSize: "8.5pt",
                    fontWeight: "500",
                    padding: "1mm 3mm",
                    borderRadius: "3mm",
                  }}
                >
                  {int.name}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ─── TEMPLATE MODERNE ─────────────────────────────────────────────────────────
function ModerneTemplate({ resume, lang, t }) {
  const c = resume.content || {};
  const p = c.profile || {};
  const GREEN = "#1e4d2b";
  const GOLD = "#f0a500";
  const SIDEBAR = "#1a3d24";

  return (
    <div
      style={{
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        display: "flex",
        minHeight: "297mm",
        color: "#2c2c2c",
        fontSize: "9.5pt",
      }}
    >
      {/* SIDEBAR */}
      <div
        style={{
          width: "68mm",
          background: SIDEBAR,
          color: "white",
          padding: "0",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Photo placeholder + nom */}
        <div
          style={{
            background: GREEN,
            padding: "10mm 7mm 8mm",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "20mm",
              height: "20mm",
              borderRadius: "50%",
              background: GOLD,
              margin: "0 auto 4mm",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14pt",
              fontWeight: "800",
              color: SIDEBAR,
            }}
          >
            {(p.first_name || "?")[0]}
            {(p.last_name || "?")[0]}
          </div>
          <h1
            style={{
              fontSize: "13pt",
              fontWeight: "800",
              margin: 0,
              letterSpacing: "0.5px",
              lineHeight: 1.2,
            }}
          >
            {p.first_name}
            <br />
            {p.last_name}
          </h1>
          <p
            style={{
              fontSize: "8.5pt",
              color: GOLD,
              margin: "2mm 0 0",
              fontStyle: "italic",
              lineHeight: 1.3,
            }}
          >
            {resume.target_job}
          </p>
        </div>

        {/* Contact */}
        <div style={{ padding: "6mm 7mm" }}>
          <SidebarSection title={t.contact} gold={GOLD}>
            {p.phone && <SidebarItem icon="📞" text={p.phone} />}
            {p.city && (
              <SidebarItem
                icon="📍"
                text={`${p.city}${p.country ? `, ${p.country}` : ""}`}
              />
            )}
            {p.linkedin_url && <SidebarItem icon="🔗" text="LinkedIn" />}
            {p.website_url && <SidebarItem icon="🌐" text="Portfolio" />}
          </SidebarSection>

          {/* Compétences */}
          {c.skills?.length > 0 && (
            <SidebarSection title={t.skills} gold={GOLD}>
              {c.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: "2.5mm" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "8.5pt",
                      color: "#c8e6d0",
                      marginBottom: "0.8mm",
                    }}
                  >
                    <span>{s.name}</span>
                  </div>
                  <div
                    style={{
                      height: "2mm",
                      background: "#2d5e3a",
                      borderRadius: "1mm",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(s.level / 5) * 100}%`,
                        background: GOLD,
                        borderRadius: "1mm",
                      }}
                    />
                  </div>
                </div>
              ))}
            </SidebarSection>
          )}

          {/* Langues */}
          {c.languages?.length > 0 && (
            <SidebarSection title={t.languages} gold={GOLD}>
              {c.languages.map((l, i) => (
                <div key={i} style={{ marginBottom: "2.5mm" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "8.5pt",
                      color: "#c8e6d0",
                      marginBottom: "0.8mm",
                    }}
                  >
                    <span style={{ fontWeight: "600" }}>{l.name}</span>
                    <span style={{ color: GOLD, fontSize: "7.5pt" }}>
                      {l.level}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "1.5mm",
                      background: "#2d5e3a",
                      borderRadius: "1mm",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${{ Débutant: 20, Beginner: 20, Intermédiaire: 40, Intermediate: 40, Courant: 65, Fluent: 65, Bilingue: 85, Bilingual: 85, Natif: 100, Native: 100 }[l.level] || 50}%`,
                        background: GOLD,
                        borderRadius: "1mm",
                      }}
                    />
                  </div>
                </div>
              ))}
            </SidebarSection>
          )}

          {/* Loisirs */}
          {c.interests?.length > 0 && (
            <SidebarSection title={t.interests} gold={GOLD}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5mm" }}>
                {c.interests.map((int, i) => (
                  <span
                    key={i}
                    style={{
                      background: "#2d5e3a",
                      color: "#c8e6d0",
                      fontSize: "7.5pt",
                      padding: "0.8mm 2.5mm",
                      borderRadius: "2mm",
                    }}
                  >
                    {int.name}
                  </span>
                ))}
              </div>
            </SidebarSection>
          )}
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ flex: 1, padding: "8mm 10mm" }}>
        {/* Profil */}
        {c.summary && (
          <div
            style={{
              marginBottom: "6mm",
              background: "#f0f7f2",
              borderLeft: `4px solid ${GOLD}`,
              padding: "4mm 5mm",
              borderRadius: "0 3mm 3mm 0",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#333",
                lineHeight: 1.6,
                fontStyle: "italic",
              }}
            >
              {c.summary}
            </p>
          </div>
        )}

        {/* Expériences */}
        {c.experiences?.length > 0 && (
          <MainSection title={t.experience} color={GREEN} gold={GOLD}>
            {c.experiences.map((exp, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "5mm",
                  paddingBottom: "4mm",
                  borderBottom:
                    i < c.experiences.length - 1
                      ? "1px dashed #e0e0e0"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "1mm",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "10pt",
                        color: GREEN,
                      }}
                    >
                      {exp.job_title}
                    </div>
                    <div
                      style={{
                        color: GOLD,
                        fontWeight: "600",
                        fontSize: "9pt",
                      }}
                    >
                      {exp.company}
                      {exp.location ? ` • ${exp.location}` : ""}
                    </div>
                  </div>
                  <span
                    style={{
                      background: "#f0f7f2",
                      color: GREEN,
                      fontSize: "7.5pt",
                      fontWeight: "600",
                      padding: "1mm 2.5mm",
                      borderRadius: "2mm",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(exp.start_date, lang)} –{" "}
                    {exp.is_current
                      ? t.present
                      : formatDate(exp.end_date, lang)}
                  </span>
                </div>
                {exp.description && (
                  <div
                    style={{
                      color: "#444",
                      fontSize: "9pt",
                      whiteSpace: "pre-line",
                      marginTop: "1.5mm",
                      lineHeight: 1.5,
                    }}
                  >
                    {exp.description}
                  </div>
                )}
              </div>
            ))}
          </MainSection>
        )}

        {/* Formation */}
        {c.educations?.length > 0 && (
          <MainSection title={t.education} color={GREEN} gold={GOLD}>
            {c.educations.map((edu, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "4mm",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: "700",
                      color: GREEN,
                      fontSize: "9.5pt",
                    }}
                  >
                    {edu.degree} — {edu.field_of_study}
                  </div>
                  <div
                    style={{ color: GOLD, fontWeight: "600", fontSize: "9pt" }}
                  >
                    {edu.institution}
                  </div>
                  {edu.mention && (
                    <div style={{ color: "#666", fontSize: "8.5pt" }}>
                      {edu.mention}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    background: "#f0f7f2",
                    color: GREEN,
                    fontSize: "7.5pt",
                    fontWeight: "600",
                    padding: "1mm 2.5mm",
                    borderRadius: "2mm",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {formatDate(edu.start_date, lang)} –{" "}
                  {edu.end_date ? formatDate(edu.end_date, lang) : t.present}
                </span>
              </div>
            ))}
          </MainSection>
        )}

        {/* Certifications */}
        {c.certifications?.length > 0 && (
          <MainSection title={t.certifications} color={GREEN} gold={GOLD}>
            {c.certifications.map((cert, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "2mm",
                  fontSize: "9pt",
                }}
              >
                <span>
                  <strong>{cert.name}</strong> — {cert.issuing_org}
                </span>
                <span style={{ color: "#888", fontSize: "8pt" }}>
                  {formatDate(cert.issue_date, lang)}
                </span>
              </div>
            ))}
          </MainSection>
        )}

        {/* Projets */}
        {c.projects?.length > 0 && (
          <MainSection title={t.projects} color={GREEN} gold={GOLD}>
            {c.projects.map((proj, i) => (
              <div key={i} style={{ marginBottom: "3mm" }}>
                <span style={{ fontWeight: "700", color: GREEN }}>
                  {proj.title}
                </span>
                {proj.technologies?.length > 0 && (
                  <span style={{ color: "#888", fontSize: "8.5pt" }}>
                    {" "}
                    — {proj.technologies.join(", ")}
                  </span>
                )}
                {proj.description && (
                  <div
                    style={{
                      color: "#444",
                      fontSize: "9pt",
                      marginTop: "0.5mm",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {proj.description}
                  </div>
                )}
              </div>
            ))}
          </MainSection>
        )}
      </div>
    </div>
  );
}

// ─── TEMPLATE CRÉATIF ─────────────────────────────────────────────────────────
function CreatifTemplate({ resume, lang, t }) {
  const c = resume.content || {};
  const p = c.profile || {};
  const GREEN = "#1e4d2b";
  const GOLD = "#f0a500";

  return (
    <div
      style={{
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        color: "#2c2c2c",
        fontSize: "9.5pt",
      }}
    >
      {/* HEADER créatif */}
      <div
        style={{
          background: `linear-gradient(135deg, ${GREEN} 0%, #2d7a42 60%, #1a5c30 100%)`,
          padding: "12mm 14mm",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-10mm",
            right: "-10mm",
            width: "50mm",
            height: "50mm",
            background: `${GOLD}30`,
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-8mm",
            right: "20mm",
            width: "30mm",
            height: "30mm",
            background: `${GOLD}20`,
            borderRadius: "50%",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1
            style={{
              fontSize: "26pt",
              fontWeight: "900",
              margin: 0,
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            {p.first_name} <span style={{ color: GOLD }}>{p.last_name}</span>
          </h1>
          <div
            style={{
              width: "20mm",
              height: "1mm",
              background: GOLD,
              margin: "2mm 0 3mm",
            }}
          />
          <h2
            style={{
              fontSize: "11pt",
              margin: 0,
              fontWeight: "400",
              color: "#c8e6d0",
              letterSpacing: "1px",
            }}
          >
            {resume.target_job}
          </h2>
        </div>
        <div
          style={{
            display: "flex",
            gap: "8mm",
            marginTop: "5mm",
            fontSize: "8.5pt",
            color: "#a8d5b5",
            position: "relative",
            zIndex: 1,
          }}
        >
          {p.phone && <span>📞 {p.phone}</span>}
          {p.city && (
            <span>
              📍 {p.city}
              {p.country ? `, ${p.country}` : ""}
            </span>
          )}
          {p.linkedin_url && <span>🔗 LinkedIn</span>}
          {p.website_url && <span>🌐 Portfolio</span>}
        </div>
      </div>

      {/* BANDE PROFIL */}
      {c.summary && (
        <div style={{ background: GOLD, padding: "4mm 14mm" }}>
          <p
            style={{
              margin: 0,
              color: "#1a1a1a",
              fontStyle: "italic",
              fontSize: "9.5pt",
              lineHeight: 1.5,
            }}
          >
            {c.summary}
          </p>
        </div>
      )}

      {/* CORPS 2 colonnes */}
      <div style={{ display: "flex", gap: 0 }}>
        {/* Colonne principale */}
        <div style={{ flex: 1, padding: "8mm 10mm 8mm 14mm" }}>
          {c.experiences?.length > 0 && (
            <CreatifSection title={t.experience} color={GREEN} gold={GOLD}>
              {c.experiences.map((exp, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: "5mm",
                    paddingLeft: "4mm",
                    borderLeft: `3px solid ${GOLD}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "700",
                        color: GREEN,
                        fontSize: "10pt",
                      }}
                    >
                      {exp.job_title}
                    </div>
                    <span
                      style={{
                        background: `${GREEN}15`,
                        color: GREEN,
                        fontSize: "7.5pt",
                        fontWeight: "600",
                        padding: "1mm 2.5mm",
                        borderRadius: "2mm",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(exp.start_date, lang)} –{" "}
                      {exp.is_current
                        ? t.present
                        : formatDate(exp.end_date, lang)}
                    </span>
                  </div>
                  <div
                    style={{
                      color: GOLD,
                      fontWeight: "600",
                      fontSize: "9pt",
                      marginBottom: "1mm",
                    }}
                  >
                    {exp.company}
                    {exp.location ? ` • ${exp.location}` : ""}
                  </div>
                  {exp.description && (
                    <div
                      style={{
                        color: "#444",
                        fontSize: "9pt",
                        whiteSpace: "pre-line",
                        lineHeight: 1.5,
                      }}
                    >
                      {exp.description}
                    </div>
                  )}
                </div>
              ))}
            </CreatifSection>
          )}

          {c.educations?.length > 0 && (
            <CreatifSection title={t.education} color={GREEN} gold={GOLD}>
              {c.educations.map((edu, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: "3mm",
                    paddingLeft: "4mm",
                    borderLeft: `3px solid ${GOLD}`,
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <div style={{ fontWeight: "700", color: GREEN }}>
                      {edu.degree}
                    </div>
                    <span style={{ color: "#888", fontSize: "8pt" }}>
                      {formatDate(edu.start_date, lang)} –{" "}
                      {edu.end_date
                        ? formatDate(edu.end_date, lang)
                        : t.present}
                    </span>
                  </div>
                  <div
                    style={{ color: GOLD, fontWeight: "600", fontSize: "9pt" }}
                  >
                    {edu.institution}
                  </div>
                  <div style={{ color: "#555", fontSize: "8.5pt" }}>
                    {edu.field_of_study}
                    {edu.mention ? ` — ${edu.mention}` : ""}
                  </div>
                </div>
              ))}
            </CreatifSection>
          )}

          {c.projects?.length > 0 && (
            <CreatifSection title={t.projects} color={GREEN} gold={GOLD}>
              {c.projects.map((proj, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: "3mm",
                    paddingLeft: "4mm",
                    borderLeft: `3px solid ${GOLD}`,
                  }}
                >
                  <div style={{ fontWeight: "700", color: GREEN }}>
                    {proj.title}
                    {proj.technologies?.length > 0 && (
                      <span
                        style={{
                          color: "#888",
                          fontWeight: "400",
                          fontSize: "8.5pt",
                        }}
                      >
                        {" "}
                        — {proj.technologies.join(", ")}
                      </span>
                    )}
                  </div>
                  {proj.description && (
                    <div
                      style={{
                        color: "#444",
                        fontSize: "9pt",
                        marginTop: "0.5mm",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {proj.description}
                    </div>
                  )}
                </div>
              ))}
            </CreatifSection>
          )}
        </div>

        {/* Colonne latérale */}
        <div
          style={{
            width: "65mm",
            background: "#f5faf6",
            padding: "8mm 7mm",
            borderLeft: `3px solid ${GREEN}15`,
          }}
        >
          {c.skills?.length > 0 && (
            <CreatifSection title={t.skills} color={GREEN} gold={GOLD}>
              {c.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: "2.5mm" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "8.5pt",
                      marginBottom: "0.8mm",
                    }}
                  >
                    <span style={{ fontWeight: "500" }}>{s.name}</span>
                  </div>
                  <div
                    style={{
                      height: "2mm",
                      background: "#dde",
                      borderRadius: "1mm",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(s.level / 5) * 100}%`,
                        background: GREEN,
                        borderRadius: "1mm",
                      }}
                    />
                  </div>
                </div>
              ))}
            </CreatifSection>
          )}

          {c.languages?.length > 0 && (
            <CreatifSection title={t.languages} color={GREEN} gold={GOLD}>
              {c.languages.map((l, i) => (
                <div key={i} style={{ marginBottom: "2mm" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "8.5pt",
                      marginBottom: "0.5mm",
                    }}
                  >
                    <span style={{ fontWeight: "600" }}>{l.name}</span>
                    <span
                      style={{
                        color: GOLD,
                        fontSize: "7.5pt",
                        fontWeight: "500",
                      }}
                    >
                      {l.level}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "1.5mm",
                      background: "#dde",
                      borderRadius: "1mm",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${{ Débutant: 20, Beginner: 20, Intermédiaire: 40, Intermediate: 40, Courant: 65, Fluent: 65, Bilingue: 85, Bilingual: 85, Natif: 100, Native: 100 }[l.level] || 50}%`,
                        background: GOLD,
                        borderRadius: "1mm",
                      }}
                    />
                  </div>
                </div>
              ))}
            </CreatifSection>
          )}

          {c.certifications?.length > 0 && (
            <CreatifSection title={t.certifications} color={GREEN} gold={GOLD}>
              {c.certifications.map((cert, i) => (
                <div key={i} style={{ marginBottom: "2mm", fontSize: "8.5pt" }}>
                  <div style={{ fontWeight: "600", color: GREEN }}>
                    {cert.name}
                  </div>
                  <div style={{ color: "#666" }}>
                    {cert.issuing_org} — {formatDate(cert.issue_date, lang)}
                  </div>
                </div>
              ))}
            </CreatifSection>
          )}

          {c.interests?.length > 0 && (
            <CreatifSection title={t.interests} color={GREEN} gold={GOLD}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5mm" }}>
                {c.interests.map((int, i) => (
                  <span
                    key={i}
                    style={{
                      background: `${GOLD}25`,
                      color: "#7a5a00",
                      fontSize: "8pt",
                      padding: "1mm 2.5mm",
                      borderRadius: "2mm",
                      fontWeight: "500",
                    }}
                  >
                    {int.name}
                  </span>
                ))}
              </div>
            </CreatifSection>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── COMPOSANTS RÉUTILISABLES ─────────────────────────────────────────────────
function SectionTitle({ title, color, gold }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2mm",
        marginBottom: "3mm",
        marginTop: "5mm",
      }}
    >
      <div
        style={{
          width: "3mm",
          height: "3mm",
          background: gold,
          borderRadius: "50%",
          flexShrink: 0,
        }}
      />
      <h3
        style={{
          fontSize: "10pt",
          fontWeight: "700",
          color,
          margin: 0,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </h3>
      <div style={{ flex: 1, height: "0.5mm", background: `${color}30` }} />
    </div>
  );
}

function Section({ title, color, gold, light, children }) {
  return (
    <div style={{ marginBottom: "5mm" }}>
      <SectionTitle title={title} color={color} gold={gold} />
      {children}
    </div>
  );
}

function SidebarSection({ title, gold, children }) {
  return (
    <div style={{ marginBottom: "6mm" }}>
      <div
        style={{
          borderBottom: `1px solid ${gold}`,
          paddingBottom: "1mm",
          marginBottom: "3mm",
        }}
      >
        <h3
          style={{
            fontSize: "8.5pt",
            fontWeight: "700",
            color: gold,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function SidebarItem({ icon, text }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "2mm",
        marginBottom: "2mm",
        fontSize: "8pt",
        color: "#c8e6d0",
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ wordBreak: "break-word" }}>{text}</span>
    </div>
  );
}

function MainSection({ title, color, gold, children }) {
  return (
    <div style={{ marginBottom: "5mm" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2mm",
          marginBottom: "3mm",
        }}
      >
        <div
          style={{
            width: "4mm",
            height: "4mm",
            background: gold,
            borderRadius: "1mm",
            flexShrink: 0,
          }}
        />
        <h3
          style={{
            fontSize: "10.5pt",
            fontWeight: "700",
            color,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </h3>
        <div style={{ flex: 1, height: "0.5mm", background: `${color}20` }} />
      </div>
      {children}
    </div>
  );
}

function CreatifSection({ title, color, gold, children }) {
  return (
    <div style={{ marginBottom: "6mm" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2mm",
          marginBottom: "3mm",
        }}
      >
        <span
          style={{
            width: "4mm",
            height: "4mm",
            background: gold,
            borderRadius: "50%",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <h3
          style={{
            fontSize: "10pt",
            fontWeight: "700",
            color,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}
