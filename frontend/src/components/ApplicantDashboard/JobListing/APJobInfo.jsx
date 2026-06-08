import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function APJobInfo() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const job = state?.job;

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [applicationConfirmed, setApplicationConfirmed] = useState(false);

  if (!job) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>Job Details Not Found 🧐</h1>
        <p>
          Please return to the{" "}
          <span
            onClick={() => navigate("/ap-dashboard/jobs")}
            style={{
              color: "#2B2D42",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Job Listings
          </span>{" "}
          page to select a job.
        </p>
      </div>
    );
  }

  const formatSalary = (minRate, maxRate, rateType) => {
    return `₱${minRate} - ₱${maxRate} per ${rateType}`;
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadError(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a resume file first.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setUploading(false);
      setUploadError("Authentication failed. Please log in.");
      return;
    }

    const jobId = job._id;
    if (!jobId) {
      setUploading(false);
      setUploadError("Error: Job ID is missing. Cannot submit application.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", selectedFile);

    const requiredSkillsString = job.skills.join(",");

    const url = `http://127.0.0.1:8000/analyze?required_skills=${encodeURIComponent(
      requiredSkillsString
    )}&job_id=${encodeURIComponent(jobId)}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.status === 401) {
        throw new Error("Unauthorized. Session expired.");
      }

      if (!res.ok) {
        const text = await res.text();
        try {
          const errorData = JSON.parse(text);
          const detailMessage =
            errorData.detail?.[0]?.msg || JSON.stringify(errorData);
          throw new Error(`Validation failed: ${detailMessage}`);
        } catch {
          throw new Error(`Server returned status ${res.status}: ${text}`);
        }
      }

      setApplicationConfirmed(true);
    } catch (error) {
      console.error("Analysis Error:", error);
      setUploadError(`Application failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const disableUpload = uploading || applicationConfirmed;

  return (
    <div style={{ padding: "20px" }}>
      <hr />
      <div className="job-container">
        <h1 style={{ marginBottom: "5px" }}>{job.title}</h1>
        <p>🏢 {job.company_name}</p>
        <p>📍 {job.category}</p>
        <p>🕒 {job.type}</p>
        <p>💵 {formatSalary(job.min_rate, job.max_rate, job.rate_type)}</p>
        {job.min_experience > 0 && (
          <p>
            🧑‍💼 Minimum Experience: {job.min_experience}{" "}
            {job.min_experience === 1 ? "year" : "years"}
          </p>
        )}
        <p style={{ color: "#888" }}>Deadline: {job.deadline}</p>

        <div
          className="job-actions"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          {applicationConfirmed && (
            <div
              style={{
                padding: "15px",
                backgroundColor: "#d4edda",
                color: "#155724",
                border: "1px solid #c3e6cb",
                borderRadius: "5px",
                textAlign: "center",
              }}
            >
              Application Submitted! Your resume has been successfully analyzed
              and submitted.
            </div>
          )}

          {!applicationConfirmed && (
            <>
              <input
                type="file"
                accept=".pdf,.docx,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                disabled={disableUpload}
                style={{
                  padding: "10px",
                  border: disableUpload
                    ? "1px solid #888"
                    : "1px solid #ccc",
                  borderRadius: "5px",
                }}
              />

              <button
                className="apply-btn"
                onClick={handleFileUpload}
                disabled={!selectedFile || disableUpload}
                style={{
                  backgroundColor:
                    !selectedFile || disableUpload ? "#ccc" : "#2B2D42",
                  cursor:
                    !selectedFile || disableUpload ? "not-allowed" : "pointer",
                }}
              >
                {uploading ? "Analyzing..." : "Analyze Resume & Apply"}
              </button>
              <p style={{ color: "#888", fontSize: "12px" }}>
                {selectedFile
                  ? `Selected: ${selectedFile.name}`
                  : "Select your resume to start analysis."}
              </p>
            </>
          )}

          {uploadError && (
            <p style={{ color: "red", fontWeight: "bold" }}>
              Error: {uploadError}
            </p>
          )}
        </div>

        <hr style={{ margin: "30px 0" }} />

        <h2>Job Description</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{job.description}</p>

        <h2>Required Skills</h2>
        {job.skills && job.skills.length > 0 ? (
          <ul style={{ listStyleType: "disc", marginLeft: "20px" }}>
            {job.skills.map((skill, index) => (
              <li key={index}>{skill}</li>
            ))}
          </ul>
        ) : (
          <p>No specific skills listed.</p>
        )}
      </div>
    </div>
  );
}

export default APJobInfo;
