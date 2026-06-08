import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./HRDashboard.css";

function HRDashboardLayout() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [hrEmail, setHrEmail] = useState("Loading...");
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  // ✅ Verify token & fetch HR email
  useEffect(() => {
    const fetchHrEmail = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setHrEmail("Not Logged In");
        navigate("/hr/login");
        return;
      }

      try {
        const response = await fetch("http://localhost:8000/user/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          setHrEmail("Session Expired");
          navigate("/hr/login");
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // ✅ Ensure only HR users can access this dashboard
        if (data.role !== "hr") {
          localStorage.removeItem("token");
          navigate("/hr/login");
          return;
        }

        setHrEmail(data.email);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching HR email:", error);
        setHrEmail("Error");
        localStorage.removeItem("token");
        navigate("/hr/login");
      }
    };

    fetchHrEmail();
  }, [navigate]);

  const linkClass = ({ isActive }) =>
    isActive ? "nav-link active-link" : "nav-link";

  const notifications = [
    { message: "New applicant submitted a resume", time: "30 m ago" },
    { message: "Job listing approved", time: "1 h ago" },
    { message: "Interview scheduled for Nov 3", time: "3 h ago" },
  ];

  // 🕐 Prevent UI flash while verifying token
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <h2>Loading...</h2>
      </div>
    );
  }

  // ✅ Render only after auth success
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-header">
            <img src="/logo.png" alt="Resumetrics Logo" className="logo-icon" />
            <h4 className="logo-text">Resumetrics</h4>
          </div>

          <nav>
            <ul>
              <li>
                <NavLink to="/hr-dashboard/account" className={linkClass}>
                  <i className="bi bi-person"></i> Account
                </NavLink>
              </li>
              <li>
                <NavLink to="/hr-dashboard/job-listings" className={linkClass}>
                  <i className="bi bi-briefcase"></i> Job Listings
                </NavLink>
              </li>
              <li>
                <NavLink to="/hr-dashboard/hr-dashboard-home" className={linkClass}>
                  <i className="bi bi-speedometer2"></i> Dashboard
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <hr />
          <nav>
            <ul>
              <li>
                <NavLink
                  to="/hr/login"
                  className={linkClass}
                  onClick={() => localStorage.removeItem("token")}
                >
                  <i className="bi bi-box-arrow-right"></i> Log out
                </NavLink>
              </li>
              <li>
                <NavLink to="/hr-dashboard/help" className={linkClass}>
                  <i className="bi bi-question-circle"></i> Help
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-right">
            

            <span className="hr-id">{hrEmail}</span>
            <div className="user-icon">
              <i className="bi bi-person-circle"></i>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default HRDashboardLayout;
