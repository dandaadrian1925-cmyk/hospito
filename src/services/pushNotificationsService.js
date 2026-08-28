import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { db, getMessagingSafe } from '../firebase/config';
import { lienInterneSur } from '../lib/safeLink';
import toast from 'react-hot-toast';
let tokenNatifActuel = null;
const initPushNative = async userId => {
  try {
    let statut = (await PushNotifications.checkPermissions()).receive;
    if (statut === 'prompt') statut = (await PushNotifications.requestPermissions()).receive;
    if (statut !== 'granted') return;
    await PushNotifications.addListener('registration', async token => {
      tokenNatifActuel = token.value;
      await updateDoc(doc(db, 'users', userId), {
        fcmTokens: arrayUnion(token.value)
      });
    });
    await PushNotifications.addListener('pushNotificationReceived', notification => {
      const titre = notification.title || 'Hospito';
      const link = notification.data?.link;
      toast(titre, link ? {
        icon: '🔔',
        onClick: () => {
          window.location.href = lienInterneSur(link);
        }
      } : {
        icon: '🔔'
      });
    });
    await PushNotifications.register();
  } catch (e) {
    console.warn('Initialisation des notifications push (natif) échouée :', e.message);
  }
};
export const initPush = async userId => {
  if (!userId) return;
  if (Capacitor.isNativePlatform()) return initPushNative(userId);
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) return;
  try {
    if (Notification.permission === 'denied') return;
    const messaging = await getMessagingSafe();
    if (!messaging) return;
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return;
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    if (!token) return;
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayUnion(token)
    });
    onMessage(messaging, payload => {
      const titre = payload.notification?.title || 'Hospito';
      const link = payload.fcmOptions?.link || payload.data?.link;
      toast(titre, link ? {
        icon: '🔔',
        onClick: () => {
          window.location.href = lienInterneSur(link);
        }
      } : {
        icon: '🔔'
      });
    });
  } catch (e) {
    console.warn('Initialisation des notifications push échouée :', e.message);
  }
};
export const removePush = async userId => {
  if (!userId) return;
  if (Capacitor.isNativePlatform()) {
    if (tokenNatifActuel) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          fcmTokens: arrayRemove(tokenNatifActuel)
        });
      } catch (e) {
        console.warn('Suppression du token push (natif) échouée :', e.message);
      }
    }
    return;
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) return;
  try {
    if (Notification.permission !== 'granted') return;
    const messaging = await getMessagingSafe();
    if (!messaging) return;
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) return;
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    if (!token) return;
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(token)
    });
  } catch (e) {
    console.warn('Suppression du token push échouée :', e.message);
  }
};
