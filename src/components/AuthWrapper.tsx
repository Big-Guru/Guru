import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { ShieldAlert, Mail, Lock } from 'lucide-react';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    
    setSubmitting(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (e: any) {
      console.error(e);
      setSubmitting(false);
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError("Email ou mot de passe incorrect.");
      } else if (e.code === 'auth/email-already-in-use') {
        setError("Cet email est déjà utilisé.");
      } else if (e.code === 'auth/weak-password') {
        setError("Le mot de passe doit contenir au moins 6 caractères.");
      } else {
        setError("Une erreur est survenue lors de l'authentification. (" + e.code + ")");
      }
    }
  };

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center text-slate-500 font-medium tracking-tight">Chargement Guru...</div>;
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm">
           <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
             <ShieldAlert className="w-6 h-6" />
           </div>
           <h1 className="text-2xl font-bold text-slate-800 mb-2">
             {isLogin ? "Connexion" : "Créer un compte"}
           </h1>
           <p className="text-sm text-slate-500 mb-6 font-medium">
             {isLogin 
               ? "Connectez-vous pour accéder à votre espace Guru et gérer vos projets."
               : "Créez votre compte pour commencer à utiliser Guru."}
           </p>
           
           {error && (
             <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-4">
               {error}
             </div>
           )}

           <form onSubmit={handleSubmit} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                   <Mail className="w-4 h-4" />
                 </div>
                 <input 
                   type="email" 
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                   className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                   placeholder="vous@exemple.com"
                 />
               </div>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                   <Lock className="w-4 h-4" />
                 </div>
                 <input 
                   type="password" 
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                   placeholder="••••••••"
                 />
               </div>
             </div>

             <button 
               type="submit"
               disabled={submitting}
               className="w-full bg-slate-900 text-white font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors mt-2 disabled:opacity-50"
             >
               {submitting ? "Chargement..." : (isLogin ? "Se connecter" : "S'inscrire")}
             </button>
           </form>

           <div className="mt-6 text-center">
             <button 
               type="button"
               onClick={() => {
                 setIsLogin(!isLogin);
                 setError('');
               }}
               className="text-sm text-blue-600 hover:text-blue-700 font-medium"
             >
               {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
             </button>
           </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
