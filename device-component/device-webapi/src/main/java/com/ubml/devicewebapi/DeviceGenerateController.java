package com.ubml.devicewebapi;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ubml.devicemanager.ContentSerializer;
import com.ubml.devicemodel.DeviceModelEntity;

import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

public class DeviceGenerateController {

    /**
     * 生成设备源代码
     *
     * @return String
     */
    @Path("initial")
    @PUT
    @Produces(MediaType.APPLICATION_JSON)
    public String generateCode() {
        return "generating device code";
    }

}
