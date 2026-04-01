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
  position?: string;
  parentId?: string;
  children?: AreaRecord[];
}
