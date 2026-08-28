import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase.js';
import { calculateDistanceKm } from '../utils/distance.js';

export const ALERT_SEVERITY = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// Initial clearly labeled demo alerts for testing in various regions
export const DEMO_ALERTS = [
  {
    id: 'demo-alert-sf-1',
    title: 'DEMO: Coastal High Tide & Flash Flood Warning',
    message: 'Rapidly rising water levels observed along coastal embankments. Avoid low-lying boardwalks and waterfront drives.',
    severity: ALERT_SEVERITY.HIGH,
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 45, // 45 km radius
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-alert-sf-2',
    title: 'DEMO: Gale Force Wind Advisory',
    message: 'Sustained wind gusts up to 55 km/h expected. Secure loose outdoor fixtures and exercise caution on bridges.',
    severity: ALERT_SEVERITY.MODERATE,
    latitude: 37.8044,
    longitude: -122.2712,
    radius: 35,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-alert-tokyo',
    title: 'DEMO: Tropical Storm Rain Band Alert',
    message: 'Intense localized downpours with potential drainage overflow. Keep umbrella and emergency supplies handy.',
    severity: ALERT_SEVERITY.HIGH,
    latitude: 35.6762,
    longitude: 139.6503,
    radius: 50,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-alert-london',
    title: 'DEMO: Urban Heat & Smog Advisory',
    message: 'Elevated surface temperatures and poor air circulation. Stay hydrated and avoid strenuous afternoon activities.',
    severity: ALERT_SEVERITY.LOW,
    latitude: 51.5074,
    longitude: -0.1278,
    radius: 30,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-alert-sydney',
    title: 'DEMO: Bushfire Smoke & Air Quality Warning',
    message: 'Smoke haze reducing visibility. Sensitive individuals are advised to remain indoors with windows closed.',
    severity: ALERT_SEVERITY.CRITICAL,
    latitude: -33.8688,
    longitude: 151.2093,
    radius: 60,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-alert-global-wide',
    title: 'DEMO: Regional Severe Weather Watch',
    message: 'Atmospheric disturbance detected in the regional perimeter. Monitor localized emergency updates.',
    severity: ALERT_SEVERITY.MODERATE,
    latitude: 37.77,
    longitude: -122.42,
    radius: 150, // wide radius for testing
    active: true,
    createdAt: new Date().toISOString(),
  },
];

const SEVERITY_WEIGHT = {
  [ALERT_SEVERITY.CRITICAL]: 4,
  [ALERT_SEVERITY.HIGH]: 3,
  [ALERT_SEVERITY.MODERATE]: 2,
  [ALERT_SEVERITY.LOW]: 1,
};

/**
 * Seeds demo alerts into Firestore if collection is empty.
 */
export async function seedDemoAlertsIfEmpty() {
  try {
    const alertsRef = collection(db, 'alerts');
    const snapshot = await getDocs(alertsRef);
    if (snapshot.empty) {
      console.log('Seeding initial DEMO alerts to Firestore...');
      for (const alert of DEMO_ALERTS) {
        const { id, ...alertData } = alert;
        await addDoc(alertsRef, {
          ...alertData,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn('Firestore seeding skipped or failed (using in-memory fallback):', err?.message || err);
  }
}

/**
 * Filters active alerts by distance and radius according to user coordinates.
 * 
 * @param {Array} alerts Raw alert list
 * @param {number} userLat Citizen's latitude
 * @param {number} userLon Citizen's longitude
 * @returns {Array} List of alerts with distance info, filtered to within alert radius
 */
export function filterAndSortNearbyAlerts(alerts, userLat, userLon) {
  if (userLat === undefined || userLat === null || userLon === undefined || userLon === null) {
    return [];
  }

  const numLat = Number(userLat);
  const numLon = Number(userLon);

  return alerts
    .filter((alert) => alert.active === true || alert.active === 'true' || alert.active === undefined)
    .map((alert) => {
      const alertLat = Number(alert.latitude);
      const alertLon = Number(alert.longitude);
      const radiusKm = Number(alert.radius) || 25; // Default 25km radius
      const distanceKm = calculateDistanceKm(numLat, numLon, alertLat, alertLon);

      return {
        ...alert,
        distanceKm,
        radiusKm,
        isWithinRadius: distanceKm <= radiusKm,
      };
    })
    .filter((alert) => alert.isWithinRadius)
    .sort((a, b) => {
      // Sort by Severity first (CRITICAL > HIGH > MODERATE > LOW), then by distance (closest first)
      const weightA = SEVERITY_WEIGHT[a.severity] || 0;
      const weightB = SEVERITY_WEIGHT[b.severity] || 0;
      if (weightB !== weightA) {
        return weightB - weightA;
      }
      return a.distanceKm - b.distanceKm;
    });
}

/**
 * Subscribes to active alerts from Firestore in real-time, or provides DEMO fallback.
 * 
 * @param {number} userLat Citizen's latitude
 * @param {number} userLon Citizen's longitude
 * @param {Function} onUpdate Callback receiving filtered nearby alerts array
 * @returns {Function} Unsubscribe function
 */
export function subscribeNearbyAlerts(userLat, userLon, onUpdate) {
  if (userLat === undefined || userLat === null || userLon === undefined || userLon === null) {
    onUpdate([]);
    return () => {};
  }

  let isUnsubscribed = false;

  try {
    const alertsRef = collection(db, 'alerts');
    const q = query(alertsRef, where('active', '==', true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (isUnsubscribed) return;

        let rawAlerts = [];
        if (!snapshot.empty) {
          rawAlerts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } else {
          // If Firestore is empty, seed asynchronously and use DEMO alerts
          seedDemoAlertsIfEmpty();
          rawAlerts = DEMO_ALERTS;
        }

        const nearby = filterAndSortNearbyAlerts(rawAlerts, userLat, userLon);
        onUpdate(nearby);
      },
      (error) => {
        console.warn('Firestore alerts subscription fallback to in-memory DEMO alerts:', error?.message || error);
        if (isUnsubscribed) return;
        // Fallback to DEMO alerts
        const nearby = filterAndSortNearbyAlerts(DEMO_ALERTS, userLat, userLon);
        onUpdate(nearby);
      }
    );

    return () => {
      isUnsubscribed = true;
      unsubscribe();
    };
  } catch (err) {
    console.warn('Firestore initialization error, using DEMO alerts fallback:', err?.message || err);
    const nearby = filterAndSortNearbyAlerts(DEMO_ALERTS, userLat, userLon);
    onUpdate(nearby);
    return () => {
      isUnsubscribed = true;
    };
  }
}

export default {
  ALERT_SEVERITY,
  DEMO_ALERTS,
  calculateDistanceKm,
  filterAndSortNearbyAlerts,
  subscribeNearbyAlerts,
  seedDemoAlertsIfEmpty,
};
