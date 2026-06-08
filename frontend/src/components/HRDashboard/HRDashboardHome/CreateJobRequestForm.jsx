import React, { useState, useEffect } from "react";
import "./HRDashboard.css";

function CreateJobRequestForm() {
  const [form, setForm] = useState({
  title: "",
  category: "",
  type: "Part-time",
  deadline: "",
  openings: 1,
  start_date: "",
  end_date: "",
  min_rate: "",
  max_rate: "",
  rate_type: "Month",
  description: "",
  skills: [],
  min_experience: 0
});

  const [skillQuery, setSkillQuery] = useState("");
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch skills from backend
  useEffect(() => {
    if (skillQuery.length > 1) {
      fetch(`http://127.0.0.1:8000/skills?q=${skillQuery}`)
        .then((res) => res.json())
        .then((data) => setSkillSuggestions(data))
        .catch(() => setSkillSuggestions([]));
    } else {
      setSkillSuggestions([]);
    }
  }, [skillQuery]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "openings" || name === "min_experience") {
      newValue = parseInt(value, 10) || 0;
    }
    setForm({ ...form, [name]: newValue });
  };

  const addSkill = (skill) => {
    if (!form.skills.includes(skill)) {
      setForm({ ...form, skills: [...form.skills, skill] });
    }
    setSkillQuery("");
    setSkillSuggestions([]);
  };

  const removeSkill = (skill) => {
    setForm({ ...form, skills: form.skills.filter((s) => s !== skill) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Error: Authentication required. Please log in as HR.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form), // company_name removed
      });

      if (res.ok) {
        setMessage("Job published successfully!");
        setForm({
          title: "",
          category: "",
          type: "Part-time",
          deadline: "",
          min_rate: "",
          max_rate: "",
          rate_type: "Month",
          description: "",
          skills: [],
          min_experience: 0,
        });
      } else {
        const errorData = await res.json();
        setMessage(`Failed to publish job. Error: ${errorData.detail || res.statusText}`);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage("Network or Server connection error — please try again.");
    }
  };

  return (
    <div className="job-form-container">
      <h3 className="form-title">Create Job Request Form</h3>
      {message && <div className="alert alert-info">{message}</div>}

      <form onSubmit={handleSubmit} className="job-form">
        {/* Job Title */}
        <div className="mb-3">
          <label className="form-label">Job Title</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="form-control"
            placeholder="Software Engineer"
            required
          />
        </div>

        {/* Job Category */}
        <div className="mb-3">
          <label className="form-label">Job Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="form-control1"
            required
          >
            <option value="">-- Select Category --</option>
            <option value="ICT">Information & Communication Technology</option>
            <option value="Accounting">Accounting</option>
            <option value="Retail">Retail</option>
            <option value="Finance">Banking & Financial Services</option>
            <option value="Admin">Administration & Office Support</option>
            <option value="Advertising">Advertising, Arts & Media</option>
            <option value="Community">Community Services & Development</option>
            <option value="Construction">Construction</option>
            <option value="Architecture">Design & Architecture</option>
            <option value="Education">Education & Training</option>
            <option value="Engineering">Engineering</option>
            <option value="Farming">Farming, Animals & Conservation</option>
            <option value="Government">Government & Defence</option>
            <option value="Medical">Healthcare & Medical</option>
            <option value="Sales">Sales</option>
            <option value="Legal">Legal</option>
            <option value="Marketing">Marketing & Communications</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Required Skills */}
        <div className="mb-3">
          <label className="form-label">Required Skills</label>
          <input
            type="text"
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const trimmed = skillQuery.trim();
                if (trimmed) addSkill(trimmed);
              }
            }}
            className="form-control"
            placeholder="Type a skill..."
          />
          {skillSuggestions.length > 0 && (
            <ul className="list-group mt-2">
              {skillSuggestions.map((s, i) => (
                <li
                  key={i}
                  className="list-group-item list-group-item-action"
                  style={{ cursor: "pointer" }}
                  onClick={() => addSkill(s)}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 d-flex flex-wrap gap-2">
            {form.skills.map((skill, i) => (
              <span key={i} className="badge bg-primary">
                {skill}{" "}
                <button
                  type="button"
                  className="btn-close btn-close-white btn-sm ms-2"
                  onClick={() => removeSkill(skill)}
                ></button>
              </span>
            ))}
          </div>
        </div>

        {/* Minimum Years of Experience */}
        <div className="mb-3">
          <label className="form-label">Minimum Year of Experience</label>
          <input
            type="number"
            name="min_experience"
            value={form.min_experience}
            onChange={handleChange}
            className="form-control3"
            placeholder="e.g. 2"
            min="0"
            required
          />
        </div>

        {/* Employment Type */}
        <div className="mb-3">
          <label className="form-label">Employment Type</label>
          <div className="d-flex gap-3">
            {["Part-time", "Full-time", "Internship", "Contract"].map((type) => (
              <label key={type}>
                <input
                  type="radio"
                  name="type"
                  value={type}
                  checked={form.type === type}
                  onChange={handleChange}
                />{" "}
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Deadline */}
        <div className="mb-3">
          <label className="form-label">Deadline</label>
          <input
            type="date"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            className="form-control2"
            required
          />
        </div>

        {/* Rate Amount */}
        <div className="row mb-3">
          <div className="col">
            <label className="form-label">Rate Amount (Min)</label>
            <input
              type="text"
              name="min_rate"
              value={form.min_rate}
              onChange={handleChange}
              className="form-control3"
              placeholder="PHP 35,000"
              required
            />
          </div>
          <div className="col">
            <label className="form-label">Rate Amount (Max)</label>
            <input
              type="text"
              name="max_rate"
              value={form.max_rate}
              onChange={handleChange}
              className="form-control3"
              placeholder="PHP 50,000"
              required
            />
          </div>
          <div className="rate-type-left">
            <label className="form-label">Per</label>
            <select
              name="rate_type"
              value={form.rate_type}
              onChange={handleChange}
              className="form-control3"
            >
              <option value="Month">Month</option>
              <option value="Day">Day</option>
              <option value="Hour">Hour</option>
            </select>
          </div>
        </div>

        {/* Job Description */}
        <div className="mb-3">
          <label className="form-label">Job Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="form-control4"
            rows="5"
            required
          ></textarea>
        </div>

        {/* Actions */}
        <div className="d-flex gap-3btn">
          <button type="submit" className="btn btn-dark">
            Publish
          </button>
          <button type="button" className="btn btn-secondary">
            Save to Draft
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateJobRequestForm;
