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
    
    if (!socket || !selectedUser) return;

    const messageHandler = (newMessage) => {
      // Only add messages for the current conversation
      if (
        (newMessage.senderId === selectedUser._id && 
         newMessage.receiverId === useAuthStore.getState().authUser?._id) ||
        (newMessage.senderId === useAuthStore.getState().authUser?._id && 
         newMessage.receiverId === selectedUser._id)
      ) {
        set(state => ({
          messages: [...state.messages, newMessage]
        }));
      }
    };

    socket.on("newMessage", messageHandler);

    return () => {
      socket.off("newMessage", messageHandler);
    };
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, messages: [] }),
}));