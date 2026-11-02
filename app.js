"use strict";

const STORAGE_KEY = "studystack.tasks";
const taskForm = document.querySelector("#task-form");
const taskList = document.querySelector("#task-list");
const taskTemplate = document.querySelector("#task-template");
const searchInput = document.querySelector("#search-input");
const filterButtons = [...document.querySelectorAll(".filter-button")];
const formFeedback = document.querySelector("#form-feedback");

const fields = {
  title: document.querySelector("#task-title"),
  subject: document.querySelector("#task-subject"),
  dueDate: document.querySelector("#task-date"),
  minutes: document.querySelector("#task-time"),
  priority: document.querySelector("#task-priority"),
};

const errors = {
  title: document.querySelector("#title-error"),
  subject: document.querySelector("#subject-error"),
  dueDate: document.querySelector("#date-error"),
  minutes: document.querySelector("#time-error"),
};

let tasks = loadTasks();
let activeFilter = "all";

function loadTasks() {
  try {
    const storedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(storedTasks)) {
      throw new Error("Saved tasks are not in the expected format.");
    }

    return storedTasks.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.subject === "string" &&
      typeof task.dueDate === "string" &&
      Number.isFinite(task.minutes) &&
      ["low", "medium", "high"].includes(task.priority) &&
      typeof task.completed === "boolean"
    );
  } catch (error) {
    console.error("Could not load StudyStack tasks:", error);
    showStorageMessage("Saved tasks could not be read. Your new tasks may not be saved.");
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save StudyStack tasks:", error);
    showStorageMessage("Could not save your task. Check your browser storage and try again.");
    return false;
  }
}

function showStorageMessage(message) {
  formFeedback.textContent = message;
  formFeedback.classList.add("error");
}

function dateToLocalISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setMinimumDueDate() {
  fields.dueDate.min = dateToLocalISO(new Date());
}

function showFieldError(name, message) {
  errors[name].textContent = message;
  const input = name === "dueDate" ? fields.dueDate : fields[name];
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateForm(data) {
  const validationErrors = {};
  const title = data.title.trim();
  const subject = data.subject.trim();
  const today = dateToLocalISO(new Date());

  if (!title) {
    validationErrors.title = "Please enter a task name.";
  } else if (title.length < 3) {
    validationErrors.title = "Task name must be at least 3 characters.";
  } else if (title.length > 60) {
    validationErrors.title = "Task name must be 60 characters or fewer.";
  }

  if (!subject) {
    validationErrors.subject = "Please enter a subject.";
  } else if (subject.length > 30) {
    validationErrors.subject = "Subject must be 30 characters or fewer.";
  }

  if (!data.dueDate) {
    validationErrors.dueDate = "Please choose a due date.";
  } else if (
    !/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate) ||
    Number.isNaN(Date.parse(`${data.dueDate}T00:00:00`)) ||
    dateToLocalISO(new Date(`${data.dueDate}T00:00:00`)) !== data.dueDate
  ) {
    validationErrors.dueDate = "Please enter a valid date.";
  } else if (data.dueDate < today) {
    validationErrors.dueDate = "Due date cannot be in the past.";
  }

  if (!Number.isInteger(data.minutes) || data.minutes < 5 || data.minutes > 480) {
    validationErrors.minutes = "Choose a whole number from 5 to 480 minutes.";
  }

  return { validationErrors, title, subject };
}

function formatDueDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function createMetaIcon(type) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.7");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  if (type === "date") {
    path.setAttribute("d", "M7 3v3m10-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z");
  } else {
    path.setAttribute("d", "M12 7v5l3 2m5-2a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z");
  }

  svg.append(path);
  return svg;
}

function createTaskCard(task) {
  const card = taskTemplate.content.firstElementChild.cloneNode(true);
  const checkButton = card.querySelector(".task-check");
  const deleteButton = card.querySelector(".delete-task");
  const dueMeta = card.querySelector(".due-meta");
  const timeMeta = card.querySelector(".time-meta");
  const priorityLabels = { low: "Low-key", medium: "Focus", high: "Top priority" };

  card.dataset.taskId = task.id;
  card.classList.toggle("is-completed", task.completed);
  card.querySelector(".subject-tag").textContent = task.subject;
  card.querySelector(".task-title").textContent = task.title;

  const priorityTag = card.querySelector(".priority-tag");
  priorityTag.textContent = priorityLabels[task.priority];
  if (task.priority !== "medium") {
    priorityTag.classList.add(`priority-${task.priority}`);
  }

  dueMeta.append(createMetaIcon("date"), document.createTextNode(`Due ${formatDueDate(task.dueDate)}`));
  if (!task.completed && task.dueDate < dateToLocalISO(new Date())) {
    dueMeta.classList.add("is-overdue");
    dueMeta.lastChild.textContent = `Overdue · ${formatDueDate(task.dueDate)}`;
  }
  timeMeta.append(createMetaIcon("time"), document.createTextNode(`${task.minutes} min`));
  checkButton.setAttribute("aria-label", task.completed ? "Mark task as not done" : "Mark task complete");

  checkButton.addEventListener("click", () => toggleTask(task.id));
  deleteButton.addEventListener("click", () => deleteTask(task.id));
  return card;
}

function renderTasks() {
  const searchTerm = searchInput.value.trim().toLocaleLowerCase();
  const visibleTasks = tasks
    .filter((task) => {
      const matchesFilter = activeFilter === "all" ||
        (activeFilter === "completed" ? task.completed : !task.completed);
      const matchesSearch = `${task.title} ${task.subject}`.toLocaleLowerCase().includes(searchTerm);
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]);
    });

  taskList.replaceChildren();
  if (visibleTasks.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    const illustration = document.createElement("span");
    illustration.className = "empty-illustration";
    illustration.setAttribute("aria-hidden", "true");
    illustration.textContent = searchTerm ? "⌕" : "✳";
    const title = document.createElement("h3");
    const description = document.createElement("p");
    if (tasks.length === 0) {
      title.textContent = "A fresh page.";
      description.textContent = "Add your first task and start making a plan that feels good.";
    } else if (searchTerm) {
      title.textContent = "Nothing found just yet.";
      description.textContent = "Try another search, or adjust your filters.";
    } else if (activeFilter === "completed") {
      title.textContent = "Your wins will show up here.";
      description.textContent = "Mark a task done and take a moment to feel good about it.";
    } else {
      title.textContent = "All caught up.";
      description.textContent = "You have no tasks to do right now. Enjoy the breathing room.";
    }
    emptyState.append(illustration, title, description);
    taskList.append(emptyState);
  } else {
    taskList.append(...visibleTasks.map(createTaskCard));
  }

  document.querySelector("#total-count").innerHTML = `${tasks.length} <span>task${tasks.length === 1 ? "" : "s"}</span>`;
  const plannedMinutes = tasks.filter((task) => !task.completed).reduce((total, task) => total + task.minutes, 0);
  document.querySelector("#time-count").innerHTML = `${plannedMinutes} <span>min</span>`;
  const completedCount = tasks.filter((task) => task.completed).length;
  document.querySelector("#done-count").innerHTML = `${completedCount} <span>task${completedCount === 1 ? "" : "s"}</span>`;
  document.querySelector("#all-filter-count").textContent = String(tasks.length);
}

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  if (saveTasks()) {
    renderTasks();
  } else {
    task.completed = !task.completed;
  }
}

function deleteTask(id) {
  const previousTasks = tasks;
  tasks = tasks.filter((task) => task.id !== id);
  if (saveTasks()) {
    renderTasks();
  } else {
    tasks = previousTasks;
    renderTasks();
  }
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formFeedback.textContent = "";
  formFeedback.classList.remove("error");

  const data = {
    title: fields.title.value,
    subject: fields.subject.value,
    dueDate: fields.dueDate.value,
    minutes: Number(fields.minutes.value),
    priority: fields.priority.value,
  };
  const { validationErrors, title, subject } = validateForm(data);
  Object.keys(errors).forEach((name) => showFieldError(name, validationErrors[name] || ""));

  if (Object.keys(validationErrors).length > 0) {
    formFeedback.textContent = "A couple of details need your attention.";
    formFeedback.classList.add("error");
    const firstInvalidField = Object.keys(errors).find((name) => validationErrors[name]);
    (firstInvalidField === "dueDate" ? fields.dueDate : fields[firstInvalidField]).focus();
    return;
  }

  const task = {
    id: crypto.randomUUID(),
    title,
    subject,
    dueDate: data.dueDate,
    minutes: data.minutes,
    priority: data.priority,
    completed: false,
  };
  tasks.unshift(task);
  if (!saveTasks()) {
    tasks.shift();
    return;
  }

  taskForm.reset();
  fields.minutes.value = "30";
  setMinimumDueDate();
  formFeedback.textContent = "Task added to your list. Nice work!";
  filterButtons.forEach((button) => {
    const isAll = button.dataset.filter === "all";
    button.classList.toggle("active", isAll);
    button.setAttribute("aria-pressed", String(isAll));
  });
  activeFilter = "all";
  searchInput.value = "";
  renderTasks();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
    renderTasks();
  });
});

searchInput.addEventListener("input", renderTasks);

Object.entries(fields).forEach(([name, input]) => {
  if (errors[name]) {
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") {
        showFieldError(name, "");
      }
    });
  }
});

setMinimumDueDate();
renderTasks();
