import axios from 'axios';

export class MetadataService {

    private metadataBasePath = '/api/dev/main/v1.0/metadatas';

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
}
