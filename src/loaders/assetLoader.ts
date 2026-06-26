import { ILevelData, validateLevel } from '../data/levelSchema';

/**
 * Loads a round JSON configuration from the public assets directory.
 */
export async function fetchRoundData(region: 'US' | 'JP', roundNum: number, branch: 'L' | 'R' | '' = ''): Promise<ILevelData> {
    const padRound = roundNum.toString().padStart(2, '0');
    const url = `/data/levels/${region.toLowerCase()}/round-${padRound}${branch}.json`;
    
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to load level data for round ${roundNum} (HTTP ${res.status})`);
    }
    
    const data = await res.json();
    
    // Validate level data before passing to simulation
    const errors = validateLevel(data);
    if (errors.length > 0) {
        throw new Error(`Invalid level data loaded for round ${roundNum}:\n${errors.join('\n')}`);
    }
    
    return data as ILevelData;
}
