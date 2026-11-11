-- ==============================================================================
-- Central Mindanao University (CMU)
-- BSIT 4B - System Integration and Architecture (SIA) Project
-- Database: event_evaluation_system
-- MySQL Database Setup Script
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS event_evaluation_system;
USE event_evaluation_system;

-- ------------------------------------------------------------------------------
-- 1. Table: admins
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    admin_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. Table: users (Extended schema for students, organizers, and admins)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('admin', 'organizer', 'student') NOT NULL DEFAULT 'student',
    student_id VARCHAR(50) NULL,
    college_department VARCHAR(100) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    last_login TIMESTAMP NULL,
    notifications_seen_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. Table: events
-- Extended with venue, times, capacity, registration deadline, organizer_id, approval_status
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    department VARCHAR(100) NOT NULL,
    description TEXT,
    venue VARCHAR(255) NOT NULL DEFAULT 'CMU Convention Center',
    start_time TIME NOT NULL DEFAULT '08:00:00',
    end_time TIME NOT NULL DEFAULT '17:00:00',
    registration_deadline DATETIME NULL,
    capacity INT NOT NULL DEFAULT 150,
    organizer_id INT NULL,
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
    rejection_reason TEXT NULL,
    is_active TINYINT(1) DEFAULT 1,
    admin_id INT NULL,
    image_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_event_date (event_date),
    INDEX idx_approval (approval_status),
    INDEX idx_active (is_active)
);

-- ------------------------------------------------------------------------------
-- 4. Table: registrations
-- Prevents duplicate registrations with UNIQUE(event_id, user_id)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
    registration_id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attendance_status ENUM('registered', 'attended', 'absent') NOT NULL DEFAULT 'registered',
    attended_at TIMESTAMP NULL,
    UNIQUE KEY uq_event_student (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_attendance (attendance_status)
);

-- ------------------------------------------------------------------------------
-- 5. Table: survey_sections
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_sections (
    section_id INT PRIMARY KEY AUTO_INCREMENT,
    section_name VARCHAR(100) NOT NULL,
    section_description TEXT,
    display_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. Table: survey_questions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_questions (
    question_id INT PRIMARY KEY AUTO_INCREMENT,
    section_id INT NOT NULL,
    question_text TEXT NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES survey_sections(section_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------------------
-- 7. Table: evaluations
-- Anonymous in reports; participant_id & registration_id used solely to enforce 1 submission per attendee
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluations (
    evaluation_id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    participant_id INT NULL,
    registration_id INT NULL,
    submit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    UNIQUE KEY uq_event_participant (event_id, participant_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (registration_id) REFERENCES registrations(registration_id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------------------
-- 8. Table: evaluation_responses
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluation_responses (
    response_id INT PRIMARY KEY AUTO_INCREMENT,
    evaluation_id INT NOT NULL,
    question_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(evaluation_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES survey_questions(question_id) ON DELETE CASCADE,
    UNIQUE (evaluation_id, question_id)
);

-- ------------------------------------------------------------------------------
-- 9. Table: activity_logs (audit trail; user_id is NULL for anonymous evaluations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    actor_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    event_id INT NULL,
    target_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_created (created_at)
);

-- ==============================================================================
-- SEED DATA
-- Demo accounts, events, registrations, survey sections and the 20 survey
-- questions are inserted by the application on first start (or with
-- `npm run db:reset`) so that every password is a real bcrypt hash.
-- ==============================================================================
