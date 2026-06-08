import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function APJobListings() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]); // for search filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // search query state

  useEffect(() => {
    const fetchJobs = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("You must be logged in to view job listings.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/jobs", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          setError("Session expired. Please log in again.");
          localStorage.removeItem("token");
          return;
        }

        const data = await res.json();

        // Sort newest to oldest using ObjectId timestamp
        const sortedJobs = data.sort((a, b) => {
          const timeA = parseInt(a._id.substring(0, 8), 16);
          const timeB = parseInt(b._id.substring(0, 8), 16);
          return timeB - timeA; // Newest first
        });

        setJobs(sortedJobs);
        setFilteredJobs(sortedJobs); // initialize filtered jobs
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load jobs. Server might be down.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [navigate]);

  const formatSalary = (minRate, maxRate, rateType) =>
    `₱${minRate} - ₱${maxRate} per ${rateType}`;

  // ⭐ Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    const filtered = jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(value.toLowerCase()) ||
        (job.company_name && job.company_name.toLowerCase().includes(value.toLowerCase())) ||
        (job.category && job.category.toLowerCase().includes(value.toLowerCase()))
    );
    setFilteredJobs(filtered);
  };

  if (loading) return <div>Loading job listings...</div>;
  if (error)
    return <div style={{ color: "red", padding: "20px" }}>Error: {error}</div>;
  if (jobs.length === 0) return <div>No jobs are currently posted.</div>;

  return (
    <div>
      <h1>Current Available Job Listings ({filteredJobs.length})</h1>
      <hr />
      <br />

      {/* 🔍 Search bar */}
      <div className="search-container">
        <i className="bi bi-search search-icon"></i>
        <input
          type="text"
          placeholder="Search for jobs"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>
      <br />

      <div className="job-container">
        {filteredJobs.map((job) => (
          <div
            key={job._id}
            className="job-card"
            onClick={() =>
              navigate(`/ap-dashboard/job-info/${job._id}`, { state: { job } })
            }
            style={{ cursor: "pointer" }}
          >
            <div className="suggested-left">
              <div className="icon-box">
                <i className={`bi bi-briefcase-fill`}></i>
              </div>
              <div className="job-info">
                <h3>{job.title}</h3>
                <p className="job-description">{job.description}</p>
                <p className="job-meta">
                  <strong>Company:</strong> {job.company_name}
                </p>
                {job.address && (
                  <p className="job-meta">
                    <strong>Address:</strong> {job.address}
                  </p>
                )}
                <p className="job-meta">
                  <strong>Category:</strong> {job.category}
                </p>
                <p className="job-meta">
                  <strong>Type:</strong> {job.type}
                </p>
                <p className="job-meta">
                  <strong>Salary:</strong> {formatSalary(job.min_rate, job.max_rate, job.rate_type)}
                </p>
                {job.min_experience > 0 && (
                  <p className="job-meta">
                    <strong>Minimum Experience:</strong> {job.min_experience}{" "}
                    {job.min_experience === 1 ? "year" : "years"}
                  </p>
                )}
              </div>
            </div>

            <div className="job-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="apply-btn"
                onClick={() =>
                  navigate(`/ap-dashboard/job-info/${job._id}`, {
                    state: { job },
                  })
                }
              >
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default APJobListings;
