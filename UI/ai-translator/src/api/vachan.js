// src/api/vachan.js
import axios from "axios";

const vachanApi = axios.create({
  baseURL: "https://api.vachanengine.org/v2/ai",
});

export default vachanApi;
