import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 

// Helper function to get status styling
const getStatusStyle = (status) => {
  switch (status) {
    case "Approved":
      return { color: '#28a745', icon: 'bi-check-circle-fill' };
    case "Rejected":
      return { color: '#dc3545', icon: 'bi-x-circle-fill' };
    case "Pending":
    default:
      return { color: '#ffc107', icon: 'bi-clock-fill' };
  }
};

function APDashboardHome() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]); // filtered applications for search
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch applications submitted by the current logged-in user
  const fetchMyApplications = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Authentication failed. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/applications/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`, 
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch applications: ${res.status}`);
      }

      const data = await res.json();

      let filtered = data.filter(app => app.job_title && app.job_title !== "Job Deleted/Not Found");

      filtered.sort((a, b) => new Date(b.date_applied) - new Date(a.date_applied));

      setApplications(filtered);
      setFilteredApps(filtered); // initialize filtered list
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Could not load application statuses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyApplications();
  }, [navigate]);

  // ⭐ Handle search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    const filtered = applications.filter((app) =>
      app.job_title.toLowerCase().includes(value.toLowerCase()) ||
      (app.company_name && app.company_name.toLowerCase().includes(value.toLowerCase()))
    );

    setFilteredApps(filtered);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <hr/><br />

      {/* 🔍 Search */}
      <div className="search-container">
        <i className="bi bi-search search-icon"></i>
        <input 
          type="text" 
          placeholder="Find your applications..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <hr/>
      <h2>My Applications ({filteredApps.length})</h2>

      {loading && <p>Loading application statuses...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && filteredApps.length === 0 && !error && (
        <p>
          You haven't applied for any jobs yet.{" "}
          <span
            onClick={() => navigate("/ap-dashboard/job-listings")}
            style={{
              color: '#2B2D42',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            View open jobs.
          </span>
        </p>
      )}

      <div className="job-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredApps.map((app) => {
          const status = getStatusStyle(app.application_status);
          return (
            <div
              key={app.application_id}
              className="job-card"
              style={{ 
                padding: '15px', 
                border: `2px solid ${status.color}`, 
                borderRadius: '8px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}
            >
              <div className="suggested-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="icon-box" style={{ fontSize: '24px', color: status.color }}>
                  <i className={`bi ${status.icon}`}></i>
                </div>
                <div className="job-info">
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{app.job_title}</h3>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                    🏢 {app.company_name}
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#888' }}>
                    📍 {app.company_address}
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                    Applied on: {new Date(app.date_applied).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: status.color, fontSize: '16px' }}>
                  {app.application_status}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default APDashboardHome;
