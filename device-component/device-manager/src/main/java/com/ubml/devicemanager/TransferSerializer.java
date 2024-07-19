/*
 * Copyright (c) 2020 - present, Inspur Genersoft Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.ubml.devicemanager;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.inspur.edp.lcm.metadata.api.IMetadataContent;
import com.inspur.edp.lcm.metadata.spi.MetadataTransferSerializer;
import com.ubml.devicemodel.DeviceModelEntity;

/**
 * Json序列化 与前台交互
 */
public class TransferSerializer implements MetadataTransferSerializer {

    /**
     * json序列化
     *
     * @param metadataContent 元数据
     * @return 序列化后元数据
     */
    public final String serialize(IMetadataContent metadataContent) {
        DeviceModelEntity deviceModelEntity = (DeviceModelEntity) ((metadataContent instanceof DeviceModelEntity) ? metadataContent : null);
        String serializeResult = null;
        try {
            serializeResult = getMapper().writeValueAsString(deviceModelEntity);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("序列化元数据失败！", e);
        }
        return serializeResult;
    }

    private ObjectMapper getMapper() {
        ObjectMapper mapper = new ObjectMapper();
        SimpleModule module = new SimpleModule();
//        module.addSerializer(DeviceModelEntity.class, new BizEntitySerializer());
//        module.addDeserializer(DeviceModelEntity.class, new BizEntityDeserializer());
        mapper.registerModule(module);
        return mapper;
    }

    /**
     * json反序列化
     *
     * @param contentString 需要反序列化元数据
     * @return 元数据
     */
    public final IMetadataContent deserialize(String contentString) {
        IMetadataContent content;
        try {
            content = (DeviceModelEntity) getMapper().readValue(contentString, DeviceModelEntity.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("元数据反序列化失败！");
        }
        return content;
    }
}