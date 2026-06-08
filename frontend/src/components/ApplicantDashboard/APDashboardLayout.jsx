import React, { useState, useEffect } from "react";
// 1. Import useNavigate
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Dashboard.css"; // Assuming this CSS file exists

function APDashboardLayout() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [applicantEmail, setApplicantEmail] = useState("Loading...");
  
  // 2. Add isLoading state
  const [isLoading, setIsLoading] = useState(true); 
  
  // 3. Get the navigate function
  const navigate = useNavigate();

  // Hook to fetch user email and verify auth
  useEffect(() => {
    const fetchUserEmail = async () => {
      const token = localStorage.getItem('token');

      // 4. Update useEffect to redirect
      if (!token) {
        setApplicantEmail("Not Logged In");
        navigate('/ap/login'); // Redirect to login
        return; // Stop execution
      }

      try {
        const response = await fetch("http://localhost:8000/user/me", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          setApplicantEmail("Session Expired");
          navigate('/ap/login'); // Redirect to login
          return; // Stop execution
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setApplicantEmail(data.email);
        
        // 5. Only set loading to false on success
        setIsLoading(false);

      } catch (error) {
        console.error("Error fetching user email:", error);
        setApplicantEmail("Error");
        localStorage.removeItem('token'); // Clear bad token
        navigate('/ap/login'); // Redirect on any error
      }
    };

    fetchUserEmail();
  }, [navigate]); // Add navigate to dependency array

  const linkClass = ({ isActive }) =>
    isActive ? "nav-link active-link" : "nav-link";

  const notifications = [
    { message: "Your application for Data Analyst was received", time: "30 m ago" },
    { message: "Software Engineer role moved to interview stage", time: "1 h ago" },
    { message: "New job posted: UX Designer", time: "2 h ago" },
  ];

  // 6. Add loading check
  // This prevents the dashboard from flashing before the user is redirected
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  // This JSX will only render if isLoading is false (i.e., auth is successful)
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
                <NavLink to="/ap-dashboard/account" className={linkClass}>
                  <i className="bi bi-person"></i> Account
                </NavLink>
              </li>
              <li>
                <NavLink to="/ap-dashboard/job-listings" className={linkClass}>
                  <i className="bi bi-briefcase"></i> Job Listings
                </NavLink>
              </li>
              <li>
                <NavLink to="/ap-dashboard/ap-dashboard-home" className={linkClass}>
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
                <NavLink to="/ap/login" className={linkClass} onClick={() => localStorage.removeItem('token')}>
                  <i className="bi bi-box-arrow-right"></i> Log out
                </NavLink>
              </li>
              <li>
                <NavLink to="/ap-dashboard/help" className={linkClass}>
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
            
            <span className="applicant-id">{applicantEmail}</span>
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

export default APDashboardLayout;