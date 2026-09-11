import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarPlus, ArrowRight, MapPin, Phone, MessageCircle as WhatsAppIcon, FolderHeart, Wallet, Flag, LifeBuoy, Building2, Users, Star } from 'lucide-react';
import { listerServicesActifs, listerActualitesPubliees } from '../../services/etablissementsPublicService';
import { listerSpecialistesDuService } from '../../services/planningService';
import { getAvisEtablissement } from '../../services/avisEtablissementsService';
import AvisPublicSection from '../../components/etablissement/AvisPublicSection';

const LABEL_CATEGORIE = { nouveaute: 'Nouveauté', evenement: 'Événement', publication: 'Publication', autre: 'Actualité' };

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function SectionTitle({ title, lienTexte, lienVers }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{title}</h2>
      {lienVers && (
        <Link to={lienVers} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--blue)', textDecoration: 'none', flexShrink: 0 }}>
          {lienTexte} <ArrowRight style={{ width: 13, height: 13 }} />
        </Link>
      )}
    </div>
  );
}

// #refonte (retour utilisateur, "pas de navbar, nous afficherons les liens
// vers les autres pages dans l'accueil ; il doit avoir des sections, des
// images") : la page d'accueil de l'établissement EST la navigation — chaque
// section (services, équipe, tarifs, avis, contact, espace patient) montre
// un aperçu concret avec de vraies images/photos et un lien vers sa page
// complète, comme la home d'un vrai site vitrine d'hôpital.
export default function EtablissementAccueilPage() {
  const { etablissement, etablissementId, tarifs, user, apropos } = useOutletContext();
  const [services, setServices] = useState(null);
  const [equipe, setEquipe] = useState(null);
  const [avis, setAvis] = useState(null);
  const [actualites, setActualites] = useState(null);

  useEffect(() => {
    listerServicesActifs(etablissementId).then(setServices).catch(() => setServices([]));
  }, [etablissementId]);

  useEffect(() => {
    getAvisEtablissement(etablissementId).then(setAvis).catch(() => setAvis([]));
  }, [etablissementId]);

  useEffect(() => {
    listerActualitesPubliees(etablissementId).then(setActualites).catch(() => setActualites([]));
  }, [etablissementId]);

  // Toute l'équipe est agrégée ici (pas seulement les 6 affichées) pour que
  // la statistique "Professionnels" du bandeau ci-dessous soit un vrai
  // décompte, jamais un chiffre inventé.
  useEffect(() => {
    if (!services?.length) return;
    let annule = false;
    (async () => {
      const vus = new Set();
      const trouves = [];
      for (const s of services) {
        const medecins = await listerSpecialistesDuService(etablissementId, s.id).catch(() => []);
        medecins.forEach((m) => {
          if (!vus.has(m.uid)) {
            vus.add(m.uid);
            trouves.push({ ...m, serviceNom: s.nom });
          }
        });
      }
      if (!annule) setEquipe(trouves);
    })();
    return () => { annule = true; };
  }, [services, etablissementId]);

  const imageHero = etablissement.photoCarrousel1 || services?.find((s) => s.photoURL)?.photoURL || null;
  const telephone = etablissement.contactTelephone;
  const moyenneAvis = avis?.length ? avis.reduce((s, a) => s + a.note, 0) / avis.length : null;

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          position: 'relative',
          borderRadius: 18,
          overflow: 'hidden',
          marginBottom: 36,
          minHeight: 280,
          display: 'flex',
          alignItems: 'flex-end',
          background: imageHero ? `url(${imageHero}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,0.05) 30%, rgba(15,23,42,0.75) 100%)' }} />
        <motion.div
          initial={fadeUp.initial}
          animate={fadeUp.animate}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ position: 'relative', padding: '28px 26px', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <MapPin style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.85)' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{etablissement.ville}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, color: 'white', lineHeight: 1.25, marginBottom: 18, maxWidth: 480 }}>
            Bienvenue à {etablissement.nom}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link to="rdv" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CalendarPlus style={{ width: 15, height: 15 }} /> Prendre rendez-vous
            </Link>
            <Link to="services" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Découvrir nos services <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Chiffres clés — si le sysadmin en a saisi (apropos.chiffresCles),
          ce sont EUX qui s'affichent (c'est à l'établissement de communiquer
          ses propres chiffres, pas à nous de les calculer à sa place) ;
          sinon on retombe sur les stats réellement calculées. Jamais les
          deux mélangés, jamais rien d'inventé dans les deux cas. */}
      {!!apropos?.chiffresCles?.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 36 }}>
          {apropos.chiffresCles.map((c, i) => (
            <div key={i} style={{ flex: '1 1 140px', padding: '16px 18px', background: 'var(--bg-2)', borderRadius: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)' }}>{c.valeur}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{c.label}</p>
            </div>
          ))}
        </div>
      ) : (
        (!!services?.length || !!equipe?.length || moyenneAvis !== null) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 36 }}>
            {!!services?.length && (
              <div style={{ flex: '1 1 140px', padding: '16px 18px', background: 'var(--bg-2)', borderRadius: 12, textAlign: 'center' }}>
                <Building2 style={{ width: 20, height: 20, color: 'var(--blue)', margin: '0 auto 6px' }} />
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{services.length}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Service{services.length > 1 ? 's' : ''}</p>
              </div>
            )}
            {!!equipe?.length && (
              <div style={{ flex: '1 1 140px', padding: '16px 18px', background: 'var(--bg-2)', borderRadius: 12, textAlign: 'center' }}>
                <Users style={{ width: 20, height: 20, color: 'var(--blue)', margin: '0 auto 6px' }} />
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{equipe.length}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Professionnel{equipe.length > 1 ? 's' : ''}</p>
              </div>
            )}
            {moyenneAvis !== null && (
              <div style={{ flex: '1 1 140px', padding: '16px 18px', background: 'var(--bg-2)', borderRadius: 12, textAlign: 'center' }}>
                <Star style={{ width: 20, height: 20, color: 'var(--blue)', margin: '0 auto 6px' }} />
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{moyenneAvis.toFixed(1)}/5</p>
                <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>{avis.length} avis patients</p>
              </div>
            )}
          </div>
        )
      )}

      {/* À propos — court extrait, texte complet sur sa propre page */}
      {(apropos?.mission || apropos?.histoire) && (
        <div style={{ marginBottom: 36 }}>
          <SectionTitle title="À propos" lienTexte="En savoir plus" lienVers="apropos" />
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            {(apropos.mission || apropos.histoire).slice(0, 220)}
            {(apropos.mission || apropos.histoire).length > 220 ? '…' : ''}
          </p>
        </div>
      )}

      {/* Services */}
      {!!services?.length && (
        <div style={{ marginBottom: 36 }}>
          <SectionTitle title="Nos services" lienTexte="Voir tous les services" lienVers="services" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {services.slice(0, 6).map((s) => {
              const tarif = tarifs?.find((t) => t.serviceId === s.id);
              return (
                <Link
                  key={s.id}
                  to="services"
                  style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)', textDecoration: 'none', background: 'white' }}
                >
                  <div
                    style={{
                      height: 90,
                      background: s.photoURL ? `url(${s.photoURL}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {!s.photoURL && <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{(s.nom || '?').charAt(0).toUpperCase()}</span>}
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{s.nom}</p>
                    {tarif && <p style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700, marginTop: 2 }}>{Number(tarif.montant).toLocaleString('fr-FR')} XAF</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Actualités */}
      {!!actualites?.length && (
        <div style={{ marginBottom: 36 }}>
          <SectionTitle title="Actualités" lienTexte="Voir toutes les actualités" lienVers="actualites" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {actualites.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                to={`actualites/${a.id}`}
                style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)', textDecoration: 'none', background: 'white' }}
              >
                <div
                  style={{
                    height: 100,
                    background: a.photoURL ? `url(${a.photoURL}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
                  }}
                />
                <div style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {LABEL_CATEGORIE[a.categorie] || 'Actualité'}
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 3, lineHeight: 1.3 }}>{a.titre}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Équipe */}
      {!!equipe?.length && (
        <div style={{ marginBottom: 36 }}>
          <SectionTitle title="Notre équipe médicale" lienTexte="Voir toute l'équipe" lienVers="equipe" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {equipe.slice(0, 6).map((m) => (
              <Link key={m.uid} to="equipe" style={{ textDecoration: 'none', textAlign: 'center', width: 92 }}>
                {m.photoURL ? (
                  <img src={m.photoURL} alt={m.nom} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px' }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--ink-3)', margin: '0 auto 8px' }}>
                    {(m.nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')}
                  </div>
                )}
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>Dr {m.nom}</p>
                <p style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{m.serviceNom}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tarifs */}
      {!!tarifs?.length && (
        <div style={{ marginBottom: 36 }}>
          <SectionTitle title="Nos tarifs" lienTexte="Voir tous les tarifs" lienVers="tarifs" />
          <div className="space-y-2">
            {tarifs.slice(0, 3).map((t) => {
              const nomService = services?.find((s) => s.id === t.serviceId)?.nom || t.serviceId;
              return (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{nomService}</span>
                  <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{Number(t.montant).toLocaleString('fr-FR')} XAF</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Avis */}
      <div style={{ marginBottom: 36 }}>
        <SectionTitle title="Avis de nos patients" lienTexte="Voir tous les avis" lienVers="avis" />
        <AvisPublicSection etablissementId={etablissementId} limite={2} />
      </div>

      {/* Contact */}
      <div style={{ marginBottom: 36 }}>
        <SectionTitle title="Nous contacter" lienTexte="Page contact" lienVers="contact" />
        <Link
          to="contact"
          style={{ display: 'block', padding: '16px 18px', background: 'var(--bg-2)', borderRadius: 12, textDecoration: 'none' }}
        >
          {etablissement.adresse && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: telephone ? 8 : 0 }}>
              <MapPin style={{ width: 15, height: 15, color: 'var(--ink-4)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{etablissement.adresse}</span>
            </div>
          )}
          {telephone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone style={{ width: 15, height: 15, color: 'var(--ink-4)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{telephone}</span>
            </div>
          )}
          {!etablissement.adresse && !telephone && (
            <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>Voir les informations pratiques et horaires</span>
          )}
        </Link>
      </div>

      {/* Espace patient */}
      <div>
        <SectionTitle title="Votre espace patient" />
        {!user && (
          <p style={{ fontSize: 12.5, color: 'var(--ink-4)', marginBottom: 12 }}>Connectez-vous pour accéder à ces services.</p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {[
            { to: 'dossier', label: 'Mon dossier', icon: FolderHeart },
            { to: 'messagerie', label: 'Messagerie', icon: WhatsAppIcon },
            { to: 'paiement', label: 'Paiement', icon: Wallet },
            { to: 'reclamations', label: 'Réclamations', icon: Flag },
            { to: 'securite', label: 'Sécurité', icon: LifeBuoy },
          ].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 10px', background: 'var(--bg-2)', borderRadius: 12, textDecoration: 'none' }}
            >
              <Icon style={{ width: 20, height: 20, color: 'var(--blue)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', textAlign: 'center' }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Bandeau d'appel à l'action — mêmes vraies coordonnées que la page
          Contact, jamais une carte/numéro fictif */}
      <div
        style={{
          marginTop: 36, padding: '28px 26px', borderRadius: 16, textAlign: 'center',
          background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
        }}
      >
        <p style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 6 }}>Besoin de soins médicaux ?</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginBottom: 18 }}>
          Notre équipe est à votre disposition pour vous accompagner dans votre parcours de santé.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {telephone && (
            <a href={`tel:${telephone}`} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Phone style={{ width: 15, height: 15 }} /> Nous appeler
            </a>
          )}
          <Link to="contact" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <MapPin style={{ width: 15, height: 15 }} /> Nous trouver
          </Link>
          <Link to="messagerie" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <WhatsAppIcon style={{ width: 15, height: 15 }} /> Poser une question
          </Link>
        </div>
      </div>
    </div>
  );
}
