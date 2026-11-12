/* A deliberately small, in-memory product illustration. No browser APIs, AI calls or storage. */
(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const seed = {
    reading: {
      title: "Weekend reading",
      subtitle: "Links worth keeping. Room to think.",
      collection: "Worth a read",
      note: "Keep a little corner of the internet that feels like a place, not a feed.",
      links: [
        {
          id: "handmade",
          title: "A handmade web",
          type: "Essay",
          domain: "luckysoap.com",
          url: "https://luckysoap.com/statements/handmadeweb.html",
          icon: "h",
          colour: "",
        },
        {
          id: "garden",
          title: "A garden on the internet",
          type: "Essay",
          domain: "maggieappleton.com",
          url: "https://maggieappleton.com/garden-history",
          icon: "a",
          colour: "garden",
        },
        {
          id: "mdn",
          title: "The web is what we make it",
          type: "Reference",
          domain: "developer.mozilla.org",
          url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
          icon: "m",
          colour: "web",
        },
      ],
      tasks: [
        { id: "read", text: "Revisit the garden essay", done: false },
        { id: "sketch", text: "Sketch a page of my own", done: false },
      ],
      extras: [
        {
          id: "smallweb",
          title: "Making room for the small web",
          type: "Reference",
          domain: "developer.mozilla.org",
          url: "https://developer.mozilla.org/en-US/docs/Web",
          icon: "w",
          colour: "web",
        },
        {
          id: "idea",
          title: "The shape of a good idea",
          type: "Reference",
          domain: "wikipedia.org",
          url: "https://en.wikipedia.org/wiki/Commonplace_book",
          icon: "W",
          colour: "",
        },
      ],
    },
    project: {
      title: "A small side project",
      subtitle: "Make something that feels like yours.",
      collection: "On the drawing board",
      note: "Start with one page. A few things I like, a few things I have made. Leave room for the rest.",
      links: [
        {
          id: "css",
          title: "A field guide to CSS",
          type: "Reference",
          domain: "developer.mozilla.org",
          url: "https://developer.mozilla.org/en-US/docs/Web/CSS",
          icon: "#",
          colour: "web",
        },
        {
          id: "type",
          title: "A typeface for the first draft",
          type: "Reference",
          domain: "fonts.google.com",
          url: "https://fonts.google.com/specimen/DM+Sans",
          icon: "Aa",
          colour: "design",
        },
      ],
      tasks: [
        { id: "idea-project", text: "Pick a small idea", done: false },
        { id: "first-page", text: "Make the first page", done: false },
      ],
      extras: [
        {
          id: "html",
          title: "HTML, from the beginning",
          type: "Reference",
          domain: "developer.mozilla.org",
          url: "https://developer.mozilla.org/en-US/docs/Web/HTML",
          icon: "h",
          colour: "web",
        },
        {
          id: "design",
          title: "Design notes to come back to",
          type: "Reference",
          domain: "maggieappleton.com",
          url: "https://maggieappleton.com/",
          icon: "a",
          colour: "garden",
        },
      ],
    },
  };
  let spaces = structuredClone(seed);
  let currentSpace = "reading";
  let currentView = "space";
  let sequence = 0;
  let undoAction = null;
  let toastTimer;
  let planAdded = false;

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#i-${name}`);
    svg.append(use);
    return svg;
  }

  function dismissToast() {
    clearTimeout(toastTimer);
    $("#toast").classList.remove("visible");
  }

  function notify(message, undo = null) {
    clearTimeout(toastTimer);
    undoAction = undo;
    $("#toast-message").textContent = message;
    $("#toast-undo").hidden = !undo;
    $("#toast").classList.add("visible");
    // Keep reversible actions available until dismissed or replaced.
    if (!undo) toastTimer = setTimeout(dismissToast, 6000);
  }

  function renderLinks(newIds = []) {
    const space = spaces[currentSpace];
    const query = $("#demo-search").value.trim().toLowerCase();
    const links =
      currentView === "library"
        ? Object.values(spaces).flatMap((item) => item.links)
        : space.links;
    const matches = links.filter((link) =>
      `${link.title} ${link.type} ${link.domain}`.toLowerCase().includes(query),
    );
    const list = $("#link-list");
    list.replaceChildren();
    for (const link of matches) {
      const anchor = document.createElement("a");
      anchor.className = `saved-link${newIds.includes(link.id) ? " new-item" : ""}`;
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.setAttribute("aria-label", `${link.title} (opens in a new tab)`);
      const mark = document.createElement("span");
      mark.className = `favicon ${link.colour}`;
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = link.icon;
      const copy = document.createElement("div");
      copy.className = "saved-link-copy";
      const title = document.createElement("h5");
      title.textContent = link.title;
      const meta = document.createElement("p");
      meta.textContent = `${link.type} · ${link.domain}`;
      copy.append(title, meta);
      anchor.append(mark, copy, icon("arrow"));
      list.append(anchor);
    }
    $("#saved-count").textContent =
      `${matches.length} ${matches.length === 1 ? "link" : "links"}`;
    $("#empty-search").hidden = matches.length !== 0;
    $("#collection-foot").hidden = query.length !== 0;
    $("#clear-search").hidden = query.length === 0;
    const available = space.extras.filter(
      (link) => !space.links.some((saved) => saved.id === link.id),
    );
    $("#save-tabs").disabled = available.length === 0;
    $("#save-tabs span").textContent = available.length
      ? `Save ${available.length} sample tabs`
      : "Saved 2 tabs";
  }

  function renderTasks() {
    const space = spaces[currentSpace];
    $("#task-list").replaceChildren();
    for (const task of space.tasks) {
      const label = document.createElement("label");
      label.className = "task-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = task.done;
      input.addEventListener("change", () => {
        task.done = input.checked;
        updateTaskCount();
      });
      const text = document.createElement("span");
      text.textContent = task.text;
      label.append(input, text);
      $("#task-list").append(label);
    }
    updateTaskCount();
  }

  function updateTaskCount() {
    const tasks = spaces[currentSpace].tasks;
    $("#task-count").textContent =
      `${tasks.filter((task) => task.done).length} / ${tasks.length}`;
  }

  function render() {
    const space = spaces[currentSpace];
    const title =
      currentView === "today"
        ? "A little room for today"
        : currentView === "library"
          ? "Everything you’ve kept"
          : space.title;
    $("#space-title").replaceChildren(document.createTextNode(title));
    const dot = document.createElement("span");
    dot.className = "title-dot";
    $("#space-title").append(dot);
    $("#space-crumb").textContent =
      currentView === "space"
        ? space.title
        : currentView === "today"
          ? "Today"
          : "Library";
    $("#space-subtitle").textContent =
      currentView === "today"
        ? "A few things to pick up. One thing at a time."
        : currentView === "library"
          ? "All your saved sample links, in one place."
          : space.subtitle;
    $("#collection-title").textContent =
      currentView === "library"
        ? "Your saved links"
        : currentView === "today"
          ? "Pick up where you left off"
          : space.collection;
    $("#sample-note").value = space.note;
    $$(".space-link").forEach((button) => {
      const selected =
        button.dataset.space === currentSpace && currentView === "space";
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    $$(".rail-link").forEach((button) => {
      const selected = button.dataset.view === currentView;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    renderLinks();
    renderTasks();
  }

  function saveTabs() {
    const key = currentSpace;
    const space = spaces[key];
    const extra = space.extras.filter(
      (link) => !space.links.some((saved) => saved.id === link.id),
    );
    if (!extra.length) return;
    space.links.push(...structuredClone(extra));
    $("#demo-search").value = "";
    renderLinks(extra.map((link) => link.id));
    notify("Two sample tabs saved. You can find them in this space.", () => {
      spaces[key].links = spaces[key].links.filter(
        (link) => !extra.some((item) => item.id === link.id),
      );
      renderLinks();
      notify("Sample tabs removed.");
    });
  }

  $("#save-tabs").addEventListener("click", saveTabs);
  $('[data-step="save"]').addEventListener("click", () => {
    saveTabs();
    $("#workspace-demo").scrollIntoView({ block: "start" });
  });
  $('[data-step="search"]').addEventListener("click", () => {
    currentSpace = "reading";
    currentView = "space";
    render();
    $("#demo-search").value = "garden";
    renderLinks();
    $("#demo-search").focus();
  });
  $("#demo-search").addEventListener("input", () => renderLinks());
  $("#clear-search").addEventListener("click", () => {
    $("#demo-search").value = "";
    renderLinks();
    $("#demo-search").focus();
  });
  $("#sample-note").addEventListener("input", (event) => {
    spaces[currentSpace].note = event.target.value;
  });
  $$(".space-link").forEach((button) =>
    button.addEventListener("click", () => {
      currentSpace = button.dataset.space;
      currentView = "space";
      $("#demo-search").value = "";
      render();
    }),
  );
  $$(".rail-link").forEach((button) =>
    button.addEventListener("click", () => {
      if (button.dataset.view === "plan") {
        $("#planning").scrollIntoView({ block: "start" });
        return;
      }
      currentView = button.dataset.view;
      $("#demo-search").value = "";
      render();
    }),
  );
  $("#task-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#new-task");
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    const key = currentSpace;
    const task = { id: `custom-${++sequence}`, text, done: false };
    spaces[key].tasks.push(task);
    input.value = "";
    renderTasks();
    notify("Task added.", () => {
      spaces[key].tasks = spaces[key].tasks.filter(
        (item) => item.id !== task.id,
      );
      renderTasks();
      notify("Task removed.");
    });
    input.focus();
  });

  function updatePlanButton() {
    const count = $$('input[name="plan-task"]:checked').length;
    $("#add-plan").disabled = !count || planAdded;
    $("#add-plan").replaceChildren(
      document.createTextNode(
        planAdded
          ? "Added to your workspace ✓"
          : count
            ? `Add ${count} ${count === 1 ? "task" : "tasks"} ↗`
            : "Select a task to continue",
      ),
    );
  }
  $$('input[name="plan-task"]').forEach((input) =>
    input.addEventListener("change", updatePlanButton),
  );
  $("#try-plan").addEventListener("click", () => {
    const scene = $(".plan-scene");
    scene.classList.remove("highlight");
    scene.scrollIntoView({ block: "center" });
    // A frame boundary restarts the one-shot cue without forcing a layout read.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => scene.classList.add("highlight")),
    );
    $('input[name="plan-task"]').focus({ preventScroll: true });
  });
  $("#add-plan").addEventListener("click", () => {
    const selected = $$('input[name="plan-task"]:checked');
    if (!selected.length || planAdded) return;
    const key = currentSpace;
    const tasks = selected.map((input) => ({
      id: `plan-${++sequence}`,
      text: input.value,
      done: false,
    }));
    spaces[key].tasks.push(...tasks);
    planAdded = true;
    updatePlanButton();
    renderTasks();
    $("#plan-feedback").textContent =
      `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} added to ${spaces[key].title}.`;
    notify("Plan added to Next up.", () => {
      spaces[key].tasks = spaces[key].tasks.filter(
        (task) => !tasks.some((added) => added.id === task.id),
      );
      planAdded = false;
      updatePlanButton();
      renderTasks();
      $("#plan-feedback").textContent = "Nothing is added until you say so.";
      notify("Plan removed.");
    });
  });
  $("#reset-demo").addEventListener("click", () => {
    spaces = structuredClone(seed);
    currentSpace = "reading";
    currentView = "space";
    planAdded = false;
    $("#demo-search").value = "";
    $("#new-task").value = "";
    $$('input[name="plan-task"]').forEach((input) => {
      input.checked = true;
    });
    $("#plan-feedback").textContent = "Nothing is added until you say so.";
    render();
    updatePlanButton();
    notify("Sample workspace reset.");
  });
  $("#toast-undo").addEventListener("click", () => {
    const action = undoAction;
    undoAction = null;
    if (action) action();
  });
  $("#toast-close").addEventListener("click", dismissToast);

  const install = $("#install-dialog");
  $$("[data-install]").forEach((button) =>
    button.addEventListener("click", () => install.showModal()),
  );
  $(".dialog-close").addEventListener("click", () => install.close());
  install.addEventListener("click", (event) => {
    if (event.target === install) {
      const rect = install.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        install.close();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key !== "/" ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      install.open
    )
      return;
    if (event.target.closest('input,textarea,[contenteditable="true"]')) return;
    event.preventDefault();
    $("#demo-search").focus();
  });

  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  let motionPaused = motionPreference.matches;
  function setMotion(paused) {
    motionPaused = paused;
    document.documentElement.toggleAttribute("data-pause-motion", paused);
    $("#motion-toggle").textContent = paused ? "Resume motion" : "Pause motion";
    $("#motion-toggle").setAttribute("aria-pressed", String(paused));
  }
  $("#motion-toggle").addEventListener("click", () => setMotion(!motionPaused));
  motionPreference.addEventListener("change", (event) =>
    setMotion(event.matches),
  );
  setMotion(motionPaused);

  if ("IntersectionObserver" in window && !motionPreference.matches) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
          if (
            entry.isIntersecting &&
            !entry.target.classList.contains("flow-art")
          )
            observer.unobserve(entry.target);
        }),
      { threshold: 0.12 },
    );
    $$(
      ".section-intro,.context-flow article,.local-copy,.local-details article,.faq-section>div,.closing-content",
    ).forEach((element) => {
      element.classList.add("reveal");
      observer.observe(element);
    });
    $$(".flow-art").forEach((element) => observer.observe(element));
  }
  render();
  updatePlanButton();
})();
