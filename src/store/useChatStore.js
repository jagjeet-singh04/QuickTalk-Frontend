import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/api/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true, messages: [] });
    try {
      const res = await axiosInstance.get(`/api/messages/conversation/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/api/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
  const { selectedUser } = get();
  const socket = useAuthStore.getState().socket;
  const currentUserId = useAuthStore.getState().authUser?._id;
  
  if (!socket || !selectedUser || !currentUserId) return;

  const messageHandler = (newMessage) => {
    // Check if message belongs to current conversation
    const isCurrentConversation = 
      (newMessage.senderId === currentUserId && newMessage.receiverId === selectedUser._id) ||
      (newMessage.senderId === selectedUser._id && newMessage.receiverId === currentUserId);
    
    if (isCurrentConversation) {
      set(state => {
        // Prevent duplicates
        if (state.messages.some(msg => msg._id === newMessage._id)) {
          return state;
        }
        return {
          messages: [...state.messages, newMessage]
        };
      });
    }
  };

  socket.on("newMessage", messageHandler);

  return () => {
    socket.off("newMessage", messageHandler);
  };
},

  setSelectedUser: (selectedUser) => set({ selectedUser, messages: [] }),
}));