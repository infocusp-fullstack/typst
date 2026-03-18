------------ Projects -----------------
CREATE POLICY "INSERT Policy" ON projects
FOR INSERT TO authenticated
WITH CHECK (
    -- Only allow insert if user is the direct owner
    auth.uid() = user_id
);

CREATE POLICY "SELECT Policy"
ON projects
FOR SELECT
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM project_shares ps
        WHERE ps.project_id = projects.id
          AND ps.shared_with = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM cxo_users cu
        WHERE cu.email = auth.email()
    )
);

CREATE POLICY "UPDATE Policy"
ON projects
FOR UPDATE
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM project_shares ps
        WHERE ps.project_id = projects.id
          AND ps.shared_with = auth.uid()
          AND ps.permission = 'edit'
    )
    OR EXISTS (
        SELECT 1
        FROM cxo_users cu
        WHERE cu.email = auth.email()
    )
)
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM project_shares ps
        WHERE ps.project_id = projects.id
          AND ps.shared_with = auth.uid()
          AND ps.permission = 'edit'
    )
    OR EXISTS (
        SELECT 1
        FROM cxo_users cu
        WHERE cu.email = auth.email()
    )
);


CREATE POLICY "DELETE Policy"
ON projects
FOR DELETE
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM project_shares ps
        WHERE ps.project_id = projects.id
          AND ps.shared_with = auth.uid()
          AND ps.permission = 'edit'
    )
    OR EXISTS (
        SELECT 1
        FROM cxo_users cu
        WHERE cu.email = auth.email()
    )
);

------------ CXO_USERS -----------------
CREATE POLICY "All authenticated users can select from cxo_users"
ON cxo_users
FOR SELECT
USING (auth.email() = email);

------------ Project Shares -----------------
CREATE POLICY "INSERT Policy" ON project_shares
FOR INSERT TO authenticated
WITH CHECK (
    -- Only allow insert if user is the direct owner
    shared_by = auth.uid()
);

CREATE POLICY "SELECT Policy"
ON project_shares
FOR SELECT
USING (
    shared_by = auth.uid()
    OR shared_with = auth.uid()
);

CREATE POLICY "UPDATE Policy"
ON project_shares
FOR UPDATE
USING (
    shared_by = auth.uid()
)
WITH CHECK (
    shared_by = auth.uid()
);


CREATE POLICY "DELETE Policy"
ON project_shares
FOR DELETE
USING (
    shared_by = auth.uid()
);

------------ Templates -----------------
CREATE POLICY "All authenticated users can select active templates"
ON templates
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active);

