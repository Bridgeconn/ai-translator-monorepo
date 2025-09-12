import axios from 'axios';

// CHANGED: Use 127.0.0.1 instead of localhost
const API_BASE_URL = 'http://127.0.0.1:8000'; // Your FastAPI backend
//const API_BASE_URL 

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
  updateFile: async (projectId, fileId, payload) => {
    const res = await api.put(`/api/project-text-documents/${projectId}/files/${fileId}`, payload);
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
  // Get all tokens for a project & book
  getTokensByProjectAndBook: async (projectId, bookId) => {
    if (!bookId) return [];
    try {
 
      const response = await api.get(`/word_tokens/project/${projectId}`, {
        params: { book_id: bookId },
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error("[ERROR] getTokensByProjectAndBook failed:", error);
      throw error;
    }
  },
 
  // Generate word tokens for a project & book
  generateWordTokens: async (projectId, bookId) => {
    try {
      const response = await api.post(
        `/word_tokens/generate/${projectId}?book_id=${bookId}`
      );
      return response.data.data;
    } catch (error) {
      console.error("[ERROR] generateWordTokens failed:", error);
      throw error;
    }
  },
 
  // Batch generate translated tokens
  generateBatchTokens: async (projectId, bookId) => {
    console.log("[DEBUG] generateBatchTokens called with:", bookId);

    const response = await api.post(
      `/api/generate_batch_stream/${projectId}`,
      null,
      { params: { book_id: bookId } }
    );
    return response.data;
  },
 
  // Update a single token translation
  updateToken: async (wordTokenId, payload) => {
    const response = await api.put(`/api/update/${wordTokenId}`, payload);
    return response.data;
  },
};

// ------------------ Draft API ------------------
export const draftAPI = {
  // ✅ Get latest draft for a book
  getLatestDraftForBook: async (projectId, bookId) => {
    try {
      const response = await api.get("/word_tokens/drafts/latest", { // ✅ Corrected path
        params: { project_id: projectId, book_id: bookId },
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error("[ERROR] getLatestDraftForBook failed:", error);
      throw error;
    }
  },
 
  // ✅ Generate draft for a book
  generateDraftForBook: async (projectId, bookId) => {
    const response = await api.post("/word_tokens/drafts/generate/book", {
      project_id: projectId,
      book_id: bookId,
    });
    return response.data.data;
  },
 
  // Generate draft for entire project
  generateDraftForProject: async (projectId) => {
    try {
      const response = await api.post("/word_tokens/drafts/generate", {
        project_id: projectId,
      });
      return response.data.data;
    } catch (error) {
      console.error("[ERROR] generateDraftForProject failed:", error);
      throw error;
    }
  },
  
  // ✅ Save draft for a book (with updated tokens)
  saveDraftForBook: async (projectId, bookId, editedTokens = [], content = null) => {
    try {
      const saveResponse = await api.put("/word_tokens/drafts/word_tokens/save", {
        project_id: projectId,
        book_id: bookId,
        updated_tokens: editedTokens,
        content: content
      });
  
      console.log("[INFO] Tokens saved:", saveResponse.data);
      return saveResponse.data; //  Return updated tokens and content
    } catch (error) {
      console.error("[ERROR] saveDraftForBook failed:", error);
      throw error;
    }
  },
  
  // ✅ New function to save a manual, free-form draft
  saveManualDraft: async (projectId, bookId, content) => {
    const response = await api.put("/word_tokens/drafts/save", { 
      project_id: projectId,
      book_id: bookId,
      content
    });
    return response.data;
  }  
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

//------------------ Verse Tokens API ------------------
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
// export const translateChapter = async (projectId, bookName, chapterNumber) => {
//   const res = await api.post(
//     `/verse_tokens/translate-chapter/${projectId}/${bookName}/${chapterNumber}`
//   );
//   return res.data;
// };
// const getVerseNumbers = async (projectId, bookName, chapterNumber) => {
//   const res = await api.get(
//     `/verse_tokens/verse-numbers/${projectId}/${bookName}/${chapterNumber}`
//   );
//   return res.data; // [1, 2, 3, ...]
// };

export const translateChapter = async (projectId, bookName, chapterNumber, verseNumbers) => {
  const res = await api.post(
    `/verse_tokens/translate-chapter/${projectId}/${bookName}/${chapterNumber}`,
    { verse_numbers: verseNumbers }  // 👈 send body only if verses passed
  );
  return res.data;
};

// api.js
// export const fetchDraft = async (projectId, bookName) => {
//   const res = await api.post(
//     "/drafts/generate-draft/",   // must include /drafts prefix
//     { project_id: projectId, book_name: bookName },
//     //{ responseType: "text" }
//   );
//   return res.data;
// };
// api.js
export const fetchDraft = async (projectId, bookName) => {
  const res = await api.post("/drafts/generate-draft-json/", {
    project_id: projectId,
    book_name: bookName,
  });
  return res.data; // now contains { draft_id, content, draft_name, format }
};

//Save/update an existing draft
export const saveDraft = async (draftId, content) => {
  const res = await api.put(`/drafts/drafts/${draftId}`, { content });
  return res.data;
};


export default api;
// // ------------------ Verse Tokens API ------------------
// export const verseTokensAPI = {
//   getVerseTokens: async (projectId, bookName) => {
//     const res = await api.get(`/verse-tokens/by-project/${projectId}?book_name=${bookName}`);
//     return res.data;
//   },
 
//   translateVerseToken: async (verseTokenId) => {
//     const res = await api.post(`/verse-tokens/translate-verse-token/${verseTokenId}`);
//     return res.data;
//   },
 
//   manualUpdateVerseToken: async (verseTokenId, translatedText) => {
//     const res = await api.patch(`/verse-tokens/manual-update/${verseTokenId}`, {
//       translated_text: translatedText,
//     });
//     return res.data;
//   },
 
//   getVerseTokenBatch: async (projectId, bookName, offset = 0, limit = 10) => {
//     const res = await api.get(
//       `/verse-tokens/by-project/${projectId}?book_name=${bookName}&offset=${offset}&limit=${limit}`
//     );
//     return res.data;
//   },
 
//   translateChunk: async (projectId, bookName, offset = 0, limit = 10) => {
//     const res = await api.post(
//       `/verse-tokens/translate-chunk/${projectId}/${bookName}?offset=${offset}&limit=${limit}`
//     );
//     return res.data;
//   },
 
//   saveVerseTranslation: async (verseTokenId, translatedText) => {
//     const res = await api.patch(`/verse-tokens/manual-update/${verseTokenId}`, {
//       translated_text: translatedText,
//     });
//     return res.data;
//   },
 
//   generateDraft: async (projectId, bookName) => {
//     const res = await api.get(`/verse-tokens/generate-draft/${projectId}/${bookName}`);
//     return res.data;
//   },
 
//   getTranslationProgress: async (projectId, bookName) => {
//     const res = await api.get(`/verse-tokens/progress/${projectId}?book_name=${bookName}`);
//     return res.data;
//   },
// };
// export const translateChapter = async (projectId, bookName, chapterNumber) => {
//   const res = await api.post(
//     `/verse_tokens/translate-chapter/${projectId}/${bookName}/${chapterNumber}`
//   );
//   return res.data;
// };
// // api.js
// export const fetchDraft = async (projectId, bookName) => {
//   const res = await api.post(
//     "/drafts/generate-draft/",   // must include /drafts prefix
//     { project_id: projectId, book_name: bookName },
//     { responseType: "text" }
//   );
//   return res.data;
// };
 
 
// // Save/update an existing draft
// export const saveDraft = async (draftId, content) => {
//   const res = await api.put(`/drafts/drafts/${draftId}`, { content });
//   return res.data;
// };
 
// export default api;