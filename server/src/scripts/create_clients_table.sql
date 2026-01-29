-- Tabela para gerenciar múltiplos clients do WhatsApp Web JS
CREATE TABLE IF NOT EXISTS Clients (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    status ENUM('connected', 'disconnected', 'connecting', 'qr_ready') DEFAULT 'disconnected',
    qr_code TEXT NULL,
    session_data TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_connected_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir client padrão (migração do sistema antigo)
INSERT INTO Clients (id, name, status) 
VALUES ('default', 'Client Principal', 'disconnected')
ON DUPLICATE KEY UPDATE name = 'Client Principal';

