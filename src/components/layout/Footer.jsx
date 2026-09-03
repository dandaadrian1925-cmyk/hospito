import { Link } from 'react-router-dom';
import { CalendarPlus, FolderHeart, MessageCircle, Flag } from 'lucide-react';
export default function Footer() {
  return <footer className="text-white mt-12" style={{
    background: 'var(--ink)'
  }}>
      {}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 sm:py-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {[{
          icon: CalendarPlus,
          title: 'Rendez-vous en ligne',
          desc: 'Réservez une consultation sans vous déplacer'
        }, {
          icon: FolderHeart,
          title: 'Dossier partagé',
          desc: 'Un seul dossier médical, valable dans tous vos établissements'
        }, {
          icon: MessageCircle,
          title: 'Messagerie sécurisée',
          desc: 'Échangez directement avec vos soignants'
        }, {
          icon: Flag,
          title: 'Réclamations suivies',
          desc: 'Signalez un problème, suivez son traitement'
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
            <img src="/icon-192.png" alt="HostoConnect" className="w-8 h-8" />
            <span className="text-xl font-black" style={{
            fontFamily: 'Syne, sans-serif'
          }}>HostoConnect</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            La plateforme qui connecte patients et établissements de santé, partout au Cameroun.
          </p>
          <p className="text-xs text-gray-500 mt-2 sm:mt-4">© {new Date().getFullYear()} Groupe 10 PFE — 🇨🇲 Cameroun. Tous droits réservés.</p>
        </div>

        {[{
        title: 'HostoConnect',
        links: [{
          to: '/etablissements',
          label: 'Trouver un établissement'
        }, {
          to: '/comment-ca-marche',
          label: 'Comment ça marche'
        }, {
          to: '/etablissements/demande',
          label: 'Devenir établissement partenaire'
        }]
      }, {
        title: 'Support',
        links: [{
          to: '/faq',
          label: 'FAQ'
        }, {
          to: '/contact',
          label: 'Support'
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
        }, {
          to: '/mes-droits',
          label: 'Mes droits'
        }]
      }].map((section, i) => <div key={i}>
            <h4 className="font-bold text-sm mb-2 sm:mb-4 text-gray-200 tracking-wider uppercase">{section.title}</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              {section.links.map(link => <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-primary-400 transition-colors">
                    {link.label}
                  </Link>
                </li>)}
            </ul>
          </div>)}
      </div>

      <div className="border-t border-gray-800 py-2.5 sm:py-4">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[11px] sm:text-xs text-gray-500 leading-snug">
            Ce site est protégé par reCAPTCHA. La <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-400">Politique de confidentialité</a> et les <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-400">Conditions d'utilisation</a> de Google s'appliquent.
          </p>
        </div>
      </div>
    </footer>;
}
