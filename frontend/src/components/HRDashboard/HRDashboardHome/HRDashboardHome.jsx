import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HRHomeDashboard() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedAppId, setExpandedAppId] = useState(null);

    const toggleExpand = (appId) => {
        setExpandedAppId(prev => (prev === appId ? null : appId));
    };

    const fetchApplications = async () => {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
            setError("Authentication failed. Please log in.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("http://127.0.0.1:8000/applications", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (res.status === 401) {
                localStorage.removeItem("token");
                navigate("/hr/login");
                return;
            }

            if (!res.ok) throw new Error(`Failed to fetch applications: ${res.status}`);
            const data = await res.json();
            setApplications(data);
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Could not load applications. Server error.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [navigate]);

    const handleStatusUpdate = async (appId, status) => {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/hr/login");

        try {
            const res = await fetch(`http://127.0.0.1:8000/applications/${appId}/${status}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) throw new Error(`Failed to ${status} application.`);
            await fetchApplications();
        } catch (err) {
            console.error(`Error updating status to ${status}:`, err);
            alert(`Failed to update status: ${err.message}`);
        }
    };

    const handleApprove = (appId) => handleStatusUpdate(appId, "approve");
    const handleReject = (appId) => handleStatusUpdate(appId, "reject");

    // ⭐ Helper: Dynamic Tier Colors
    const getTierColor = (tier) => {
        switch (tier) {
            case "HIGH ALIGNMENT": return { bg: "#d4edda", text: "#155724", border: "#c3e6cb" }; // Green
            case "EXPERIENCED, BUT SKILL GAP": return { bg: "#fff3cd", text: "#856404", border: "#ffeeba" }; // Yellow
            case "SKILLED, BUT UNDER-EXPERIENCED": return { bg: "#cce5ff", text: "#004085", border: "#b8daff" }; // Blue
            case "LOW ALIGNMENT": return { bg: "#f8d7da", text: "#721c24", border: "#f5c6cb" }; // Red
            default: return { bg: "#e2e3e5", text: "#383d41", border: "#d6d8db" }; // Gray
        }
    };

    return (
        <div>
            <h1>Dashboard</h1>

            <div className="button-group">
                <button className="main-feature-btn" onClick={() => navigate("/hr-dashboard/createrequest")}>
                    <h3>Create Job Request</h3>
                    <i className="bi bi-pencil-square"></i>
                </button>
                <button className="main-feature-btn" onClick={() => navigate("/hr-dashboard/review")}>
                    <h3>Review Job Applicants</h3>
                    <i className="bi bi-view-list"></i>
                </button>
                <button className="main-feature-btn" onClick={() => navigate("/hr-dashboard/approved")}>
                    <h3>Approved Applicants</h3>
                    <i className="bi bi-archive-fill"></i>
                </button>
            </div>

            <h2>Pending AI Reviews ({applications.length})</h2>
            <hr />
            {loading && <p>Loading applicants...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {!loading && applications.length === 0 && <p>No pending applications for your posted jobs.</p>}

            {applications.map((app) => {
                const colors = getTierColor(app.tier);

                return (
                    <React.Fragment key={app._id}>
                        {/* THE MAIN CARD */}
                        <div
                            className="pending-container"
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                border: `2px solid ${colors.border}`,
                                background: "#fff",
                                marginBottom: expandedAppId === app._id ? "0px" : "15px",
                                padding: "15px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                borderLeft: `6px solid ${colors.text}`
                            }}
                            onClick={() => toggleExpand(app._id)}
                        >
                            <div className="pending-left" style={{ display: 'flex', alignItems: 'center' }}>
                                <div className="icon-box" style={{ marginRight: '20px', color: colors.text }}>
                                    <i className="bi bi-person-lines-fill" style={{ fontSize: '32px' }}></i>
                                </div>
                                <div className="pending-info">
                                    {/* Using Applicant ID to maintain anonymity as you mentioned */}
                                    <h3 style={{ margin: "0 0 5px 0", color: "#2c3e50" }}>Applicant ID: {app._id}</h3>
                                    <p style={{ margin: "0 0 8px 0", color: "#555" }}>Applying for: <strong>{app.title}</strong></p>
                                    
                                    <div style={{ 
                                        background: "#f8f9fa", 
                                        padding: "8px 12px", 
                                        borderRadius: "6px", 
                                        borderLeft: `4px solid ${colors.text}`,
                                        fontSize: "0.9em" 
                                    }}>
                                        <p style={{ margin: "0 0 4px 0", color: "#333" }}>
                                            <strong>Applicant Tier:</strong> 
                                            <span style={{ color: colors.text, fontWeight: "bold", marginLeft: "8px" }}>
                                                [ {app.tier || "UNCLASSIFIED"} ]
                                            </span>
                                        </p>
                                        <p style={{ margin: "0", color: "#333" }}>
                                            <strong>Action Recommended:</strong> 
                                            <span style={{ color: "#d9534f", fontWeight: "bold", marginLeft: "8px" }}>
                                                {app.action_required || "Manual Review"}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pending-btn-group" style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="icon-btn"
                                    style={{ background: "#28a745", color: "white", border: "none", padding: "10px", borderRadius: "5px", cursor: "pointer" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleApprove(app._id);
                                    }}
                                    title="Shortlist Applicant"
                                >
                                    <i className="bi bi-check-circle"></i> Approve
                                </button>
                                <button
                                    className="icon-btn"
                                    style={{ background: "#dc3545", color: "white", border: "none", padding: "10px", borderRadius: "5px", cursor: "pointer" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleReject(app._id);
                                    }}
                                    title="Reject Applicant"
                                >
                                    <i className="bi bi-x-circle"></i> Reject
                                </button>
                            </div>
                        </div>

                        {/* THE EXPANDED AI DETAILS */}
                        {expandedAppId === app._id && (
                            <div
                                className="applicant-details"
                                style={{
                                    padding: "20px",
                                    border: `2px solid ${colors.border}`,
                                    borderTop: "none",
                                    background: "#fdfdfd",
                                    marginBottom: "15px",
                                    borderRadius: "0 0 8px 8px",
                                    boxShadow: "inset 0px 4px 6px -6px rgba(0,0,0,0.1)"
                                }}
                            >
                                <div style={{ 
                                    background: "#f8f9fa", borderLeft: "4px solid #6c757d", 
                                    padding: "15px", marginBottom: "20px", borderRadius: "4px" 
                                }}>
                                    <h4 style={{ margin: "0 0 10px 0", color: "#343a40" }}>
                                        <i className="bi bi-robot"></i> AI Executive Synthesis
                                    </h4>
                                    <p style={{ margin: "0", fontSize: "0.95em", lineHeight: "1.5", color: "#495057" }}>
                                        {app.executive_summary || "No summary generated for this applicant. Please re-run the analysis."}
                                    </p>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                    <div>
                                        <h5 style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>Chronological Data</h5>
                                        <p><strong>Total Experience:</strong> {app.total_experience_years || 0} Years</p>
                                        {app.experience && app.experience.length > 0 ? (
                                            <ul style={{ paddingLeft: "20px", fontSize: "0.9em" }}>
                                                {app.experience.map((exp, idx) => (
                                                    <li key={idx}>{exp.role} at {exp.company} ({exp.duration})</li>
                                                ))}
                                            </ul>
                                        ) : <p>No experience data parsed.</p>}
                                        
                                        <h5 style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px", marginTop: "15px" }}>Education</h5>
                                        {app.education && app.education.length > 0 ? (
                                            <ul style={{ paddingLeft: "20px", fontSize: "0.9em" }}>
                                                {app.education.map((edu, idx) => (
                                                    <li key={idx}>{edu.school}</li>
                                                ))}
                                            </ul>
                                        ) : <sp>No education data parsed.</p>}
                                    </div>
                                    
                                    <div>
                                        <h5 style={{ borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>Semantic Skill Alignment</h5>
                                        <p><strong>Verified Competencies ({app.fraction_score || "N/A"}):</strong></p>
                                        <p style={{ color: "green", fontSize: "0.9em" }}>{app.skills_matched?.join(", ") || "None detected"}</p>
                                        
                                        <p><strong>Missing Requirements:</strong></p>
                                        <p style={{ color: "red", fontSize: "0.9em" }}>{app.missing_skills?.join(", ") || "None"}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}