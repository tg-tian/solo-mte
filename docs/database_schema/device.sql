/*
 Navicat Premium Data Transfer

 Source Server         : 低代码
 Source Server Type    : MySQL
 Source Server Version : 80041 (8.0.41)
 Source Host           : 139.196.147.52:3306
 Source Schema         : lowcodedemo

 Target Server Type    : MySQL
 Target Server Version : 80041 (8.0.41)
 File Encoding         : 65001

 Date: 16/04/2025 19:39:30
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for device
-- ----------------------------
DROP TABLE IF EXISTS `device`;
CREATE TABLE `device`  (
  `id` int NOT NULL,
  `device_code` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `device_name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `device_type_id` int NOT NULL,
  `scene_id` int NOT NULL,
  `status` tinyint NOT NULL DEFAULT 2 COMMENT '设备状态(0-离线,1-在线,2-未激活)',
  `protocol_type` enum('HTTP','MQTT') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `protocol_config` json NULL COMMENT '协议特定配置(JSON格式)',
  `create_time` datetime NULL DEFAULT NULL,
  `last_online_time` datetime NULL DEFAULT NULL,
  `update_time` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `uk_device_code`(`device_code` ASC) USING BTREE,
  INDEX `fk_device_type`(`device_type_id` ASC) USING BTREE,
  INDEX `fk_scene`(`scene_id` ASC) USING BTREE,
  CONSTRAINT `fk_device_type` FOREIGN KEY (`device_type_id`) REFERENCES `devicetype` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_scene` FOREIGN KEY (`scene_id`) REFERENCES `scene` (`scene_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 33 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
