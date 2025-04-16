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

 Date: 16/04/2025 19:40:12
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for domain_component
-- ----------------------------
DROP TABLE IF EXISTS `domain_component`;
CREATE TABLE `domain_component`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `component_id` int NULL DEFAULT NULL,
  `domain_id` int NULL DEFAULT NULL,
  `component_type` enum('component','template','devicetype') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `uk_domain_component`(`component_id` ASC, `domain_id` ASC, `component_type` ASC) USING BTREE,
  INDEX `fk_domain`(`domain_id` ASC) USING BTREE,
  CONSTRAINT `fk_domain` FOREIGN KEY (`domain_id`) REFERENCES `domain` (`domain_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
