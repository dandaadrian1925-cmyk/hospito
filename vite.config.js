import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Port fixe : la fonction Supabase K-PAY (dynamic-processor) n'autorise en CORS
  // que http://localhost:5173 — si ce port est déjà pris, ne pas basculer ailleurs
  // en silence (ce qui casse le paiement), échouer clairement à la place.
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        // Sépare les grosses dépendances stables dans leurs propres chunks : le
        // navigateur les met en cache indépendamment du code applicatif (qui change
        // à chaque déploiement), donc les visiteurs récurrents ne les re-téléchargent
        // pas à chaque mise à jour de MAKET.
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'vendor-firebase';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
        },
      },
    },
  },
})
