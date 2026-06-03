const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function submitScore(formData) {
  const res = await fetch(`${API_BASE}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw { status: res.status, message: "Invalid response from server" };
  }

  if (!res.ok) {
    throw { status: res.status, detail: data.detail, message: data.message };
  }

  return data;
}
