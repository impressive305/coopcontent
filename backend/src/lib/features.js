import { HttpError } from './errors.js';

// The academic supervisor role is paused until further notice: supervisor
// accounts cannot sign in, none can be created or assigned, and the admin
// reviews reports instead. Set SUPERVISOR_ROLE_ENABLED=true to bring it back.
export const supervisorRoleEnabled = () => process.env.SUPERVISOR_ROLE_ENABLED === 'true';

export const assertSupervisorRoleEnabled = () => {
  if (!supervisorRoleEnabled()) throw new HttpError(409, 'The supervisor role is currently disabled');
};
