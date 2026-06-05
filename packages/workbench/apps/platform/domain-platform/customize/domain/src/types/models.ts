export interface DomainRecord {
  domainId: string;
  domainName: string;
  domainCode: string;
  domainDescription: string;
  status: string;
  url?: string;
  codeEditor?: string;
  modelEditor?: string;
  framework?: string;
  dsl?: string;
  domainTemplateId?: number | null;
}

export interface DomainFormData {
  code: string;
  name: string;
  description: string;
  status: string;
  codeEditor: string;
  modelEditor: string;
  baseFramework: string;
  dslStandard: string;
  url: string;
  domainTemplateId: number | null;
}

export interface TemplateRecord {
  template_id?: number;
  name: string;
  template_index?: string;
  template_description?: string;
  example_image_url?: string;
  code_url?: string;
  repository_url?: string;
  file_source?: string;
  submitter?: string;
  license?: string;
  tags?: Record<string, string[]> | string;
  created_at?: string;
  updated_at?: string;
}

export interface DeviceModelRecord {
  id: number;
  modelId?: string;
  modelName?: string;
  name?: string;
  category?: string;
  description?: string;
  updateTime?: string;
  createTime?: string;
}

export interface ComponentRecord {
  id: number;
  code?: string;
  name?: string;
  componentName?: string;
  description?: string;
  updateTime?: string;
  createTime?: string;
}