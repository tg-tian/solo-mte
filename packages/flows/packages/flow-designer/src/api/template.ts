import { handleApiRequest, get } from './request';
import type { ApiResult } from './request';

const TEMPLATE_API_URL = 'https://lctemplates.gitlink.org.cn/templates';

export interface TemplateItem {
    id: number;
    name: string;
    template_index: string;
    template_description: string;
    code_file: string;
    file_name: string | null;
    example_image_url: string | null;
    code_url: string | null;
    repository_url: string | null;
    file_source: string | null;
    submitter: string;
    license: string;
    created_at: string;
    updated_at: string;
    tags: Record<string, string[]>;
}

export interface TemplateSearchResponse {
    data: TemplateItem[];
    page_info: {
        current_page: number;
        next_page: number | null;
        prev_page: number | null;
        total_pages: number;
        total_count: number;
    };
}

export class TemplateApi {
    /**
     * 搜索模板列表
     * @param keyword 搜索关键词
     * @returns 模板列表
     */
    public static async searchTemplates(keyword: string): Promise<ApiResult<TemplateItem[]>> {
        const result = await handleApiRequest<TemplateSearchResponse>(() =>
            get(TEMPLATE_API_URL, {
                page: 0,
                per: 999,
                schema: 'inBuilderFlow',
                template_type: 'eventflow',
                'q[tag_fuzzy]': keyword,
            }, {
                headers: {
                    Accept: 'application/json',
                },
            })
        );

        if (result.success && result.data) {
            const templates = result.data.data || [];
            templates.sort((a, b) => a.template_index.localeCompare(b.template_index));
            return {
                success: true,
                data: templates,
            };
        }

        return {
            success: false,
            error: result.error || '搜索模板失败',
        };
    }
}
