import { WaterParameters } from "./waterPredictor";

export interface MockSample {
  id: string;
  name: string;
  category: "tap" | "spring" | "industrial" | "well" | "runoff";
  description: string;
  parameters: WaterParameters;
  coordinates: { lat: number; lng: number };
  locationName: string;
  dateCollected: string;
}

export const MOCK_SAMPLES: MockSample[] = [
  {
    id: "sample-1",
    name: "Glacier Mountain Spring",
    category: "spring",
    description: "Pristine natural glacial meltwater sourced directly from high altitude spring.",
    parameters: {
      ph: 7.35,
      hardness: 85.4,
      solids: 120.5,
      chloramines: 0.25,
      sulfate: 18.2,
      conductivity: 110.0,
      organic_carbon: 0.45,
      trihalomethanes: 4.8,
      turbidity: 0.35
    },
    coordinates: { lat: 39.7392, lng: -104.9903 }, // Denver, CO
    locationName: "Rocky Mountain Foothills Reservoir",
    dateCollected: "2026-03-10"
  },
  {
    id: "sample-2",
    name: "Municipal Tap Water",
    category: "tap",
    description: "Standard city treated tap water from a modern urban water utility.",
    parameters: {
      ph: 7.15,
      hardness: 165.2,
      solids: 310.4,
      chloramines: 2.10,
      sulfate: 65.8,
      conductivity: 245.0,
      organic_carbon: 1.25,
      trihalomethanes: 35.6,
      turbidity: 0.72
    },
    coordinates: { lat: 40.7128, lng: -74.0060 }, // New York, NY
    locationName: "Chelsea Filtration Center Intake",
    dateCollected: "2026-03-12"
  },
  {
    id: "sample-3",
    name: "Industrial Runoff Pond",
    category: "industrial",
    description: "Stagnant pool sample collected downstream from an active manufacturing facility.",
    parameters: {
      ph: 4.80,
      hardness: 380.5,
      solids: 1850.0,
      chloramines: 6.80,
      sulfate: 490.2,
      conductivity: 1150.0,
      organic_carbon: 9.40,
      trihalomethanes: 125.0,
      turbidity: 9.45
    },
    coordinates: { lat: 41.8781, lng: -87.6298 }, // Chicago, IL
    locationName: "South Calumet Industrial Outfall",
    dateCollected: "2026-03-08"
  },
  {
    id: "sample-4",
    name: "Suburban Residential Well",
    category: "well",
    description: "Private domestic well water drawing from a deep limestone aquifer.",
    parameters: {
      ph: 6.85,
      hardness: 285.4, // hard water
      solids: 740.0,
      chloramines: 0.85,
      sulfate: 215.0,
      conductivity: 420.0,
      organic_carbon: 2.45,
      trihalomethanes: 42.1,
      turbidity: 2.85
    },
    coordinates: { lat: 34.0522, lng: -118.2437 }, // Los Angeles, CA
    locationName: "Lancaster Aquifer Well #4",
    dateCollected: "2026-03-14"
  },
  {
    id: "sample-5",
    name: "Acid Mine Drainage",
    category: "runoff",
    description: "Highly contaminated runoff from an abandoned coal mine shaft.",
    parameters: {
      ph: 2.80,
      hardness: 620.0,
      solids: 8400.0,
      chloramines: 0.10,
      sulfate: 1850.0,
      conductivity: 2900.0,
      organic_carbon: 14.2,
      trihalomethanes: 10.0,
      turbidity: 16.8
    },
    coordinates: { lat: 40.4406, lng: -79.9959 }, // Pittsburgh, PA
    locationName: "Blackwood Creek Mine Shaft",
    dateCollected: "2026-03-15"
  },
  // ===== BENGALURU (BANGALORE), INDIA SAMPLES =====
  {
    id: "sample-blr-1",
    name: "Kaveri River at TK Halli",
    category: "spring",
    description: "Raw water from Kaveri River, the primary source for Bengaluru's water supply. Before treatment.",
    parameters: {
      ph: 7.45,
      hardness: 185.0,
      solids: 285.0,
      chloramines: 0.0,
      sulfate: 42.0,
      conductivity: 385.0,
      organic_carbon: 3.2,
      trihalomethanes: 0.0,
      turbidity: 4.5
    },
    coordinates: { lat: 12.9716, lng: 77.5946 }, // Bengaluru
    locationName: "Kaveri River Intake, TK Halli",
    dateCollected: "2026-03-20"
  },
  {
    id: "sample-blr-2",
    name: "Bengaluru Municipal Tap Water",
    category: "tap",
    description: "BWSSB (Bangalore Water Supply and Sewerage Board) treated tap water from Cauvery Stage IV.",
    parameters: {
      ph: 7.25,
      hardness: 165.0,
      solids: 320.0,
      chloramines: 1.85,
      sulfate: 48.0,
      conductivity: 420.0,
      organic_carbon: 1.8,
      trihalomethanes: 28.5,
      turbidity: 0.65
    },
    coordinates: { lat: 12.9352, lng: 77.6245 }, // Indiranagar, Bangalore
    locationName: "Indiranagar, East Bangalore",
    dateCollected: "2026-03-21"
  },
  {
    id: "sample-blr-3",
    name: "Bellandur Lake Water",
    category: "industrial",
    description: "Severely polluted urban lake with foam and industrial discharge. Toxic foaming due to detergents and sewage.",
    parameters: {
      ph: 8.85, // Alkaline from industrial waste
      hardness: 445.0,
      solids: 2850.0,
      chloramines: 0.45,
      sulfate: 285.0,
      conductivity: 1850.0,
      organic_carbon: 18.5,
      trihalomethanes: 65.0,
      turbidity: 12.8
    },
    coordinates: { lat: 12.9369, lng: 77.6510 }, // Bellandur Lake
    locationName: "Bellandur Lake, Southeast Bangalore",
    dateCollected: "2026-03-19"
  },
  {
    id: "sample-blr-4",
    name: "Borewell Water (Hard Water)",
    category: "well",
    description: "Deep borewell water from Bangalore's depleting groundwater table. High hardness and TDS common.",
    parameters: {
      ph: 7.05,
      hardness: 485.0, // Very hard
      solids: 1250.0,
      chloramines: 0.0,
      sulfate: 185.0,
      conductivity: 1680.0,
      organic_carbon: 2.1,
      trihalomethanes: 0.0,
      turbidity: 1.2
    },
    coordinates: { lat: 12.9988, lng: 77.5920 }, // Yelahanka
    locationName: "Yelahanka New Town, North Bangalore",
    dateCollected: "2026-03-18"
  },
  {
    id: "sample-blr-5",
    name: "Ulsoor Lake (Stagnant)",
    category: "runoff",
    description: "Historic lake in central Bangalore with sewage inflow and algal blooms.",
    parameters: {
      ph: 8.15,
      hardness: 225.0,
      solids: 685.0,
      chloramines: 0.25,
      sulfate: 95.0,
      conductivity: 920.0,
      organic_carbon: 12.8,
      trihalomethanes: 18.5,
      turbidity: 8.2
    },
    coordinates: { lat: 12.9818, lng: 77.6243 }, // Ulsoor Lake
    locationName: "Ulsoor Lake, Central Bangalore",
    dateCollected: "2026-03-22"
  }
];
