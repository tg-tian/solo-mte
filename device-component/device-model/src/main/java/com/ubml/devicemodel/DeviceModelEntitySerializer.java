package com.ubml.devicemodel;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;

public class DeviceModelEntitySerializer extends JsonSerializer<DeviceModelEntity> {
    @Override
    public void serialize(DeviceModelEntity deviceModelEntityProperty, JsonGenerator jsonGenerator, SerializerProvider serializerProvider) throws IOException {

    }
}
