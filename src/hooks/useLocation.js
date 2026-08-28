import { useState, useEffect, useCallback } from 'react';

export const LOCATION_STATUS = {
  IDLE: 'IDLE',
  REQUESTING: 'REQUESTING',
  SUCCESS: 'SUCCESS',
  DENIED: 'DENIED',
  UNAVAILABLE: 'UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  ERROR: 'ERROR',
};

export function useLocation(autoFetch = true) {
  const [coordinates, setCoordinates] = useState(null); // { latitude, longitude, accuracy }
  const [status, setStatus] = useState(LOCATION_STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus(LOCATION_STATUS.UNAVAILABLE);
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setStatus(LOCATION_STATUS.REQUESTING);
    setErrorMessage(null);

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoordinates({
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
        });
        setStatus(LOCATION_STATUS.SUCCESS);
        setErrorMessage(null);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setStatus(LOCATION_STATUS.DENIED);
            setErrorMessage('Location permission was denied. You can enter coordinates manually.');
            break;
          case error.POSITION_UNAVAILABLE:
            setStatus(LOCATION_STATUS.UNAVAILABLE);
            setErrorMessage('Location information is currently unavailable.');
            break;
          case error.TIMEOUT:
            setStatus(LOCATION_STATUS.TIMEOUT);
            setErrorMessage('The request to get your location timed out.');
            break;
          default:
            setStatus(LOCATION_STATUS.ERROR);
            setErrorMessage(error.message || 'An unknown error occurred while retrieving location.');
            break;
        }
      },
      geoOptions
    );
  }, []);

  const setManualCoordinates = useCallback((lat, lng, acc = 10) => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setErrorMessage('Please enter valid numeric latitude and longitude.');
      return false;
    }

    if (parsedLat < -90 || parsedLat > 90) {
      setErrorMessage('Latitude must be between -90 and 90 degrees.');
      return false;
    }

    if (parsedLng < -180 || parsedLng > 180) {
      setErrorMessage('Longitude must be between -180 and 180 degrees.');
      return false;
    }

    setCoordinates({
      latitude: Number(parsedLat.toFixed(6)),
      longitude: Number(parsedLng.toFixed(6)),
      accuracy: Math.round(acc),
    });
    setStatus(LOCATION_STATUS.SUCCESS);
    setErrorMessage(null);
    return true;
  }, []);

  useEffect(() => {
    if (autoFetch) {
      requestLocation();
    }
  }, [autoFetch, requestLocation]);

  return {
    coordinates,
    status,
    errorMessage,
    requestLocation,
    setManualCoordinates,
    isLoading: status === LOCATION_STATUS.REQUESTING,
    isSuccess: status === LOCATION_STATUS.SUCCESS,
  };
}

export default useLocation;
