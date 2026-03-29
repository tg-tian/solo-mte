import request from '../utils/request';
import type { ScenarioRecord } from '../types/models';

const scenarioSourceUri = 'http://139.196.147.52:8080/scenes?domainId=26';
const statusMap: Record<string, string> = { testing: '0', published: '1', editing: '2' };

function normalizeScenario(scenario: Record<string, any>): ScenarioRecord {
  const status = scenario.status in statusMap ? statusMap[scenario.status] : `${scenario.status ?? '2'}`;
  return {
    sceneId: `${scenario.sceneId ?? scenario.id ?? ''}`,
    sceneName: scenario.sceneName ?? scenario.title ?? '',
    sceneCode: scenario.sceneCode ?? scenario.code ?? '',
    sceneDescription: scenario.sceneDescription ?? scenario.description ?? '',
    status,
    url: scenario.url
  };
}

export async function getScenarioList() {
  try {
    const response = await request.get(scenarioSourceUri);
    if (!Array.isArray(response.data)) {
      return [];
    }
    return response.data.map((item: Record<string, any>) => normalizeScenario(item));
  } catch (error) {
    return [];
  }
}
