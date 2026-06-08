import React, { useEffect, useState } from "react";
import "../HRDashboard.css";

function HRJobListings() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]); // Filtered jobs based on search
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const options = [
  ];

  // --- Fetch HR info ---
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Not authenticated. Please log in.");
          setLoading(false);
          return;
        }

        const res = await fetch("http://localhost:8000/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setUserEmail(data.email);
        else setError(data.detail || "Failed to fetch user info");
      } catch (err) {
        console.error("User fetch error:", err);
        setError("Error fetching user info");
      }
    };

    fetchUserProfile();
  }, []);

  // --- Fetch all jobs and filter by HR email ---
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("http://localhost:8000/jobs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) {
          const hrJobs = data.filter((job) => job.created_by === userEmail);
          setJobs(hrJobs);
          setFilteredJobs(hrJobs); // Initialize filtered jobs
        } else {
          setError(data.message || "Failed to load job listings");
        }
      } catch (err) {
        console.error("Job fetch error:", err);
        setError("Error connecting to server");
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) fetchJobs();
  }, [userEmail]);

  // --- Delete Job ---
  const handleDelete = async (jobId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this job?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const updatedJobs = jobs.filter((job) => job._id !== jobId);
        setJobs(updatedJobs);
        setFilteredJobs(updatedJobs.filter((job) => job.title.toLowerCase().includes(query.toLowerCase())));
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete job");
      }
    } catch (err) {
      console.error("Delete job error:", err);
      alert("Error deleting job");
    }
  };

  // --- Autocomplete + filter jobs ---
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Filter suggestions for dropdown
    const filteredSuggestions = options.filter((item) =>
      item.toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(filteredSuggestions);

    // Filter jobs list
    const filtered = jobs.filter((job) =>
      job.title.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredJobs(filtered);
  };

  return (
    <div>
      <h1>Job Listings</h1>

      {/* 🔍 Search */}
      <div className="search-container">
        <i className="bi bi-search search-icon"></i>
        <input
          type="text"
          placeholder="Search for job title"
          value={query}
          onChange={handleSearchChange}
        />
        {query && suggestions.length > 0 && (
          <ul className="dropdown-list">
            {suggestions.map((item, index) => (
              <li key={index} className="dropdown-item">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2>Current Job Listings</h2>
      <hr />

      {loading ? (
        <p>Loading job listings...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : filteredJobs.length === 0 ? (
        <p>
          No jobs found.{" "}
          <a
            href="/hr-dashboard/createrequest"
            style={{
              color: "#2B2D42",
              fontWeight: "600",
              textDecoration: "underline",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.target.style.color = "#1b1d2f")}
            onMouseLeave={(e) => (e.target.style.color = "#2B2D42")}
          >
            Create a new one!
          </a>
        </p>
      ) : (
        filteredJobs.map((job) => (
          <div className="pending-container" key={job._id}>
            <div className="pending-left">
              <div className="icon-box">
                <i className="bi bi-briefcase-fill"></i>
              </div>
              <div className="pending-info">
                <h3>{job.title}</h3>
                <p>
                  {job.category} | {job.type}
                </p>
                <small>
                  Deadline: {new Date(job.deadline).toLocaleDateString("en-US")}
                </small>
              </div>
            </div>

            {/* 🗑️ Remove Button */}
            <button
              className="apply-btn"
              onClick={() => handleDelete(job._id)}
            >
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default HRJobListings;
