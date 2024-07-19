package com.ubml.devicemodel;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;

public class DeviceModelEntityPropertySerializer extends JsonSerializer<DeviceModelEntityProperty> {
    @Override
    public void serialize(DeviceModelEntityProperty deviceModelEntityProperty, JsonGenerator jsonGenerator, SerializerProvider serializerProvider) throws IOException {

    }
}
