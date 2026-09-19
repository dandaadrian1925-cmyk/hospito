import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ScrollToTop from './components/common/ScrollToTop';
import CookieConsentBanner from './components/common/CookieConsentBanner';
import AccessibiliteButton from './components/common/AccessibiliteButton';
import SupportChatWidget from './components/support/SupportChatWidget';
const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const MonComptePage = lazy(() => import('./pages/MonComptePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const CGUPage = lazy(() => import('./pages/CGUPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const SecuritePage = lazy(() => import('./pages/SecuritePage'));
const ConfidentialitePage = lazy(() => import('./pages/ConfidentialitePage'));
const CookiesPage = lazy(() => import('./pages/CookiesPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const DemandeEtablissementPage = lazy(() => import('./pages/DemandeEtablissementPage'));
const EtablissementLayout = lazy(() => import('./pages/etablissement/EtablissementLayout'));
const EtablissementAccueilPage = lazy(() => import('./pages/etablissement/EtablissementAccueilPage'));
const EtablissementServicesPage = lazy(() => import('./pages/etablissement/EtablissementServicesPage'));
const EtablissementServiceDetailPage = lazy(() => import('./pages/etablissement/EtablissementServiceDetailPage'));
const EtablissementEquipePage = lazy(() => import('./pages/etablissement/EtablissementEquipePage'));
const EtablissementTarifsPage = lazy(() => import('./pages/etablissement/EtablissementTarifsPage'));
const EtablissementAvisPage = lazy(() => import('./pages/etablissement/EtablissementAvisPage'));
const EtablissementContactPage = lazy(() => import('./pages/etablissement/EtablissementContactPage'));
const EtablissementAProposPage = lazy(() => import('./pages/etablissement/EtablissementAProposPage'));
const EtablissementActualitesPage = lazy(() => import('./pages/etablissement/EtablissementActualitesPage'));
const EtablissementActualiteDetailPage = lazy(() => import('./pages/etablissement/EtablissementActualiteDetailPage'));
const EtablissementRdvPage = lazy(() => import('./pages/etablissement/EtablissementRdvPage'));
const EtablissementMesRendezVousPage = lazy(() => import('./pages/etablissement/EtablissementMesRendezVousPage'));
const EtablissementDossierPage = lazy(() => import('./pages/etablissement/EtablissementDossierPage'));
const EtablissementPaiementPage = lazy(() => import('./pages/etablissement/EtablissementPaiementPage'));
const EtablissementReclamationsPage = lazy(() => import('./pages/etablissement/EtablissementReclamationsPage'));
const EtablissementSecuritePage = lazy(() => import('./pages/etablissement/EtablissementSecuritePage'));
const EtablissementsPage = lazy(() => import('./pages/EtablissementsPage'));
const FavorisEtablissementsPage = lazy(() => import('./pages/FavorisEtablissementsPage'));
const CommentCaMarchePage = lazy(() => import('./pages/CommentCaMarchePage'));
const MesDroitsPage = lazy(() => import('./pages/MesDroitsPage'));
const UrgencePage = lazy(() => import('./pages/UrgencePage'));
const TeleconsultationUrgencePage = lazy(() => import('./pages/TeleconsultationUrgencePage'));
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
      <AccessibiliteButton />
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
      borderTopColor: 'var(--blue, #2FB4A0)',
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
        <SupportChatWidget />
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
            <Route path="/notifications" element={<Layout><NotificationsPage /></Layout>} />

            {}
            <Route path="/wallet" element={<Layout><WalletPage /></Layout>} />
            <Route path="/wallet/retour" element={<Layout><WalletPage /></Layout>} />

            {}
            <Route path="/mon-compte/*" element={<Layout><MonComptePage /></Layout>} />

            {}
            <Route path="/comment-ca-marche" element={<Layout><CommentCaMarchePage /></Layout>} />
            <Route path="/faq" element={<Layout><FAQPage /></Layout>} />
            <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
            <Route path="/securite" element={<Layout><SecuritePage /></Layout>} />
            <Route path="/cgu" element={<Layout><CGUPage /></Layout>} />
            <Route path="/confidentialite" element={<Layout><ConfidentialitePage /></Layout>} />
            <Route path="/cookies" element={<Layout><CookiesPage /></Layout>} />
            <Route path="/etablissements/demande" element={<Layout><DemandeEtablissementPage /></Layout>} />
            <Route path="/etablissement/:etablissementId" element={<EtablissementLayout />}>
              <Route index element={<EtablissementAccueilPage />} />
              <Route path="services" element={<EtablissementServicesPage />} />
              <Route path="services/:serviceId" element={<EtablissementServiceDetailPage />} />
              <Route path="equipe" element={<EtablissementEquipePage />} />
              <Route path="tarifs" element={<EtablissementTarifsPage />} />
              <Route path="avis" element={<EtablissementAvisPage />} />
              <Route path="contact" element={<EtablissementContactPage />} />
              <Route path="apropos" element={<EtablissementAProposPage />} />
              <Route path="actualites" element={<EtablissementActualitesPage />} />
              <Route path="actualites/:actualiteId" element={<EtablissementActualiteDetailPage />} />
              <Route path="rdv" element={<EtablissementRdvPage />} />
              <Route path="mes-rendez-vous" element={<EtablissementMesRendezVousPage />} />
              <Route path="dossier" element={<EtablissementDossierPage />} />
              <Route path="paiement" element={<EtablissementPaiementPage />} />
              <Route path="reclamations" element={<EtablissementReclamationsPage />} />
              <Route path="securite" element={<EtablissementSecuritePage />} />
            </Route>
            <Route path="/etablissements" element={<Layout><EtablissementsPage /></Layout>} />
            <Route path="/mes-favoris" element={<Layout><FavorisEtablissementsPage /></Layout>} />
            <Route path="/mes-droits" element={<Layout><MesDroitsPage /></Layout>} />
            <Route path="/urgence" element={<Layout noFooter><UrgencePage /></Layout>} />
            <Route path="/urgence/teleconsultation" element={<Layout noFooter><TeleconsultationUrgencePage /></Layout>} />

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
