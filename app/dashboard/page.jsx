"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const stats = [
  {
    label: "Expériences",
    icon: "💼",
    table: "experiences",
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "Formations",
    icon: "🎓",
    table: "educations",
    color: "bg-purple-50 text-purple-600",
  },
  {
    label: "Compétences",
    icon: "🛠️",
    table: "skills",
    color: "bg-orange-50 text-orange-600",
  },
  {
    label: "CV générés",
    icon: "📄",
    table: "resumes",
    color: "bg-green-50 text-green-600",
  },
];

export default function DashboardHome() {
  const [counts, setCounts] = useState({});
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      setUserName(session.session.user.user_metadata?.full_name || "");

      const results = await Promise.all(
        stats.map((s) =>
          supabase.from(s.table).select("id", { count: "exact", head: true }),
        ),
      );
      const newCounts = {};
      stats.forEach((s, i) => {
        newCounts[s.table] = results[i].count || 0;
      });
      setCounts(newCounts);
    }
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const firstName = userName.split(" ")[0];

  return (
    <div>
      {/* Salutation */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          {greeting}, {firstName} 👋
        </h2>
        <p className="text-gray-400 mt-1">
          Voici un aperçu de votre profil Ascendio.
        </p>
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.table}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${s.color}`}
            >
              {s.icon}
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {counts[s.table] ?? "—"}
            </p>
            <p className="text-sm text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bannière action */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <h3 className="text-white font-bold text-lg">
            Prêt à générer votre CV ?
          </h3>
          <p className="text-green-100 text-sm mt-1">
            Sélectionnez vos meilleures expériences et créez un CV parfait.
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/dashboard/generate")}
          className="bg-yellow-400 hover:bg-yellow-300 text-green-800 font-semibold px-5 py-2.5 rounded-xl transition-all text-sm whitespace-nowrap shadow-sm"
        >
          ✦ Générer un CV
        </button>
      </div>
    </div>
  );
}
