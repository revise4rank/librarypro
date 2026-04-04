WITH student_targets AS (
  SELECT
    u.id,
    upper(substr(regexp_replace(COALESCE(u.full_name, 'STUDENT'), '[^A-Za-z]', '', 'g') || 'SSS', 1, 3)) AS prefix,
    row_number() OVER (ORDER BY u.created_at, u.id) AS seq
  FROM users u
  INNER JOIN user_library_roles ur ON ur.user_id = u.id AND ur.role = 'STUDENT'
  WHERE u.student_code IS NULL
)
UPDATE users u
SET student_code = student_targets.prefix || lpad(student_targets.seq::text, 4, '0')
FROM student_targets
WHERE u.id = student_targets.id;
