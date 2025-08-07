import { getAdminClient } from "./supabaseClient";
import { convertPdfToBase64 } from "./pdfToImageService";

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
}

const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
  width: 210,
  height: 297,
  quality: 0.8,
};

/**
 * Generate a thumbnail from PDF content and upload to Supabase storage
 */
export async function generateAndUploadThumbnail(
  pdfContent: Uint8Array,
  thumbnailPath: string,
  options: ThumbnailOptions = {}
): Promise<string> {
  try {
    const mergedOptions = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };

    if (pdfContent instanceof Uint8Array) {
      // Convert PDF to blob
      const pdfBlob = new Blob([pdfContent as unknown as BlobPart], { type: "application/pdf" });

      // Convert PDF to base64 image
      const base64Image = await convertPdfToBase64(pdfBlob, {
        width: mergedOptions.width,
        height: mergedOptions.height,
        quality: mergedOptions.quality ? mergedOptions.quality * 100 : 80,
        format: "png",
      });

      // Convert base64 to blob
      const base64Data = base64Image.split(",")[1];
      const imageBlob = new Blob(
        [Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))],
        {
          type: "image/png",
        }
      );

      // Upload to Supabase
      const supabase = getAdminClient();
      const { error } = await supabase.storage
        .from("user-projects")
        .upload(thumbnailPath, imageBlob, {
          upsert: true,
          contentType: "image/png",
        });

      if (error) {
        throw new Error(`Thumbnail upload failed: ${error.message}`);
      }

      return thumbnailPath;
    }

    throw new Error("Invalid PDF content provided");
  } catch (error) {
    console.error("Thumbnail generation failed:", error);

    // Fallback to creating a simple canvas with PDF-like styling
    return await createFallbackThumbnail(thumbnailPath, options);
  }
}

/**
 * Create a fallback thumbnail when PDF conversion fails
 */
async function createFallbackThumbnail(
  thumbnailPath: string,
  options: ThumbnailOptions
): Promise<string> {
  try {
    // Create a simple canvas with PDF-like styling as a placeholder
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;

    canvas.width = options.width!;
    canvas.height = options.height!;

    // Fill with white background
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add a border
    context.strokeStyle = "#e5e7eb";
    context.lineWidth = 2;
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    // Add some text to indicate it's a PDF
    context.fillStyle = "#6b7280";
    context.font = "14px Arial";
    context.textAlign = "center";
    context.fillText("PDF Document", canvas.width / 2, canvas.height / 2);

    context.font = "12px Arial";
    context.fillText("Preview", canvas.width / 2, canvas.height / 2 + 20);

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob!);
        },
        "image/png",
        options.quality
      );
    });

    // Upload to Supabase
    const supabase = getAdminClient();
    const { error } = await supabase.storage
      .from("user-projects")
      .upload(thumbnailPath, blob, {
        upsert: true,
        contentType: "image/png",
      });

    if (error) {
      throw new Error(`Fallback thumbnail upload failed: ${error.message}`);
    }

    return thumbnailPath;
  } catch (error) {
    console.error("Fallback thumbnail creation failed:", error);
    throw error;
  }
}

/**
 * Get signed URL for thumbnail
 */
export async function getThumbnailUrl(
  thumbnailPath: string
): Promise<string | null> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.storage
      .from("user-projects")
      .createSignedUrl(thumbnailPath, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Failed to get thumbnail URL:", error);
    return null;
  }
}

/**
 * Delete thumbnail from storage
 */
export async function deleteThumbnail(thumbnailPath: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.storage
      .from("user-projects")
      .remove([thumbnailPath]);

    if (error) {
      console.error("Failed to delete thumbnail:", error);
    }
  } catch (error) {
    console.error("Failed to delete thumbnail:", error);
  }
}
