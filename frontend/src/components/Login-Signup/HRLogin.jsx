import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HRLoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const togglePassword = () => setShowPassword((v) => !v);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/hr/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setMessage(data.message);

      if (data.success) {
        // Store JWT under 'token' for dashboard compatibility
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("userRole", data.user?.role || "hr");
          localStorage.setItem("userEmail", data.user?.email || form.email);
          console.log("JWT Token Stored:", data.token);
        }

        console.log("HR Logged in:", data.user);
        navigate("/hr-dashboard/hr-dashboard-home");
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage("Error connecting to server");
    }
  };

  // --- SVG Icons (no react-icons dependency) ---
  const EyeIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.12 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
    </svg>
  );

  const EyeSlashIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="M13.359 11.238C15.06 10.16 16 8.943 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.94 5.94 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.16.163-.324.32-.494.478l.708.707z" />
      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.288.78.78a3.5 3.5 0 0 1-4.474-4.474l.78.78a2.5 2.5 0 0 0 2.914 2.914zm-3.214-1.922a.5.5 0 0 1 .707-.707L6.547 6.547a3 3 0 0 1 1.17-1.17l.707-.707a.5.5 0 0 1 .707.707l-.707.707a2 2 0 0 0-1.586 1.586l-.707.707a.5.5 0 0 1-.707-.707l.707-.707z" />
      <path d="M.5 3.14a.5.5 0 0 0 0 .707l1.562 1.562C.678 6.004 0 6.934 0 8s3 5.5 8 5.5c.34 0 .672-.033 1-.095l.746.746a.5.5 0 0 0 .707-.707L1.207 3.14a.5.5 0 0 0-.707 0zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c.29 0 .57.02.84.058l-1.07 1.071A3.483 3.483 0 0 0 4.5 8c0 .341.05.67.146 1.001l-1.07 1.071A13.133 13.133 0 0 1 1.172 8z" />
    </svg>
  );
  // --- End SVG Icons ---

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.logoPlaceholder} />
        <h1 style={styles.title}>HR Portal Login</h1>
        <p style={styles.subtitle}>Welcome back! Log in to your HR account.</p>

        {/* Email */}
        <div style={styles.formGroup}>
          <label htmlFor="email" style={styles.label}>
            Company Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            style={styles.input}
            required
          />
        </div>

        {/* Password */}
        <div style={styles.formGroup}>
          <label htmlFor="password" style={styles.label}>
            Password
          </label>
          <div style={styles.passwordWrapper}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              style={styles.input}
              required
            />
            <span onClick={togglePassword} style={styles.eyeIcon}>
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </span>
          </div>
        </div>

        {/* API message */}
        {message && (
          <p
            style={{
              color: message.toLowerCase().includes("success")
                ? "green"
                : "red",
              textAlign: "center",
              fontSize: "0.9em",
            }}
          >
            {message}
          </p>
        )}

        {/* Submit */}
        <button type="submit" style={styles.loginButton}>
          Log In
        </button>

        {/* Links */}
        <div style={styles.links}>
          <p>
            Don’t have an account?{" "}
            <a href="/hr/signup" style={styles.link}>
              Sign up
            </a>
          </p>
          <p>
            <a href="/ap/login" style={styles.link}>
              Applicant Site
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    padding: "1rem",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "5rem",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
    color: "#333",
  },
  logoPlaceholder: {
  width: "60px",
  height: "60px",
  backgroundImage: "url('/logo.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  margin: "0 auto 20px",
  borderRadius: "8px",
},
  title: {
    marginBottom: "0.5rem",
    fontSize: "1.8rem",
    color: "#2B2D42",
  },
  subtitle: {
    marginBottom: "1.5rem",
    fontSize: "0.95rem",
    color: "#666",
  },
  formGroup: {
    marginBottom: "1.2rem",
    textAlign: "left",
  },
  label: {
    display: "block",
    marginBottom: "0.3rem",
    fontSize: "0.9em",
    color: "#333",
    fontWeight: 500,
  },
  input: {
    width: "95%",
    padding: "0.7rem 1rem",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "1em",
    backgroundColor: "#F5F5F5",
    color: "#333",
    outline: "none",
  },
  passwordWrapper: {
    position: "relative",
  },
  eyeIcon: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer",
    color: "#888",
  },
  loginButton: {
    width: "104%",
    padding: "0.8rem",
    backgroundColor: "#2B2D42",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontWeight: 600,
    fontSize: "1em",
    cursor: "pointer",
    marginTop: "1rem",
  },
  links: {
    marginTop: "1.5rem",
    fontSize: "0.85rem",
    color: "#666",
  },
  link: {
    color: "#2B2D42",
    textDecoration: "none",
    fontWeight: 500,
  },
};
