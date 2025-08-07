
--  Delete ALL template entries (keeps table structure intact)
DELETE FROM templates;

--  Insert specific templates
INSERT INTO templates (title, description, category, storage_path, is_active, created_at)
VALUES 
  ('Basic Resume', 'A clean and simple resume layout.', 'resume', 'template/resume/basic-resume.typ', true, NOW()),
  ('Modern CV', 'A modern, bold design for professionals.', 'resume', 'template/resume/modern-cv.typ', true, NOW());

--  SELECT all active templates
SELECT * FROM templates WHERE is_active = true;

--  SELECT a specific template by title
SELECT * FROM templates WHERE title = 'Basic Resume';

--  DELETE a specific template by title
DELETE FROM templates WHERE title = 'Basic Resume';

--  DELETE a specific template by id
 DELETE FROM templates WHERE id = 'your-template-id';
