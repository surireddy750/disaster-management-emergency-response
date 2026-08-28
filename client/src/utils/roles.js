export const ROLES = {
  CITIZEN: 'CITIZEN',
  RESCUE_TEAM: 'RESCUE_TEAM',
  ADMIN: 'ADMIN',
};

export const ROLE_LABELS = {
  [ROLES.CITIZEN]: 'Citizen',
  [ROLES.RESCUE_TEAM]: 'Rescue Team',
  [ROLES.ADMIN]: 'System Administrator',
};

export const ROLE_REDIRECTS = {
  [ROLES.CITIZEN]: '/citizen/home',
  [ROLES.RESCUE_TEAM]: '/rescue/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',
};
