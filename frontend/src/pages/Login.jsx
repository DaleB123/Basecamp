import React, { useState, useEffect } from 'react';

function Login({ setCurrentPage, theme, setCurrentID, setCurrentUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const url = "http://localhost:8000";

  const onLoginSuccess = (username, id) => {
    setCurrentUser(username);
    setCurrentID(id);
    setCurrentPage('trips');
  };

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent form from refreshing the page

    try {
      // POST to the /login endpoint
      const response = await fetch(url+"/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage("Login successful!");
        // Call the onLoginSuccess function from App.jsx
        onLoginSuccess(username, data.id); 
      } else {
        setMessage(data.message || data.detail || "Invalid username or password.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Error connecting to server.");
    }
  };

  return (
    <div data-theme={theme} className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-lg">
        <button onClick={() => setCurrentPage("home")} className="btn btn-ghost">
          Back to Home
        </button>
      </div>

      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] space-y-6">
        {/* Login form */}
        <div className="bg-base-100 p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block mb-1">Username</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Password</label>
              <input
                type="password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full mb-4">
              Sign In
            </button>
          </form>

          <button 
            onClick={() => setCurrentPage("signup")} 
            className="btn btn-link w-full"
            type="button"
          >
            Don't have an account? Sign up here
          </button>

          {message && (
            <p
              className={`text-center font-semibold ${
                message.includes("successful") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;