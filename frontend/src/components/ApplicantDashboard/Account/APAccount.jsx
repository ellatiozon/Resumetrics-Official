import React, { useState, useEffect } from "react";
import "../Dashboard.css";

function APAccount() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [originalData, setOriginalData] = useState({});

  // ✅ Fetch current applicant data on mount
  useEffect(() => {
    const fetchAccountInfo = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to view account information.");
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/ap/account", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to load account data.");

        const data = await res.json();
        setOriginalData(data);
        setForm({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
      } catch (err) {
        console.error(err);
        alert("Unable to fetch account information.");
      } finally {
        setLoading(false);
      }
    };

    fetchAccountInfo();
  }, []);

  // ✅ Handle form field updates
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Submit update request
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password && form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const token = localStorage.getItem("token");
    const updatedData = {
      firstName: form.firstName || originalData.firstName,
      lastName: form.lastName || originalData.lastName,
      email: form.email || originalData.email,
      password: form.password || undefined, // only send if changed
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/ap/account", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) throw new Error("Update failed.");

      alert("Account information updated successfully!");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to update account information.");
    }
  };

  if (loading) return <div>Loading account information...</div>;

  return (
    <div className="account-page">
      <h1 className="account-heading">Applicant Account</h1>
      <p className="account-subtext">Update your personal information below.</p>
      <hr />

      <div className="account-card">
        <form onSubmit={handleSubmit} className="account-form">
          <h3 className="section-title">Edit Account Info</h3>

          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder={originalData.firstName || "e.g. John"}
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder={originalData.lastName || "e.g. Doe"}
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder={originalData.email || "e.g. john.doe@example.com"}
            />
          </div>

          <h3 className="section-title">Change Password</h3>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter new password"
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter new password"
            />
          </div>

          <button type="submit" className="btn-dark2">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}

export default APAccount;
