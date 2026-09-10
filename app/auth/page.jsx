"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) setError(error.message);
        else setSuccess("Compte créé ! Vous pouvez maintenant vous connecter.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError("Email ou mot de passe incorrect.");
        } else if (data.session) {
          window.location.replace("/dashboard");
        }
      }
    } catch (err) {
      setError("Erreur réseau : " + err.message);
    }

    setLoading(false);
  }

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex min-h-[520px]">
        {/* GAUCHE : Formulaire */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12">
          <div className="flex items-center gap-2 mb-8">
            <img
              src="/images/logo.png"
              alt="Ascendio"
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold text-gray-800">Ascendio</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {isLogin ? "Connexion" : "Créer un compte"}
          </h2>
          <p className="text-gray-400 text-sm mb-7">
            {isLogin
              ? "Bienvenue ! Entrez vos identifiants."
              : "Rejoignez Ascendio gratuitement."}
          </p>

          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                />
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean@exemple.com"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-green-200"
          >
            {loading
              ? "Chargement..."
              : isLogin
                ? "Se connecter"
                : "Créer mon compte"}
          </button>

          {isLogin && (
            <p className="text-center text-sm text-gray-400 mt-4 cursor-pointer hover:text-green-600 transition">
              Mot de passe oublié ?
            </p>
          )}
        </div>

        {/* DROITE : Panneau coloré */}
        <div className="w-80 bg-green-600 flex flex-col items-center justify-center px-8 text-center">
          <img
            src="/images/logo.png"
            alt="Ascendio"
            className="h-24 w-auto mb-6 drop-shadow-lg bg-white rounded-2xl p-2"
          />

          <h3 className="text-white text-2xl font-bold mb-3">
            {isLogin ? "Bon retour !" : "Bienvenue !"}
          </h3>
          <p className="text-green-100 text-sm leading-relaxed mb-8">
            {isLogin
              ? "Heureux de vous revoir. Votre carrière vous attend, organisée et prête à l'emploi."
              : "Créez votre profil une seule fois et générez des CV parfaits pour chaque opportunité."}
          </p>

          <button
            onClick={() => {
              setMode(isLogin ? "register" : "login");
              setError(null);
              setSuccess(null);
            }}
            className="border-2 border-white text-white font-semibold px-6 py-2 rounded-xl hover:bg-white hover:text-green-700 transition-all text-sm"
          >
            {isLogin
              ? "Pas de compte ? S'inscrire"
              : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}
