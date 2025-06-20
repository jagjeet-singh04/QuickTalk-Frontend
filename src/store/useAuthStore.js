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
    const { authUser } = get();
    
    if (!authUser?._id) {
      console.warn("⚠️ Cannot connect socket: No authenticated user");
      return;
    }

    const socket = io(backendUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      transports: ["websocket"],
      query: {
        userId: authUser._id
      }
    });
    
    set({ socket });

    socket.on("onlineUsersUpdate", (userIds) => {
      console.log("🟢 Online users updated:", userIds);
      set({ onlineUsers: userIds });
    });
    
    // Add reconnect logic
    socket.on("reconnect", (attempt) => {
      console.log(`🔁 Reconnected after ${attempt} attempts`);
      if (authUser?._id) {
        socket.emit("authenticate", { userId: authUser._id });
      }
    });
    
    // Handle socket errors
    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setTimeout(() => socket.connect(), 2000);
    });
    
    // Handle connection events
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      if (authUser?._id) {
        socket.emit("authenticate", { userId: authUser._id });
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