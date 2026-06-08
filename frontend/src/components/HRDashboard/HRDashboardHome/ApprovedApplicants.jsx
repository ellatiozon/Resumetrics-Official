import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 

export default function ApprovedApplicants() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // ⭐ Track which application is expanded
    const [expandedAppId, setExpandedAppId] = useState(null);

    // ⭐ Fetch Approved Applications
    const fetchApprovedApplications = async () => {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
            setError("Authentication failed. Please log in.");
            setLoading(false);
            navigate("/hr/login"); 
            return;
        }

        try {
            const res = await fetch("http://127.0.0.1:8000/applications/approved", {
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

            if (!res.ok) {
                throw new Error(`Failed to fetch approved applications: ${res.status}`);
            }

            const data = await res.json();
            setApplications(data);
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Could not load approved applications. Server error.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovedApplications();
    }, [navigate]);

    // ⭐ Toggle expand/collapse
    const toggleExpand = (id) => {
        setExpandedAppId(expandedAppId === id ? null : id);
    };

    // --- Loading and Error Handling ---
    if (loading) {
        return <div style={{ padding: '20px' }}>Loading approved applicants...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
    }

    if (applications.length === 0) {
        return <div style={{ padding: '20px' }}>No applicants have been approved yet.</div>;
    }

    // --- Render Approved Applications ---
    return (
        <div className="approved-applicants-page" style={{ padding: '20px' }}>
            <h3 className="form-title">Approved Applicants ({applications.length})</h3>
            <hr />

            {applications.map((app) => (
                <React.Fragment key={app._id}>
                    {/* Main row */}
                    <div 
                        className="pending-container" 
                        style={{
                            marginBottom: '5px', 
                            padding: '15px', 
                            border: '1px solid #ccc', 
                            borderRadius: '5px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            cursor: 'pointer'
                        }}
                        onClick={() => toggleExpand(app._id)}
                    >
                        <div className="pending-left" style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="icon-box" style={{ marginRight: '15px' }}>
                                <i className="bi bi-check-circle-fill" style={{ fontSize: '24px' }}></i>
                            </div>
                            <div className="pending-info">
                                <h3>Applicant: {app._id}</h3>
                                <p>Applying for: {app.title}</p>
                                <p>Suitability Score: <span>{app.suitability_score}%</span></p>
                            </div>
                        </div>
                        
                    </div>

                    {/* Expanded details */}
                    {expandedAppId === app._id && (
                        <div
                            className="applicant-details"
                            style={{
                                padding: "20px",
                                border: "1px solid #eee",
                                borderTop: "none",
                                background: "#f9f9f9",
                                marginBottom: "10px",
                                borderRadius: "0 0 5px 5px",
                                margin: "0 5px 10px 5"
                            }}
                        >
                            <strong>Education:</strong>
                            {app.education && app.education.length > 0 ? (
                                <ul>
                                    {app.education.map((edu, idx) => (
                                        <li key={idx}>
                                            {edu.degree || 'N/A'} in {edu.field || 'N/A'} - {edu.school|| 'N/A'} ({edu.duration || 'N/A'})
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>No education data extracted.</p>}

                            <p><strong>Total Experience:</strong> {app.total_experience_years || 0} years</p>
                            {app.experience && app.experience.length > 0 ? (
                                <ul>
                                    {app.experience.map((exp, idx) => (
                                        <li key={idx}>
                                            {exp.role || 'N/A'} at {exp.company || 'N/A'} ({exp.duration || 'N/A'})
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>No experience data extracted.</p>}
                            <p><strong>Skills Matched:</strong> {app.skills_matched?.join(", ") || "None"}</p>
                            <p><strong>Missing Skills:</strong> {app.skills_missing?.join(", ") || "None"}</p>
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}
