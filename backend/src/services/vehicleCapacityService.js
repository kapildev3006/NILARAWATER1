/**
 * Vehicle Capacity Service
 * Computes vehicle requirements based on volume, water jar count, total weight, and product types.
 * Configurable thresholds support easy customization.
 */

const VEHICLE_HIERARCHY = ['BIKE', 'SCOOTER', 'E_RICKSHAW', 'LOADER', 'PICKUP_VAN', 'MINI_TRUCK'];

// Default configurable thresholds
const CAPACITY_RULES = {
  BIKE: {
    maxJars: 4,
    maxWeightKg: 30,
    maxCartons: 2,
    description: 'Two-wheeler bike for small/instant orders'
  },
  SCOOTER: {
    maxJars: 4,
    maxWeightKg: 30,
    maxCartons: 2,
    description: 'Two-wheeler scooter with footboard space'
  },
  E_RICKSHAW: {
    maxJars: 18,
    maxWeightKg: 300,
    maxCartons: 10,
    description: 'Electric 3-wheeler for medium residential routes'
  },
  LOADER: {
    maxJars: 30,
    maxWeightKg: 500,
    maxCartons: 20,
    description: 'Auto loader 3-wheeler commercial carrier'
  },
  PICKUP_VAN: {
    maxJars: 75,
    maxWeightKg: 1200,
    maxCartons: 60,
    description: 'Tata Ace / Bolero pickup van for heavy bulk delivery'
  },
  MINI_TRUCK: {
    maxJars: 200,
    maxWeightKg: 3000,
    maxCartons: 150,
    description: 'Commercial mini-truck for large company / event orders'
  }
};

/**
 * Determine required vehicle category based on order parameters
 * @param {Object} params
 * @param {number} params.waterJarCount - Count of 20L water jars (approx 20kg each)
 * @param {number} params.cartonCount - Count of product cartons/cases
 * @param {number} params.totalWeightKg - Approximate total weight in kg
 * @param {number} params.itemCount - Total individual product count
 * @returns {string} One of ['BIKE', 'SCOOTER', 'E_RICKSHAW', 'LOADER', 'PICKUP_VAN', 'MINI_TRUCK']
 */
const determineRequiredVehicle = ({ waterJarCount = 0, cartonCount = 0, totalWeightKg = 0, itemCount = 0 }) => {
  const calculatedWeight = totalWeightKg > 0 ? totalWeightKg : (waterJarCount * 20 + cartonCount * 10 + itemCount * 0.5);

  if (waterJarCount > 75 || calculatedWeight > 1200 || cartonCount > 60) {
    return 'MINI_TRUCK';
  }
  if (waterJarCount > 30 || calculatedWeight > 500 || cartonCount > 20) {
    return 'PICKUP_VAN';
  }
  if (waterJarCount > 18 || calculatedWeight > 300 || cartonCount > 10) {
    return 'LOADER';
  }
  if (waterJarCount > 4 || calculatedWeight > 30 || cartonCount > 2) {
    return 'E_RICKSHAW';
  }
  return 'BIKE';
};

/**
 * Checks whether a driver's vehicle meets or exceeds the required vehicle capacity
 * @param {string} driverVehicle 
 * @param {string} requiredVehicle 
 * @returns {boolean}
 */
const isVehicleSufficient = (driverVehicle, requiredVehicle) => {
  if (!driverVehicle) return false;
  if (!requiredVehicle) return true;

  const driverRank = VEHICLE_HIERARCHY.indexOf(driverVehicle.toUpperCase());
  const requiredRank = VEHICLE_HIERARCHY.indexOf(requiredVehicle.toUpperCase());

  if (driverRank === -1) return false;
  if (requiredRank === -1) return true;

  return driverRank >= requiredRank;
};

module.exports = {
  VEHICLE_HIERARCHY,
  CAPACITY_RULES,
  determineRequiredVehicle,
  isVehicleSufficient
};
