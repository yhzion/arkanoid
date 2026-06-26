export interface AssetManifest {
  version: string;
  levels: string[];
  sprites: string[];
  audio: string[];
}

export const defaultManifest: AssetManifest = {
  version: '1.0.0',
  levels: [],
  sprites: [],
  audio: [],
};
