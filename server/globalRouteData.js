
let globalRouteData = null;  // This will store the routeData globally

// Function to set the global route data
function setGlobalRouteData(routeData) {
  globalRouteData = routeData;
}

// Function to get the global route data
function getGlobalRouteData() {
  return globalRouteData;
}

// Export the functions for use in other files
module.exports = {
  setGlobalRouteData,
  getGlobalRouteData
};