export interface PolygonPoint {
  x: number;
  y: number;
}

export interface ScenarioRecord {
  sceneId: string;
  sceneName: string;
  sceneCode: string;
  sceneDescription: string;
  status: string;
  domainId: string;
  longitude?: number | null;
  latitude?: number | null;
  imageUrl?: string;
  url?: string;
  polygon?: PolygonPoint[] | null;
}

export interface DomainOption {
  domainId: string;
  domainName: string;
  domainCode: string;
}

export interface AreaRecord {
  id: string;
  name: string;
  sceneId: string;
  description?: string;
  image?: string;
  parentId?: string;
  children?: AreaRecord[];
  polygon?: PolygonPoint[] | null;
}

export interface AreaPolygonInfo {
  id: string;
  name: string;
  polygon: PolygonPoint[] | null;
  color: string;
}