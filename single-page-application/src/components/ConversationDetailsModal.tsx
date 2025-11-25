import { useEffect, useState, useRef } from "react";
import { ChevronDown, ChevronUp, File as FileIcon, Camera, UserPlus, Pencil, Check, X, LogOut, XCircle, Search } from "lucide-react";
import { DEFAULT_AVATAR } from "../constants/common";
import type { ConversationResponse, MemberResponse, MessageResponse } from "../helpers/chatApi";
import AddMemberModal from "./AddMemberModal";
import ConfirmModal from "./ConfirmModal";
import ConversationSearchModal from "./ConversationSearchModal";
import { removeConversationMember, updateConversationImage, updateConversationName } from "../helpers/chatApi";
import { fetchUserById } from "../helpers/userApi";
import type { UserResponse } from "../helpers/userApi";

interface ConversationDetailsModalProps {
  conversation: ConversationResponse;
  currentUserId: string;
  onClose: () => void;
  fetchMembers: (conversationId: string) => Promise<MemberResponse[]>;
  fetchMedia: (conversationId: string, page: number, size: number) => Promise<MessageResponse[]>;
  fetchFiles: (conversationId: string, page: number, size: number) => Promise<MessageResponse[]>;
  fetchLinks: (conversationId: string, page: number, size: number) => Promise<MessageResponse[]>;
  onConversationUpdated?: (updated: ConversationResponse) => void;
  incomingMessage?: MessageResponse | null;
  onJumpToMessage?: (m: MessageResponse, q?: string) => void;
  onSearchClosed?: () => void;
}

export default function ConversationDetailsModal({
  conversation,
  currentUserId,
  onClose,
  fetchMembers,
  fetchMedia,
  fetchFiles,
  fetchLinks,
  onConversationUpdated,
  incomingMessage,
  onJumpToMessage,
  onSearchClosed,
}: ConversationDetailsModalProps) {
  const [sectionsOpen, setSectionsOpen] = useState({
    members: true,
    media: false,
    files: false,
    links: false,
  });

  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [media, setMedia] = useState<MessageResponse[]>([]);
  const [files, setFiles] = useState<MessageResponse[]>([]);
  const [links, setLinks] = useState<MessageResponse[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(conversation.name || "");
  const [confirmData, setConfirmData] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [localConversation, setLocalConversation] = useState(conversation);

  const mediaPage = useRef(0);
  const filesPage = useRef(0);
  const linksPage = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mediaHasMore, setMediaHasMore] = useState(true);
  const [filesHasMore, setFilesHasMore] = useState(true);
  const [linksHasMore, setLinksHasMore] = useState(true);

  const pageSize = 20;

  // track whether each list has been loaded at least once
  const mediaLoaded = useRef(false);
  const filesLoaded = useRef(false);
  const linksLoaded = useRef(false);

  // track seen ids so we don't add duplicates
  const seenIds = useRef<Set<string>>(new Set());

  // When parent passes an incoming message, analyze and add to appropriate list
  // Only add if that list has been loaded at least once (mediaLoaded/filesLoaded/linksLoaded)
  useEffect(() => {
    if (!incomingMessage) return;
    if (incomingMessage.conversationId !== conversation.id) return;

    // skip if we've already added/seen this message
    if (seenIds.current.has(incomingMessage.id)) return;

    try {
      if (incomingMessage.type === "media") {
        const meta = JSON.parse(incomingMessage.content);
        const mediaType = meta?.mediaType;
        if ((mediaType === "image" || mediaType === "video") && mediaLoaded.current) {
          setMedia((prev) => [incomingMessage, ...prev]);
          seenIds.current.add(incomingMessage.id);
        } else if (mediaType === "file" && filesLoaded.current) {
          setFiles((prev) => [incomingMessage, ...prev]);
          seenIds.current.add(incomingMessage.id);
        }
      } else if (incomingMessage.type === "link") {
        if (!linksLoaded.current) return;
        setLinks((prev) => [incomingMessage, ...prev]);
        seenIds.current.add(incomingMessage.id);
      } else if (incomingMessage.type === "text") {
        // maybe contains a link payload
        if (!linksLoaded.current) return;
        try {
          const maybe = JSON.parse(incomingMessage.content);
          if (maybe && maybe.url) {
            setLinks((prev) => [incomingMessage, ...prev]);
            seenIds.current.add(incomingMessage.id);
          }
        } catch {
          // plain text - ignore for details lists
        }
      }
    } catch (err) {
      console.error("Failed to process incoming message in details modal:", err);
    }
  }, [incomingMessage, conversation.id]);

  // Load members on mount
  useEffect(() => {
    fetchMembers(conversation.id).then(setMembers);
  }, [conversation.id]);

  
  // When parent changes the conversation prop, sync local state and reset lists
  useEffect(() => {
    setLocalConversation(conversation);
    setNewName(conversation.name || "");
    setIsEditingName(false);

    // Close search modal when conversation changes so the search state is cleared
    setShowSearchModal(false);

    // reset members (will be re-fetched by the effect above), lists and pagination
    setMembers([]);
    setMedia([]);
    setFiles([]);
    setLinks([]);

    mediaPage.current = 0;
    filesPage.current = 0;
    linksPage.current = 0;

    mediaLoaded.current = false;
    filesLoaded.current = false;
    linksLoaded.current = false;

    seenIds.current.clear();

    setMediaHasMore(true);
    setFilesHasMore(true);
    setLinksHasMore(true);

    setSectionsOpen({ members: true, media: false, files: false, links: false });
    setShowAddMember(false);
    setConfirmData(null);
  }, [conversation.id]);

  // Lấy displayName và displayImage giống ChatCrossBar
  const isPrivate = conversation.type === "private";
  const otherUser = isPrivate
    ? conversation.members.find((m) => m.userId !== currentUserId)
    : null;

  const displayName = isPrivate
    ? otherUser?.fullName
    : localConversation.name || "Unnamed group";

  const displayImage = isPrivate
    ? otherUser?.imageUrl || DEFAULT_AVATAR
    : localConversation.imageUrl || DEFAULT_AVATAR;

  const isAdmin =
    conversation.members?.find((u) => u.userId === currentUserId)?.role === "admin";

  // helper fetch with skip + filter
  async function fetchWithSkip(
    fetchFn: (conversationId: string, page: number, size: number) => Promise<MessageResponse[]>,
    conversationId: string,
    startPage: number,
    size: number,
    filterFn: (m: MessageResponse) => boolean
  ): Promise<{ items: MessageResponse[]; nextPage: number; hasMore: boolean }> {
    let currentPage = startPage;

    while (true) {
      const messages = await fetchFn(conversationId, currentPage, size);

      if (messages.length === 0) {
        return { items: [], nextPage: currentPage, hasMore: false };
      }

      const filtered = messages.filter(filterFn);

      if (filtered.length > 0) {
        return { items: filtered, nextPage: currentPage + 1, hasMore: true };
      }

      currentPage++;
    }
  }

  // Toggle section + load first time
  const handleToggleSection = async (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));

    if (section === "media" && media.length === 0 && mediaHasMore) {
      const { items, nextPage, hasMore } = await fetchWithSkip(
        fetchMedia,
        conversation.id,
        mediaPage.current,
        pageSize,
        (m) => {
          try {
            const meta = JSON.parse(m.content);
            return meta.mediaType === "image" || meta.mediaType === "video";
          } catch {
            return false;
          }
        }
      );
      // filter out already-seen ids (e.g., added via websocket earlier)
      const newMedia = items.filter((it) => !seenIds.current.has(it.id));
      setMedia(newMedia);
      newMedia.forEach((it) => seenIds.current.add(it.id));
      mediaLoaded.current = true;
      mediaPage.current = nextPage;
      setMediaHasMore(hasMore);
    }

    if (section === "files" && files.length === 0 && filesHasMore) {
      const { items, nextPage, hasMore } = await fetchWithSkip(
        fetchFiles,
        conversation.id,
        filesPage.current,
        pageSize,
        (m) => {
          try {
            const meta = JSON.parse(m.content);
            return meta.mediaType === "file";
          } catch {
            return false;
          }
        }
      );
      const newFiles = items.filter((it) => !seenIds.current.has(it.id));
      setFiles(newFiles);
      newFiles.forEach((it) => seenIds.current.add(it.id));
      filesLoaded.current = true;
      filesPage.current = nextPage;
      setFilesHasMore(hasMore);
    }

    if (section === "links" && links.length === 0 && linksHasMore) {
      const { items, nextPage, hasMore } = await fetchWithSkip(
        fetchLinks,
        conversation.id,
        linksPage.current,
        pageSize,
        (m) => {
          try {
            const meta = JSON.parse(m.content);
            return !!meta.url;
          } catch {
            return false;
          }
        }
      );
      const newLinks = items.filter((it) => !seenIds.current.has(it.id));
      setLinks(newLinks);
      newLinks.forEach((it) => seenIds.current.add(it.id));
      linksLoaded.current = true;
      linksPage.current = nextPage;
      setLinksHasMore(hasMore);
    }
  };

  // Infinite scroll handlers
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>, type: "media" | "files" | "links") => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      if (type === "media" && mediaHasMore) {
        const { items, nextPage, hasMore } = await fetchWithSkip(
          fetchMedia,
          conversation.id,
          mediaPage.current,
          pageSize,
          (m) => {
            try {
              const meta = JSON.parse(m.content);
              return meta.mediaType === "image" || meta.mediaType === "video";
            } catch {
              return false;
            }
          }
        );
        const appended = items.filter((it) => !seenIds.current.has(it.id));
        appended.forEach((it) => seenIds.current.add(it.id));
        setMedia((prev) => [...prev, ...appended]);
        mediaPage.current = nextPage;
        setMediaHasMore(hasMore);
      }

      if (type === "files" && filesHasMore) {
        const { items, nextPage, hasMore } = await fetchWithSkip(
          fetchFiles,
          conversation.id,
          filesPage.current,
          pageSize,
          (m) => {
            try {
              const meta = JSON.parse(m.content);
              return meta.mediaType === "file";
            } catch {
              return false;
            }
          }
        );
        const appended = items.filter((it) => !seenIds.current.has(it.id));
        appended.forEach((it) => seenIds.current.add(it.id));
        setFiles((prev) => [...prev, ...appended]);
        filesPage.current = nextPage;
        setFilesHasMore(hasMore);
      }

      if (type === "links" && linksHasMore) {
        const { items, nextPage, hasMore } = await fetchWithSkip(
          fetchLinks,
          conversation.id,
          linksPage.current,
          pageSize,
          (m) => {
            try {
              const meta = JSON.parse(m.content);
              return !!meta.url;
            } catch {
              return false;
            }
          }
        );
        const appended = items.filter((it) => !seenIds.current.has(it.id));
        appended.forEach((it) => seenIds.current.add(it.id));
        setLinks((prev) => [...prev, ...appended]);
        linksPage.current = nextPage;
        setLinksHasMore(hasMore);
      }
    }
  };

  // handle remove member 
  const handleRemoveMember = (userId: string) => {
    if (!isAdmin || userId === currentUserId) return;

    setConfirmData({
      message: "Are you sure you want to remove this member?",
      onConfirm: async () => {
        try {
          const updatedConversation = await removeConversationMember(conversation.id, userId);
          setMembers(updatedConversation.members);
        } catch (err) {
          console.error("Failed to remove member", err);
          alert("Failed to remove member");
        } finally {
          setConfirmData(null);
        }
      },
    });
  };
  
  const handleLeaveGroup = () => {
    if (conversation.type !== "group") return;

    setConfirmData({
      message: "Are you sure you want to leave this group?",
      onConfirm: async () => {
        try {
          await removeConversationMember(conversation.id, currentUserId);
          window.location.reload();
        } catch (err) {
          console.error("Failed to leave group", err);
          alert("Failed to leave group");
        } finally {
          setConfirmData(null);
        }
      },
    });
  };


  const handleUpdateGroupImage = () => {
    fileInputRef.current?.click();
  };

  // --- Hàm helper lấy user fullname ---
  async function getCurrentUser(): Promise<UserResponse | null> {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) return null;
      return await fetchUserById(userId);
    } catch (err) {
      console.error("Failed to fetch current user:", err);
      return null;
    }
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];

    try {
      const user = await getCurrentUser();
      if (!user) {
        alert("User not found. Please re-login.");
        return;
      }

      const updatedConversation = await updateConversationImage(
        conversation.id,
        currentUserId,
        user.fullName,
        file
      );

      setLocalConversation(updatedConversation);
      onConversationUpdated?.(updatedConversation);
    } catch (err) {
      console.error("Failed to update group image", err);
      alert("Failed to update group image");
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName === localConversation.name) {
      setNewName(conversation.name || "");
      setIsEditingName(false);
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        alert("User not found. Please re-login.");
        return;
      }

      const updated = await updateConversationName(
        conversation.id,
        currentUserId,
        user.fullName,
        newName
      );

      setLocalConversation(updated);
      onConversationUpdated?.(updated);
      setIsEditingName(false);
    } catch (err) {
      console.error("Update name failed:", err);
      alert("Failed to update group name");
    }
  };

  return (
    <div className="w-96 max-h-screen border-l bg-white flex flex-col shadow">
      <div className="bg-white w-96 max-h-[90vh] rounded shadow p-4 flex flex-col">
        {/* Header giữ nguyên, chỉ thêm camera overlay + Add Member */}
        <div className="flex flex-col items-center mb-6 relative">
          <button
            className="absolute right-0 top-0 text-gray-500 hover:text-black"
            onClick={onClose}
          >
            ✕
          </button>
          <div className="relative">
            {/* <img
              src={displayImage}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover mb-2"
              onError={(e) => ((e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR)}
            /> */}
            {/* input file ẩn */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={onFileChange}
              style={{ display: "none" }}
            />
            {conversation.type === "group" && !conversation.imageUrl ? (
              <div className="relative w-24 h-24 mb-2">
                {conversation.members.slice(-2).map((m, idx) => (
                  <img
                    key={m.userId}
                    src={m.imageUrl || DEFAULT_AVATAR}
                    alt={m.fullName}
                    className="absolute object-cover rounded-full"
                    style={{
                      width: "70%",  // mỗi ảnh chiếm 60% khung để chồng lên nhau đẹp
                      height: "70%",
                      top: idx === 0 ? 0 : undefined,       // ảnh top-right nằm dưới
                      right: idx === 0 ? 0 : undefined,
                      bottom: idx === 1 ? 0 : undefined,    // ảnh bottom-left nằm trên
                      left: idx === 1 ? 0 : undefined,
                      zIndex: idx === 0 ? 0 : 10,
                    }}
                  />
                ))}
              </div>
            ) : (
              <img
                src={displayImage}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover mb-2"
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR)}
              />
            )}
            {conversation.type === "group" ? (
              <button
                className="absolute bottom-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                onClick={(handleUpdateGroupImage)}
              >
                <Camera size={16} />
              </button>
              ) : null
            }
          </div>
          {/* <div className="font-medium text-lg text-center">{displayName}</div> */}
          <div className="flex items-center gap-2">
            {conversation.type === "group" ? (
              isEditingName ? (
                <>
                  <input
                    className="border px-2 py-1 rounded flex-1"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") {
                        setNewName(conversation.name || "");
                        setIsEditingName(false);
                      }
                    }}
                    autoFocus
                  />
                  <button
                    className="p-1 text-green-600 hover:text-green-800"
                    onClick={handleSaveName}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    className="p-1 text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      setNewName(conversation.name || "");
                      setIsEditingName(false);
                    }}
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">{localConversation.name}</h2>
                  <button
                    className="p-1 text-gray-500 hover:text-gray-700"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Pencil size={16} />
                  </button>
                </>
              )
            ) : (
              <h2 className="text-lg font-semibold">{displayName}</h2>
            )}
          </div>

          {/* Nút Add Member */}
          {!isPrivate &&(
            <div className="flex gap-2 mt-2">
              <button
                className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-sm"
                onClick={() => setShowAddMember(true)}
              >
                <UserPlus size={16} />
                Add Member
              </button>
              <button
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                onClick={() => setShowSearchModal(true)}
                title="Search messages"
              >
                <Search size={16} />
                Search Messages
              </button>
            </div>
          )}
          {isPrivate && (
            <div className="mt-2">
              <button
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                onClick={() => setShowSearchModal(true)}
                title="Search messages"
              >
                <Search size={16} />
                Search Messages
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Members */}
          <div>
            <button
              className="flex justify-between w-full px-2 py-1 font-medium hover:bg-gray-100 rounded"
              onClick={() => handleToggleSection("members")}
            >
              Members ({members.length})
              {sectionsOpen.members ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {sectionsOpen.members && (
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center gap-2 px-2 py-1 border-b">
                    <img
                      src={m.imageUrl || DEFAULT_AVATAR}
                      alt={m.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span>{m.fullName}</span>
                    {/* Nút remove cho admin, nhưng không hiển thị cho chính mình */}
                    {isAdmin && m.userId !== currentUserId && (
                      <button
                        className="ml-auto text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveMember(m.userId)}
                        title="Remove member"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Media */}
          <div>
            <button
              className="flex justify-between w-full px-2 py-1 font-medium hover:bg-gray-100 rounded"
              onClick={() => handleToggleSection("media")}
            >
              Media
              {sectionsOpen.media ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {sectionsOpen.media && (
              <div
                className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto"
                onScroll={(e) => handleScroll(e, "media")}
              >
                {media.map((m, idx) => {
                  const meta = JSON.parse(m.content) as {
                    url: string;
                    mediaType: string;
                    originalName?: string;
                  };
                  if (meta.mediaType === "image") {
                    return (
                      <img
                        key={idx}
                        src={meta.url}
                        alt="media"
                        className="w-full h-24 object-cover rounded"
                      />
                    );
                  }
                  if (meta.mediaType === "video") {
                    return (
                      <video
                        key={idx}
                        src={meta.url}
                        className="w-full h-24 object-cover rounded"
                        controls
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>

          {/* Files */}
          <div>
            <button
              className="flex justify-between w-full px-2 py-1 font-medium hover:bg-gray-100 rounded"
              onClick={() => handleToggleSection("files")}
            >
              Files
              {sectionsOpen.files ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {sectionsOpen.files && (
              <div
                className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto"
                onScroll={(e) => handleScroll(e, "files")}
              >
                {files.map((m, idx) => {
                  const meta = JSON.parse(m.content) as {
                    url: string;
                    mediaType: string;
                    size: number;
                    originalName: string;
                  };
                  return (
                    <a
                      key={idx}
                      href={meta.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative border rounded p-2 hover:bg-gray-50 flex flex-col items-start"
                    >
                      <FileIcon size={20} className="absolute top-2 left-2 text-gray-600" />
                      <div className="mt-6 text-sm line-clamp-2 break-all">{meta.originalName}</div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Links */}
          <div>
            <button
              className="flex justify-between w-full px-2 py-1 font-medium hover:bg-gray-100 rounded"
              onClick={() => handleToggleSection("links")}
            >
              Links
              {sectionsOpen.links ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {sectionsOpen.links && (
              <div
                className="mt-2 max-h-96 overflow-y-auto flex flex-col gap-1"
                onScroll={(e) => handleScroll(e, "links")}
              >
                {links.map((m, idx) => {
                  const meta = JSON.parse(m.content) as {
                    url: string;
                    title?: string;
                    image?: string;
                  };
                  return (
                    <a
                      key={idx}
                      href={meta.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center border rounded px-2 py-1 hover:bg-gray-50 min-h-[40px] break-all"
                    >
                      {meta.image && (
                        <img
                          src={meta.image}
                          alt={meta.title || meta.url}
                          className="w-12 h-12 object-cover flex-shrink-0 rounded"
                        />
                      )}
                      <span className="ml-2 text-sm truncate">{meta.title || meta.url}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          {conversation.type === "group" && (
            <div className="mt-4">
              <button
                className="w-full py-2 text-red-600 border border-red-600 rounded hover:bg-red-50 flex items-center justify-center gap-2"
                onClick={handleLeaveGroup}
              >
                <LogOut size={18} />
                Leave Group
              </button>
            </div>
          )}
        </div>
      </div>
      {showAddMember && (
        <AddMemberModal
          conversationId={conversation.id}
          currentUserId={currentUserId}
          existingMembers={members} // những người đã là member
          onClose={() => setShowAddMember(false)}
          onMembersAdded={(cid) => fetchMembers(cid).then(setMembers)}
        />
      )}
      {showSearchModal && (
        <ConversationSearchModal
          conversationId={conversation.id}
          onBack={() => {
            setShowSearchModal(false);
            onSearchClosed?.();
          }}
          onSelectMessage={(m, q) => {
            // notify parent about the selected message but DO NOT close the search modal
            onJumpToMessage?.(m, q);
          }}
        />
      )}
      {confirmData && (
        <ConfirmModal
          message={confirmData.message}
          onConfirm={confirmData.onConfirm}
          onCancel={() => setConfirmData(null)}
        />
      )}
    </div>
  );
}
