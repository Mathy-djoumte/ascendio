"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";

const menuItems = [
  { label: "Profil", href: "/dashboard/profile" },
  { label: "Expériences", href: "/dashboard/experiences" },
  { label: "Formations", href: "/dashboard/educations" },
  { label: "Compétences", href: "/dashboard/skills" },
  { label: "Langues", href: "/dashboard/languages" },
  { label: "Certifications", href: "/dashboard/certifications" },
  { label: "Projets", href: "/dashboard/projects" },
  { label: "Loisirs", href: "/dashboard/interests" },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.replace("/auth");
      } else {
        setUser(data.session.user);
      }
    }
    checkAuth();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.replace("/auth");
  }

  const fullName = user?.user_metadata?.full_name || "Utilisateur";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-3 pb-2 border-b border-green-500 flex justify-center">
        <img
          src="/images/logo.png"
          alt="Ascendio"
          className="h-8 w-auto bg-white rounded-lg p-0.5"
        />
      </div>

      {/* Profil utilisateur */}
      <div className="px-3 py-2 border-b border-green-500 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-green-800 font-bold text-xs flex-shrink-0">
          {initials}
        </div>
        <div className="overflow-hidden">
          <p className="text-white text-xs font-semibold truncate">
            {fullName}
          </p>
          <p className="text-green-200 text-xs truncate">{user?.email}</p>
        </div>
      </div>

      {/* Bouton Générer CV */}
      <div className="px-3 pt-2 pb-1">
        <button
          onClick={() => (window.location.href = "/dashboard/generate")}
          className="w-full bg-yellow-400 hover:bg-yellow-300 text-green-800 font-semibold rounded-lg py-1.5 text-xs flex items-center justify-center gap-1 transition-all"
        >
          ✦ Générer un CV
        </button>
      </div>

      {/* Navigation MON PROFIL */}
      <nav className="flex-1 px-3 py-1">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-wider px-2 mb-1">
          Mon profil
        </p>
        {menuItems.map((item) => {
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => {
                window.location.href = item.href;
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-all block ${
                active
                  ? "bg-white text-green-700"
                  : "text-green-100 hover:bg-green-500 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}

        {/* DOCUMENTS */}
        <p className="text-green-300 text-xs font-semibold uppercase tracking-wider px-2 mt-2 mb-1">
          Documents
        </p>
        <button
          onClick={() => {
            window.location.href = "/dashboard/resumes";
            setSidebarOpen(false);
          }}
          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-all block ${
            pathname === "/dashboard/resumes"
              ? "bg-white text-green-700"
              : "text-green-100 hover:bg-green-500 hover:text-white"
          }`}
        >
          Mes CV
        </button>
      </nav>

      {/* Déconnexion */}
      <div className="px-3 pb-2 pt-1 border-t border-green-500">
        <button
          onClick={handleLogout}
          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-green-200 hover:bg-green-500 hover:text-white transition-all"
        >
          ⏻ Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-52 bg-green-600 h-full flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile (overlay) */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-52 bg-green-600 h-full flex flex-col">
            <SidebarContent />
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Burger menu mobile */}
            <button
              className="md:hidden text-gray-500 hover:text-gray-800"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <h1 className="text-base font-semibold text-gray-800">
              {menuItems.find((m) => m.href === pathname)?.label ||
                (pathname === "/dashboard/resumes" ? "Mes CV" : "Dashboard")}
            </h1>
          </div>
          <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-green-800 font-bold text-xs">
            {initials}
          </div>
        </div>

        {/* Contenu de la page */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
