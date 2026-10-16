import axios from "axios";

export type Build = {
  id: number;
  name: string;
  label: string;
  price: string;
  tone: string;
  featured: boolean;
  specs: string[];
};

export type OrderPayload = {
  name: string;
  phone: string;
  message?: string;
  build_id?: number | null;
  purpose?: string;
  performance?: string;
  estimated_price?: number;
};

export type OrderResponse = { id: number; status: string; created_at: string | null };

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

export const getBuilds = async () => (await api.get<Build[]>("/builds")).data;
export const createOrder = async (payload: OrderPayload) =>
  (await api.post<OrderResponse>("/orders", payload)).data;
