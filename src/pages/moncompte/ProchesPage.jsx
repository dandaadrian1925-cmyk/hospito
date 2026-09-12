import { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listerMesProches } from '../../services/prochesService';
import { getEtablissement } from '../../services/etablissementsPublicService';

// #nouveau (demande utilisateur, "un bébé ou une personne âgée sans compte
// doit aussi pouvoir être pris en compte") : lecture seule — la fiche d'un
// proche reste créée/modifiée uniquement par l'admin/accueil de
// l'établissement (geePar posé là-bas, jamais ici). Cette page ne fait que
// lister les proches déjà liés à ce compte, tous établissements confondus.
export default function ProchesPage() {
  const { user } = useAuth();
  const [proches, setProches] = useState(null);
  const [etablissements, setEtablissements] = useState({});

  useEffect(() => {
    if (!user) return;
    listerMesProches(user.uid).then(async (liste) => {
      setProches(liste);
      const ids = [...new Set(liste.map((p) => p.etablissementId))];
      const entries = await Promise.all(ids.map(async (id) => [id, await getEtablissement(id)]));
      setEtablissements(Object.fromEntries(entries));
    }).catch(() => setProches([]));
  }, [user]);

  if (proches === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Loader2 style={{ width: 24, height: 24, color: '#94A3B8' }} className="animate-spin" />
    </div>;
  }

  if (!proches.length) {
    return <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9' }}>
      <Users style={{ width: 32, height: 32, color: '#CBD5E1', margin: '0 auto 12px' }} />
      <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Aucun proche géré pour le moment</p>
      <p style={{ fontSize: 13, color: '#94A3B8' }}>
        Pour un bébé ou une personne âgée sans compte, demandez à l'accueil de l'établissement de lier sa fiche à votre compte (par votre email).
      </p>
    </div>;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {proches.map((p) => {
      const etab = etablissements[p.etablissementId];
      return <div key={p.id} style={{ background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{p.prenom} {p.nom}</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{etab?.nom || 'Établissement'}</p>
          </div>
          {etab && (
            <Link
              to={`/etablissement/${p.etablissementId}/rdv`}
              style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--blue, #2FB4A0)', textDecoration: 'none' }}
            >
              Prendre RDV →
            </Link>
          )}
        </div>
      </div>;
    })}
  </div>;
}
