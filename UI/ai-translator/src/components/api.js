import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000"; // FastAPI backend

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ------------------ Interceptors ------------------

// Attach token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/register")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ------------------ Auth API ------------------
export const authAPI = {
  login: async (credentials) => {
    const params = new URLSearchParams();
    params.append("username", credentials.username);
    params.append("password", credentials.password);
    const response = await api.post("/auth/login", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  },

  register: async (userData) => (await api.post("/users/", userData)).data,

  getCurrentUser: async () => (await api.get("/users/me")).data,

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore backend logout errors
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },
};

// ------------------ Projects API ------------------
export const projectsAPI = {
  getAllProjects: async () => (await api.get("/projects/")).data.data,

  getProjectById: async (projectId) =>
    (await api.get(`/projects/${projectId}`)).data.data[0],

  deleteProject: async (projectId) =>
    (await api.delete(`/projects/${projectId}`)).data.data,
};

// ------------------ Sources API ------------------
export const sourcesAPI = {
  getSourceById: async (sourceId) => {
    if (!sourceId) return null;
    return (await api.get(`/sources/${sourceId}`)).data.data;
  },
};

// ------------------ Languages API ------------------
export const languagesAPI = {
  getLanguageById: async (languageId) => {
    if (!languageId) return null;
    return (await api.get(`/languages/id/${languageId}`)).data.data;
  },
};

// ------------------ Word Tokens API ------------------
export const wordTokenAPI = {
  getTokensByProjectAndBook: async (projectId, book) => {
    if (!book) return [];
    const response = await api.get(`/word_tokens/project/${projectId}`, {
      params: { book_name: book },
    });
    return response.data.data || response.data;
  },

  generateWordTokens: async (projectId, bookName) => {
    const encodedBook = encodeURIComponent(bookName);
    const response = await api.post(
      `/word_tokens/generate/${projectId}?book_name=${encodedBook}`
    );
    return response.data;
  },

  // ✅ Update translation
  updateToken: async (wordTokenId, payload) => {
    const response = await api.put(`/api/${wordTokenId}`, payload);
    return response.data;
  }, 

  generateTokens: async (projectId, bookName) => {
    const response = await api.post(
      `/api/generate_batch/${projectId}?book_name=${encodeURIComponent(bookName)}`
    );
    return response.data.data || response.data;
  },
};

// ------------------ Draft API ------------------
export const draftAPI = {
  generateDraft: async (projectId) => {
    const response = await api.post("/translation/translation/generate", {
      project_id: projectId,
    });
    return response.data.data;
  },
};

// ------------------ Books API ------------------
export const booksAPI = {
  getAllBooks: async () => {
    const response = await api.get("/books/books");
    return response.data.data || [];
  },

  getBooksBySourceId: async (sourceId) => {
    if (!sourceId) return [];
    const response = await api.get(`/books/by_source/${sourceId}`);
    return response.data.data || [];
  },
};

export default api;
