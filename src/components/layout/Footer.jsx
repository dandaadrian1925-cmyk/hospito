import { Link } from 'react-router-dom';
import { Shield, Truck, CreditCard, Star } from 'lucide-react';
import TelechargerApkBouton from '../common/TelechargerApkBouton';
export default function Footer() {
  return <footer className="text-white mt-12" style={{
    background: 'var(--ink)'
  }}>
      {}
      {}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 sm:py-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {[{
          icon: Shield,
          title: 'Paiement sécurisé',
          desc: 'MAKET bloque votre argent jusqu\'à la remise (CamPay gère uniquement vos dépôts/retraits)'
        }, {
          icon: Truck,
          title: 'Livraison disponible',
          desc: 'Main propre ou via un livreur partenaire, même entre deux villes'
        }, {
          icon: CreditCard,
          title: 'Remboursement garanti',
          desc: '24h pour signaler un problème'
        }, {
          icon: Star,
          title: 'Factures vérifiées',
          desc: 'Authenticité contrôlée par notre équipe'
        }].map((item, i) => <div key={i} className="flex items-start gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-primary-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                <item.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary-400" />
              </div>
              <div>
                <p className="font-semibold text-xs sm:text-sm text-white">{item.title}</p>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 leading-snug">{item.desc}</p>
              </div>
            </div>)}
        </div>
      </div>

      {}
      <div className="max-w-7xl mx-auto px-6 py-6 sm:py-12 grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2 sm:mb-4">
            <div className="w-8 h-8 gradient-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm" style={{
              fontFamily: 'Syne, sans-serif'
            }}>M</span>
            </div>
            <span className="text-xl font-black" style={{
            fontFamily: 'Syne, sans-serif'
          }}>MAKET</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Le marketplace d'occasion de confiance au Cameroun. Achetez et vendez en toute sécurité, partout au pays.
          </p>
          {}
          <p className="text-xs text-gray-500 mt-2 sm:mt-4">© {new Date().getFullYear()} TAL SOLUTIONS AND SERVICES SARL — 🇨🇲 Cameroun. Tous droits réservés.</p>
        </div>

        {[{
        title: 'MAKET',
        links: [{
          to: '/catalogue',
          label: 'Parcourir les articles'
        }, {
          to: '/publier',
          label: 'Vendre un article'
        }, {
          to: '/comment-ca-marche',
          label: 'Comment ça marche'
        }, {
          to: '/parrainage',
          label: 'Parrainage'
        }]
      }, {
        title: 'Support',
        links: [{
          to: '/faq',
          label: 'FAQ'
        }, {
          to: '/litiges',
          label: 'Litiges'
        }, {
          to: '/contact',
          label: 'Nous contacter'
        }, {
          to: '/securite',
          label: 'Sécurité'
        }]
      }, {
        title: 'Légal',
        links: [{
          to: '/cgu',
          label: 'CGU'
        }, {
          to: '/confidentialite',
          label: 'Confidentialité'
        }, {
          to: '/cookies',
          label: 'Cookies'
        }]
      }].map((section, i) => <div key={i}>
            <h4 className="font-bold text-sm mb-2 sm:mb-4 text-gray-200 tracking-wider uppercase">{section.title}</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              {section.links.map(link => <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-primary-400 transition-colors">
                    {link.label}
                  </Link>
                </li>)}
              {}
              {section.title === 'Légal' && <li>
                  <TelechargerApkBouton className="text-sm text-gray-400 hover:text-primary-400 transition-colors text-left">
                    Télécharger l'application MAKET
                  </TelechargerApkBouton>
                </li>}
            </ul>
          </div>)}
      </div>

      <div className="border-t border-gray-800 py-2.5 sm:py-4">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[11px] sm:text-xs text-gray-500 leading-snug">
            Tout arrangement hors MAKET est sous votre entière responsabilité. MAKET ne pourra être tenu responsable d'aucune escroquerie résultant d'échanges hors plateforme.
          </p>
          {}
          {}
          <p className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-1.5">
            Ce site est protégé par reCAPTCHA. La <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-400">Politique de confidentialité</a> et les <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-400">Conditions d'utilisation</a> de Google s'appliquent.
          </p>
        </div>
      </div>
    </footer>;
}
