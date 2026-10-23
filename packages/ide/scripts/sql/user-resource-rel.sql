CREATE TABLE IF NOT EXISTS user_resource_rel (
    user_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    resource_type VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    resource_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, resource_type, resource_id),
    KEY idx_user_resource_resource (resource_type, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
