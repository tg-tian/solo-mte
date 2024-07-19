package com.ubml.devicemanager;

import com.fasterxml.jackson.databind.JsonNode;
import com.inspur.edp.lcm.metadata.api.entity.GspMetadata;
import com.inspur.edp.lcm.metadata.spi.MetadataContentManager;
import com.ubml.devicemodel.DeviceModelEntity;

public class DeviceMetadataContentManager implements MetadataContentManager {

    @Override
    public void build(GspMetadata metadata) {
        String metadataID = metadata.getHeader().getId();
        String metadataName = metadata.getHeader().getName();
        String metadataCode = metadata.getHeader().getCode();
        String metadataAssembly = metadata.getHeader().getNameSpace();
        DeviceModelEntity deviceModelEntity = initialize(metadataID, metadataName, metadataCode,
                metadataAssembly);

        metadata.setContent(deviceModelEntity);
    }

    /**
     * 初始化单值UDT
     * @param metadataId 元数据唯一标识
     * @param metadataName 元数据名称
     * @param metadataCode 元数据编号
     * @param metadataAssembly 元数据ch
     * @return DeviceModelEntity
     */
    private DeviceModelEntity initialize(String metadataId, String metadataName, String metadataCode, String metadataAssembly) {
        DeviceModelEntity deviceModelEntity = new DeviceModelEntity();
        deviceModelEntity.setCode(metadataCode);
        deviceModelEntity.setName(metadataName);
        return deviceModelEntity;
    }

    public JsonNode getDeviceModelEntity(){
        ContentSerializer serializer = new ContentSerializer();
        DeviceModelEntity deviceModelEntity = new DeviceModelEntity();
        deviceModelEntity.setCode("smoke-detector");
        deviceModelEntity.setName("烟感器");
        return serializer.Serialize(deviceModelEntity);
    }
}
