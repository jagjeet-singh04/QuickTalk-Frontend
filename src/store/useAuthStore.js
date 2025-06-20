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
      const res = await axiosInstance.get("/api/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      // Don't show error for 401 (normal for unauthenticated users)
      if (error.response?.status !== 401) {
        console.log("Error in checkAuth:", error);
      }
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/api/auth/signup", data);
      
      // Check if response contains user data
      if (res.data && res.data._id) {
        set({ authUser: res.data });
        toast.success("Account created successfully");
        get().connectSocket();
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/api/auth/login", data);
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
      await axiosInstance.post("/api/auth/logout");
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
      const res = await axiosInstance.put("/api/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    const socket = io(backendUrl, {
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket"]
    });
    
    socket.connect();
    set({ socket });

    // Handle online users
    socket.on("onlineUsersUpdate", (userIds) => {
      set({ onlineUsers: userIds });
    });
    
    // Handle heartbeat
    socket.on("heartbeat", () => {
      socket.emit("heartbeat", () => {
        // Keeps connection alive
      });
    });
    
    // Handle socket errors
    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setTimeout(() => socket.connect(), 2000);
    });
    
    // Handle connection events
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      if (get().authUser?._id) {
        socket.emit("authenticate", { userId: get().authUser._id });
      }
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