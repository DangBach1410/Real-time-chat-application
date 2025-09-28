import { useEffect, useState, useRef } from "react";
import { ChevronDown, ChevronUp, File as FileIcon, Camera, UserPlus } from "lucide-react";
import { DEFAULT_AVATAR } from "../constants/common";
import type { ConversationResponse, MemberResponse, MessageResponse } from "../helpers/chatApi";
import AddMemberModal from "./AddMemberModal";
import { removeConversationMember, updateConversationImage } from "../helpers/chatApi"; // import ap

interface ConversationDetailsModalProps {
  conversation: ConversationResponse;
  currentUserId: string;
  onClose: () => void;
  fetchMembers: (conversationId: string) => Promise<MemberResponse[]>;
  fetchMedia: (conversationId: string, page: number, size: number) => Promise<MessageResponse[]>;
  fetchFiles: (conversationId: string, page: number, size: number) => Promise<MessageResponse[]>;
  fetchLinks: (conversationId: string, page: number, size: number) => Promise<MessageResponse[]>;
  onConversationUpdated?: (updated: ConversationResponse) => void;
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

  const mediaPage = useRef(0);
  const filesPage = useRef(0);
  const linksPage = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mediaHasMore, setMediaHasMore] = useState(true);
  const [filesHasMore, setFilesHasMore] = useState(true);
  const [linksHasMore, setLinksHasMore] = useState(true);

  const pageSize = 20;

  // Load members on mount
  useEffect(() => {
    fetchMembers(conversation.id).then(setMembers);
  }, [conversation.id]);

  // Lấy displayName và displayImage giống ChatCrossBar
  const isPrivate = conversation.type === "private";
  const otherUser = isPrivate
    ? conversation.members.find((m) => m.userId !== currentUserId)
    : null;

  const displayName = isPrivate
    ? otherUser?.fullName
    : conversation.name || "Unnamed group";

  const displayImage = isPrivate
    ? otherUser?.imageUrl || DEFAULT_AVATAR
    : conversation.imageUrl || DEFAULT_AVATAR;

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
      setMedia(items);
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
      setFiles(items);
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
      setLinks(items);
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
        setMedia((prev) => [...prev, ...items]);
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
        setFiles((prev) => [...prev, ...items]);
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
        setLinks((prev) => [...prev, ...items]);
        linksPage.current = nextPage;
        setLinksHasMore(hasMore);
      }
    }
  };

  // handle remove member (BE call cần bạn triển khai)
  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin) return;
    if (userId === currentUserId) return; // không cho remove bản thân

    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const updatedConversation = await removeConversationMember(conversation.id, userId);
      setMembers(updatedConversation.members);
    } catch (err) {
      console.error("Failed to remove member", err);
      alert("Failed to remove member");
    }
  };
  const handleUpdateGroupImage = () => {
    if (!isAdmin) {
      alert("Only admins can update the group image.");
      return;
    }
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];

    try {
      const updatedConversation = await updateConversationImage(conversation.id, file);
      onConversationUpdated?.(updatedConversation); // 👈 báo ngược lên
    } catch (err) {
      console.error("Failed to update group image", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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

            <button
              className="absolute bottom-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
              onClick={(handleUpdateGroupImage)}
            >
              <Camera size={16} />
            </button>
          </div>
          <div className="font-medium text-lg text-center">{displayName}</div>

          {/* Nút Add Member */}
          {!isPrivate &&(
            <button
              className="mt-2 flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-sm"
              onClick={() => setShowAddMember(true)}
            >
              <UserPlus size={16} />
              Add Member
            </button>
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
                        className="ml-auto text-red-500 text-xs hover:underline"
                        onClick={() => handleRemoveMember(m.userId)}
                      >
                        Remove
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
    </div>
  );
}
