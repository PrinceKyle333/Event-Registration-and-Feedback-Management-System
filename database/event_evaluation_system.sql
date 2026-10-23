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
    last_login TIMESTAMP NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE SET NULL,
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

-- ==============================================================================
-- SEED DATA: Survey Sections
-- ==============================================================================
INSERT IGNORE INTO survey_sections
    (section_id, section_name, section_description, display_order)
VALUES
(1, 'Accommodation and Venue',
 'Evaluation of the venue facilities and accessibility', 1),
(2, 'Spokesperson / Speaker Evaluation',
 'Assessment of speaker performance and content delivery', 2),
(3, 'Food and Refreshments',
 'Feedback on catering and refreshments provided', 3),
(4, 'Event Coordination and Overall Experience',
 'General satisfaction with event organization and experience', 4);

-- ==============================================================================
-- SEED DATA: Survey Questions (Idempotent Insert)
-- ==============================================================================
INSERT INTO survey_questions
    (section_id, question_text, is_required)
SELECT s.section_id, q.question_text, TRUE
FROM (
    SELECT 1 AS section_id,
    'Was the venue easily accessible and clearly signposted?' AS question_text
    UNION ALL SELECT 1, 'Was the accommodation (if provided) comfortable and clean?'
    UNION ALL SELECT 1, 'Were restroom facilities clean and well-maintained?'
    UNION ALL SELECT 1, 'Was the venue appropriate for the number of participants?'
    UNION ALL SELECT 1, 'Did you feel safe and secure throughout the event?'
    UNION ALL SELECT 2, 'How would you rate the speaker/s knowledge and expertise?'
    UNION ALL SELECT 2, 'Was the speaker engaging and effective in delivering their message?'
    UNION ALL SELECT 2, 'Did the speaker encourage questions and interaction?'
    UNION ALL SELECT 2, 'Were the topics covered relevant and well-organized?'
    UNION ALL SELECT 2, 'Did the speaker stay on topic and manage time well?'
    UNION ALL SELECT 3, 'Were food and refreshments served on time?'
    UNION ALL SELECT 3, 'Was there a variety of food options available (e.g., vegetarian, halal)?'
    UNION ALL SELECT 3, 'How would you rate the quality and taste of the food?'
    UNION ALL SELECT 3, 'Were dietary needs or restrictions considered?'
    UNION ALL SELECT 3, 'Was the serving area clean and organized?'
    UNION ALL SELECT 4, 'Was the event schedule followed properly?'
    UNION ALL SELECT 4, 'Were event staff and volunteers helpful and courteous?'
    UNION ALL SELECT 4, 'How would you rate the overall flow and organization of the event?'
    UNION ALL SELECT 4, 'Did the event meet your expectations?'
    UNION ALL SELECT 4, 'Would you recommend this event to others or attend again?'
) AS q
JOIN survey_sections s ON s.section_id = q.section_id
WHERE NOT EXISTS (
    SELECT 1
    FROM survey_questions existing
    WHERE existing.section_id = s.section_id
      AND existing.question_text = q.question_text
);

-- ==============================================================================
-- SEED DATA: Initial Users (Passwords hashed using bcrypt with salt 10)
-- Password for admin: admin123
-- Password for organizer: organizer123
-- Password for students: student123
-- ==============================================================================
INSERT IGNORE INTO users (user_id, username, password, full_name, email, role, student_id, college_department) VALUES
(1, 'admin', '$2b$10$TKh8H1.PfQx37YgCzwiKb.KjQ50dpdp2eFvK18m17W4nSj6v9qV9W', 'Engr. Juan Dela Cruz', 'admin@cmu.edu.ph', 'admin', NULL, 'College of Information Sciences and Computing'),
(2, 'organizer1', '$2b$10$o8QkLpZ3M2y6rYjT0V6VNu9s9N3kK2Vn4Rk0D5k9X4m1H7s5V3t0O', 'Prof. Maria Santos', 'maria.santos@cmu.edu.ph', 'organizer', NULL, 'Department of Information Technology'),
(3, 'student1', '$2b$10$J7N0q4L3k9x9T1Y4V6b7Oe4W8kK2Vn4Rk0D5k9X4m1H7s5V3t0O', 'Prince Kyle Christian Reston', 's.reston.princekylechristian@cmu.edu.ph', 'student', '2023-BSIT-0428', 'BSIT 4B'),
(4, 'student2', '$2b$10$J7N0q4L3k9x9T1Y4V6b7Oe4W8kK2Vn4Rk0D5k9X4m1H7s5V3t0O', 'Alyssa Jean Ramos', 'alyssa.ramos@cmu.edu.ph', 'student', '2023-BSIT-0435', 'BSIT 4B'),
(5, 'student3', '$2b$10$J7N0q4L3k9x9T1Y4V6b7Oe4W8kK2Vn4Rk0D5k9X4m1H7s5V3t0O', 'Joshua Dave Flores', 'joshua.flores@cmu.edu.ph', 'student', '2023-BSIT-0442', 'BSIT 4B');

INSERT IGNORE INTO admins (admin_id, username, password, full_name, email) VALUES
(1, 'admin', '$2b$10$TKh8H1.PfQx37YgCzwiKb.KjQ50dpdp2eFvK18m17W4nSj6v9qV9W', 'Engr. Juan Dela Cruz', 'admin@cmu.edu.ph');
