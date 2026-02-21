import React, { useState } from "react";
import { apiRequest } from "../services/api";

const TestBackend = () => {
  const [response, setResponse] = useState("");

  const testConnection = async () => {
    try {
      const data = await apiRequest("/");

      setResponse(JSON.stringify(data));
    } catch (error) {
      setResponse("Error connecting to backend");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Test FastAPI Connection</h2>

      <button onClick={testConnection}>
        Test Backend
      </button>

      <p>Response:</p>
      <pre>{response}</pre>
    </div>
  );
};

export default TestBackend;