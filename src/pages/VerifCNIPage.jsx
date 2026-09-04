import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Upload, CheckCircle, Clock, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadFile } from '../supabase/config';
import toast from 'react-hot-toast';
export default function VerifCNIPage() {
  const {
    user,
    userProfile
  } = useAuth();
  const navigate = useNavigate();
  const [recto, setRecto] = useState(null);
  const [verso, setVerso] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // #bug (retour utilisateur, corrigé en même temps que le même bug sur
  // PublierPage.jsx) : URL.createObjectURL(recto) était appelé directement
  // dans le JSX, donc RECRÉÉ à chaque rendu — une fuite mémoire (l'ancienne
  // URL n'est jamais révoquée) plutôt qu'un aperçu cassé ici, mais même classe
  // de problème. useMemo calcule l'URL une seule fois par fichier sélectionné,
  // et l'effet de nettoyage la révoque proprement au changement/démontage.
  const rectoUrl = useMemo(() => recto ? URL.createObjectURL(recto) : null, [recto]);
  const versoUrl = useMemo(() => verso ? URL.createObjectURL(verso) : null, [verso]);
  const selfieUrl = useMemo(() => selfie ? URL.createObjectURL(selfie) : null, [selfie]);
  useEffect(() => () => { if (rectoUrl) URL.revokeObjectURL(rectoUrl); }, [rectoUrl]);
  useEffect(() => () => { if (versoUrl) URL.revokeObjectURL(versoUrl); }, [versoUrl]);
  useEffect(() => () => { if (selfieUrl) URL.revokeObjectURL(selfieUrl); }, [selfieUrl]);
  if (!user) {
    navigate('/auth');
    return null;
  }
  if (userProfile?.cniVerifie) return <div style={{
    maxWidth: 500,
    margin: '80px auto',
    padding: '0 24px',
    textAlign: 'center'
  }}>
      <div style={{
      background: '#F0FDF4',
      borderRadius: 20,
      padding: 40,
      border: '1.5px solid #BBF7D0'
    }}>
        <CheckCircle style={{
        width: 56,
        height: 56,
        color: '#10B981',
        margin: '0 auto 16px'
      }} />
        <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 24,
        color: 'var(--ink)',
        marginBottom: 8
      }}>
          Identité vérifiée ✅
        </h2>
        <p style={{
        color: '#64748B',
        fontSize: 15,
        marginBottom: 24
      }}>
          Votre identité a déjà été vérifiée — elle facilite votre reconnaissance dans tout établissement partenaire.
        </p>
        <button onClick={() => navigate('/mon-compte')} className="btn-primary" style={{
        display: 'inline-flex'
      }}>
          Retour à mon compte
        </button>
      </div>
    </div>;
  const handleSubmit = async () => {
    if (!recto || !verso || !selfie) {
      toast.error('Veuillez uploader les deux faces de votre CNI et la photo avec la CNI en main');
      return;
    }
    setLoading(true);
    try {
      const rectoUpload = await uploadFile('cni', `${user.uid}/recto_${Date.now()}`, recto);
      const versoUpload = await uploadFile('cni', `${user.uid}/verso_${Date.now()}`, verso);
      const selfieUpload = await uploadFile('cni', `${user.uid}/selfie_${Date.now()}`, selfie);
      await setDoc(doc(db, 'users', user.uid), {
        cniDemande: true,
        cniRejete: false,
        cniRectoPath: rectoUpload.path,
        cniVersoPath: versoUpload.path,
        cniSelfiePath: selfieUpload.path,
        cniSoumisAt: new Date().toISOString()
      }, {
        merge: true
      });
      setSubmitted(true);
      toast.success('Documents envoyés ! Vérification sous 24h.');
    } catch (e) {
      toast.error('Erreur lors de l\'envoi : ' + e.message);
    } finally {
      setLoading(false);
    }
  };
  if (submitted) return <div style={{
    maxWidth: 500,
    margin: '80px auto',
    padding: '0 24px',
    textAlign: 'center'
  }}>
      <motion.div initial={{
      opacity: 0,
      scale: 0.95
    }} animate={{
      opacity: 1,
      scale: 1
    }} style={{
      background: '#EFF6FF',
      borderRadius: 20,
      padding: 40,
      border: '1.5px solid #BFDBFE'
    }}>
        <Clock style={{
        width: 56,
        height: 56,
        color: '#2FB4A0',
        margin: '0 auto 16px'
      }} />
        <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 24,
        color: 'var(--ink)',
        marginBottom: 8
      }}>
          Documents envoyés !
        </h2>
        <p style={{
        color: '#64748B',
        fontSize: 15,
        lineHeight: 1.6,
        marginBottom: 24
      }}>
          Notre équipe vérifie votre identité sous <strong>24h</strong>. Vous recevrez une notification dès validation.
        </p>
        <button onClick={() => navigate('/mon-compte')} className="btn-outline" style={{
        display: 'inline-flex'
      }}>
          Retour à mon compte
        </button>
      </motion.div>
    </div>;
  return <div style={{
    maxWidth: 560,
    margin: '0 auto',
    padding: '48px 24px'
  }}>
      {}
      <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8
    }}>
        <div style={{
        width: 44,
        height: 44,
        background: '#EFF6FF',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
          <Shield style={{
          width: 22,
          height: 22,
          color: '#2FB4A0'
        }} />
        </div>
        <div>
          <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 24,
          color: 'var(--ink)'
        }}>
            Vérification d'identité
          </h1>
          <p style={{
          fontSize: 13,
          color: '#64748B'
        }}>Facilite votre reconnaissance dans tout établissement partenaire</p>
        </div>
      </div>

      {}
      <div style={{
      background: '#EFF6FF',
      borderRadius: 14,
      padding: 16,
      border: '1.5px solid #BFDBFE',
      marginBottom: 28
    }}>
        <div style={{
        display: 'flex',
        gap: 10
      }}>
          <AlertTriangle style={{
          width: 16,
          height: 16,
          color: '#2FB4A0',
          flexShrink: 0,
          marginTop: 2
        }} />
          <div>
            <p style={{
            fontWeight: 700,
            fontSize: 13,
            color: '#1E40AF',
            marginBottom: 4
          }}>Pourquoi vérifier mon identité ?</p>
            <p style={{
            fontSize: 12,
            color: '#2FB4A0',
            lineHeight: 1.6
          }}>
              La vérification CNI garantit que votre identité est bien établie dans le système — elle protège votre dossier médical contre toute usurpation et facilite votre prise en charge dans chaque établissement partenaire.
            </p>
          </div>
        </div>
      </div>

      {}
      <div style={{
      marginBottom: 20
    }}>
        <label style={{
        display: 'block',
        fontWeight: 700,
        fontSize: 14,
        color: '#374151',
        marginBottom: 8
      }}>
          CNI Recto *
        </label>
        <label style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: recto ? '2px solid #10B981' : '2px dashed #CBD5E1',
        borderRadius: 14,
        padding: '24px 16px',
        cursor: 'pointer',
        background: recto ? '#F0FDF4' : '#F8FAFC',
        transition: 'all 0.2s',
        gap: 8
      }}>
          {recto ? <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%'
        }}>
              <img src={rectoUrl} alt="recto" style={{
            width: 80,
            height: 50,
            objectFit: 'cover',
            borderRadius: 8
          }} />
              <div style={{
            flex: 1
          }}>
                <p style={{
              fontWeight: 600,
              fontSize: 13,
              color: '#059669'
            }}>✅ {recto.name}</p>
                <p style={{
              fontSize: 11,
              color: '#94A3B8'
            }}>{(recto.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={e => {
            e.preventDefault();
            setRecto(null);
          }} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#EF4444'
          }}>
                <X style={{
              width: 16,
              height: 16
            }} />
              </button>
            </div> : <>
              <Upload style={{
            width: 28,
            height: 28,
            color: '#94A3B8'
          }} />
              <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#64748B'
          }}>Cliquer pour uploader le recto</p>
              <p style={{
            fontSize: 11,
            color: '#94A3B8'
          }}>JPG, PNG — Max 5MB</p>
            </>}
          <input type="file" accept="image/*" onChange={e => setRecto(e.target.files[0])} style={{
          display: 'none'
        }} />
        </label>
      </div>

      {}
      <div style={{
      marginBottom: 28
    }}>
        <label style={{
        display: 'block',
        fontWeight: 700,
        fontSize: 14,
        color: '#374151',
        marginBottom: 8
      }}>
          CNI Verso *
        </label>
        <label style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: verso ? '2px solid #10B981' : '2px dashed #CBD5E1',
        borderRadius: 14,
        padding: '24px 16px',
        cursor: 'pointer',
        background: verso ? '#F0FDF4' : '#F8FAFC',
        transition: 'all 0.2s',
        gap: 8
      }}>
          {verso ? <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%'
        }}>
              <img src={versoUrl} alt="verso" style={{
            width: 80,
            height: 50,
            objectFit: 'cover',
            borderRadius: 8
          }} />
              <div style={{
            flex: 1
          }}>
                <p style={{
              fontWeight: 600,
              fontSize: 13,
              color: '#059669'
            }}>✅ {verso.name}</p>
                <p style={{
              fontSize: 11,
              color: '#94A3B8'
            }}>{(verso.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={e => {
            e.preventDefault();
            setVerso(null);
          }} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#EF4444'
          }}>
                <X style={{
              width: 16,
              height: 16
            }} />
              </button>
            </div> : <>
              <Upload style={{
            width: 28,
            height: 28,
            color: '#94A3B8'
          }} />
              <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#64748B'
          }}>Cliquer pour uploader le verso</p>
              <p style={{
            fontSize: 11,
            color: '#94A3B8'
          }}>JPG, PNG — Max 5MB</p>
            </>}
          <input type="file" accept="image/*" onChange={e => setVerso(e.target.files[0])} style={{
          display: 'none'
        }} />
        </label>
      </div>

      {}
      <div style={{
      marginBottom: 28
    }}>
        <label style={{
        display: 'block',
        fontWeight: 700,
        fontSize: 14,
        color: '#374151',
        marginBottom: 8
      }}>
          Photo de vous tenant votre CNI *
        </label>
        <p style={{
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 8,
        lineHeight: 1.5
      }}>
          Prenez-vous en photo (ou selfie) en tenant votre CNI à côté de votre visage. Votre visage et la carte doivent être nets et lisibles.
        </p>
        <label style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: selfie ? '2px solid #10B981' : '2px dashed #CBD5E1',
        borderRadius: 14,
        padding: '24px 16px',
        cursor: 'pointer',
        background: selfie ? '#F0FDF4' : '#F8FAFC',
        transition: 'all 0.2s',
        gap: 8
      }}>
          {selfie ? <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%'
        }}>
              <img src={selfieUrl} alt="selfie avec CNI" style={{
            width: 80,
            height: 50,
            objectFit: 'cover',
            borderRadius: 8
          }} />
              <div style={{
            flex: 1
          }}>
                <p style={{
              fontWeight: 600,
              fontSize: 13,
              color: '#059669'
            }}>✅ {selfie.name}</p>
                <p style={{
              fontSize: 11,
              color: '#94A3B8'
            }}>{(selfie.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={e => {
            e.preventDefault();
            setSelfie(null);
          }} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#EF4444'
          }}>
                <X style={{
              width: 16,
              height: 16
            }} />
              </button>
            </div> : <>
              <Upload style={{
            width: 28,
            height: 28,
            color: '#94A3B8'
          }} />
              <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#64748B'
          }}>Cliquer pour uploader la photo</p>
              <p style={{
            fontSize: 11,
            color: '#94A3B8'
          }}>JPG, PNG — Max 5MB</p>
            </>}
          <input type="file" accept="image/*" capture="user" onChange={e => setSelfie(e.target.files[0])} style={{
          display: 'none'
        }} />
        </label>
      </div>

      {}
      <div style={{
      background: '#F8FAFC',
      borderRadius: 14,
      padding: 16,
      marginBottom: 24,
      border: '1.5px solid #F1F5F9'
    }}>
        {['Vos documents sont chiffrés et stockés de manière sécurisée', 'Seule l\'équipe HostoConnect y a accès pour la vérification', 'Les photos sont supprimées au plus tard 24h après validation — seul le numéro de CNI est conservé', 'Vérification effectuée sous 24h'].map((item, i) => <div key={i} style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        marginBottom: i < 3 ? 8 : 0
      }}>
            <CheckCircle style={{
          width: 14,
          height: 14,
          color: '#10B981',
          flexShrink: 0,
          marginTop: 2
        }} />
            <span style={{
          fontSize: 12,
          color: '#64748B',
          lineHeight: 1.5
        }}>{item}</span>
          </div>)}
      </div>

      <button onClick={handleSubmit} disabled={!recto || !verso || !selfie || loading} className="btn-primary" style={{
      width: '100%',
      justifyContent: 'center',
      padding: 14,
      fontSize: 15,
      opacity: !recto || !verso || !selfie ? 0.5 : 1
    }}>
        {loading ? <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}><span style={{
          width: 16,
          height: 16,
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          display: 'inline-block'
        }} />Envoi en cours...</span> : <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}><Shield style={{
          width: 16,
          height: 16
        }} />Envoyer pour vérification</span>}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>;
}
