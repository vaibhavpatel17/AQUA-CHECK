import axios from 'axios';

const USGS_BASE_URL = 'https://waterservices.usgs.gov/nwis/iv/';

export interface USGSStation {
  siteCode: string;
  name: string;
  latitude: number;
  longitude: number;
  county: string;
  state: string;
  type: string;
}

export interface USGSWaterData {
  siteName: string;
  siteCode: string;
  timestamp: string;
  parameters: {
    ph?: number;
    specificConductance?: number; // μS/cm - proxy for conductivity/TDS
    turbidity?: number; // NTU
    waterTemperature?: number; // °C
    dissolvedOxygen?: number; // mg/L
    gageHeight?: number; // feet
    discharge?: number; // cubic feet per second
  };
  sourceUrl: string;
}

// Map USGS parameter codes to our parameters
const PARAMETER_CODES: Record<string, keyof USGSWaterData['parameters']> = {
  '00400': 'ph',                    // pH
  '00095': 'specificConductance',   // Specific Conductance μS/cm at 25°C
  '63680': 'turbidity',             // Turbidity, FNU/NTU
  '00010': 'waterTemperature',      // Water temperature °C
  '00300': 'dissolvedOxygen',       // Dissolved oxygen mg/L
  '00065': 'gageHeight',            // Gage height feet
  '00060': 'discharge',             // Discharge cubic ft/sec
  '99133': 'specificConductance',   // Conductance alternative code
  '99892': 'turbidity',             // Turbidity alternative
  '90860': 'turbidity',             // Turbidity FNU
  '99137': 'ph',                    // pH alternative
};

/**
 * Search for USGS monitoring stations near a location
 */
export async function searchNearbyStations(
  latitude: number, 
  longitude: number, 
  radiusMiles: number = 25
): Promise<USGSStation[]> {
  try {
    // BBox approximation (rough conversion)
    const latDelta = radiusMiles / 69;
    const lngDelta = radiusMiles / (69 * Math.cos(latitude * Math.PI / 180));
    
    const bBox = `${longitude - lngDelta},${latitude - latDelta},${longitude + lngDelta},${latitude + latDelta}`;
    
    const response = await axios.get(USGS_BASE_URL, {
      params: {
        format: 'json',
        bBox: bBox,
        parameterCd: '00400,00095,63680,00010,00300', // pH, conductance, turbidity, temp, DO
        siteType: 'ST,ST-CA,ST-DCH,ST-TS,LK,WE', // Stream, Canal, Ditch, Tidal stream, Lake, Wetland
        siteStatus: 'active',
        hasDataTypeCd: 'iv', // Instantaneous values
      },
      timeout: 15000,
    });

    const timeSeries = response.data?.value?.timeSeries || [];
    
    // Extract unique stations from time series
    const stationsMap = new Map<string, USGSStation>();
    
    timeSeries.forEach((series: any) => {
      const siteInfo = series.sourceInfo;
      const siteCode = siteInfo.siteCode?.[0]?.value;
      
      if (!stationsMap.has(siteCode)) {
        stationsMap.set(siteCode, {
          siteCode,
          name: siteInfo.siteName,
          latitude: parseFloat(siteInfo.geoLocation?.geogLocation?.latitude || 0),
          longitude: parseFloat(siteInfo.geoLocation?.geogLocation?.longitude || 0),
          county: siteInfo.siteProperty?.find((p: any) => p.name === 'countyCd')?.value || 'Unknown',
          state: siteInfo.siteProperty?.find((p: any) => p.name === 'stateCd')?.value || 'Unknown',
          type: siteInfo.siteTypeCd,
        });
      }
    });

    return Array.from(stationsMap.values());
  } catch (error) {
    console.error('Error fetching USGS stations:', error);
    throw new Error('Failed to fetch monitoring stations. Please check your connection.');
  }
}

/**
 * Get real-time water quality data for a specific station
 */
export async function getStationWaterData(siteCode: string): Promise<USGSWaterData | null> {
  try {
    const response = await axios.get(USGS_BASE_URL, {
      params: {
        format: 'json',
        sites: siteCode,
        parameterCd: '00400,00095,63680,00010,00300,00065,00060',
        siteStatus: 'active',
      },
      timeout: 15000,
    });

    const timeSeries = response.data?.value?.timeSeries || [];
    
    if (timeSeries.length === 0) {
      return null;
    }

    const siteInfo = timeSeries[0].sourceInfo;
    const siteName = siteInfo.siteName;
    
    const parameters: USGSWaterData['parameters'] = {};
    let latestTimestamp = '';

    timeSeries.forEach((series: any) => {
      const paramCode = series.variable?.variableCode?.[0]?.value;
      const paramName = PARAMETER_CODES[paramCode];
      
      if (paramName && series.values?.[0]?.value?.length > 0) {
        const latestValue = series.values[0].value[series.values[0].value.length - 1];
        parameters[paramName] = parseFloat(latestValue.value);
        
        if (latestValue.dateTime && latestValue.dateTime > latestTimestamp) {
          latestTimestamp = latestValue.dateTime;
        }
      }
    });

    return {
      siteName,
      siteCode,
      timestamp: latestTimestamp,
      parameters,
      sourceUrl: `https://waterdata.usgs.gov/nwis/uv?site_no=${siteCode}`,
    };
  } catch (error) {
    console.error('Error fetching USGS water data:', error);
    throw new Error('Failed to fetch water quality data from this station.');
  }
}

/**
 * Convert USGS parameters to our app's parameter format
 * This is an estimation - real drinking water needs lab testing!
 */
export function convertUSGSToParameters(usgsData: USGSWaterData): {
  parameters: {
    ph: number;
    hardness: number;
    solids: number;
    chloramines: number;
    sulfate: number;
    conductivity: number;
    organic_carbon: number;
    trihalomethanes: number;
    turbidity: number;
  };
  sourceName: string;
  disclaimers: string[];
} {
  const p = usgsData.parameters;
  const disclaimers: string[] = [];

  // pH - direct measurement
  const ph = p.ph || 7.2;

  // Conductance is essentially the same as conductivity
  const conductivity = p.specificConductance || 250;

  // Estimate TDS from specific conductance (rough rule: TDS ≈ EC × 0.5 to 0.8)
  // For natural waters, typically 0.55-0.8
  const solids = p.specificConductance ? Math.round(p.specificConductance * 0.65) : 300;

  // Turbidity - direct measurement if available
  const turbidity = p.turbidity || 1.0;

  // These parameters CANNOT be measured by typical USGS river sensors
  // We use rough estimates based on water type, but these are NOT accurate
  disclaimers.push(
    'Hardness, Chloramines, Sulfate, Organic Carbon, and Trihalomethanes are estimated values. '
    + 'USGS river monitoring stations do not measure these directly. '
    + 'For drinking water safety, laboratory testing is required.'
  );

  // Rough estimates based on conductance (very approximate!)
  // High conductance often correlates with hardness and dissolved minerals
  let hardness = 150;
  let sulfate = 50;
  
  if (p.specificConductance) {
    // Very rough correlation
    hardness = Math.round(p.specificConductance * 0.4);
    sulfate = Math.round(p.specificConductance * 0.2);
  }

  // River water typically has low chloramines (not disinfected like tap water)
  const chloramines = 0.1;

  // Organic carbon estimate based on turbidity
  // Higher turbidity often suggests more organic matter
  let organic_carbon = 1.5;
  if (p.turbidity && p.turbidity > 5) {
    organic_carbon = Math.min(8.0, 1.5 + p.turbidity * 0.3);
  }

  // THMs - not measured in rivers, very low naturally
  const trihalomethanes = 5.0;

  return {
    parameters: {
      ph,
      hardness,
      solids,
      chloramines,
      sulfate,
      conductivity,
      organic_carbon,
      trihalomethanes,
      turbidity,
    },
    sourceName: usgsData.siteName,
    disclaimers,
  };
}

/**
 * Search by state code for broader searches
 */
export async function searchStationsByState(stateCode: string): Promise<USGSStation[]> {
  try {
    const response = await axios.get(USGS_BASE_URL, {
      params: {
        format: 'json',
        stateCd: stateCode,
        parameterCd: '00400,00095,63680',
        siteType: 'ST,LK',
        siteStatus: 'active',
        hasDataTypeCd: 'iv',
      },
      timeout: 15000,
    });

    const timeSeries = response.data?.value?.timeSeries || [];
    const stationsMap = new Map<string, USGSStation>();
    
    timeSeries.forEach((series: any) => {
      const siteInfo = series.sourceInfo;
      const siteCode = siteInfo.siteCode?.[0]?.value;
      
      if (!stationsMap.has(siteCode)) {
        stationsMap.set(siteCode, {
          siteCode,
          name: siteInfo.siteName,
          latitude: parseFloat(siteInfo.geoLocation?.geogLocation?.latitude || 0),
          longitude: parseFloat(siteInfo.geoLocation?.geogLocation?.longitude || 0),
          county: siteInfo.siteProperty?.find((p: any) => p.name === 'countyCd')?.value || 'Unknown',
          state: siteInfo.siteProperty?.find((p: any) => p.name === 'stateCd')?.value || stateCode,
          type: siteInfo.siteTypeCd,
        });
      }
    });

    return Array.from(stationsMap.values()).slice(0, 50); // Limit to 50
  } catch (error) {
    console.error('Error fetching USGS stations by state:', error);
    throw new Error('Failed to fetch stations for this state.');
  }
}

// State code mapping for common states
export const STATE_CODES: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC',
};
