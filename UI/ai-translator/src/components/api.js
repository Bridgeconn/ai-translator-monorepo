import axios from 'axios';

// CHANGED: Use 127.0.0.1 instead of localhost
const API_BASE_URL = 'http://127.0.0.1:8000'; // Your FastAPI backend

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

// ------------------ Auth API ------------------
export const authAPI = {
  login: async (credentials) => {
    const formData = new FormData();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await api.post("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
      console.log("Logout API call failed, but clearing local storage anyway");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },

  // ✅ Forgot password (request reset link)
  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  // ✅ Reset password with token
  resetPassword: async ({ token, new_password, confirm_password }) => {
    const response = await api.post("/auth/reset-password", {
      token,
      new_password,
      confirm_password,
    });
    return response.data;
  },

  // ✅ Update user profile
  updateUser: async (userId, updates) => {
    const response = await api.put(`/users/${userId}`, updates);
    return response.data;
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
// inside api.js
export const textDocumentAPI = {
  getAllProjects: async () => (await api.get("/api/project-text-documents/")).data.data,

  getProjectById: async (projectId) => {
    const res = await api.get(`/api/project-text-documents/${projectId}`);
    return res.data;
  },
  
  deleteProject: async (projectId) => {
    const res = await api.delete(`/api/project-text-documents/${projectId}`); 
    return res.data;
  },
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
    try {
      console.log("[DEBUG] getTokensByProjectAndBook called with:", {
        projectId,
        book,
      });
  
      const response = await api.get(`/word_tokens/project/${projectId}`, {
        params: { book_name: book },
      });
  
      console.log("[DEBUG] getTokensByProjectAndBook response:", response.data);
      return response.data.data || response.data;
    } catch (error) {
      console.error("[ERROR] getTokensByProjectAndBook failed:", error);
      throw error;
    }
  },
  generateWordTokens: async (projectId, bookName) => {
    try {
      const encodedBook = encodeURIComponent(bookName);
      console.log("[DEBUG] generateWordTokens called with:", {
        projectId,
        bookName,
        encodedBook,
        finalUrl: `/word_tokens/generate/${projectId}?book_name=${encodedBook}`,
      });
  
      const response = await api.post(
        `/word_tokens/generate/${projectId}?book_name=${encodedBook}`
      );
  
      return response.data;
    } catch (error) {
      console.error("[ERROR] generateWordTokens failed:", error);
      throw error;
    }
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

// ------------------ Draft API -----------------

export const draftAPI = {
  // Generate a draft for a project
  generateDraft: async (projectId) => {
    const res = await api.post("/word_tokens/drafts/generate", {
      project_id: projectId,
    });
    return res.data;
  },

  // Generate a draft for a specific book
  generateBookDraft: async (projectId, bookName) => {
    const res = await api.post("/word_tokens/drafts/generate/book", {
      project_id: projectId,
      book_name: bookName,
    });
    return res.data;
  },

  // Get latest draft for a given project + book
  getLatestDraft: async (projectId, bookName) => {
    const res = await api.get("/word_tokens/drafts/latest", {
      params: { project_id: projectId, book_name: bookName },
    });
    return res.data;
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

// ------------------ Verse Tokens API ------------------
export const verseTokensAPI = {
  getVerseTokens: async (projectId, bookName) => {
    const res = await api.get(`/verse-tokens/by-project/${projectId}?book_name=${bookName}`);
    return res.data;
  },

  translateVerseToken: async (verseTokenId) => {
    const res = await api.post(`/verse-tokens/translate-verse-token/${verseTokenId}`);
    return res.data;
  },

  manualUpdateVerseToken: async (verseTokenId, translatedText) => {
    const res = await api.patch(`/verse-tokens/manual-update/${verseTokenId}`, {
      translated_text: translatedText,
    });
    return res.data;
  },

  getVerseTokenBatch: async (projectId, bookName, offset = 0, limit = 10) => {
    const res = await api.get(
      `/verse-tokens/by-project/${projectId}?book_name=${bookName}&offset=${offset}&limit=${limit}`
    );
    return res.data;
  },

  translateChunk: async (projectId, bookName, offset = 0, limit = 10) => {
    const res = await api.post(
      `/verse-tokens/translate-chunk/${projectId}/${bookName}?offset=${offset}&limit=${limit}`
    );
    return res.data;
  },

  saveVerseTranslation: async (verseTokenId, translatedText) => {
    const res = await api.patch(`/verse-tokens/manual-update/${verseTokenId}`, {
      translated_text: translatedText,
    });
    return res.data;
  },

  generateDraft: async (projectId, bookName) => {
    const res = await api.get(`/verse-tokens/generate-draft/${projectId}/${bookName}`);
    return res.data;
  },

  getTranslationProgress: async (projectId, bookName) => {
    const res = await api.get(`/verse-tokens/progress/${projectId}?book_name=${bookName}`);
    return res.data;
  },
};
export const translateChapter = async (projectId, bookName, chapterNumber) => {
  const res = await api.post(
    `/verse_tokens/translate-chapter/${projectId}/${bookName}/${chapterNumber}`
  );
  return res.data;
};
// api.js
export const fetchDraft = async (projectId, bookName) => {
  const res = await api.post(
    "/drafts/generate-draft/",   // ✅ must include /drafts prefix
    { project_id: projectId, book_name: bookName },
    { responseType: "text" }
  );
  return res.data;
};


export default api;
