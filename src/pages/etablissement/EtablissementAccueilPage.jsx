import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  ArrowRight, MapPin, Phone, MessageCircle as WhatsAppIcon,
  Clock, AlertTriangle, Quote,
} from 'lucide-react';
import { listerServicesActifs, listerActualitesPubliees } from '../../services/etablissementsPublicService';
import { listerMedecinsDeLEtablissement } from '../../services/planningService';
import { getAvisEtablissement } from '../../services/avisEtablissementsService';
import { getTransparenceAttente } from '../../services/transparenceService';
import EtablissementHeroCarousel from '../../components/home/EtablissementHeroCarousel';

const LABEL_CATEGORIE = { nouveaute: 'Nouveauté', evenement: 'Événement', publication: 'Publication', autre: 'Actualité' };

// Fait ignorer à un élément la largeur/le padding de son parent, pour
// couvrir toute la largeur de l'écran (bandeaux Urgences/Hero/Services/
// Témoignages/CTA du site de référence fourni par l'utilisateur) — même si
// ce parent est lui-même centré avec une largeur maximale (cf.
// EtablissementLayout). `overflowX: hidden` posé sur ce même layout évite
// tout défilement horizontal parasite lié à l'arrondi de 100vw.
const PLEINE_LARGEUR = { position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', width: '100vw' };

function SectionTitle({ title, lienTexte, lienVers, clair }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: clair ? 'white' : 'var(--ink)' }}>{title}</h2>
      {lienVers && (
        <Link to={lienVers} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: clair ? 'white' : 'var(--blue)', textDecoration: 'none', flexShrink: 0 }}>
          {lienTexte} <ArrowRight style={{ width: 13, height: 13 }} />
        </Link>
      )}
    </div>
  );
}

// #refonte (retour utilisateur, capture d'écran d'un vrai site d'hôpital de
// référence : "la page d'accueil est trop laide, fais en sorte qu'elle
// ressemble exactement à ce site") : bandeau Urgences/temps d'attente en
// pleine largeur, hero pleine largeur avec chiffres intégrés, sections aux
// fonds alternés (services sur fond clair, témoignages sur fond teinté,
// appel à l'action sur fond de couleur) — même structure visuelle que la
// référence, avec uniquement de vraies données (aucune image de stock,
// aucun chiffre inventé : une section sans donnée réelle ne s'affiche pas).
export default function EtablissementAccueilPage() {
  const { etablissement, etablissementId, tarifs, apropos } = useOutletContext();
  const [services, setServices] = useState(null);
  const [equipe, setEquipe] = useState(null);
  const [avis, setAvis] = useState(null);
  const [actualites, setActualites] = useState(null);
  const [temps, setTemps] = useState(null);

  useEffect(() => {
    listerServicesActifs(etablissementId).then(setServices).catch(() => setServices([]));
  }, [etablissementId]);

  useEffect(() => {
    getAvisEtablissement(etablissementId).then(setAvis).catch(() => setAvis([]));
  }, [etablissementId]);

  useEffect(() => {
    listerActualitesPubliees(etablissementId).then(setActualites).catch(() => setActualites([]));
  }, [etablissementId]);

  useEffect(() => {
    getTransparenceAttente(etablissementId).then(setTemps).catch(() => setTemps(null));
  }, [etablissementId]);

  // #refonte (demande utilisateur, "efface la logique de planning du
  // personnel actuelle") : `listerMedecinsDeLEtablissement` (medecins_publics)
  // liste déjà TOUS les médecins actifs de l'établissement en un seul appel,
  // avec ou sans horaires renseignés — plus besoin de boucler service par
  // service ni de dédupliquer, la statistique "Professionnels" reste un vrai
  // décompte, jamais un chiffre inventé.
  useEffect(() => {
    listerMedecinsDeLEtablissement(etablissementId).then(setEquipe).catch(() => setEquipe([]));
  }, [etablissementId]);

  const telephone = etablissement.contactTelephone;
  const moyenneAvis = avis?.length ? avis.reduce((s, a) => s + a.note, 0) / avis.length : null;
  const chiffres = apropos?.chiffresCles?.length
    ? apropos.chiffresCles
    : [
        services?.length ? { valeur: String(services.length), label: `Service${services.length > 1 ? 's' : ''}` } : null,
        equipe?.length ? { valeur: String(equipe.length), label: `Professionnel${equipe.length > 1 ? 's' : ''}` } : null,
        moyenneAvis !== null ? { valeur: `${moyenneAvis.toFixed(1)}/5`, label: `${avis.length} avis patients` } : null,
      ].filter(Boolean);

  return (
    <div>
      {/* Bandeau Urgences / temps d'attente — pleine largeur, uniquement si
          une vraie mesure existe (jamais un temps estimé à la légère) */}
      {!!temps?.tempsAttenteMoyenMinutes && (
        <div style={{ ...PLEINE_LARGEUR, background: '#C2402F', marginBottom: 36 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'white' }}>
              <AlertTriangle style={{ width: 15, height: 15 }} /> Service d'urgences
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              <Clock style={{ width: 13, height: 13 }} /> Temps d'attente moyen : {temps.tempsAttenteMoyenMinutes} minutes
            </span>
            <Link to="/urgence" style={{ fontSize: 12.5, fontWeight: 700, color: '#C2402F', background: 'white', padding: '5px 14px', borderRadius: 999, textDecoration: 'none' }}>
              Voir les urgences
            </Link>
          </div>
        </div>
      )}

      {/* #corrigé (demande utilisateur, "je voudrais que le même carrousel
          [que celui de l'accueil HostoConnect] s'affiche dans l'accueil de
          l'établissement") : remplace l'ancien hero maison (fond +
          nom/ville/chiffres directement dessus, sans carte) par EXACTEMENT
          le même composant que HomePage.jsx — mêmes photos
          (photoCarrousel1/2/3 ou génériques), même carte blanche "Prenez
          rendez-vous en quelques clics", jamais deux implémentations
          différentes du même hero établissement. Les chiffres clés
          (uniques à cette page) suivent juste en dessous. */}
      <EtablissementHeroCarousel etablissement={etablissement} />

      {!!chiffres.length && (
        <div style={{ maxWidth: 1100, margin: '24px auto 0', padding: '0 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          {chiffres.map((c, i) => (
            <div
              key={i}
              style={{
                padding: '0 32px', textAlign: 'center',
                borderLeft: i > 0 ? '1px solid var(--border, #E2E8F0)' : 'none',
                marginBottom: 8,
              }}
            >
              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-etab, var(--blue))' }}>{c.valeur}</p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '40px auto 0', padding: '0 24px' }}>
        {/* À propos — court extrait, texte complet sur sa propre page */}
        {(apropos?.mission || apropos?.histoire) && (
          <div style={{ marginBottom: 44 }}>
            <SectionTitle title="À propos" lienTexte="En savoir plus" lienVers="apropos" />
            <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.65, maxWidth: 720 }}>
              {(apropos.mission || apropos.histoire).slice(0, 260)}
              {(apropos.mission || apropos.histoire).length > 260 ? '…' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Nos services — bandeau plein écran, fond teinté, comme la référence */}
      {!!services?.length && (
        <div style={{ ...PLEINE_LARGEUR, background: 'var(--bg-2)', padding: '48px 0', marginBottom: 44 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
            <SectionTitle title="Nos services médicaux" lienTexte="Voir tous les services" lienVers="services" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {services.slice(0, 8).map((s) => {
                const tarif = tarifs?.find((t) => t.serviceId === s.id);
                return (
                  <div key={s.id} style={{ borderRadius: 14, overflow: 'hidden', background: 'white', boxShadow: '0 2px 10px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <div
                      style={{
                        height: 110,
                        background: s.photoURL ? `url(${s.photoURL}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {!s.photoURL && <span style={{ color: 'white', fontSize: 26, fontWeight: 700 }}>{(s.nom || '?').charAt(0).toUpperCase()}</span>}
                    </div>
                    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{s.nom}</p>
                      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 14, flex: 1 }}>
                        {s.description ? (s.description.length > 90 ? `${s.description.slice(0, 90)}…` : s.description) : 'Découvrez ce service.'}
                      </p>
                      {tarif && (
                        <p style={{ fontSize: 12, color: 'var(--accent-etab, var(--blue))', fontWeight: 700, marginBottom: 10 }}>{Number(tarif.montant).toLocaleString('fr-FR')} XAF</p>
                      )}
                      <Link
                        to={`services/${s.id}`}
                        style={{ alignSelf: 'flex-start', fontSize: 12.5, fontWeight: 700, color: 'var(--blue)', border: '1.5px solid var(--blue)', borderRadius: 999, padding: '6px 14px', textDecoration: 'none' }}
                      >
                        En savoir plus
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <Link to="services" className="btn-primary" style={{ display: 'inline-flex' }}>Voir tous les services</Link>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        {/* Actualités */}
        {!!actualites?.length && (
          <div style={{ marginBottom: 44 }}>
            <SectionTitle title="Actualités & Événements" lienTexte="Voir toutes les actualités" lienVers="actualites" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {actualites.slice(0, 3).map((a) => (
                <div key={a.id} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)', background: 'white' }}>
                  <div
                    style={{
                      height: 130,
                      background: a.photoURL ? `url(${a.photoURL}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
                    }}
                  />
                  <div style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'white', padding: '3px 10px', borderRadius: 999,
                        background: 'var(--blue)', marginBottom: 10,
                      }}
                    >
                      {LABEL_CATEGORIE[a.categorie] || 'Actualité'}
                    </span>
                    <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.35 }}>{a.titre}</p>
                    {a.resume && <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 12 }}>{a.resume}</p>}
                    <Link to={`actualites/${a.id}`} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--blue)', border: '1.5px solid var(--blue)', borderRadius: 999, padding: '6px 14px', textDecoration: 'none' }}>
                      Lire plus
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Témoignages — bandeau plein écran, fond teinté, cartes citation */}
      {!!avis?.length && (
        <div style={{ ...PLEINE_LARGEUR, background: 'var(--bg-2)', padding: '48px 0', marginBottom: 44 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
            <SectionTitle title="Témoignages de patients" lienTexte="Voir tous les avis" lienVers="avis" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              {avis.slice(0, 3).map((a) => (
                <div key={a.id} style={{ background: 'white', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 10px rgba(15,23,42,0.06)' }}>
                  <Quote style={{ width: 20, height: 20, color: 'var(--blue)', opacity: 0.5, marginBottom: 10 }} />
                  {a.commentaire && (
                    <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 14, fontStyle: 'italic' }}>
                      « {a.commentaire.length > 140 ? `${a.commentaire.slice(0, 140)}…` : a.commentaire} »
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {(a.patientNom || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{a.patientNom || 'Patient'}</p>
                      <span style={{ color: '#F59E0B', fontSize: 12 }}>{'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        {/* Équipe */}
        {!!equipe?.length && (
          <div style={{ marginBottom: 44 }}>
            <SectionTitle title="Notre équipe médicale" lienTexte="Voir toute l'équipe" lienVers="equipe" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
              {equipe.slice(0, 6).map((m) => (
                <Link key={m.uid} to="equipe" style={{ textDecoration: 'none', textAlign: 'center', width: 100 }}>
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.nom} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px' }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--ink-3)', margin: '0 auto 8px' }}>
                      {(m.nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')}
                    </div>
                  )}
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>Dr {m.nom}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>{m.serviceNom}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* #retiré (demande utilisateur, "enlève Nos tarifs de l'accueil et
            de l'entête... c'est déjà inclus dans les informations de chaque
            service") : le tarif d'un service est déjà affiché dans sa
            propre fiche (ServiceDetailPanel, section Services), doublon
            encombrant ici. */}

        {/* Contact */}
        <div style={{ marginBottom: 44 }}>
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

        {/* #retiré (demande utilisateur, "enlève Votre espace patient de
            l'accueil et met tout ça dans espace patient de l'entête dès
            qu'on clique") : ces mêmes liens vivent désormais dans le menu
            déroulant "Espace Patient" de l'en-tête (EtablissementSiteHeader,
            EspacePatientMenu). */}
      </div>

      {/* Bandeau d'appel à l'action — pleine largeur, mêmes vraies
          coordonnées que la page Contact, jamais une carte/numéro fictif */}
      <div style={{ ...PLEINE_LARGEUR, background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))', padding: '48px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 8 }}>Besoin de soins médicaux ?</p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 22 }}>
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
            <Link to="contact" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <WhatsAppIcon style={{ width: 15, height: 15 }} /> Poser une question
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
