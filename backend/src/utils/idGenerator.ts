import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique ID using the uuid package
 */
export const generateId = (): string => {
  return uuidv4();
};
