import request from '../utils/request';
import type { AreaRecord, DomainOption, ScenarioRecord } from '../types/models';

const host = (import.meta as any).env?.VITE_BASE_PATH || '';
const statusMap: Record<string, string> = {
  '0': '0',
  '1': '1',
  '2': '0',
  testing: '0',
  published: '1',
  editing: '0',
  developing: '0',
  development: '0'
};

function normalizeScenario(scenario: Record<string, any>): ScenarioRecord {
  const rawStatus = `${scenario.status ?? ''}`.trim().toLowerCase();
  const status = rawStatus in statusMap ? statusMap[rawStatus] : '0';
  return {
    sceneId: `${scenario.sceneId ?? scenario.id ?? ''}`,
    sceneName: scenario.sceneName ?? scenario.title ?? '',
    sceneCode: scenario.sceneCode ?? scenario.code ?? '',
    sceneDescription: scenario.sceneDescription ?? scenario.description ?? '',
    status,
    domainId: `${scenario.domainId ?? ''}`,
    longitude: scenario.longitude ?? null,
    latitude: scenario.latitude ?? null,
    imageUrl: scenario.imageUrl ?? '',
    url: scenario.url
  };
}

function normalizeDomain(domain: Record<string, any>): DomainOption {
  return {
    domainId: `${domain.domainId ?? domain.id ?? ''}`,
    domainName: domain.domainName ?? domain.name ?? '',
    domainCode: domain.domainCode ?? domain.code ?? ''
  };
}

function normalizeArea(area: Record<string, any>): AreaRecord {
  return {
    id: `${area.id ?? ''}`,
    name: area.name ?? '',
    sceneId: `${area.sceneId ?? ''}`,
    description: area.description ?? '',
    image: area.image ?? '',
    position: area.position ?? '',
    parentId: `${area.parentId ?? '-1'}`
  };
}

export interface SaveScenarioPayload {
  code: string;
  name: string;
  description: string;
  status: '0' | '1';
  url?: string;
  domainId: number;
  location?: {
    lng: number;
    lat: number;
  } | null;
  imageUrl?: string;
}

export interface PublishScenarioPayload {
  sceneId: number;
  status: '0' | '1';
  url?: string;
  dslData?: {
    sceneData: {
      code: string;
      name: string;
      description: string;
      status: '0' | '1';
      url?: string;
      domainId: number;
      location?: {
        lng: number;
        lat: number;
      } | null;
      imageUrl?: string;
    };
    devices: Array<Record<string, any>>;
  } | null;
}

export interface SaveAreaPayload {
  name: string;
  sceneId: number;
  description?: string;
  image?: string;
  position?: string;
  parentId?: number;
}

export async function getScenarioList(domainId?: string) {
  const uri = domainId ? `${host}/scenes?domainId=${domainId}` : `${host}/all-scenes`;
  try {
    const response = await request.get(uri);
    if (!Array.isArray(response.data)) {
      return [];
    }
    return response.data.map((item: Record<string, any>) => normalizeScenario(item));
  } catch (error) {
    return [];
  }
}

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post(`${host}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

export async function createScenario(payload: SaveScenarioPayload) {
  return request.post(`${host}/scenes`, payload);
}

export async function updateScenario(sceneId: string, payload: SaveScenarioPayload) {
  return request.put(`${host}/scenes/${sceneId}`, payload);
}

export async function deleteScenario(sceneId: string) {
  return request.delete(`${host}/scenes/${sceneId}`);
}

export async function publishScenario(payload: PublishScenarioPayload) {
  return request.post(`${host}/scenes/publish`, payload);
}

export async function getDomainOptions() {
  try {
    const response = await request.get(`${host}/domains`);
    if (!Array.isArray(response.data)) {
      return [];
    }
    return response.data.map((item: Record<string, any>) => normalizeDomain(item));
  } catch (error) {
    return [];
  }
}

export async function getAreaList(sceneId: string) {
  try {
    const response = await request.get(`${host}/areas`, { params: { sceneId } });
    if (!Array.isArray(response.data)) {
      return [];
    }
    return response.data.map((item: Record<string, any>) => normalizeArea(item));
  } catch (error) {
    return [];
  }
}

export async function createArea(payload: SaveAreaPayload) {
  return request.post(`${host}/areas`, payload);
}

export async function updateArea(id: string, payload: SaveAreaPayload) {
  return request.put(`${host}/areas/${id}`, payload);
}

export async function deleteArea(id: string) {
  return request.delete(`${host}/areas/${id}`);
}
