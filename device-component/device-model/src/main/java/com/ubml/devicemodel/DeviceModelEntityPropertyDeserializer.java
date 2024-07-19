package com.ubml.devicemodel;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;

public class DeviceModelEntityPropertyDeserializer extends JsonDeserializer<DeviceModelEntityProperty> {
    @Override
    public DeviceModelEntityProperty deserialize(JsonParser jsonParser, DeserializationContext deserializationContext) throws IOException, JsonProcessingException {
        return null;
    }
}
