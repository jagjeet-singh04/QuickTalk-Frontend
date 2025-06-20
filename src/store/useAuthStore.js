import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      
      // Handle 401 specifically
      if (error.response?.status === 401) {
        set({ authUser: null });
        return; // Stop further processing
      }
      
      // Show error only if not 401
      toast.error("Session expired. Please login again");
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

 updateProfile: async (data) => {
  set({ isUpdatingProfile: true });
  try {
    // Send FormData instead of JSON for images
    const formData = new FormData();
    if (data.profilePic) {
      formData.append('profilePic', data.profilePic);
    }
    formData.append('fullName', data.fullName);
    
    const res = await axiosInstance.put("/auth/update-profile", formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    set({ authUser: res.data });
    toast.success("Profile updated successfully");
  } catch (error) {
    toast.error(error.response?.data?.message || "Update failed");
  } finally {
    set({ isUpdatingProfile: false });
  }
},

  connectSocket: () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL.replace('/api', '');
  
  const socket = io(backendUrl, {
    withCredentials: true,
    autoConnect: false,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    path: "/socket.io/", // Explicit path
  });
  
  socket.connect();
  set({ socket });

  // Add error listeners
  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
    if (err.message.includes("CORS")) {
      toast.error("Connection issue. Please refresh");
    }
  });
  
  socket.on("getOnlineUsers", (userIds) => {
    set({ onlineUsers: userIds });
  });
    
    // Handle socket errors
    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });
  },
  
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.disconnect();
    }
    set({ socket: null, onlineUsers: [] });
  },
}));