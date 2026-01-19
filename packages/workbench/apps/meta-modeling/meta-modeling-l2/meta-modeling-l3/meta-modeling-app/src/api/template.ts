import templateRequest from '@/utils/templateRequest'
import request from '@/utils/request'


export function getTemplates(data: any, page: number) {
    return templateRequest({
        url: `/templates.json`,
        method: 'get',
        params: {
            page,
            ...data
        }
    })
}

export function getDomainTemplates(domainId: number) {
    return request({
        url: `/templates/domain?domainId=${domainId}`,
        method: 'get'
    })
}

export function bindingTemplates(data: any) {
    return request({
        url: '/templates/binding',
        method: 'post',
        data: data
    })
}

export function unbindingTemplates(domainId: number, id: number) {
    return request({
        url: '/templates/unbinding',
        method: 'post',
        data: {
            domainId: domainId,
            templateId: id
        }
    })
}

// 获取所有领域模板
export function getDomainTemplate(page: number) {
    return templateRequest({
        url: `/templates.json`,
        method: 'get',
        params: {
            page,
            query: {
                name_or_category_or_description_or_domain_or_tags_or_code_key_word_string_cont: '',
                name_cont: '',
                category_cont: '领域模板',
                description_cont: '',
                domain_cont: '',
                tags_cont: '领域',
                code_key_word_string_cont: ''
            }
        }
    })
}

export function saveSceneTemplate(data: any) {
    return request({
        url: `/scenes/templates`,
        method: 'post',
        data: data
        }
    )
}


// 模板保存到模板库
export function saveTemplate(data: any) {
    return templateRequest({
        url: `/templates.json`,
        method: 'post',
        data: {
            ...data,
            token: "09eae09167d60929a030fe5b274f8dd0"
        }
    })
}

// 将领域模板在模板库中id保存到数据库
export function saveDomainTemplateId(domainId: number, templateId: number) {
    return request({
        url: `/domains/templateId`,
        method: 'post',
        data: {
            domainId: domainId,
            templateId: templateId
        }
    })
}

// 更新模板
export function updateTemplate(data: any, id: number) {
    return templateRequest({
        url: `/templates/${id}.json`,
        method: 'put',
        data: {
            ...data,
            token: "09eae09167d60929a030fe5b274f8dd0"
        }
    })
}
