"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const { data } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("created_at", { ascending: false });
      setResumes(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(id) {
    if (!confirm("Supprimer ce CV ?")) return;
    await supabase.from("resumes").delete().eq("id", id);
    setResumes((prev) => prev.filter((r) => r.id !== id));
  }

  function formatDate(d) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const templateLabels = {
    classique: "Classique",
    moderne: "Moderne",
    creatif: "Créatif",
  };
  const templateColors = {
    classique: "bg-gray-100 text-gray-700",
    moderne: "bg-blue-100 text-blue-700",
    creatif: "bg-purple-100 text-purple-700",
  };

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
          <h2 className="text-xl font-bold text-gray-800">Mes CV</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {resumes.length} CV généré{resumes.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/dashboard/generate")}
          className="bg-yellow-400 hover:bg-yellow-300 text-green-800 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
        >
          ✦ Générer un CV
        </button>
      </div>

      {resumes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-gray-500 font-medium">Aucun CV généré</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            Générez votre premier CV en cliquant sur le bouton ci-dessus.
          </p>
          <button
            onClick={() => (window.location.href = "/dashboard/generate")}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all"
          >
            ✦ Générer mon premier CV
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-800 text-sm">
                    {resume.title}
                  </h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${templateColors[resume.template] || "bg-gray-100 text-gray-600"}`}
                  >
                    {templateLabels[resume.template] || resume.template}
                  </span>
                </div>
                {resume.target_job && (
                  <p className="text-green-600 text-sm font-medium">
                    {resume.target_job}
                  </p>
                )}
                <p className="text-gray-400 text-xs mt-0.5">
                  Créé le {formatDate(resume.created_at)}
                </p>
              </div>

              <div className="flex gap-2 ml-4 flex-shrink-0">
                {/* Voir */}
                <button
                  onClick={() =>
                    (window.location.href = `/dashboard/resumes/${resume.id}`)
                  }
                  className="text-xs text-gray-400 hover:text-blue-600 border border-gray-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-all"
                >
                  👁 Voir
                </button>

                {/* Dupliquer */}
                <button
                  onClick={async () => {
                    const { data: session } = await supabase.auth.getSession();
                    if (!session.session) return;
                    const { data } = await supabase
                      .from("resumes")
                      .insert({
                        ...resume,
                        id: undefined,
                        title: `${resume.title} (copie)`,
                        created_at: undefined,
                        updated_at: undefined,
                      })
                      .select();
                    if (data?.length > 0)
                      setResumes((prev) => [data[0], ...prev]);
                  }}
                  className="text-xs text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-all"
                >
                  Dupliquer
                </button>

                {/* Supprimer */}
                <button
                  onClick={() => handleDelete(resume.id)}
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
