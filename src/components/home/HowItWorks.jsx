import { motion } from 'framer-motion';
import { Camera, Shield, KeyRound, Star } from 'lucide-react';
const steps = [{
  icon: Camera,
  num: '01',
  title: 'Publie ton annonce',
  desc: 'Prends des photos, filme une vidéo honnête de l\'article et fixe ton prix. Gratuit en V1 !'
}, {
  icon: Shield,
  num: '02',
  title: 'Acheteur paie en sécurité',
  desc: 'L\'argent est bloqué en sécurité via CamPay. Ni toi ni nous n\'y avons accès avant la remise.'
}, {
  icon: KeyRound,
  num: '03',
  title: 'Main propre ou livraison',
  desc: 'Convenez d\'un lieu via le chat, ou faites appel à un livreur partenaire (même entre deux villes) — l\'acheteur donne son code au moment de la remise.'
}, {
  icon: Star,
  num: '04',
  title: 'Tu es payé !',
  desc: 'Le code confirme la remise. 24h après, l\'argent t\'est versé automatiquement.'
}];
export default function HowItWorks() {
  return <section className="py-16 bg-gradient-to-br from-primary-950 to-primary-800 text-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="text-center mb-12">
          <span className="text-primary-300 text-sm font-bold uppercase tracking-widest">Simple & Sécurisé</span>
          <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600
        }} className="text-3xl md:text-4xl mt-2">
            Comment ça marche ?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => <motion.div key={i} initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: i * 0.15
        }} className="relative">
              {i < steps.length - 1 && <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-primary-600 z-0" style={{
            width: 'calc(100% - 2rem)'
          }}></div>}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 relative z-10 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary-200" />
                  </div>
                  <span style={{
                fontFamily: 'var(--font-display)'
              }} className="text-3xl font-semibold text-white/20">{step.num}</span>
                </div>
                <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600
            }} className="text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-primary-200 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>)}
        </div>
      </div>
    </section>;
}
