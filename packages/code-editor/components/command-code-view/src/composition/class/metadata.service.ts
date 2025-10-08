import axios from 'axios';
import { MetadataDto } from '../../type/metadata-generator';
import { WebCommandMetadata } from './web-command';
import { WebComponentMetadata } from './web-component';

export class MetadataService {

    private metadataBasePath = '/api/dev/main/v1.0/metadatas';
    private metadataServicePath = '/api/dev/main/v1.0/mdservice';

    public saveMetadata(metadataDto: any) {
        const content = {
            'ID': metadataDto.id,
            'NameSpace': metadataDto.nameSpace,
            'Code': metadataDto.code,
            'Name': metadataDto.name,
            'FileName': metadataDto.fileName,
            'RelativePath': metadataDto.relativePath,
            'Content': metadataDto.content,
            'Type': metadataDto.type,
            'BizobjectID': metadataDto.bizobjectID,
            'ExtendProperty': metadataDto.extendProperty,
            'Extendable': metadataDto.extendable,
            'NameLanguage': !metadataDto.nameLanguage ? null : metadataDto.nameLanguage,
            'Properties': metadataDto.properties || null
        };
        return axios.put(this.metadataBasePath, content);
    }
    // Load元数据（外部调用）
    public loadMetadata(path: string, fullName: string) {
        const metadataFullPath = path.replace(/\\/g, '/') + '/' + fullName;
        const encMetadataFullPath = encodeURIComponent(metadataFullPath);
        const url = this.metadataBasePath + '/load?metadataFullPath=' + encMetadataFullPath;
        return axios.get(url).then((res: any) => {
            return res.data;
        });
    }
    public validateRepeatName(path: string, fileName: string) {
        const url = this.metadataBasePath + '/validation?path=' + path + '&fileName=' + fileName;
        return axios.get(url).then((res: any) => {
            return !res.data;
        });
    }
    private getUrlParam(key: string) {
        const URL = new URLSearchParams(location.search);
        return decodeURI(URL.get(key) || '');
    }
    public getMetadataPath() {

        let metadataPath = this.getUrlParam('id') || '';
        if (metadataPath && metadataPath.startsWith('/')) {
            metadataPath = metadataPath.slice(1, metadataPath.length);
        }
        if (metadataPath && metadataPath.endsWith('/')) {
            metadataPath = metadataPath.slice(0, metadataPath.length - 1);
        }
        return metadataPath;
    }

    /**
     * 根据元数据Id查询元数据
     * @param relativePath 相对路径
     * @param metadataId 元数据id
     * @returns
     */
    public queryMetadataById(relativePath: string, metadataId: string): Promise<any> {
        const url = this.metadataBasePath + '/relied?metadataPath=' + relativePath + '&metadataID=' + metadataId;
        return axios.get(url);
    }

    /**
     * 根据元数据类型查询元数据
     * @param relativePath
     * @param metadataType
     * @returns
     */
    public GetMetadataListByType(relativePath: string, metadataType: string): Promise<any> {
        const url = this.metadataBasePath + '?path=' + relativePath + '&metadataTypeList=' + metadataType;
        return axios.get(url);
    }

    /**
     * 获取当前工程下或者其他元数据包中依赖的元数据
     * @param {?} path
     * @param {?} metadataId
     * @param {?} sessionId
     * @return {?}
     */
    public GetRefMetadata(path, metadataId): Promise<any> {
        // gsp.cache.get('sessionId');
        const url = this.metadataBasePath + '/relied?metadataPath=' + path + '&metadataID=' + metadataId;
        return axios.get(url);
    }

    /**
     * 获取当前工程下所有的元数据包
     * @param {?} spacePath
     * @param {?} typeName
     * @return {?}
     */
    public GetMetadataList(spacePath, typeName) {
        // var headers = new HttpHeaders().set('SessionId', this.sessionId);
        const url = this.metadataServicePath + '?path=' + spacePath + '&metadataTypeList=' + typeName;
        return axios.get(url);
    };

    public getMetadataListInSu(relativePath: string, metaddataType: string) {
        const url = this.metadataServicePath + '/metadataListInSu?path=' + relativePath + '&metadataTypeList=' + metaddataType;
        return axios.get(url);
    }

    /**
     * 获取最近使用的元数据
     * @param relativePath
     * @param metaddataType
     * @returns
     */
    public getRecentMetadata(relativePath: string, metaddataType: string) {
        const url = this.metadataServicePath + '/getmdrecentuse?path=' + relativePath + '&metadataTypeList=' + metaddataType;
        return axios.get(url);
    }

    /**
     * 获取所有元数据
     * @param relativePath
     * @param metaddataType
     * @param pageSize
     * @returns
     */
    public getAllMetadataList(relativePath: string, metaddataType: string, pageSize = 1000) {
        const url = this.metadataServicePath + '/unionmdlist?pageIndex=1&pageSize=1000' +
            '&path=' + relativePath + '&metadataTypeList=' + metaddataType;

        return axios.get(url).then((res: any) => {
            const totalNum = res.data['page']['total'] || 0;
            if (totalNum > 1000) {
                return this.getAllMetadataList(relativePath, metaddataType, totalNum);
            }
            return res;
        });
    }

    public getPickMetadata(relativePath: string, data: any) {
        const url = this.metadataServicePath + '/pickMetadata?currentPath=' + relativePath;
        return axios.post(url, data).then((res: any) => {
            return res.data;
        });
    }
    // 初始化元数据实体
    public initializeMetadataEntity(metadataDto: MetadataDto) {
        let name_chs = metadataDto.name;
        let name_en = "";
        let name_cht = "";
        if (metadataDto.nameLanguage) {
            name_chs = metadataDto.nameLanguage['zh-CHS'] ? metadataDto.nameLanguage['zh-CHS'] : "";
            name_en = metadataDto.nameLanguage['en'] ? metadataDto.nameLanguage['en'] : "";
            name_cht = metadataDto.nameLanguage['zh-CHT'] ? metadataDto.nameLanguage['zh-CHT'] : "";
        }
        // tslint:disable-next-line:max-line-length
        const url = this.metadataBasePath + '/initialized?nameSpace=' + metadataDto.nameSpace + '&code=' + metadataDto.code + '&name=' + name_chs + '&name_cht=' + name_cht + '&name_en=' + name_en + '&type=' + metadataDto.type + '&bizObjectID=' + metadataDto.bizobjectID + '&metadataPath=' + metadataDto.relativePath + '&extendProperty=' + metadataDto.extendProperty;

        return axios.get(url).then((res: any) => {
            return res.data;
        });
    }
    // 新建元数据
    public createMetadata(metadataDto: MetadataDto) {
        const content = {
            'ID': metadataDto.id,
            'NameSpace': metadataDto.nameSpace,
            'Code': metadataDto.code,
            'Name': metadataDto.name,
            'FileName': metadataDto.fileName,
            'RelativePath': metadataDto.relativePath,
            'Content': metadataDto.content,
            'Type': metadataDto.type,
            'BizobjectID': metadataDto.bizobjectID,
            'ExtendProperty': metadataDto.extendProperty,
            'NameLanguage': !metadataDto.nameLanguage ? null : metadataDto.nameLanguage,
        };
        const url = this.metadataBasePath;

        return axios.post(url, content, {
            params: {}, // 可以指定请求的URL参数
            responseType: 'stream'
        }
        ).then((res: any) => {
            return { ok: res.status === 204 };
        });
    }

    /**
     * 保存Web构件元数据
     * @remarks 该方法具有副作用：将按照Web构件元数据更新形参中的传输对象
     * @param cmp - Web构件元数据
     * @param dto - 元数据传输对象
     * @returns 错误信息
     */
    public saveWebcmp(cmp: WebComponentMetadata, dto: MetadataDto): Promise<string> {
        const contentString = JSON.stringify(
            cmp.output()
        );
        dto.content = contentString;
        dto.code = cmp.Code;  // 在旧版实现中，Web构件的编号是允许修改的
        !!cmp.name && (dto.name = cmp.name);
        return new Promise((resolve, reject) => {
            this.saveMetadata(dto)
                .then(response => {
                    resolve(response.data ? 'Web构件元数据保存失败' : '');
                })
                .catch(error => {
                    reject(error); // 返回错误信息
                });
        });
    }

    /**
     * 保存命令构件元数据
     * @remarks 该方法具有副作用：将按照命令构件元数据更新形参中的传输对象
     * @param cmd - 命令构件元数据
     * @param dto - 元数据传输对象
     * @returns 错误信息
     */
    public saveWebcmd(cmd: WebCommandMetadata, dto: MetadataDto): Promise<string> {
        const contentString = JSON.stringify(
            cmd.output()
        );
        dto.content = contentString;
        dto.code = cmd.Code;  // 在旧版实现中，命令构件的编号是不可修改的
        !!cmd.Name && (dto.name = cmd.Name);

        return new Promise((resolve, reject) => {
            this.saveMetadata(dto)
                .then(response => {
                    // 有返回值，出现异常, 无返回值是正常
                    resolve(response.data ? '命令构件元数据保存失败' : '');
                })
                .catch(error => {
                    reject(error); // 返回错误信息
                });
        });
    }
}
