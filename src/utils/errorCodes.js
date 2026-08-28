export function getFirebaseAuthErrorMessage(error) {
  if (!error) return 'An unknown error occurred.';
  const code = error.code || '';
  
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is invalid. Please check and try again.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters with a combination of letters and numbers.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled in Firebase Console.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please wait a few minutes before trying again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}
