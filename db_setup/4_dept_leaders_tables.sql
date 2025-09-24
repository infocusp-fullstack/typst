CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  leader_email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can select from departments"
ON departments
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE TABLE employee_department (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_name TEXT NOT NULL,
  emp_email TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE employee_department ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can select from employee_department"
ON employee_department
FOR SELECT
USING (auth.uid() IS NOT NULL);


-- Helper function to check if user is leader of project owner's dept
CREATE OR REPLACE FUNCTION is_dept_leader_of_project(project_uuid UUID, email_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM projects p
    JOIN auth.users u ON u.id = p.user_id
    JOIN employee_department ed ON ed.emp_email = u.email
    JOIN departments d ON d.id = ed.department_id
    WHERE p.id = project_uuid
      AND d.leader_email = email_input
  );
END;
$$ LANGUAGE plpgsql STABLE;


-- ==============================
-- Projects Policies
-- ==============================

DROP POLICY IF EXISTS "SELECT Policy" ON projects;

CREATE POLICY "Projects: SELECT"
ON projects
FOR SELECT
USING (
  user_id = auth.uid()

  OR EXISTS (
    SELECT 1 FROM project_shares ps
    WHERE ps.project_id = projects.id
      AND ps.shared_with = auth.uid()
  )

  OR EXISTS (
    SELECT 1 FROM cxo_users cu
    WHERE cu.email = auth.email()
  )

  OR is_dept_leader_of_project(projects.id, auth.email())
);


DROP POLICY IF EXISTS "UPDATE Policy" ON projects;

CREATE POLICY "Projects: UPDATE"
ON projects
FOR UPDATE
USING (
  user_id = auth.uid()

  OR EXISTS (
    SELECT 1 FROM project_shares ps
    WHERE ps.project_id = projects.id
      AND ps.shared_with = auth.uid()
      AND ps.permission = 'edit'
  )

  OR EXISTS (
    SELECT 1 FROM cxo_users cu
    WHERE cu.email = auth.email()
  )

  OR is_dept_leader_of_project(projects.id, auth.email())
)
WITH CHECK (
  user_id = auth.uid()

  OR EXISTS (
    SELECT 1 FROM project_shares ps
    WHERE ps.project_id = projects.id
      AND ps.shared_with = auth.uid()
      AND ps.permission = 'edit'
  )

  OR EXISTS (
    SELECT 1 FROM cxo_users cu
    WHERE cu.email = auth.email()
  )

  OR is_dept_leader_of_project(projects.id, auth.email())
);


DROP POLICY IF EXISTS "DELETE Policy" ON projects;

CREATE POLICY "Projects: DELETE"
ON projects
FOR DELETE
USING (
  user_id = auth.uid()

  OR EXISTS (
    SELECT 1 FROM project_shares ps
    WHERE ps.project_id = projects.id
      AND ps.shared_with = auth.uid()
      AND ps.permission = 'edit'
  )

  OR EXISTS (
    SELECT 1 FROM cxo_users cu
    WHERE cu.email = auth.email()
  )

  OR is_dept_leader_of_project(projects.id, auth.email())
);

-- ==============================
-- Storage Bucket Policies for user-projects bucket
-- ==============================

DROP POLICY IF EXISTS "Storage: SELECT Policy" ON storage.objects;

CREATE POLICY "Storage: SELECT (user-projects)"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'user-projects'
  AND (
    (storage.foldername(name))[1] = 'templates'
    
    OR auth.uid()::text = (storage.foldername(name))[1]

    OR EXISTS (
      SELECT 1 FROM project_shares ps
      WHERE ps.project_id::text = (storage.foldername(name))[2]
        AND ps.shared_with = auth.uid()
    )

    OR EXISTS (
      SELECT 1 FROM cxo_users cu
      WHERE cu.email = auth.email()
    )

    OR is_dept_leader_of_project((storage.foldername(name))[2]::UUID, auth.email())
  )
);

DROP POLICY IF EXISTS "Storage: INSERT Policy" ON storage.objects;

CREATE POLICY "Storage: INSERT (user-projects)"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-projects'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]

    OR EXISTS (
      SELECT 1 FROM project_shares ps
      WHERE ps.project_id::text = (storage.foldername(name))[2]
        AND ps.shared_with = auth.uid()
        AND ps.permission = 'edit'
    )

    OR EXISTS (
      SELECT 1 FROM cxo_users cu
      WHERE cu.email = auth.email()
    )

    OR is_dept_leader_of_project((storage.foldername(name))[2]::UUID, auth.email())
  )
);

DROP POLICY IF EXISTS "Storage: UPDATE Policy" ON storage.objects;

CREATE POLICY "Storage: UPDATE (user-projects)"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user-projects'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]

    OR EXISTS (
      SELECT 1 FROM project_shares ps
      WHERE ps.project_id::text = (storage.foldername(name))[2]
        AND ps.shared_with = auth.uid()
        AND ps.permission = 'edit'
    )

    OR EXISTS (
      SELECT 1 FROM cxo_users cu
      WHERE cu.email = auth.email()
    )

    OR is_dept_leader_of_project((storage.foldername(name))[2]::UUID, auth.email())
  )
)
WITH CHECK (
  bucket_id = 'user-projects'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]

    OR EXISTS (
      SELECT 1 FROM project_shares ps
      WHERE ps.project_id::text = (storage.foldername(name))[2]
        AND ps.shared_with = auth.uid()
        AND ps.permission = 'edit'
    )

    OR EXISTS (
      SELECT 1 FROM cxo_users cu
      WHERE cu.email = auth.email()
    )

    OR is_dept_leader_of_project((storage.foldername(name))[2]::UUID, auth.email())
  )
);

-- DROP POLICY IF EXISTS "Storage: DELETE Policy" ON projects;

-- CREATE POLICY "Storage: DELETE (user-projects)"
-- ON storage.objects
-- FOR DELETE
-- USING (
--   bucket_id = 'user-projects'
--   AND (
--     auth.uid()::text = storage.foldername(name)[1]

--     OR EXISTS (
--       SELECT 1 FROM cxo_users cu
--       WHERE cu.email = auth.email()
--     )

--     OR is_dept_leader_of_project(storage.foldername(name)[2]::UUID, auth.email())
--   )
-- );

----------THUMBNAILS BUCKET--------------------
-- Public thumbnails bucket: allow anonymous read

DROP POLICY IF EXISTS "Thumbnails: SELECT Policy" ON storage.objects;

CREATE POLICY "Thumbnails: SELECT Policy"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'thumbnails'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR EXISTS (
            SELECT 1
            FROM project_shares ps
            WHERE ps.project_id::text = (storage.foldername(name))[2]
                AND ps.shared_with = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM cxo_users cu
            WHERE cu.email = auth.email()
        )
        OR is_dept_leader_of_project((storage.foldername(name))[2]::UUID, auth.email())
    )
);

-- Allow authenticated users to manage thumbnails (optional)
DROP POLICY IF EXISTS "Thumbnails: INSERT Policy" ON storage.objects;

CREATE POLICY "Thumbnails: INSERT Policy"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'thumbnails'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR EXISTS (
            SELECT 1
            FROM project_shares ps
            WHERE ps.project_id::text = (storage.foldername(name))[2]
                AND ps.shared_with = auth.uid()
                AND ps.permission = 'edit'
        )
        OR EXISTS (
            SELECT 1
            FROM cxo_users cu
            WHERE cu.email = auth.email()
        )
        OR is_dept_leader_of_project((storage.foldername(name))[2]::UUID, auth.email())
    )
);

DROP POLICY IF EXISTS "Thumbnails: UPDATE Policy" ON storage.objects;

CREATE POLICY "Thumbnails: UPDATE Policy"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'thumbnails'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR EXISTS (
            SELECT 1
            FROM project_shares ps
            WHERE ps.project_id::text = (storage.foldername(name))[2]
              AND ps.shared_with = auth.uid()
              AND ps.permission = 'edit'
        )
        OR EXISTS (
            SELECT 1
            FROM cxo_users cu
            WHERE cu.email = auth.email()
        )
        OR is_dept_leader_of_project((storage.foldername(name))[2]::UUID, auth.email())
    )
)
WITH CHECK (
    bucket_id = 'thumbnails'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR EXISTS (
            SELECT 1
            FROM project_shares ps
            WHERE ps.project_id::text = (storage.foldername(name))[2]
              AND ps.shared_with = auth.uid()
              AND ps.permission = 'edit'
        )
        OR EXISTS (
            SELECT 1
            FROM cxo_users cu
            WHERE cu.email = auth.email()
        )
        OR is_dept_leader_of_project((storage.foldername(name))[2]::UUID, auth.email())
    )
);