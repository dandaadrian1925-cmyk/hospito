import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ScrollToTop from './components/common/ScrollToTop';
import CookieConsentBanner from './components/common/CookieConsentBanner';
import AppDownloadBanner from './components/common/AppDownloadBanner';
const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const CataloguePage = lazy(() => import('./pages/CataloguePage'));
const AnnoncePage = lazy(() => import('./pages/AnnoncePage'));
const PublierPage = lazy(() => import('./pages/PublierPage'));
const MonComptePage = lazy(() => import('./pages/MonComptePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const CommandePage = lazy(() => import('./pages/CommandePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const FavorisPage = lazy(() => import('./pages/FavorisPage'));
const AchatPage = lazy(() => import('./pages/AchatPage'));
const CommentCaMarche = lazy(() => import('./pages/CommentCaMarche'));
const CGUPage = lazy(() => import('./pages/CGUPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const SecuritePage = lazy(() => import('./pages/SecuritePage'));
const ConfidentialitePage = lazy(() => import('./pages/ConfidentialitePage'));
const CookiesPage = lazy(() => import('./pages/CookiesPage'));
const LitigesPage = lazy(() => import('./pages/LitigesPage'));
const ParrainagePage = lazy(() => import('./pages/ParrainagePage'));
const VerifCNIPage = lazy(() => import('./pages/VerifCNIPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const VendeurPage = lazy(() => import('./pages/VendeurPage'));
const DemandeEtablissementPage = lazy(() => import('./pages/DemandeEtablissementPage'));
const EtablissementSpacePage = lazy(() => import('./pages/EtablissementSpacePage'));
function Layout({
  children,
  noFooter = false
}) {
  return <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'white'
  }}>
      <Navbar />
      <main style={{
      flex: 1
    }}>{children}</main>
      {!noFooter && <Footer />}
    </div>;
}
function PageLoader() {
  return <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh'
  }}>
      <span style={{
      width: 32,
      height: 32,
      border: '3px solid #E2E8F0',
      borderTopColor: 'var(--blue, #2451C4)',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'maket-spin 0.7s linear infinite'
    }} />
      <style>{'@keyframes maket-spin { to { transform: rotate(360deg); } }'}</style>
    </div>;
}
export default function App() {
  return <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <CookieConsentBanner />
        <AppDownloadBanner />
        <Toaster position="top-center" toastOptions={{
        duration: 3000,
        style: {
          background: '#17181A',
          color: '#fff',
          borderRadius: '999px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        },
        success: {
          style: {
            background: '#2F7D5C'
          }
        },
        error: {
          style: {
            background: '#C2402F'
          }
        }
      }} />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />

            {}
            <Route path="/" element={<Layout><HomePage /></Layout>} />
            <Route path="/catalogue" element={<Layout><CataloguePage /></Layout>} />
            <Route path="/annonce/:id" element={<Layout><AnnoncePage /></Layout>} />
            <Route path="/vendeur/:userId" element={<Layout><VendeurPage /></Layout>} />
            <Route path="/publier" element={<Layout><PublierPage /></Layout>} />
            <Route path="/publier/:id" element={<Layout><PublierPage /></Layout>} />
            <Route path="/favoris" element={<Layout><FavorisPage /></Layout>} />
            <Route path="/notifications" element={<Layout><NotificationsPage /></Layout>} />
            <Route path="/acheter/:annonceId" element={<Layout><AchatPage /></Layout>} />
            <Route path="/commande/:id" element={<Layout><CommandePage /></Layout>} />

            {}
            <Route path="/wallet" element={<Layout><WalletPage /></Layout>} />
            <Route path="/wallet/retour" element={<Layout><WalletPage /></Layout>} />
            <Route path="/chat" element={<Layout noFooter><ChatPage /></Layout>} />
            <Route path="/chat/:convId" element={<Layout noFooter><ChatPage /></Layout>} />

            {}
            <Route path="/mon-compte/*" element={<Layout><MonComptePage /></Layout>} />
            <Route path="/mon-compte/cni" element={<Layout><VerifCNIPage /></Layout>} />

            {}
            <Route path="/comment-ca-marche" element={<Layout><CommentCaMarche /></Layout>} />
            <Route path="/parrainage" element={<Layout><ParrainagePage /></Layout>} />
            <Route path="/litiges" element={<Layout><LitigesPage /></Layout>} />
            <Route path="/faq" element={<Layout><FAQPage /></Layout>} />
            <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
            <Route path="/securite" element={<Layout><SecuritePage /></Layout>} />
            <Route path="/cgu" element={<Layout><CGUPage /></Layout>} />
            <Route path="/confidentialite" element={<Layout><ConfidentialitePage /></Layout>} />
            <Route path="/cookies" element={<Layout><CookiesPage /></Layout>} />
            <Route path="/etablissements/demande" element={<Layout><DemandeEtablissementPage /></Layout>} />
            <Route path="/etablissement/:etablissementId" element={<Layout><EtablissementSpacePage /></Layout>} />

            {}
            <Route path="*" element={<Layout>
                <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 24px',
              textAlign: 'center',
              minHeight: '60vh'
            }}>
                  <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 88,
                color: 'var(--accent-soft)',
                lineHeight: 1,
                marginBottom: 8
              }}>404</div>
                  <h1 style={{
                fontFamily: 'var(--font)',
                fontWeight: 700,
                fontSize: 26,
                color: 'var(--ink)',
                marginBottom: 10
              }}>
                    Page introuvable
                  </h1>
                  <p style={{
                color: 'var(--ink-3)',
                marginBottom: 28,
                fontSize: 15
              }}>
                    La page que vous cherchez n'existe pas ou a été déplacée.
                  </p>
                  <a href="/" className="btn-primary">Retour à l'accueil</a>
                </div>
              </Layout>} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>;
}
