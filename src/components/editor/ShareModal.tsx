"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Share2, User, X, Edit, Eye } from "lucide-react";
import { User as UserType, ProjectShare, SharePermission } from "@/types";
import {
  searchUsers,
  shareProject,
  unshareProject,
  getProjectShares,
} from "@/lib/sharingService";
import showToast from "@/lib/toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentUserId: string;
}

export function ShareModal({
  isOpen,
  onClose,
  projectId,
  currentUserId,
}: ShareModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [permission, setPermission] = useState<SharePermission>("read");
  const [sharedUsers, setSharedUsers] = useState<
    (ProjectShare & { user?: UserType })[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  // Load existing shares when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSharedUsers();
    }
  }, [isOpen, projectId]);

  // Search users when query changes
  useEffect(() => {
    const searchUsersDebounced = async () => {
      if (searchQuery.trim().length <= 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const excludeIds = [
          currentUserId,
          ...sharedUsers.map((s) => s.shared_with),
        ];
        const results = await searchUsers(searchQuery, {
          excludeUserIds: Array.from(new Set(excludeIds)),
        });
        setSearchResults(results);
      } catch (error) {
        console.error("Failed to search users:", error);
        showToast.error("Failed to search users");
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsersDebounced, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentUserId, sharedUsers]);

  const loadSharedUsers = async () => {
    setIsLoadingShares(true);
    try {
      const shares = await getProjectShares(projectId);
      setSharedUsers(shares);
    } catch (error) {
      console.error("Failed to load shared users:", error);
      showToast.error("Failed to load shared users");
    } finally {
      setIsLoadingShares(false);
    }
  };

  const handleShare = async () => {
    if (!selectedUser) return;

    setIsSharing(true);
    try {
      await shareProject(projectId, currentUserId, selectedUser.id, permission);
      showToast.success(
        `Shared with ${selectedUser.name || selectedUser.email}`
      );
      onClose();
      // setSelectedUser(null);
      // setSearchQuery("");
      // setPermission("read");
      // loadSharedUsers();
    } catch (error) {
      console.error("Failed to share:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to share"
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshare = async (sharedWith: string) => {
    try {
      await unshareProject(projectId, sharedWith);
      showToast.success("Removed access");
      loadSharedUsers();
    } catch (error) {
      console.error("Failed to unshare:", error);
      showToast.error("Failed to remove access");
    }
  };

  const handleUpdatePermission = async (
    toSharedUserId: string,
    newPermission: SharePermission
  ) => {
    try {
      await shareProject(
        projectId,
        currentUserId,
        toSharedUserId,
        newPermission
      ); // This will update existing share
      showToast.success("Permission updated");
      loadSharedUsers();
    } catch (error) {
      console.error("Failed to update permission:", error);
      showToast.error("Failed to update permission");
    }
  };

  const handleUserSelect = (user: UserType) => {
    setSelectedUser(user);
    setSearchQuery(user.email);
    setSearchResults([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Document
          </DialogTitle>
          <DialogDescription>
            Share this document with other users. They can view or edit based on
            the permission you set.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Section */}
          <div className="space-y-3">
            <Label htmlFor="user-search">Find users by name or email</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-search"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name || user.email}</p>
                        {user.name && (
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Searching...
              </div>
            )}
          </div>

          {/* Permission Selection */}
          {selectedUser && (
            <div className="space-y-3">
              <Label>Permission</Label>
              <Select
                value={permission}
                onValueChange={(value: SharePermission) => setPermission(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Read only
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Can edit
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleShare}
                disabled={isSharing}
                className="w-full"
              >
                {isSharing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share with {selectedUser.name || selectedUser.email}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Shared Users List */}
        <div className="space-y-3">
          <Label>Shared with</Label>
          {isLoadingShares ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading...
            </div>
          ) : sharedUsers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Share2 className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No users shared yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sharedUsers.map((share) => (
                <Card key={share.id} className="p-3">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {share.user?.name ||
                              share.user?.email ||
                              "Unknown User"}
                          </p>
                          {share.user?.name && (
                            <p className="text-sm text-muted-foreground">
                              {share.user.email}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={share.permission}
                          onValueChange={(value: SharePermission) =>
                            handleUpdatePermission(share.shared_with, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="read">Read only</SelectItem>
                            <SelectItem value="edit">Can edit</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnshare(share.shared_with)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
