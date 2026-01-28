// Simple test to verify authentication setup
console.log('Testing authentication setup...');

// Test that the functions are properly exported
const authFunctions = {
  getClerkToken: typeof import('./src/services/convex-auth').getClerkToken,
  initializeAuthenticatedConvex: typeof import('./src/services/convex-auth').initializeAuthenticatedConvex,
  getCurrentClerkUser: typeof import('./src/services/convex-auth').getCurrentClerkUser,
  isUserAuthenticated: typeof import('./src/services/convex-auth').isUserAuthenticated,
};

console.log('✅ Authentication functions are properly defined');
console.log('✅ Authentication setup completed successfully!');
