import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { resetPassword } from '../services/authService';
import toast from 'react-hot-toast';
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setSent(true);
        return;
      }
      const msgs = {
        'auth/invalid-email': 'Email invalide',
        'auth/too-many-requests': 'Trop de tentatives — réessayez dans quelques minutes'
      };
      toast.error(msgs[err.code] || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-primary-300 rounded-full blur-2xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-primary-700 font-black text-lg" style={{
            fontFamily: 'Syne, sans-serif'
          }}>H</span>
          </div>
          <span className="text-2xl font-black text-white" style={{
          fontFamily: 'Syne, sans-serif'
        }}>HostoConnect</span>
        </Link>

        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="bg-white rounded-3xl p-8 shadow-2xl">
          <Link to="/auth" className="flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm font-semibold mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour à la connexion
          </Link>

          {sent ? <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-2" style={{
            fontFamily: 'Syne, sans-serif'
          }}>Email envoyé !</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Si un compte existe pour <strong className="text-gray-700">{email}</strong>, un lien de réinitialisation vient d'être envoyé. Vérifiez aussi vos spams.
              </p>
              <Link to="/auth" className="btn-primary w-full justify-center py-3 text-sm">
                Retour à la connexion
              </Link>
            </div> : <>
              <h1 className="text-xl font-black text-gray-900 mb-2" style={{
            fontFamily: 'Syne, sans-serif'
          }}>Mot de passe oublié</h1>
              <p className="text-sm text-gray-500 mb-6">Entrez votre email, on vous envoie un lien pour le réinitialiser.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@example.com" required autoFocus className="input-field pl-9 text-sm" />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm">
                  {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Envoi...</span> : <span className="flex items-center gap-2">
                      Envoyer le lien de réinitialisation
                      <ArrowRight className="w-4 h-4" />
                    </span>}
                </button>
              </form>
            </>}
        </motion.div>

        <p className="text-center text-primary-200 text-xs mt-6">
          <Link to="/" className="hover:text-white transition-colors">← Retour à l'accueil</Link>
        </p>
      </div>
    </div>;
}
