(() => {
  "use strict";

  const config = window.SVETLAB_CONFIG;
  if (!config) return;

  const { contacts, site, analytics } = config;
  const menuButton = document.querySelector(".menu-button");
  const mobileMenu = document.getElementById("mobile-menu");
  const modal = document.getElementById("project-modal");
  const modalPanel = modal?.querySelector(".modal-panel");
  const requestForm = document.getElementById("request-form");
  const toast = document.getElementById("toast");
  const fixedCta = document.querySelector(".mobile-fixed-cta");
  const focusableSelector = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
  let lastFocusedElement = null;
  let toastTimer = null;
  let submitting = false;

  const safeStorage = {
    get(storage, key) {
      try {
        return storage.getItem(key);
      } catch (_error) {
        return null;
      }
    },
    set(storage, key, value) {
      try {
        storage.setItem(key, value);
      } catch (_error) {
        // Storage can be unavailable in private browsing. The page remains usable.
      }
    }
  };

  function collectUtm() {
    const names = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const params = new URLSearchParams(window.location.search);
    const fromUrl = {};

    names.forEach((name) => {
      const value = params.get(name);
      if (value) fromUrl[name] = value.slice(0, 240);
    });

    const storedRaw = safeStorage.get(window.sessionStorage, "svetlab_utm") || safeStorage.get(window.localStorage, "svetlab_utm");
    let stored = {};
    if (storedRaw) {
      try {
        stored = JSON.parse(storedRaw);
      } catch (_error) {
        stored = {};
      }
    }

    const result = { ...stored, ...fromUrl };
    const serialized = JSON.stringify(result);
    safeStorage.set(window.sessionStorage, "svetlab_utm", serialized);
    safeStorage.set(window.localStorage, "svetlab_utm", serialized);
    return result;
  }

  const utm = collectUtm();

  function trackEvent(eventName, details = {}) {
    const payload = { event: eventName, ...details };

    window.dispatchEvent(new CustomEvent("svetlab:event", { detail: payload }));

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, details);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(payload);
    }

    if (analytics.yandexMetricaId && typeof window.ym === "function") {
      window.ym(analytics.yandexMetricaId, "reachGoal", eventName, details);
    }
  }

  function setBodyLock() {
    const menuOpen = menuButton?.getAttribute("aria-expanded") === "true";
    const modalOpen = modal && !modal.hidden;
    document.body.classList.toggle("is-locked", Boolean(menuOpen || modalOpen));
  }

  function setMenu(open, restoreFocus = false) {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    mobileMenu.hidden = !open;
    setBodyLock();
    if (open) {
      mobileMenu.querySelector("a")?.focus();
    } else if (restoreFocus) {
      menuButton.focus();
    }
  }

  menuButton?.addEventListener("click", () => {
    setMenu(menuButton.getAttribute("aria-expanded") !== "true");
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  function showToast(message) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 5200);
  }

  function applyRequestContext(trigger) {
    if (!requestForm) return;
    const requestType = trigger?.dataset.requestType;
    const category = trigger?.dataset.category || "";
    const typeSelect = requestForm.elements.requestType;
    if (requestType && typeSelect) typeSelect.value = requestType;
    requestForm.dataset.category = category;
  }

  function openModal(trigger) {
    if (!modal || !modalPanel) return;
    lastFocusedElement = trigger || document.activeElement;
    applyRequestContext(trigger);
    modal.hidden = false;
    setMenu(false);
    setBodyLock();
    trackEvent("project_modal_open", {
      request_type: requestForm?.elements.requestType?.value || "",
      category: requestForm?.dataset.category || ""
    });
    window.requestAnimationFrame(() => modalPanel.focus());
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    setBodyLock();
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  }

  document.querySelectorAll("[data-open-modal]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      trackEvent("cta_project_click", { label: trigger.textContent.trim().slice(0, 100) });
      openModal(trigger);
    });
  });

  modal?.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  function trapFocus(event, container) {
    const focusable = [...container.querySelectorAll(focusableSelector)].filter((element) => !element.hidden && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (modal && !modal.hidden) closeModal();
      else if (menuButton?.getAttribute("aria-expanded") === "true") setMenu(false, true);
    }

    if (event.key === "Tab" && modal && !modal.hidden && modalPanel) {
      trapFocus(event, modalPanel);
    }
  });

  document.querySelectorAll(".faq-button").forEach((button) => {
    const answer = document.getElementById(button.getAttribute("aria-controls"));
    if (answer) answer.hidden = true;
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      if (answer) answer.hidden = open;
      if (!open) trackEvent("faq_open", { question: button.firstChild?.textContent?.trim() || button.textContent.trim() });
    });
  });

  document.querySelectorAll("[data-track]").forEach((element) => {
    element.addEventListener("click", () => trackEvent(element.dataset.track, { label: element.textContent.trim().slice(0, 100) }));
  });

  function copyText(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    return new Promise((resolve, reject) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      copied ? resolve() : reject(new Error("copy_failed"));
    });
  }

  document.querySelector("[data-copy-max]")?.addEventListener("click", async () => {
    try {
      await copyText(contacts.maxPhone);
      showToast(`Номер ${contacts.maxPhoneDisplay} скопирован.`);
    } catch (_error) {
      showToast(`Скопируйте номер вручную: ${contacts.maxPhoneDisplay}`);
    }
  });

  function buildRequestMessage(data) {
    const contextLines = [
      `Источник страницы: ${window.location.href.split("#")[0]}`,
      `Referrer: ${document.referrer || "прямой переход"}`,
      `Время отправки: ${new Date().toISOString()}`
    ];

    const utmValues = Object.entries(utm).map(([key, value]) => `${key}=${value}`);
    if (utmValues.length) contextLines.splice(1, 0, `UTM: ${utmValues.join("; ")}`);

    return [
      "Здравствуйте! Хочу получить расчёт.",
      "",
      `Тип запроса: ${data.requestType}`,
      data.category ? `Категория: ${data.category}` : "",
      `Город получения: ${data.city}`,
      `Желаемый срок: ${data.deadline || "не указан"}`,
      `Комментарий: ${data.comment || "нет"}`,
      `Предпочтительный контакт: ${data.contact}`,
      "",
      "Проект, спецификацию или ссылки отправлю следующим сообщением.",
      "",
      ...contextLines
    ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "").join("\n");
  }

  function clearFieldError(field) {
    field.removeAttribute("aria-invalid");
    const error = field.closest(".field")?.querySelector(".field-error");
    if (error) error.textContent = "";
  }

  function setFieldError(field, message) {
    field.setAttribute("aria-invalid", "true");
    const error = field.closest(".field")?.querySelector(".field-error");
    if (error) error.textContent = message;
  }

  function validateForm(form) {
    let firstInvalid = null;
    const requiredFields = [...form.querySelectorAll("input[required]:not([type='checkbox']), select[required]")];
    requiredFields.forEach((field) => {
      clearFieldError(field);
      if (!String(field.value).trim()) {
        setFieldError(field, "Заполните это поле.");
        if (!firstInvalid) firstInvalid = field;
      }
    });

    const consent = form.elements.consent;
    const formError = form.querySelector(".form-error");
    if (formError) {
      formError.hidden = true;
      formError.textContent = "";
    }

    if (!consent.checked) {
      if (formError) {
        formError.textContent = "Подтвердите согласие на обработку данных для подготовки ответа.";
        formError.hidden = false;
      }
      if (!firstInvalid) firstInvalid = consent;
    }

    firstInvalid?.focus();
    return !firstInvalid;
  }

  function openExternal(url) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function sendThroughChannel(channel, message) {
    if (channel === "telegram") {
      copyText(message).then(
        () => showToast("Текст запроса скопирован. Вставьте его в сообщение и приложите файл."),
        () => showToast("Telegram открыт. Вставьте данные запроса и приложите файл.")
      );
      openExternal(contacts.telegramUrl);
      trackEvent("cta_telegram_click", { source: "project_form" });
      return;
    }

    if (channel === "whatsapp") {
      openExternal(`https://wa.me/${contacts.whatsappPhone}?text=${encodeURIComponent(message)}`);
      showToast("WhatsApp открыт с подготовленным текстом. Приложите файл к сообщению.");
      trackEvent("cta_whatsapp_click", { source: "project_form" });
      return;
    }

    if (channel === "email") {
      window.location.href = `mailto:${contacts.email}?subject=${encodeURIComponent(site.requestEmailSubject)}&body=${encodeURIComponent(message + "\n\nПожалуйста, приложите PDF, таблицу или изображения к письму.")}`;
      showToast("Почтовое приложение открыто. Приложите файл перед отправкой.");
      trackEvent("cta_email_click", { source: "project_form" });
      return;
    }

    throw new Error("unsupported_channel");
  }

  requestForm?.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => {
      if (field.matches("input:not([type='checkbox']), select")) clearFieldError(field);
      const formError = requestForm.querySelector(".form-error");
      if (formError) formError.hidden = true;
    });
  });

  requestForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting || !validateForm(requestForm)) return;

    const formData = new FormData(requestForm);
    const data = {
      requestType: String(formData.get("requestType") || ""),
      city: String(formData.get("city") || "").trim(),
      deadline: String(formData.get("deadline") || "").trim(),
      comment: String(formData.get("comment") || "").trim(),
      channel: String(formData.get("channel") || ""),
      contact: String(formData.get("contact") || "").trim(),
      category: requestForm.dataset.category || ""
    };
    const submitButton = requestForm.querySelector("button[type='submit']");
    const formError = requestForm.querySelector(".form-error");

    submitting = true;
    if (submitButton) submitButton.disabled = true;

    try {
      sendThroughChannel(data.channel, buildRequestMessage(data));
      trackEvent("project_submit_success", { channel: data.channel, request_type: data.requestType });
      window.setTimeout(closeModal, 350);
    } catch (_error) {
      trackEvent("project_submit_error", { channel: data.channel, request_type: data.requestType });
      if (formError) {
        formError.textContent = "Не удалось открыть выбранный канал. Используйте прямую ссылку ниже или напишите на e-mail.";
        formError.hidden = false;
      }
    } finally {
      window.setTimeout(() => {
        submitting = false;
        if (submitButton) submitButton.disabled = false;
      }, 1200);
    }
  });

  const whatsappMessage = "Здравствуйте! Хочу получить расчёт. Проект, спецификацию или ссылки отправлю следующим сообщением.";
  document.querySelectorAll("[data-contact-link='whatsapp']").forEach((link) => {
    link.href = `https://wa.me/${contacts.whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`;
  });

  if (fixedCta && "IntersectionObserver" in window) {
    const footerObserver = new IntersectionObserver((entries) => {
      fixedCta.classList.toggle("is-hidden", entries.some((entry) => entry.isIntersecting));
    }, { threshold: 0.05 });
    const contactSection = document.getElementById("contact");
    const footer = document.querySelector(".site-footer");
    if (contactSection) footerObserver.observe(contactSection);
    if (footer) footerObserver.observe(footer);
  }

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
