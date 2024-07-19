package com.ubml.devicemodel;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.inspur.edp.lcm.metadata.api.AbstractMetadataContent;
import com.inspur.edp.lcm.metadata.api.IMetadataContent;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
public class DeviceModelEntity extends AbstractMetadataContent implements IMetadataContent {

    public List<DeviceModelEntityProperty> properties;

    public List<String> commands;

    public List<String> events;

    private String code;

    private String name;

}
