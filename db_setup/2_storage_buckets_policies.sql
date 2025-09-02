-- ---------- Storage Bucket Policies ----------

-- SELECT files
CREATE POLICY "Storage: SELECT Policy"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'user-projects'
    AND (
        (storage.foldername(name))[1] = 'templates'
        OR auth.uid()::text = (storage.foldername(name))[1]
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
    )
);


-- INSERT (upload files)
CREATE POLICY "Storage: INSERT Policy"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'user-projects'
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
    )
);

-- UPDATE files
CREATE POLICY "Storage: UPDATE Policy"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'user-projects'
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
    )
)
WITH CHECK (
    bucket_id = 'user-projects'
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
    )
);

-- DELETE files
CREATE POLICY "Storage: DELETE Policy"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'user-projects'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR EXISTS (
            SELECT 1
            FROM cxo_users cu
            WHERE cu.email = auth.email()
        )
    )
);

----------THUMBNAILS BUCKET--------------------
-- Public thumbnails bucket: allow anonymous read
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
    )
);

-- Allow authenticated users to manage thumbnails (optional)
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
    )
);

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
    )
);

CREATE POLICY "Thumbnails: DELETE Policy"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'thumbnails'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR EXISTS (
            SELECT 1
            FROM cxo_users cu
            WHERE cu.email = auth.email()
        )
    )
);
