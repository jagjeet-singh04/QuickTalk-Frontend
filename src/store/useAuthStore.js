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
    // Handle duplicate key errors specifically
    if (error.response?.data?.field === "email") {
      toast.error("Email already in use");
    } else {
      toast.error(error.response?.data?.message || "Signup failed");
    }
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
    // Send FormData instead of JSON for images
    const formData = new FormData();
    if (data.profilePic) {
      formData.append('profilePic', data.profilePic);
    }
    formData.append('fullName', data.fullName);
    
    const res = await axiosInstance.put("/api/auth/update-profile", formData, {
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
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  
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