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
  
  if (!socket || !selectedUser || !currentUserId) {
    console.log("🚫 Cannot subscribe - missing socket, selectedUser, or currentUserId");
    return () => {};
  }

  console.log(`🔔 Subscribing to messages for conversation between ${currentUserId} and ${selectedUser._id}`);

  const messageHandler = (newMessage) => {
    console.log("📬 Received newMessage event", newMessage);
    
    // Convert IDs to strings for consistent comparison
    const formattedMessage = {
      ...newMessage,
      senderId: newMessage.senderId.toString(),
      receiverId: newMessage.receiverId.toString()
    };

    // Check if message belongs to current conversation
    const isCurrentConversation = 
      (formattedMessage.senderId === currentUserId && 
       formattedMessage.receiverId === selectedUser._id) ||
      (formattedMessage.senderId === selectedUser._id && 
       formattedMessage.receiverId === currentUserId);
    
    if (isCurrentConversation) {
      console.log("💬 Message belongs to current conversation");
      set(state => {
        // Prevent duplicates
        const exists = state.messages.some(msg => 
          msg._id === formattedMessage._id
        );
        
        if (exists) {
          console.log("🔄 Message already exists in state");
          return state;
        }
        
        console.log("➕ Adding new message to state");
        return {
          messages: [...state.messages, formattedMessage]
        };
      });
    } else {
      console.log("📭 Message not for current conversation");
    }
  };

  socket.on("newMessage", messageHandler);

  return () => {
    console.log("🔕 Unsubscribing from newMessage events");
    socket.off("newMessage", messageHandler);
  };
},

  setSelectedUser: (selectedUser) => set({ selectedUser, messages: [] }),
}));