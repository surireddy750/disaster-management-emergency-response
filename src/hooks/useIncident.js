import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  subscribeCitizenActiveIncident,
  subscribeIncidentById,
  INCIDENT_STATUSES,
  STATUS_STEPS,
} from '../services/incidentService.js';

/**
 * Custom hook that subscribes to the current logged-in citizen's active SOS incident.
 * Updates automatically when Firestore document changes via onSnapshot.
 * 
 * @returns {{
 *   activeIncident: Object|null,
 *   isLoading: boolean,
 *   error: Error|null,
 *   hasActiveIncident: boolean,
 * }}
 */
export function useActiveIncident() {
  const { currentUser } = useAuth();
  const [activeIncident, setActiveIncident] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setActiveIncident(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeCitizenActiveIncident(
      currentUser.uid,
      (incident) => {
        setActiveIncident(incident);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid]);

  return {
    activeIncident,
    isLoading,
    error,
    hasActiveIncident: !!activeIncident,
  };
}

/**
 * Custom hook to track a specific incident by ID in real-time.
 * 
 * @param {string} incidentId
 * @returns {{ incident: Object|null, isLoading: boolean, error: Error|null }}
 */
export function useIncident(incidentId) {
  const [incident, setIncident] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!incidentId) {
      setIncident(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeIncidentById(
      incidentId,
      (data) => {
        setIncident(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [incidentId]);

  return {
    incident,
    isLoading,
    error,
  };
}

export default {
  useActiveIncident,
  useIncident,
  INCIDENT_STATUSES,
  STATUS_STEPS,
};
