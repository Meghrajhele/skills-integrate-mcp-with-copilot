document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const authBtn = document.getElementById("auth-btn");
  const authStatus = document.getElementById("auth-status");
  const loginModal = document.getElementById("login-modal");
  const closeBtn = document.querySelector(".close-btn");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");

  let authToken = localStorage.getItem("authToken");
  let currentUsername = localStorage.getItem("username");

  // Initialize UI based on login state
  function updateAuthUI() {
    if (authToken) {
      authBtn.textContent = "🚪 Logout";
      authStatus.textContent = `Logged in as: ${currentUsername}`;
      authStatus.classList.remove("hidden");
      document.getElementById("signup-container").classList.remove("hidden");
      document.getElementById("signup-container").innerHTML = `
        <h3>Manage Student Registrations</h3>
        <p>As a teacher, you can register and unregister students from activities.</p>
        <div class="form-group">
          <label for="teacher-email">Student Email:</label>
          <input type="email" id="teacher-email" placeholder="student@mergington.edu" />
        </div>
        <div class="form-group">
          <label for="teacher-activity">Select Activity:</label>
          <select id="teacher-activity">
            <option value="">-- Select an activity --</option>
          </select>
        </div>
        <button id="register-btn">Register Student</button>
        <div id="message" class="hidden"></div>
      `;
      
      // Re-populate activity options for teacher
      const teacherActivitySelect = document.getElementById("teacher-activity");
      const activities = document.querySelectorAll(".activity-card");
      activities.forEach(card => {
        const title = card.querySelector("h4").textContent;
        const option = document.createElement("option");
        option.value = title;
        option.textContent = title;
        teacherActivitySelect.appendChild(option);
      });

      // Add register button listener
      document.getElementById("register-btn").addEventListener("click", handleTeacherRegister);
    } else {
      authBtn.textContent = "👤 Login";
      authStatus.classList.add("hidden");
      document.getElementById("signup-container").classList.add("hidden");
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons (only if teacher is logged in)
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants (${details.participants.length}/${details.max_participants}):</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        authToken
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);
      });

      // Add event listeners to delete buttons only if logged in
      if (authToken) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleTeacherUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle teacher unregister
  async function handleTeacherUnregister(event) {
    event.preventDefault();
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&token=${encodeURIComponent(authToken)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle teacher register
  async function handleTeacherRegister() {
    const email = document.getElementById("teacher-email").value;
    const activity = document.getElementById("teacher-activity").value;

    if (!email || !activity) {
      showMessage("Please select both email and activity", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        document.getElementById("teacher-email").value = "";
        document.getElementById("teacher-activity").value = "";
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to register. Please try again.", "error");
      console.error("Error registering:", error);
    }
  }

  // Show message helper
  function showMessage(text, type) {
    const messageDiv = document.getElementById("message");
    if (!messageDiv) return;
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Authentication handlers
  authBtn.addEventListener("click", () => {
    if (authToken) {
      // Logout
      localStorage.removeItem("authToken");
      localStorage.removeItem("username");
      authToken = null;
      currentUsername = null;
      loginForm.reset();
      loginError.classList.add("hidden");
      updateAuthUI();
      fetchActivities();
    } else {
      // Show login modal
      loginModal.classList.remove("hidden");
    }
  });

  closeBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginError.classList.add("hidden");
  });

  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
      loginForm.reset();
      loginError.classList.add("hidden");
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        authToken = result.token;
        currentUsername = result.username;
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("username", currentUsername);
        loginModal.classList.add("hidden");
        loginForm.reset();
        loginError.classList.add("hidden");
        updateAuthUI();
        fetchActivities();
      } else {
        loginError.textContent = result.detail || "Login failed";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      loginError.textContent = "Login failed. Please try again.";
      loginError.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
