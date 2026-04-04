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
  id: number;
  template_id?: number;
  name: string;
  category?: string;
  description?: string;
  domain?: string;
  tags?: string;
  image_url?: string;
  describing_the_model?: string;
  url?: string;
}

export interface DeviceTypeRecord {
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
