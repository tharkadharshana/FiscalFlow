
import type { TaxSettings } from '@/types';

// Based on the provided documents for Sri Lanka (LK)
export const sriLankaTaxRules: TaxSettings = {
  countryCode: 'LK',
  vatRate: 0.18, // 18% as of latest changes
  palRate: 0.10, // 10% Port and Airport Levy
  sslRate: 0.025, // 2.5% Social Security Contribution Levy
  tariffs: {
    food: 0.15, // Average tariff for imported food items
    fuel: 0.05, // Specific tariffs on fuel imports
    vehicles: 0.25, // General tariff on vehicle bodies/parts
    clothing: 0.30, // Tariffs on imported apparel
    electronics: 0.10, // Tariffs on consumer electronics
    medical: 0.0, // Medical supplies often exempt
    other: 0.20, // General rate for other goods
  },
  exciseDuties: {
    fuelPerLiter: 20.0, // LKR 20 per liter excise duty on petrol
    alcoholPerLiter: 800.0, // Example excise duty on alcohol
    tobaccoPerStick: 15.0, // Example excise duty per cigarette
  },
  vehicleImport: {
    cidRate: 0.30, // Customs Import Duty
    luxuryTax: {
      petrol: { threshold: 5_000_000, rate: 1.20 },
      hybrid: { threshold: 5_500_000, rate: 0.90 },
      electric: { threshold: 6_000_000, rate: 0.60 },
    },
  },
  incomeTaxBrackets: [
    { limit: 1_200_000, rate: 0 },
    { limit: 1_700_000, rate: 0.06 },
    { limit: 2_200_000, rate: 0.12 },
    { limit: 2_700_000, rate: 0.18 },
    { limit: 3_200_000, rate: 0.24 },
    { limit: 3_700_000, rate: 0.30 },
    { limit: Infinity, rate: 0.36 },
  ],
  constants: {
    avgFuelConsumptionPerKm: 0.1, // 10km per liter average
    defaultFuelPricePerLiter: 350.0, // LKR
  },
};
