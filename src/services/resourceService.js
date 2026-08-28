import {
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { calculateDistanceKm } from '../utils/distance.js';

// Clearly labeled initial demo shelters across key test locations
export const DEMO_SHELTERS = [
  {
    id: 'demo-shelter-sf-1',
    name: 'DEMO: Civic Center Emergency Shelter',
    address: '99 Grove St, San Francisco, CA 94102',
    latitude: 37.7786,
    longitude: -122.4178,
    phone: '(415) 555-0192',
    capacity: 250,
  },
  {
    id: 'demo-shelter-sf-2',
    name: 'DEMO: Mission District Community Relief Center',
    address: '2450 Mission St, San Francisco, CA 94110',
    latitude: 37.7599,
    longitude: -122.4191,
    phone: '(415) 555-0144',
    capacity: 180,
  },
  {
    id: 'demo-shelter-sf-3',
    name: 'DEMO: Presidio Emergency Evacuation Base',
    address: '210 Lincoln Blvd, San Francisco, CA 94129',
    latitude: 37.7995,
    longitude: -122.4642,
    phone: '(415) 555-0178',
    capacity: 400,
  },
  {
    id: 'demo-shelter-tokyo',
    name: 'DEMO: Shinjuku Disaster Relief Center',
    address: '1-1 Minami-Shinjuku, Tokyo, Japan',
    latitude: 35.6895,
    longitude: 139.7005,
    phone: '+81 3-5555-0123',
    capacity: 500,
  },
  {
    id: 'demo-shelter-london',
    name: 'DEMO: Westminster Emergency Reception Center',
    address: '64 Victoria St, London SW1E 6QP, UK',
    latitude: 51.4988,
    longitude: -0.1372,
    phone: '+44 20 7946 0912',
    capacity: 320,
  },
  {
    id: 'demo-shelter-mumbai',
    name: 'DEMO: Dadar Disaster Management Shelter',
    address: 'Senapati Bapat Marg, Dadar, Mumbai, India',
    latitude: 19.0178,
    longitude: 72.8478,
    phone: '+91 22 2414 0000',
    capacity: 350,
  },
];

// Clearly labeled initial demo hospitals across key test locations
export const DEMO_HOSPITALS = [
  {
    id: 'demo-hospital-sf-1',
    name: 'DEMO: SF General Hospital & Trauma Center',
    address: '1001 Potrero Ave, San Francisco, CA 94110',
    latitude: 37.7558,
    longitude: -122.4047,
    phone: '(415) 206-8000',
  },
  {
    id: 'demo-hospital-sf-2',
    name: 'DEMO: UCSF Medical Center at Parnassus',
    address: '505 Parnassus Ave, San Francisco, CA 94143',
    latitude: 37.7631,
    longitude: -122.4578,
    phone: '(415) 476-1000',
  },
  {
    id: 'demo-hospital-sf-3',
    name: 'DEMO: Saint Francis Memorial Hospital',
    address: '900 Hyde St, San Francisco, CA 94109',
    latitude: 37.7897,
    longitude: -122.4172,
    phone: '(415) 353-6000',
  },
  {
    id: 'demo-hospital-tokyo',
    name: 'DEMO: Tokyo Medical University Hospital',
    address: '6-7-1 Nishishinjuku, Shinjuku City, Tokyo, Japan',
    latitude: 35.6942,
    longitude: 139.6917,
    phone: '+81 3-3342-6111',
  },
  {
    id: 'demo-hospital-london',
    name: "DEMO: St Thomas' Emergency Hospital",
    address: 'Westminster Bridge Rd, London SE1 7EH, UK',
    latitude: 51.4991,
    longitude: -0.1197,
    phone: '+44 20 7188 7188',
  },
  {
    id: 'demo-hospital-mumbai',
    name: 'DEMO: KEM Emergency Care Hospital',
    address: 'Acharya Donde Marg, Parel, Mumbai, India',
    latitude: 19.0028,
    longitude: 72.8428,
    phone: '+91 22 2410 7000',
  },
];

/**
 * Seeds demo shelters into Firestore if collection is empty.
 */
export async function seedDemoSheltersIfEmpty() {
  try {
    const sheltersRef = collection(db, 'shelters');
    const snapshot = await getDocs(sheltersRef);
    if (snapshot.empty) {
      console.log('Seeding initial DEMO shelters to Firestore...');
      for (const item of DEMO_SHELTERS) {
        const { id, ...data } = item;
        await addDoc(sheltersRef, {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn('Firestore shelters seeding skipped:', err?.message || err);
  }
}

/**
 * Seeds demo hospitals into Firestore if collection is empty.
 */
export async function seedDemoHospitalsIfEmpty() {
  try {
    const hospitalsRef = collection(db, 'hospitals');
    const snapshot = await getDocs(hospitalsRef);
    if (snapshot.empty) {
      console.log('Seeding initial DEMO hospitals to Firestore...');
      for (const item of DEMO_HOSPITALS) {
        const { id, ...data } = item;
        await addDoc(hospitalsRef, {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn('Firestore hospitals seeding skipped:', err?.message || err);
  }
}

/**
 * Calculates distance from user location to a list of resources,
 * sorts nearest first, and returns top N (default 3).
 * 
 * @param {Array} items List of locations (shelters or hospitals)
 * @param {number} userLat
 * @param {number} userLon
 * @param {number} limit Top N items to return
 * @returns {Array} Sorted nearest resources
 */
export function getNearestResources(items = [], userLat, userLon, limit = 3) {
  if (userLat === undefined || userLat === null || userLon === undefined || userLon === null) {
    return [];
  }

  const numLat = Number(userLat);
  const numLon = Number(userLon);

  return items
    .map((item) => {
      const itemLat = Number(item.latitude);
      const itemLon = Number(item.longitude);
      const distanceKm = calculateDistanceKm(numLat, numLon, itemLat, itemLon);

      return {
        ...item,
        distanceKm,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/**
 * Real-time subscription to Shelters collection with fallback to DEMO_SHELTERS.
 * 
 * @param {number} userLat
 * @param {number} userLon
 * @param {Function} onUpdate
 * @returns {Function} Unsubscribe function
 */
export function subscribeNearestShelters(userLat, userLon, onUpdate) {
  if (userLat === undefined || userLat === null || userLon === undefined || userLon === null) {
    onUpdate([]);
    return () => {};
  }

  let isUnsubscribed = false;

  try {
    const sheltersRef = collection(db, 'shelters');
    const unsubscribe = onSnapshot(
      sheltersRef,
      (snapshot) => {
        if (isUnsubscribed) return;

        let raw = [];
        if (!snapshot.empty) {
          raw = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } else {
          seedDemoSheltersIfEmpty();
          raw = DEMO_SHELTERS;
        }

        const nearest = getNearestResources(raw, userLat, userLon, 3);
        onUpdate(nearest);
      },
      (error) => {
        console.warn('Firestore shelters subscription fallback to DEMO data:', error?.message || error);
        if (isUnsubscribed) return;
        const nearest = getNearestResources(DEMO_SHELTERS, userLat, userLon, 3);
        onUpdate(nearest);
      }
    );

    return () => {
      isUnsubscribed = true;
      unsubscribe();
    };
  } catch (err) {
    console.warn('Firestore shelters subscription error, fallback to DEMO data:', err?.message || err);
    const nearest = getNearestResources(DEMO_SHELTERS, userLat, userLon, 3);
    onUpdate(nearest);
    return () => {
      isUnsubscribed = true;
    };
  }
}

/**
 * Real-time subscription to Hospitals collection with fallback to DEMO_HOSPITALS.
 * 
 * @param {number} userLat
 * @param {number} userLon
 * @param {Function} onUpdate
 * @returns {Function} Unsubscribe function
 */
export function subscribeNearestHospitals(userLat, userLon, onUpdate) {
  if (userLat === undefined || userLat === null || userLon === undefined || userLon === null) {
    onUpdate([]);
    return () => {};
  }

  let isUnsubscribed = false;

  try {
    const hospitalsRef = collection(db, 'hospitals');
    const unsubscribe = onSnapshot(
      hospitalsRef,
      (snapshot) => {
        if (isUnsubscribed) return;

        let raw = [];
        if (!snapshot.empty) {
          raw = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } else {
          seedDemoHospitalsIfEmpty();
          raw = DEMO_HOSPITALS;
        }

        const nearest = getNearestResources(raw, userLat, userLon, 3);
        onUpdate(nearest);
      },
      (error) => {
        console.warn('Firestore hospitals subscription fallback to DEMO data:', error?.message || error);
        if (isUnsubscribed) return;
        const nearest = getNearestResources(DEMO_HOSPITALS, userLat, userLon, 3);
        onUpdate(nearest);
      }
    );

    return () => {
      isUnsubscribed = true;
      unsubscribe();
    };
  } catch (err) {
    console.warn('Firestore hospitals subscription error, fallback to DEMO data:', err?.message || err);
    const nearest = getNearestResources(DEMO_HOSPITALS, userLat, userLon, 3);
    onUpdate(nearest);
    return () => {
      isUnsubscribed = true;
    };
  }
}

export default {
  DEMO_SHELTERS,
  DEMO_HOSPITALS,
  getNearestResources,
  subscribeNearestShelters,
  subscribeNearestHospitals,
  seedDemoSheltersIfEmpty,
  seedDemoHospitalsIfEmpty,
};
