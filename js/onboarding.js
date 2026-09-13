(function () {
  "use strict";

  /* ---------------------------------------------------------------------
   * Config — fill these in once the Mimo Supabase project exists.
   * Until then the flow still works end-to-end; it just logs to the
   * console instead of writing to a database (see README.md).
   * ------------------------------------------------------------------- */
  var CONFIG = {
    SUPABASE_URL: "https://dkrxhlrexdnhsghzlanx.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_SRwm1H37KqNV0QErSTuhBg_glmKzXGA",
    LAUNCH_DATE_ISO: "2026-12-01T00:00:00Z" // placeholder — change to the real launch date
  };

  var supabase = null;
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase) {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }

  /* ---------------------------------------------------------------------
   * State
   * ------------------------------------------------------------------- */
  var answers = {};
  var history = []; // stack of visited step ids, for the back button
  var current = "welcome";
  var authUser = null; // { id, email } once signed up

  // Fixed position of each step for the "x/8" counter and progress bar.
  // "final" has no counter (it's the launch countdown screen).
  var STEP_NUMBER = {
    welcome: 1,
    account: 2,
    "own-pet": 3,
    profile: 4,
    habits: 5,
    emergency: 6,
    value: 7,
    community: 8
  };
  var TOTAL_STEPS = 8;

  var panels = {};
  document.querySelectorAll(".ob-panel").forEach(function (el) {
    panels[el.dataset.step] = el;
  });

  var stepCountEl = document.getElementById("obStepCount");
  var progressBar = document.getElementById("obProgressBar");
  var backBtn = document.getElementById("obBack");
  var content = document.getElementById("obContent");

  /* ---------------------------------------------------------------------
   * Panel rendering
   * ------------------------------------------------------------------- */
  function applyConditionals() {
    var owner = answers.ownPet; // 'yes' | 'planning' | 'no'

    var petOwnerOnly = document.getElementById("petOwnerOnly");
    if (petOwnerOnly) petOwnerOnly.style.display = owner === "planning" ? "none" : "block";

    var freqOnly = document.getElementById("freqOnly");
    if (freqOnly) freqOnly.style.display = owner === "planning" ? "none" : "block";

    var emergOnly = document.getElementById("emergOnly");
    if (emergOnly) emergOnly.style.display = owner === "planning" ? "none" : "block";

    toggleShow("emergencyDetail", answers.everEmergency === "yes");
    toggleShow("usedAppWhichWrap", answers.usedApp === "yes");
    toggleShow("phoneWrap", answers.joinCommunity === "yes");
  }

  function toggleShow(id, show) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("show", !!show);
  }

  function showPanel(stepId) {
    Object.keys(panels).forEach(function (id) {
      panels[id].classList.toggle("active", id === stepId);
    });
    current = stepId;
    applyConditionals();

    var num = STEP_NUMBER[stepId];
    if (num) {
      stepCountEl.style.visibility = "visible";
      stepCountEl.textContent = num + "/" + TOTAL_STEPS;
      progressBar.style.width = (num / TOTAL_STEPS) * 100 + "%";
    } else {
      stepCountEl.style.visibility = "hidden";
      progressBar.style.width = "100%";
    }
    backBtn.classList.toggle("show", history.length > 0);
    content.scrollTop = 0;
  }

  function goTo(stepId) {
    history.push(current);
    showPanel(stepId);
  }

  function goBack() {
    var prev = history.pop();
    if (prev) showPanel(prev);
  }

  /* ---------------------------------------------------------------------
   * Branching — decides the next step from the current one
   * ------------------------------------------------------------------- */
  function nextFrom(stepId) {
    switch (stepId) {
      case "welcome": return "account";
      case "account": return "own-pet";
      case "own-pet": return answers.ownPet === "no" ? "final" : "profile";
      case "profile": return "habits";
      case "habits": return "emergency";
      case "emergency": return "value";
      case "value": return "community";
      case "community": return "final";
      default: return "final";
    }
  }

  /* ---------------------------------------------------------------------
   * Generic interactive controls: pills, tiles, radio cards, checkboxes
   * ------------------------------------------------------------------- */
  function wirePillGroup(containerId, answerKey) {
    var group = document.getElementById(containerId);
    if (!group) return;
    group.querySelectorAll(".ob-pill").forEach(function (btn) {
      btn.addEventListener("click", function () {
        group.querySelectorAll(".ob-pill").forEach(function (b) { b.classList.remove("checked"); });
        btn.classList.add("checked");
        answers[answerKey] = btn.dataset.value;
        applyConditionals();
        refreshContinueStates();
      });
    });
  }

  function wireTileGroup(containerId, answerKey) {
    var group = document.getElementById(containerId);
    if (!group) return;
    group.querySelectorAll(".ob-tile").forEach(function (btn) {
      btn.addEventListener("click", function () {
        group.querySelectorAll(".ob-tile").forEach(function (b) { b.classList.remove("checked"); });
        btn.classList.add("checked");
        answers[answerKey] = btn.dataset.value;
        refreshContinueStates();
      });
    });
  }

  function wireRadioCards() {
    document.querySelectorAll(".ob-option input[type=radio]").forEach(function (input) {
      input.addEventListener("change", function () {
        var name = input.name;
        document.querySelectorAll('input[name="' + name + '"]').forEach(function (i) {
          i.closest(".ob-option").classList.toggle("checked", i.checked);
        });
        answers[name] = input.value;
        applyConditionals();
        refreshContinueStates();
      });
    });
  }

  function wireCheckboxLists() {
    document.querySelectorAll(".ob-check-list input[type=checkbox]").forEach(function (box) {
      box.addEventListener("change", collectCheckboxAnswers);
    });
  }

  function collectCheckboxAnswers() {
    answers.findProducts = valuesOf(
      document.querySelectorAll('[data-step="habits"] .ob-block:nth-of-type(2) input[type=checkbox]:checked')
    );
    answers.whatDidYouDo = valuesOf(document.querySelectorAll('#emergencyDetail input[type=checkbox]:checked'));
  }

  function valuesOf(nodeList) {
    return Array.prototype.map.call(nodeList, function (n) { return n.value; });
  }

  /* ---------------------------------------------------------------------
   * Continue-button gating for required fields
   * ------------------------------------------------------------------- */
  function refreshContinueStates() {
    var btnOwnPet = document.getElementById("btnOwnPet");
    if (btnOwnPet) btnOwnPet.disabled = !answers.ownPet;

    var btnProfile = document.getElementById("btnProfile");
    if (btnProfile) {
      var state = document.getElementById("fState").value.trim();
      var city = document.getElementById("fCity").value.trim();
      var ok = state.length > 0 && city.length > 0;
      if (answers.ownPet !== "planning") {
        ok = ok && !!answers.petType && !!answers.petDuration;
      }
      btnProfile.disabled = !ok;
    }
  }

  /* ---------------------------------------------------------------------
   * Step 2 — real Supabase Auth sign-up
   * ------------------------------------------------------------------- */
  function showAcctError(msg) {
    var el = document.getElementById("acctError");
    el.textContent = msg;
    el.classList.toggle("show", !!msg);
  }

  document.getElementById("btnCreateAccount").addEventListener("click", function () {
    var email = document.getElementById("fEmail").value.trim();
    var password = document.getElementById("fPass").value;
    var phoneCode = document.getElementById("fPhoneCode").value;
    var phone = document.getElementById("fPhoneAcct").value.trim();
    showAcctError("");

    if (!email || !password) {
      showAcctError("Please enter an email and password.");
      return;
    }
    if (password.length < 6) {
      showAcctError("Password should be at least 6 characters.");
      return;
    }

    answers.email = email;
    answers.phoneCountryCode = phoneCode;
    answers.phoneFromAccount = phone;

    var btn = this;
    if (!supabase) {
      // No backend configured yet — proceed so the flow can still be reviewed end to end.
      console.warn("Supabase isn't configured yet (see CONFIG at the top of onboarding.js) — skipping real sign-up.");
      goTo(nextFrom(current));
      return;
    }

    btn.disabled = true;
    var originalText = btn.textContent;
    btn.textContent = "Creating account…";

    supabase.auth.signUp({ email: email, password: password })
      .then(function (res) {
        if (res.error) throw res.error;
        authUser = res.data && res.data.user ? { id: res.data.user.id, email: email } : null;
        goTo(nextFrom(current));
      })
      .catch(function (err) {
        showAcctError(err.message || "Something went wrong creating your account.");
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = originalText;
      });
  });

  /* ---------------------------------------------------------------------
   * Wire up static controls
   * ------------------------------------------------------------------- */
  wirePillGroup("emFreq", "emergencyFreq");
  wirePillGroup("usedApp", "usedApp");
  wirePillGroup("everEmergency", "everEmergency");
  wirePillGroup("afterHours", "afterHours");
  wirePillGroup("trustedVet", "trustedVet");
  wirePillGroup("useApp", "wouldUseApp");
  wirePillGroup("buyDelivery", "wouldBuyDelivery");
  wirePillGroup("payPriority", "payPriority");
  wirePillGroup("joinCommunity", "joinCommunity");
  wireTileGroup("petTypes", "petType");
  wireRadioCards();
  wireCheckboxLists();

  document.getElementById("fState").addEventListener("input", refreshContinueStates);
  document.getElementById("fCity").addEventListener("input", refreshContinueStates);

  document.querySelectorAll("[data-next]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.disabled) return;
      goTo(nextFrom(current));
    });
  });

  backBtn.addEventListener("click", goBack);

  /* ---------------------------------------------------------------------
   * Step 8 — Finish: collect everything and store the response
   * ------------------------------------------------------------------- */
  document.getElementById("btnFinish").addEventListener("click", function () {
    answers.fairPrice = document.getElementById("fFairPrice").value.trim();
    answers.trustFeature = document.getElementById("fTrustFeature").value.trim();
    answers.timeToHelp = document.getElementById("fTimeToHelp").value;
    answers.usedAppWhich = document.getElementById("fUsedAppWhich").value.trim();
    answers.phone = document.getElementById("fPhone").value.trim();
    answers.anythingElse = document.getElementById("fAnythingElse").value.trim();
    answers.state = document.getElementById("fState").value.trim();
    answers.city = document.getElementById("fCity").value.trim();
    collectCheckboxAnswers();

    var record = {
      source: "site",
      user_id: authUser ? authUser.id : null,
      email: answers.email || null,
      phone: answers.phone || answers.phoneFromAccount || null,
      state: answers.state || null,
      city: answers.city || null,
      answers: answers
    };

    if (supabase) {
      supabase.from("responses").insert([record]).then(function (res) {
        if (res.error) console.error("Mimo — failed to save response:", res.error);
      });
    } else {
      console.warn("Supabase isn't configured yet (see CONFIG at the top of onboarding.js) — logging instead of saving.");
      console.log("Mimo onboarding — collected answers:", record);
    }

    goTo("final");
  });

  /* ---------------------------------------------------------------------
   * Final screen — launch countdown + share
   * ------------------------------------------------------------------- */
  function pad(n) { return String(n).padStart(2, "0"); }

  function tickCountdown() {
    var target = new Date(CONFIG.LAUNCH_DATE_ISO).getTime();
    var diff = Math.max(0, target - Date.now());

    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);

    document.getElementById("cdDays").textContent = pad(days);
    document.getElementById("cdHours").textContent = pad(hours);
    document.getElementById("cdMins").textContent = pad(mins);
    document.getElementById("cdSecs").textContent = pad(secs);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  document.getElementById("btnShare").addEventListener("click", function () {
    var shareData = {
      title: "Mimo",
      text: "I just joined the waitlist for Mimo — a new app for pet emergencies, vets, and pet care. Launching soon!",
      url: window.location.origin + window.location.pathname.replace("onboarding.html", "index.html")
    };
    var btn = this;
    if (navigator.share) {
      navigator.share(shareData).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareData.url).then(function () {
        var original = btn.textContent;
        btn.textContent = "Link copied!";
        setTimeout(function () { btn.textContent = original; }, 1800);
      });
    }
  });

  showPanel("welcome");
})();
