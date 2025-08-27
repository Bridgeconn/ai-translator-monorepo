import axios from "axios";

const API_BASE_URL = "http://localhost:8000";
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export const authAPI = {
  login: async (credentials) => {
    const formData = new FormData();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await api.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post("/users/", userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get("/users/me");
    return response.data;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.log("Logout API failed, clearing local storage anyway");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },
};

export const getProjectById = async (projectId) => {
  const res = await api.get(`/projects/${projectId}`);
  return res.data.data[0]; 
};

export const getBooksBySource = async (sourceId) => {
  const res = await api.get(`/books/by_source/${sourceId}`);
  return res.data.data; 
};

export const getVerseTokens = async (projectId, bookName) => {
  const res = await api.get(`/verse-tokens/by-project/${projectId}?book_name=${bookName}`);
  return res.data;
};

export const translateVerseToken = async (verseTokenId) => {
  const res = await api.post(`/verse-tokens/translate-verse-token/${verseTokenId}`);
  return res.data;
};

export const manualUpdateVerseToken = async (verseTokenId, translatedText) => {
  const res = await api.patch(`/verse-tokens/manual-update/${verseTokenId}`, {
    translated_text: translatedText,
  });
  return res.data;
};

export const getVerseTokenBatch = async (projectId, bookName, offset = 0, limit = 10) => {
  const res = await api.get(
    `/verse-tokens/by-project/${projectId}?book_name=${bookName}&offset=${offset}&limit=${limit}`
  );
  return res.data;
};

export const translateChunk = async (projectId, bookName, offset = 0, limit = 10) => {
  const res = await api.post(
    `/verse-tokens/translate-chunk/${projectId}/${bookName}?offset=${offset}&limit=${limit}`
  );
  return res.data;
};

export const saveVerseTranslation = async (verseTokenId, translatedText) => {
  const res = await api.patch(`/verse-tokens/manual-update/${verseTokenId}`, {
    translated_text: translatedText,
  });
  return res.data;
};

export const generateDraft = async (projectId, bookName) => {
  const res = await api.get(`/verse-tokens/generate-draft/${projectId}/${bookName}`);
  return res.data;
};

export const getTranslationProgress = async (projectId, bookName) => {
  const res = await api.get(`/verse-tokens/progress/${projectId}?book_name=${bookName}`);
  return res.data;
};

export default api;

