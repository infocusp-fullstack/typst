"use client";

import { ReviewComment } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Trash2, MapPin } from "lucide-react";

interface CommentsSidebarProps {
  comments: ReviewComment[];
  onDelete: (comment: ReviewComment) => void;
  onCommentClick: (comment: ReviewComment) => void;
  activeCommentId?: string;
}

export default function CommentsSidebar({
  comments,
  onDelete,
  onCommentClick,
  activeCommentId,
}: CommentsSidebarProps) {
  if (comments.length === 0) {
    return (
      <div className="w-72 border-l border-border bg-background flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm">Comments</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            No comments yet.
            <br />
            Select text to add one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 border-l border-border bg-background flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm">
          Comments ({comments.length})
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`p-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${
              activeCommentId === comment.id ? "bg-muted/50 border-l-2 border-l-primary" : ""
            }`}
            onClick={() => onCommentClick(comment)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium truncate">
                    {comment.user_id.slice(0, 8)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-xs text-foreground mb-2 break-words">
                  {comment.content}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>
                    L{comment.start_line}
                    {comment.end_line && comment.end_line !== comment.start_line
                      ? `-${comment.end_line}`
                      : ""}
                    :{comment.start_column}
                    {comment.end_column && comment.end_column !== comment.start_column
                      ? `-${comment.end_column}`
                      : ""}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(comment);
                }}
                className="shrink-0 p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="Delete comment"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}