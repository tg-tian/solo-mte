package com.ubml.devicewebapi;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspur.edp.lcm.metadata.api.service.MetadataService;
import com.ubml.devicemanager.ContentSerializer;
import com.ubml.devicemanager.DeviceMetadataContentManager;
import com.ubml.devicemodel.DeviceModelEntity;
import io.iec.edp.caf.commons.utils.SpringBeanUtils;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;

public class DeviceController {
    private com.inspur.edp.lcm.metadata.api.service.MetadataService metadataService;

    /**
     * 元数据服务
     *
     * @return 获取元数据服务类实例
     */
    private MetadataService getMetadataService() {
        if (metadataService == null)
            metadataService = SpringBeanUtils.getBean(MetadataService.class);
        return metadataService;
    }

    /**
     * 新建元数据
     *
     * @param metadataInfo 元数据基本信息
     * @return String
     */
    @Path("initial")
    @PUT
    @Produces(MediaType.APPLICATION_JSON)
    public String initial(String metadataInfo) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            JsonNode node = mapper.readTree(metadataInfo);
            String type = node.get("type").textValue();
            String metadataId = node.get("metadataId").textValue();
            String metadataName = node.get("metadataName").textValue();
            String metadataCode = node.get("metadataCode").textValue();
            String metadataAssembly = node.get("metadataAssembly").textValue();

            DeviceModelEntity deviceModelEntity = initDeviceModelEntity(metadataId, metadataName, metadataCode, metadataAssembly, type);
            ContentSerializer serializer = new ContentSerializer();
            return serializer.Serialize(deviceModelEntity).toString();
        } catch (JsonProcessingException e) {
            throw new RuntimeException("json结构异常，导致反序列化出错，错误信息请见内部异常", e);
        }
    }

    /**
     * 初始化单值DeviceModelEntity的类型定义
     *
     * @param metadataID       元数据ID
     * @param metadataName     元数据名称
     * @param metadataCode     元数据编号
     * @param metadataAssembly 元数据集合
     * @param type             DeviceModelEntity
     * @return DeviceModelEntity
     */
    private DeviceModelEntity initDeviceModelEntity(String metadataID, String metadataName, String metadataCode, String metadataAssembly, String type) {
        DeviceModelEntity deviceModelEntity = new DeviceModelEntity();
        deviceModelEntity.setCode(metadataCode);
        deviceModelEntity.setName(metadataName);
        return deviceModelEntity;
    }

    /**
     * 获取设备模型实例
     *
     * @return String
     */
    @Path("entity/device/{deviceId}")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public JsonNode getExtendConfigByConfigId(@PathParam("deviceId") String deviceId) {
        DeviceMetadataContentManager deviceManager = new DeviceMetadataContentManager();
        return deviceManager.getDeviceModelEntity();
    }

}
