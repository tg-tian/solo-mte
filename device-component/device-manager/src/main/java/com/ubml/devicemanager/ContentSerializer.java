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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.inspur.edp.lcm.metadata.api.IMetadataContent;
import com.inspur.edp.lcm.metadata.spi.MetadataContentSerializer;
import com.ubml.devicemodel.DeviceModelEntity;


import io.iec.edp.caf.common.JSONSerializer;

import java.io.IOException;

public class ContentSerializer implements MetadataContentSerializer {

    String serializeResult = "{\n" +
            "    \"Type\": \"DeviceModelEntity\",\n" +
            "    \"Content\": {}}";
    String deviceModelEntityType = "DeviceModelEntity";
    String para_Type = "Type";
    String para_Content = "Content";

    @Override
    public JsonNode Serialize(IMetadataContent iMetadataContent) {
//        ObjectMapper mapper = JSONSerializer.
        try {
//            JsonNode result = mapper.readTree(serializeResult);
//            if (iMetadataContent.getClass().isAssignableFrom(DeviceModelEntity.class)) {
//                String result = JSONSerializer.serialize(iMetadataContent);
//                DeviceModelEntity deviceModelEntity = (DeviceModelEntity) iMetadataContent;
//                String jsonResult = mapper.writeValueAsString(deviceModelEntity);
//                ((ObjectNode) result).put(para_Type, deviceModelEntityType);
//                JsonNode sUdtJson = mapper.readTree(jsonResult);
//                ((ObjectNode) result).set(this.para_Content, sUdtJson);
                String contentString = JSONSerializer.serialize(iMetadataContent);
                return JSONSerializer.deserialize(contentString,JsonNode.class);
//            }
        } catch (Exception e) {
            throw new RuntimeException("Device元数据'" + ((DeviceModelEntity) iMetadataContent).getName() + "'序列化报错。" + e.getMessage());
        }
//        return null;
    }

    @Override
    public IMetadataContent DeSerialize(JsonNode metaJsonNode) {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode jsonNode = null;
        try {
            jsonNode = mapper.readTree(handleJsonString(metaJsonNode.toString()));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        String componentType = jsonNode.get(para_Type).textValue();
        String dataType = handleJsonString(jsonNode.get(para_Content).toString());
        if (deviceModelEntityType.equals(componentType)) {
            try {
                return mapper.readValue(dataType, DeviceModelEntity.class);
            } catch (IOException e) {
                throw new RuntimeException("反序列化单值udt异常！" + e);
            }
        }
        return null;
    }

    private static String handleJsonString(String contentJson) {
        if (!contentJson.startsWith("\"")) {
            return contentJson;
        }
        contentJson = contentJson.replace("\\r\\n", "");
        contentJson = contentJson.replace("\\\"{", "{");
        contentJson = contentJson.replace("}\\\"", "}");
        while (contentJson.startsWith("\"")) {
            contentJson = contentJson.substring(1, contentJson.length() - 1);
        }

        contentJson = contentJson.replace("\\\"", "\"");
        contentJson = contentJson.replace("\\\\", "");
        return contentJson;
    }
}
