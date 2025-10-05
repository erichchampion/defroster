/**
 * Error handling utilities for consistent error logging and handling
 */

/**
 * Create an error handler for state save operations
 * @param context Description of what was being saved (e.g., "save location state")
 * @returns Error handler function
 */
export const handleStateSaveError = (context: string) => (err: unknown) => {
  console.error(`Failed to ${context}:`, err);
  // Optional: Add analytics tracking here in the future
};
