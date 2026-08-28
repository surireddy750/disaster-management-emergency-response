import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';

export const INCIDENT_TYPES = [
  { id: 'Flood', label: 'Flood', baseScore: 30, icon: '🌊' },
  { id: 'Fire', label: 'Fire', baseScore: 35, icon: '🔥' },
  { id: 'Medical Emergency', label: 'Medical Emergency', baseScore: 30, icon: '🚑' },
  { id: 'Landslide', label: 'Landslide', baseScore: 35, icon: '⛰️' },
  { id: 'Building Collapse', label: 'Building Collapse', baseScore: 45, icon: '🏚️' },
  { id: 'People Trapped', label: 'People Trapped', baseScore: 40, icon: '🆘' },
  { id: 'Other', label: 'Other', baseScore: 20, icon: '⚠️' },
];

export const INCIDENT_SEVERITY = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export const INCIDENT_STATUS = {
  REPORTED: 'REPORTED',
  DISPATCHED: 'DISPATCHED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
};

/**
 * Deterministic Priority & Severity calculation engine.
 * 
 * @param {Object} params
 * @param {string} params.incidentType
 * @param {number} params.peopleCount
 * @param {number} params.childrenCount
 * @param {number} params.elderlyCount
 * @param {number} params.injuredCount
 * @returns {{ priorityScore: number, severity: string, factors: string[] }}
 */
export function calculateIncidentPriority({
  incidentType = 'Other',
  peopleCount = 1,
  childrenCount = 0,
  elderlyCount = 0,
  injuredCount = 0,
}) {
  const typeObj = INCIDENT_TYPES.find((t) => t.id === incidentType) || {
    baseScore: 20,
    label: incidentType,
  };

  const pCount = Math.max(1, Number(peopleCount) || 1);
  const cCount = Math.max(0, Number(childrenCount) || 0);
  const eCount = Math.max(0, Number(elderlyCount) || 0);
  const iCount = Math.max(0, Number(injuredCount) || 0);

  const factors = [];

  // Base score from hazard severity
  let rawScore = typeObj.baseScore;
  factors.push(`Base hazard severity (${typeObj.id}): +${typeObj.baseScore}`);

  // Weighted casualties & vulnerable persons
  if (iCount > 0) {
    const injuredWeight = Math.min(45, iCount * 15);
    rawScore += injuredWeight;
    factors.push(`${iCount} injured individual(s): +${injuredWeight}`);
  }

  if (cCount > 0) {
    const childrenWeight = Math.min(25, cCount * 10);
    rawScore += childrenWeight;
    factors.push(`${cCount} child(ren) present: +${childrenWeight}`);
  }

  if (eCount > 0) {
    const elderlyWeight = Math.min(20, eCount * 8);
    rawScore += elderlyWeight;
    factors.push(`${eCount} elderly person(s): +${elderlyWeight}`);
  }

  const otherPeople = Math.max(0, pCount - cCount - eCount - iCount);
  if (otherPeople > 0) {
    const otherWeight = Math.min(15, otherPeople * 3);
    rawScore += otherWeight;
    factors.push(`${otherPeople} other person(s) at risk: +${otherWeight}`);
  }

  // Clamping to 0-100 scale
  const priorityScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Determine Severity Level
  let severity = INCIDENT_SEVERITY.LOW;
  if (priorityScore >= 80 || iCount >= 2 || (iCount >= 1 && (cCount > 0 || eCount > 0))) {
    severity = INCIDENT_SEVERITY.CRITICAL;
  } else if (priorityScore >= 60 || iCount > 0) {
    severity = INCIDENT_SEVERITY.HIGH;
  } else if (priorityScore >= 35 || pCount > 2) {
    severity = INCIDENT_SEVERITY.MODERATE;
  } else {
    severity = INCIDENT_SEVERITY.LOW;
  }

  return {
    priorityScore,
    severity,
    factors,
  };
}

/**
 * Creates and submits a new SOS incident record into Firestore `incidents` collection.
 * 
 * @param {Object} incidentPayload
 * @returns {Promise<{ success: boolean, incidentId: string, data: Object }>}
 */
export async function submitSOSIncident({
  citizenId,
  citizenName,
  incidentType,
  location,
  peopleCount,
  childrenCount,
  elderlyCount,
  injuredCount,
  description = '',
}) {
  if (!citizenId) {
    throw new Error('User authentication required to submit an emergency report.');
  }

  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    throw new Error('Valid GPS coordinates (latitude and longitude) are required for emergency dispatch.');
  }

  if (isNaN(location.latitude) || isNaN(location.longitude)) {
    throw new Error('Invalid coordinate numbers provided.');
  }

  const pCount = Math.max(1, Number(peopleCount) || 1);
  const cCount = Math.max(0, Number(childrenCount) || 0);
  const eCount = Math.max(0, Number(elderlyCount) || 0);
  const iCount = Math.max(0, Number(injuredCount) || 0);

  // Calculate deterministic priority & severity
  const { priorityScore, severity } = calculateIncidentPriority({
    incidentType,
    peopleCount: pCount,
    childrenCount: cCount,
    elderlyCount: eCount,
    injuredCount: iCount,
  });

  const now = new Date();
  const timestampCode = now.getTime().toString().slice(-6);
  const tempIncidentId = `INC-${timestampCode}`;

  const incidentsRef = collection(db, 'incidents');

  const incidentDocData = {
    incidentId: tempIncidentId, // will be updated with actual docId if preferred
    citizenId,
    citizenName: citizenName || 'Anonymous Citizen',
    incidentType: incidentType || 'Other',
    location: {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    },
    peopleCount: pCount,
    childrenCount: cCount,
    elderlyCount: eCount,
    injuredCount: iCount,
    description: (description || '').trim(),
    priorityScore,
    severity,
    status: INCIDENT_STATUS.REPORTED,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(incidentsRef, incidentDocData);

  // Sync actual document ID as canonical incident identifier
  const finalIncidentId = docRef.id;
  try {
    await updateDoc(docRef, {
      incidentId: finalIncidentId,
    });
  } catch (syncErr) {
    console.warn('Incident ID update sync notice:', syncErr?.message);
  }

  return {
    success: true,
    incidentId: finalIncidentId,
    data: {
      ...incidentDocData,
      incidentId: finalIncidentId,
    },
  };
}

export default {
  INCIDENT_TYPES,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  calculateIncidentPriority,
  submitSOSIncident,
};
