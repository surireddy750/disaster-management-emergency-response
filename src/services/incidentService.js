import {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';

export const INCIDENT_STATUSES = {
  REPORTED: 'REPORTED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
};

// Lifecycle progression steps for active tracking
export const STATUS_STEPS = [
  { id: INCIDENT_STATUSES.REPORTED, label: 'Reported', description: 'Emergency received by dispatch' },
  { id: INCIDENT_STATUSES.ASSIGNED, label: 'Assigned', description: 'Rescue unit designated' },
  { id: INCIDENT_STATUSES.IN_PROGRESS, label: 'In Progress', description: 'Responders en route / on site' },
  { id: INCIDENT_STATUSES.RESOLVED, label: 'Resolved', description: 'Assistance complete & safe' },
];

/**
 * Listens in real-time to a specific incident by its document ID.
 * 
 * @param {string} incidentId Document ID of the incident
 * @param {Function} onUpdate Callback receiving incident data or null
 * @param {Function} onError Optional error callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeIncidentById(incidentId, onUpdate, onError) {
  if (!incidentId) {
    onUpdate(null);
    return () => {};
  }

  const docRef = doc(db, 'incidents', incidentId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate({
          id: docSnap.id,
          ...docSnap.data(),
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn(`Firestore subscription error on incident ${incidentId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Listens in real-time to all open incidents for rescue dispatch.
 * Returns incidents with status: REPORTED, ASSIGNED, IN_PROGRESS (and optionally recently RESOLVED).
 * Sorted by highest priority score first.
 * 
 * @param {Function} onUpdate Callback receiving list of incidents
 * @param {Function} onError Optional error callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeRescueIncidents(onUpdate, onError) {
  const incidentsRef = collection(db, 'incidents');

  return onSnapshot(
    incidentsRef,
    (snapshot) => {
      const incidents = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Filter to open / active incidents
      const openIncidents = incidents.filter(
        (inc) =>
          inc.status === INCIDENT_STATUSES.REPORTED ||
          inc.status === INCIDENT_STATUSES.ASSIGNED ||
          inc.status === INCIDENT_STATUSES.IN_PROGRESS
      );

      // Sort by highest priorityScore first, then newest createdAt
      openIncidents.sort((a, b) => {
        const scoreA = Number(a.priorityScore) || 0;
        const scoreB = Number(b.priorityScore) || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      onUpdate(openIncidents);
    },
    (err) => {
      console.warn('Firestore subscription error on rescue incidents:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Accepts a mission atomically via Firestore transaction to prevent race conditions.
 * 
 * @param {string} incidentId Document ID of the incident
 * @param {string} rescueTeamId Current rescue user's UID
 * @param {string} rescueTeamName Display name of the rescue team
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function acceptRescueMission(incidentId, rescueTeamId, rescueTeamName = 'Rescue Responder') {
  if (!incidentId || !rescueTeamId) {
    throw new Error('Incident ID and Rescue Team ID are required to accept mission.');
  }

  const docRef = doc(db, 'incidents', incidentId);

  await runTransaction(db, async (transaction) => {
    const incidentSnap = await transaction.get(docRef);

    if (!incidentSnap.exists()) {
      throw new Error('Incident not found in emergency database.');
    }

    const data = incidentSnap.data();

    // Check if another team has already claimed or if no longer in REPORTED state
    if (data.status !== INCIDENT_STATUSES.REPORTED && data.assignedRescueTeamId !== rescueTeamId) {
      throw new Error(
        `Mission is no longer available. Already assigned to: ${data.assignedRescueTeamName || 'another rescue unit'}`
      );
    }

    if (data.assignedRescueTeamId && data.assignedRescueTeamId !== rescueTeamId) {
      throw new Error(`This mission is already assigned to ${data.assignedRescueTeamName || 'another team'}.`);
    }

    transaction.update(docRef, {
      status: INCIDENT_STATUSES.ASSIGNED,
      assignedRescueTeamId: rescueTeamId,
      assignedRescueTeamName: rescueTeamName,
      assignedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return { success: true };
}

/**
 * Transitions an assigned incident status (ASSIGNED -> IN_PROGRESS -> RESOLVED).
 * 
 * @param {string} incidentId Document ID of the incident
 * @param {string} newStatus One of INCIDENT_STATUSES (e.g. IN_PROGRESS, RESOLVED)
 * @param {string} rescueTeamId Current rescue team's UID
 * @returns {Promise<{ success: boolean }>}
 */
export async function transitionMissionStatus(incidentId, newStatus, rescueTeamId) {
  if (!incidentId || !newStatus) {
    throw new Error('Incident ID and target status are required.');
  }

  const docRef = doc(db, 'incidents', incidentId);

  await runTransaction(db, async (transaction) => {
    const incidentSnap = await transaction.get(docRef);

    if (!incidentSnap.exists()) {
      throw new Error('Incident not found.');
    }

    const data = incidentSnap.data();

    // Ensure the updating team is the assigned team or an authorized admin
    if (rescueTeamId && data.assignedRescueTeamId && data.assignedRescueTeamId !== rescueTeamId) {
      throw new Error('Only the assigned rescue unit can update this mission status.');
    }

    const updatePayload = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };

    if (newStatus === INCIDENT_STATUSES.RESOLVED) {
      updatePayload.resolvedAt = serverTimestamp();
    }

    transaction.update(docRef, updatePayload);
  });

  return { success: true };
}

/**
 * Listens in real-time to the citizen's latest active emergency incident.
 * Filters out already RESOLVED and CANCELLED incidents unless no active ones exist.
 * 
 * @param {string} citizenId Current user's UID
 * @param {Function} onUpdate Callback receiving latest active incident or null
 * @param {Function} onError Optional error callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeCitizenActiveIncident(citizenId, onUpdate, onError) {
  if (!citizenId) {
    onUpdate(null);
    return () => {};
  }

  const incidentsRef = collection(db, 'incidents');
  // Query all incidents reported by this citizen
  const q = query(
    incidentsRef,
    where('citizenId', '==', citizenId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(null);
        return;
      }

      const allIncidents = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Sort by creation time descending (most recent first)
      allIncidents.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      // Find the most recent ACTIVE incident (REPORTED, ASSIGNED, or IN_PROGRESS)
      const activeIncident = allIncidents.find(
        (inc) =>
          inc.status === INCIDENT_STATUSES.REPORTED ||
          inc.status === INCIDENT_STATUSES.ASSIGNED ||
          inc.status === INCIDENT_STATUSES.IN_PROGRESS
      );

      // Return the active incident if any, otherwise null (or resolved if within 1 hour)
      onUpdate(activeIncident || null);
    },
    (err) => {
      console.warn(`Firestore subscription error for citizen ${citizenId} incidents:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Optional helper for testing or citizen cancellation
 */
export async function updateIncidentStatus(incidentId, newStatus) {
  if (!incidentId || !newStatus) return;
  const docRef = doc(db, 'incidents', incidentId);
  await updateDoc(docRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Listens in real-time to ALL incidents in the system for the Admin Command Center.
 * Sorted by highest priority score first, then newest creation time.
 * 
 * @param {Function} onUpdate Callback receiving list of all incidents
 * @param {Function} onError Optional error callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeAllIncidents(onUpdate, onError) {
  const incidentsRef = collection(db, 'incidents');

  return onSnapshot(
    incidentsRef,
    (snapshot) => {
      const incidents = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Sort by highest priorityScore first, then newest createdAt
      incidents.sort((a, b) => {
        const scoreA = Number(a.priorityScore) || 0;
        const scoreB = Number(b.priorityScore) || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      onUpdate(incidents);
    },
    (err) => {
      console.warn('Firestore subscription error on all incidents:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Listens in real-time to all users with role 'RESCUE_TEAM'.
 * 
 * @param {Function} onUpdate Callback receiving array of rescue team users
 * @param {Function} onError Optional error callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeRescueTeamUsers(onUpdate, onError) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'RESCUE_TEAM'));

  return onSnapshot(
    q,
    (snapshot) => {
      const teams = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        uid: docSnap.id,
        ...docSnap.data(),
      }));
      onUpdate(teams);
    },
    (err) => {
      console.warn('Firestore subscription error on rescue team users:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Admin assigns an unassigned incident to a selected rescue team.
 * Uses a Firestore transaction to ensure the incident has not already been assigned.
 * 
 * @param {string} incidentId Document ID of the incident
 * @param {string} rescueTeamId Selected rescue user's UID
 * @param {string} rescueTeamName Display name of the rescue team
 * @returns {Promise<{ success: boolean }>}
 */
export async function adminAssignRescueMission(incidentId, rescueTeamId, rescueTeamName) {
  if (!incidentId || !rescueTeamId) {
    throw new Error('Incident ID and Target Rescue Team are required.');
  }

  const docRef = doc(db, 'incidents', incidentId);

  await runTransaction(db, async (transaction) => {
    const incidentSnap = await transaction.get(docRef);

    if (!incidentSnap.exists()) {
      throw new Error('Incident not found in emergency database.');
    }

    const data = incidentSnap.data();

    // Verify incident is in REPORTED status
    if (data.status !== INCIDENT_STATUSES.REPORTED) {
      throw new Error(
        `Incident cannot be assigned. Current status is ${data.status} (assigned to ${data.assignedRescueTeamName || 'another unit'}).`
      );
    }

    transaction.update(docRef, {
      status: INCIDENT_STATUSES.ASSIGNED,
      assignedRescueTeamId: rescueTeamId,
      assignedRescueTeamName: rescueTeamName || 'Rescue Responder',
      assignedByAdmin: true,
      assignedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return { success: true };
}

export default {
  INCIDENT_STATUSES,
  STATUS_STEPS,
  subscribeIncidentById,
  subscribeRescueIncidents,
  subscribeAllIncidents,
  subscribeRescueTeamUsers,
  acceptRescueMission,
  adminAssignRescueMission,
  transitionMissionStatus,
  subscribeCitizenActiveIncident,
  updateIncidentStatus,
};
