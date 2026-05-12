import { initializeApp } from 'firebase/app'
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { pushNotificationsAPI } from './api'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
const TOKEN_KEY = 'bonifacios_push_token'

let appInstance = null
let messagingInstance = null
let foregroundUnsubscribe = null

const hasFirebaseConfig = () => (
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.projectId) &&
  Boolean(firebaseConfig.messagingSenderId) &&
  Boolean(firebaseConfig.appId) &&
  Boolean(vapidKey)
)

const buildMessagingSwUrl = () => {
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  })
  return `/firebase-messaging-sw.js?${params.toString()}`
}

const ensureFirebaseMessaging = async () => {
  const supported = await isSupported().catch(() => false)
  if (!supported || !hasFirebaseConfig()) return null

  if (!appInstance) appInstance = initializeApp(firebaseConfig)
  if (!messagingInstance) messagingInstance = getMessaging(appInstance)
  return messagingInstance
}

const ensureMessagingServiceWorker = async () => {
  const swUrl = buildMessagingSwUrl()
  // Use dedicated scope to avoid conflicting with vite-plugin-pwa root service worker.
  return navigator.serviceWorker.register(swUrl, { scope: '/firebase-cloud-messaging-push-scope' })
}

export const getPushAvailability = async () => {
  if (typeof window === 'undefined') return { supported: false, reason: 'server' }
  if (!('Notification' in window)) return { supported: false, reason: 'notification_unsupported' }
  if (!('serviceWorker' in navigator)) return { supported: false, reason: 'service_worker_unsupported' }
  const supported = await isSupported().catch(() => false)
  if (!supported) return { supported: false, reason: 'firebase_messaging_unsupported' }
  if (!hasFirebaseConfig()) return { supported: false, reason: 'missing_firebase_config' }
  return { supported: true, reason: 'ok' }
}

export const getPushPermission = () => (typeof Notification === 'undefined' ? 'default' : Notification.permission)

export const enablePushNotifications = async () => {
  const availability = await getPushAvailability()
  if (!availability.supported) return { ok: false, reason: availability.reason }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'permission_denied' }

  const messaging = await ensureFirebaseMessaging()
  if (!messaging) return { ok: false, reason: 'messaging_unavailable' }

  const registration = await ensureMessagingServiceWorker()
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })

  if (!token) return { ok: false, reason: 'empty_token' }

  await pushNotificationsAPI.register(token)
  localStorage.setItem(TOKEN_KEY, token)
  return { ok: true, token }
}

export const syncPushNotifications = async () => {
  const availability = await getPushAvailability()
  if (!availability.supported || getPushPermission() !== 'granted') return { ok: false }

  const messaging = await ensureFirebaseMessaging()
  if (!messaging) return { ok: false }

  const registration = await ensureMessagingServiceWorker()
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })
  if (!token) return { ok: false }

  await pushNotificationsAPI.register(token)
  localStorage.setItem(TOKEN_KEY, token)
  return { ok: true, token }
}

export const disablePushNotifications = async () => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    await pushNotificationsAPI.unregister(token).catch(() => {})
  }

  const messaging = await ensureFirebaseMessaging()
  if (messaging && token) {
    await deleteToken(messaging).catch(() => {})
  }

  localStorage.removeItem(TOKEN_KEY)
  return { ok: true }
}

export const subscribeForegroundPush = async (onPayload) => {
  const messaging = await ensureFirebaseMessaging()
  if (!messaging) return () => {}

  if (foregroundUnsubscribe) {
    foregroundUnsubscribe()
    foregroundUnsubscribe = null
  }

  foregroundUnsubscribe = onMessage(messaging, (payload) => {
    if (typeof onPayload === 'function') onPayload(payload)
  })

  return () => {
    if (foregroundUnsubscribe) {
      foregroundUnsubscribe()
      foregroundUnsubscribe = null
    }
  }
}

