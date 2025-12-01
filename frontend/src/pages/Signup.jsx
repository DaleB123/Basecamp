import React, { useState, useEffect } from "react";

function Signup({ setCurrentPage, theme, setCurrentUser, setCurrentID }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const url = "http://localhost:8000";

  const handleSignup = async (e) => {
    e.preventDefault(); // Prevent form from refreshing the page

    if (!username || !password || !firstName || !lastName || !email) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match!");
      return;
    }

    try {
      // Only make the POST request. The backend handles the check.
      const postResponse = await fetch(url+"/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          first_name: firstName,
          last_name: lastName,
          username: username,
          email: email, 
          password: password 
        }),
      });

      const data = await postResponse.json();

      if (postResponse.ok && data.success) {
        setMessage("Signup successful! You can now log in.");
        setCurrentUser(username);
        setCurrentID(data.id);
        setCurrentPage("home");
        setUsername("");
        setPassword("");
      } else {
        setMessage(data.message || data.detail || "Unknown error");
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to server.");
    }
  };

  return (
    <div data-theme={theme} className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-lg">
        <button onClick={() => setCurrentPage("home")} className="btn btn-ghost">
          Back to Home
        </button>
      </div>

      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="bg-base-100 p-8 rounded-lg shadow-md w-[32rem]">
          <h2 className="text-2xl font-bold mb-6 text-center">Create an Account</h2>

          <form onSubmit={handleSignup}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1">First Name</label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block mb-1">Last Name</label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1">Username</label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block mb-1">Email</label>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1">Password</label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block mb-1">Confirm Password</label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full mb-4">
              Sign Up
            </button>
          </form>

          <button 
            onClick={() => setCurrentPage("login")} 
            className="btn btn-link w-full"
            type="button"
          >
            Have an existing account? Login instead
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

export default Signup;