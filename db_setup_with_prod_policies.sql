-- PROJECTS Table
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "All authenticated users can select from projects"
  ON projects
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT
CREATE POLICY "All authenticated users can insert into projects"
  ON projects
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE
CREATE POLICY "All authenticated users can update projects"
  ON projects
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- DELETE
CREATE POLICY "All authenticated users can delete projects"
  ON projects
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- PROJECTS_SHARE TABLE
-- ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "All authenticated users can select from project_shares"
  ON project_shares
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT
CREATE POLICY "All authenticated users can insert into project_shares"
  ON project_shares
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE
CREATE POLICY "All authenticated users can update project_shares"
  ON project_shares
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- DELETE
CREATE POLICY "All authenticated users can delete project_shares"
  ON project_shares
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- CXO_USERS Table
-- ALTER TABLE cxo_users ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "All authenticated users can select from cxo_users"
  ON cxo_users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT
CREATE POLICY "All authenticated users can insert into cxo_users"
  ON cxo_users
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE
CREATE POLICY "All authenticated users can update cxo_users"
  ON cxo_users
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- DELETE
CREATE POLICY "All authenticated users can delete from cxo_users"
  ON cxo_users
  FOR DELETE
  USING (auth.uid() IS NOT NULL);


-- TEMPLATES Table
-- ALTER TABLE Templates ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "All authenticated users can select from Templates"
  ON Templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT
CREATE POLICY "All authenticated users can insert into Templates"
  ON Templates
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE
CREATE POLICY "All authenticated users can update Templates"
  ON Templates
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- DELETE
CREATE POLICY "All authenticated users can delete from Templates"
  ON Templates
  FOR DELETE
  USING (auth.uid() IS NOT NULL);


-- STORAGE_OBJECTS Table
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "All authenticated users can select from user-projects"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-projects'
    AND auth.uid() IS NOT NULL
  );

-- INSERT
CREATE POLICY "All authenticated users can insert into user-projects"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-projects'
    AND auth.uid() IS NOT NULL
  );

-- UPDATE
CREATE POLICY "All authenticated users can update user-projects"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user-projects'
    AND auth.uid() IS NOT NULL
  );

-- DELETE
CREATE POLICY "All authenticated users can delete from user-projects"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-projects'
    AND auth.uid() IS NOT NULL
  );
