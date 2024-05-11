import axios from "axios";

const app = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

const http = {
  post: app.post,
  get: app.get,
  delete: app.delete,
  put: app.put,
  patch: app.patch,
};

export default http;
